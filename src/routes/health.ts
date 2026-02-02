/**
 * ヘルスチェック API
 */

import { Router, Request, Response } from 'express';
import { HealthResponse } from '../types/api';

const router = Router();

/**
 * GET /api/health
 * サーバーヘルスチェック
 */
router.get('/', (_req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  };

  res.json(response);
});

export default router;
