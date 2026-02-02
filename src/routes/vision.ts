/**
 * Vision Routes - GPT-4 Vision API エンドポイント
 * Phase 5: チャート画像分析API + ATR/ADX標準インジケーター対応
 */

import { Router, Request, Response } from 'express';
import visionService from '../services/vision.service';
import logger from '../utils/logger';

const router = Router();

// ===== POST /api/vision/analyze - Quick Analysis =====
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { image, symbol, interval, indicators, technicalData } = req.body;

    // バリデーション
    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'image (base64) is required'
      });
    }

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'symbol is required'
      });
    }

    if (!interval) {
      return res.status(400).json({
        success: false,
        error: 'interval is required'
      });
    }

    if (!technicalData) {
      return res.status(400).json({
        success: false,
        error: 'technicalData is required'
      });
    }

    logger.info(`Vision Analysis request: ${symbol} ${interval} (Current: ${technicalData.currentPrice})`);
    logger.info(`Technical Data: ${JSON.stringify(technicalData, null, 2)}`);

    // Vision Serviceを呼び出し
    const result = await visionService.quickAnalysis(
      image,
      symbol,
      interval,
      indicators || [],
      technicalData
    );

    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Vision Analysis error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// ===== POST /api/vision/ask - Ask AI (対話型分析) =====
router.post('/ask', async (req: Request, res: Response) => {
  try {
    const { image, question, context, conversationHistory } = req.body;

    // バリデーション
    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'image (base64) is required'
      });
    }

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'question is required'
      });
    }

    if (!context || !context.symbol || !context.interval) {
      return res.status(400).json({
        success: false,
        error: 'context (symbol, interval) is required'
      });
    }

    logger.info(`Ask AI request: "${question}" for ${context.symbol}`);

    // Vision Serviceを呼び出し
    const answer = await visionService.askAI(
      image,
      question,
      context,
      conversationHistory || []
    );

    return res.json({
      success: true,
      data: {
        answer: answer,
        question: question
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Ask AI error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// ===== GET /api/vision/health - ヘルスチェック =====
router.get('/health', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    service: 'Vision API with ATR/ADX',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
