/**
 * Indicator Routes
 * テクニカル指標のAPIエンドポイント
 */

import { Router, Request, Response } from 'express';
import { IndicatorService } from '../services/indicator.service';
import { logger } from '../utils/logger';

const router = Router();
const indicatorService = new IndicatorService();

/**
 * GET /api/indicator/metadata
 * 全インジケーターのメタデータを取得
 */
router.get('/metadata', async (_req: Request, res: Response): Promise<void> => {
  try {
    const metadata = await indicatorService.getAllMetadata();
    
    res.json({
      success: true,
      data: metadata
    });
  } catch (error) {
    logger.error('Failed to get indicator metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve indicator metadata',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/indicator/metadata/:name
 * 個別インジケーターのメタデータを取得
 */
router.get('/metadata/:name', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    const metadata = await indicatorService.getAllMetadata();
    
    if (!metadata[name]) {
      res.status(404).json({
        success: false,
        error: 'Indicator not found',
        message: `Indicator '${name}' does not exist`
      });
      return;
    }
    
    res.json({
      success: true,
      data: metadata[name]
    });
  } catch (error) {
    logger.error(`Failed to get metadata for indicator ${req.params.name}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve indicator metadata',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/indicator/calculate
 * インジケーターを計算
 */
router.post('/calculate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { indicator, candles, parameters } = req.body;

    if (!indicator || !candles || !Array.isArray(candles)) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Missing required fields: indicator, candles'
      });
      return;
    }

    const result = await indicatorService.calculate(indicator, candles, parameters);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to calculate indicator:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate indicator',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/indicator/list
 * 利用可能なインジケーターの一覧を取得
 */
router.get('/list', async (_req: Request, res: Response): Promise<void> => {
  try {
    const metadata = await indicatorService.getAllMetadata();
    const indicators = Object.keys(metadata).map(key => ({
      name: key,
      fullName: metadata[key].fullName,
      category: metadata[key].category,
      description: metadata[key].description
    }));
    
    res.json({
      success: true,
      data: indicators,
      count: indicators.length
    });
  } catch (error) {
    logger.error('Failed to get indicator list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve indicator list',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
