/**
 * Expressサーバー エントリーポイント
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

// ミドルウェア
import corsMiddleware from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/logger';

// ルート
import routes from './routes';

// 設定・ユーティリティ
import { validateEnvironment, env } from './config/environment';
import { logger } from './utils/logger';

// 環境変数検証
validateEnvironment();

// Expressアプリケーション作成
const app: Application = express();

// セキュリティヘッダー設定
app.use(helmet({
  contentSecurityPolicy: false, // 開発環境では無効化
}));

// CORS設定
app.use(corsMiddleware);

// ボディパーサー
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// リクエストログ
app.use(requestLogger);

// レート制限
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: {
      type: 'RateLimitError',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// 静的ファイル配信 (フロントエンド用)
app.use(express.static(path.join(__dirname, '../public')));

// APIルート
app.use('/api', routes);

// フロントエンドルーティング (SPA対応)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404エラーハンドラー
app.use(notFoundHandler);

// グローバルエラーハンドラー
app.use(errorHandler);

// サーバー起動
const PORT = env.PORT;
const HOST = env.HOST;

app.listen(PORT, () => {
  logger.info('='.repeat(50));
  logger.info('Trading Platform Server Started');
  logger.info('='.repeat(50));
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`Server: http://${HOST}:${PORT}`);
  logger.info(`API Base: http://${HOST}:${PORT}/api`);
  logger.info(`Cache: ${env.CACHE_ENABLED ? 'Enabled' : 'Disabled'}`);
  logger.info('='.repeat(50));
});

// グレースフルシャットダウン
const shutdown = (signal: string): void => {
  logger.info(`${signal} signal received: closing HTTP server`);
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// 未処理エラーのキャッチ
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

export default app;
