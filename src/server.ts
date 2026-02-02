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
const PORT = parseInt(process.env.PORT || '10000', 10);
const HOST = '0.0.0.0';

console.log('========================================');
console.log('Starting server with configuration:');
console.log(`PORT: ${PORT} (from process.env.PORT: ${process.env.PORT})`);
console.log(`HOST: ${HOST}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log('========================================');

const server = app.listen(PORT, HOST, () => {
  console.log('========================================');
  console.log('SERVER SUCCESSFULLY STARTED!');
  console.log('========================================');
  logger.info('='.repeat(50));
  logger.info('Trading Platform Server Started');
  logger.info('='.repeat(50));
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`Server: http://${HOST}:${PORT}`);
  logger.info(`API Base: http://${HOST}:${PORT}/api`);
  logger.info(`Cache: ${env.CACHE_ENABLED ? 'Enabled' : 'Disabled'}`);
  logger.info('='.repeat(50));
});

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error('========================================');
  console.error('SERVER ERROR:');
  console.error(error);
  console.error('========================================');
  logger.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
  } else if (error.code === 'EACCES') {
    logger.error(`Permission denied to use port ${PORT}`);
  }
  process.exit(1);
});

// グレースフルシャットダウン
const shutdown = (signal: string): void => {
  logger.info(`${signal} signal received: closing HTTP server`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// 未処理エラーのキャッチ
process.on('uncaughtException', (error: Error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('UNHANDLED REJECTION:', reason);
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

export default app;
