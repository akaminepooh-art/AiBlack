/**
 * 市場データ取得 API
 */

import { Router, Request, Response, NextFunction } from 'express';
import { yahooFinanceService } from '../services/yahoo-finance.service';
import { cacheService } from '../services/cache.service';
import { logger } from '../utils/logger';
import { SuccessResponse } from '../types/api';
import { AppError } from '../middleware/error-handler';
import { CandleData, QuoteData } from '../types/candle';

const router = Router();

/**
 * GET /api/market-data/candles
 * ローソク足データ取得
 * 
 * Query Parameters:
 * - symbol: string (required) - 銘柄シンボル (例: AAPL, EURUSD=X)
 * - interval: string (required) - タイムフレーム (1m, 5m, 15m, 1h, 4h, 1d, 1w, 1M)
 * - range: string (optional) - 取得期間 (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max)
 */
router.get('/candles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { symbol, interval, range } = req.query;

    // パラメータ検証
    if (!symbol || typeof symbol !== 'string') {
      throw new AppError('symbol is required', 400, 'ValidationError');
    }

    if (!interval || typeof interval !== 'string') {
      throw new AppError('interval is required', 400, 'ValidationError');
    }

    // === 小さい足 (1m, 5m, 15m, 1h) で短い期間 (1d) の組み合わせの自動調整 ===
    const isIntraday = ['1m', '5m', '15m', '30m', '1h', '2h', '4h'].includes(interval);
    const shortRange = range === '1d';
    
    if (isIntraday && shortRange) {
      // 小さい足で 1d の場合、データが不足する可能性があるため、適切な範囲に調整
      const adjustedRange = {
        '1m': '1d',    // 1分足: 1日は最大約390ポイント (6.5時間)
        '5m': '5d',    // 5分足: 5日に拡張して十分なデータを取得
        '15m': '5d',   // 15分足: 5日
        '30m': '1mo',  // 30分足: 1か月
        '1h': '1mo',   // 1時間足: 1か月
        '2h': '1mo',   // 2時間足: 1か月
        '4h': '3mo'    // 4時間足: 3か月
      }[interval] || '5d';
      
      logger.warn(`Adjusted range for ${interval} from ${range} to ${adjustedRange} to ensure sufficient data`);
      range = adjustedRange;
    }

    // キャッシュキー生成
    const cacheKey = `candles:${symbol}:${interval}:${range || 'default'}`;

    // キャッシュチェック
    const cached = cacheService.get<SuccessResponse<CandleData[]>>(cacheKey);
    if (cached) {
      logger.debug(`Cache hit: ${cacheKey}`);
      res.json(cached);
      return;
    }

    // データ取得
    const candles = await yahooFinanceService.getCandles({
      symbol: symbol as string,
      interval: interval as string,
      range: range as string,
    });

    if (candles.length === 0) {
      throw new AppError(`No data available for ${symbol}`, 404, 'DataNotFoundError');
    }

    const response: SuccessResponse<CandleData[]> = {
      success: true,
      data: candles,
      metadata: {
        symbol,
        interval,
        range: range || '1mo',
        count: candles.length,
        timestamp: new Date().toISOString(),
      },
    };

    // キャッシュ保存
    cacheService.set(cacheKey, response);

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/market-data/quote
 * リアルタイムクォート取得
 * 
 * Query Parameters:
 * - symbol: string (required) - 銘柄シンボル
 */
router.get('/quote', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { symbol } = req.query;

    if (!symbol || typeof symbol !== 'string') {
      throw new AppError('symbol is required', 400, 'ValidationError');
    }

    const quote = await yahooFinanceService.getQuote(symbol);

    const response: SuccessResponse<QuoteData> = {
      success: true,
      data: quote,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/market-data/symbols
 * 利用可能なシンボルリスト取得
 */
router.get('/symbols', (_req: Request, res: Response) => {
  const symbols = yahooFinanceService.getAvailableSymbols();

  const response: SuccessResponse<Record<string, string[]>> = {
    success: true,
    data: symbols,
    metadata: {
      categories: Object.keys(symbols),
      totalCount: Object.values(symbols).reduce((sum, arr) => sum + arr.length, 0),
    },
  };

  res.json(response);
});

export default router;
