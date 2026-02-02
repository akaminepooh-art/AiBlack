/**
 * Yahoo Finance API サービス
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../utils/logger';
import { env } from '../config/environment';
import { CandleData, CandleRequest, QuoteData } from '../types/candle';

/**
 * Yahoo Finance データ取得サービス
 */
export class YahooFinanceService {
  private client: AxiosInstance;
  private timeout: number;
  // private retries: number; // 将来のリトライ機能用

  constructor() {
    this.timeout = env.YAHOO_FINANCE_TIMEOUT;
    // this.retries = env.YAHOO_FINANCE_RETRY; // 将来のリトライ機能用

    this.client = axios.create({
      baseURL: 'https://query1.finance.yahoo.com/v8/finance',
      timeout: this.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    logger.info('Yahoo Finance service initialized');
  }

  /**
   * ローソク足データ取得
   */
  async getCandles(request: CandleRequest): Promise<CandleData[]> {
    const { symbol, interval, range = '1mo' } = request;

    logger.info(`Fetching candles: ${symbol} ${interval} ${range}`);

    try {
      const response = await this.client.get(`/chart/${symbol}`, {
        params: {
          interval,
          range,
        },
      });

      // レスポンス検証
      if (!response.data?.chart?.result?.[0]) {
        throw new Error('Invalid response from Yahoo Finance API');
      }

      const result = response.data.chart.result[0];

      // エラーチェック
      if (result.error) {
        throw new Error(`Yahoo Finance API error: ${result.error.description}`);
      }

      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];

      if (!timestamps || !quote) {
        throw new Error('Missing timestamp or quote data');
      }

      // === DEBUG: Log raw API response details ===
      logger.debug(`Raw API response for ${symbol}:`, {
        timestampCount: timestamps.length,
        firstTimestamp: timestamps[0],
        lastTimestamp: timestamps[timestamps.length - 1],
        firstTimestampDate: new Date(timestamps[0] * 1000).toISOString(),
        lastTimestampDate: new Date(timestamps[timestamps.length - 1] * 1000).toISOString(),
        quoteOpenCount: quote.open.length,
        quoteHighCount: quote.high.length,
        quoteLowCount: quote.low.length,
        quoteCloseCount: quote.close.length,
        quoteVolumeCount: quote.volume.length,
      });

      // CandleData配列に変換
      const candles: CandleData[] = [];
      let skippedCount = 0;

      for (let i = 0; i < timestamps.length; i++) {
        // null/undefinedをスキップ
        if (
          quote.open[i] == null ||
          quote.high[i] == null ||
          quote.low[i] == null ||
          quote.close[i] == null ||
          quote.volume[i] == null
        ) {
          skippedCount++;
          logger.debug(`Skipped null data at index ${i}: time=${timestamps[i]}`);
          continue;
        }

        candles.push({
          time: timestamps[i],
          open: quote.open[i],
          high: quote.high[i],
          low: quote.low[i],
          close: quote.close[i],
          volume: quote.volume[i],
        });
      }

      // === DEBUG: Log processed candles ===
      logger.info(`Fetched ${candles.length} candles for ${symbol} (skipped ${skippedCount} null entries)`);
      if (candles.length > 0) {
        logger.debug(`First candle:`, candles[0]);
        logger.debug(`Last candle:`, candles[candles.length - 1]);
      }

      // データの並び順を確認してソート
      const isAscending = candles.length > 1 && candles[0].time < candles[1].time;
      if (!isAscending && candles.length > 1) {
        logger.warn(`Data is not in ascending order, sorting...`);
        candles.sort((a, b) => a.time - b.time);
      }

      return candles;
    } catch (error) {
      return this.handleError(error, `Failed to fetch candles for ${symbol}`);
    }
  }

  /**
   * リアルタイムクォート取得
   */
  async getQuote(symbol: string): Promise<QuoteData> {
    logger.info(`Fetching quote: ${symbol}`);

    try {
      const response = await this.client.get('/quote', {
        params: {
          symbols: symbol,
        },
      });

      if (!response.data?.quoteResponse?.result?.[0]) {
        throw new Error('Invalid quote response from Yahoo Finance API');
      }

      const data = response.data.quoteResponse.result[0];

      const quote: QuoteData = {
        symbol: data.symbol,
        price: data.regularMarketPrice || 0,
        change: data.regularMarketChange || 0,
        changePercent: data.regularMarketChangePercent || 0,
        volume: data.regularMarketVolume || 0,
        marketTime: data.regularMarketTime,
        dayHigh: data.regularMarketDayHigh,
        dayLow: data.regularMarketDayLow,
      };

      logger.info(`Fetched quote for ${symbol}: $${quote.price}`);
      return quote;
    } catch (error) {
      return this.handleError(error, `Failed to fetch quote for ${symbol}`);
    }
  }

  /**
   * 利用可能なシンボルリスト
   */
  getAvailableSymbols(): Record<string, string[]> {
    return {
      forex: [
        'EURUSD=X',
        'GBPUSD=X',
        'USDJPY=X',
        'GBPJPY=X',
        'AUDUSD=X',
        'USDCAD=X',
        'USDCHF=X',
        'NZDUSD=X',
      ],
      stocks: [
        'AAPL',
        'MSFT',
        'GOOGL',
        'AMZN',
        'TSLA',
        'META',
        'NVDA',
        'JPM',
        'V',
        'WMT',
      ],
      crypto: [
        'BTC-USD',
        'ETH-USD',
        'USDT-USD',
        'BNB-USD',
        'XRP-USD',
        'ADA-USD',
        'DOGE-USD',
        'SOL-USD',
      ],
      indices: [
        '^GSPC', // S&P 500
        '^DJI',  // Dow Jones
        '^IXIC', // NASDAQ
        '^N225', // Nikkei 225
        '^FTSE', // FTSE 100
      ],
    };
  }

  /**
   * エラーハンドリング
   */
  private handleError(error: unknown, message: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        // サーバーエラー
        logger.error(`${message}: ${axiosError.response.status} ${axiosError.response.statusText}`);
        throw new Error(`Yahoo Finance API error: ${axiosError.response.status}`);
      } else if (axiosError.request) {
        // リクエストエラー (タイムアウト等)
        logger.error(`${message}: No response received`);
        throw new Error('Yahoo Finance API timeout or network error');
      }
    }

    // その他のエラー
    logger.error(`${message}:`, error);
    throw new Error(message);
  }
}

// シングルトンインスタンス
export const yahooFinanceService = new YahooFinanceService();
