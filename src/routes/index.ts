/**
 * ルート集約
 */

import { Router } from 'express';
import healthRouter from './health';
import marketDataRouter from './market-data';
import indicatorRouter from './indicator';
import visionRouter from './vision';

const router = Router();

// ヘルスチェック
router.use('/health', healthRouter);

// 市場データ
router.use('/market-data', marketDataRouter);

// インジケーター
router.use('/indicator', indicatorRouter);

// Vision AI (Phase 5)
router.use('/vision', visionRouter);

export default router;
