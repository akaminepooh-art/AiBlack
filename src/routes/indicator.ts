import { Router, Request, Response } from 'express';
import { pythonExecutor } from '../services/python-executor.service';
import { IndicatorRequest } from '../types/indicator';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/indicator/execute
 * インジケーターを実行
 * 
 * Request Body:
 * {
 *   "name": "sma",
 *   "candleData": [...],
 *   "params": { "period": 20 },
 *   "metadata": { ... }
 * }
 */
router.post('/execute', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: IndicatorRequest = req.body;

    // バリデーション
    if (!request.name) {
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Indicator name is required',
        },
      });
      return;
    }

    if (!Array.isArray(request.candleData) || request.candleData.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'candleData must be a non-empty array',
        },
      });
      return;
    }

    if (!request.params || typeof request.params !== 'object') {
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'params must be an object',
        },
      });
      return;
    }

    logger.info(`Indicator execution request: ${request.name}`, {
      candleCount: request.candleData.length,
      params: request.params,
    });

    // Python実行
    const result = await pythonExecutor.execute(request.name, request);

    // 結果返却
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    logger.error('Indicator execution failed', { error });
    res.status(500).json({
      success: false,
      error: {
        type: 'InternalError',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * GET /api/indicator/list
 * 利用可能なインジケーター一覧を取得
 * 
 * Response:
 * {
 *   "success": true,
 *   "indicators": ["sma", "ema", "rsi", "macd", "bollinger"]
 * }
 */
router.get('/list', async (_req: Request, res: Response): Promise<void> => {
  try {
    const indicators = await pythonExecutor.listIndicators();

    res.json({
      success: true,
      indicators,
      count: indicators.length,
    });
  } catch (error) {
    logger.error('Failed to list indicators', { error });
    res.status(500).json({
      success: false,
      error: {
        type: 'InternalError',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * GET /api/indicator/health
 * Pythonインジケーター環境のヘルスチェック
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const indicators = await pythonExecutor.listIndicators();
    
    res.json({
      success: true,
      status: 'healthy',
      indicators: {
        available: indicators.length,
        list: indicators,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Indicator health check failed', { error });
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: {
        type: 'HealthCheckError',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/indicator/metadata
 * 全インジケーターのメタデータを取得
 */
router.get('/metadata', async (_req: Request, res: Response): Promise<void> => {
  try {
    const metadata = await pythonExecutor.getIndicatorsMetadata();
    
    res.json({
      success: true,
      indicators: metadata,
      count: metadata.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get indicators metadata', { error });
    res.status(500).json({
      success: false,
      error: {
        type: 'InternalError',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * GET /api/indicator/metadata/:name
 * 特定のインジケーターのメタデータを取得
 */
router.get('/metadata/:name', async (req: Request, res: Response): Promise<void> => {
  try {
    const name = req.params.name as string;
    const metadata = await pythonExecutor.getIndicatorMetadata(name);
    
    if (!metadata || !metadata.success) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NotFoundError',
          message: `Indicator '${name}' not found or failed to load metadata`,
        },
      });
      return;
    }
    
    res.json({
      success: true,
      indicator: metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Failed to get metadata for ${req.params.name}`, { error });
    res.status(404).json({
      success: false,
      error: {
        type: 'NotFoundError',
        message: `Indicator '${req.params.name}' not found`,
      },
    });
  }
});

export default router;
