/**
 * 環境変数管理・検証
 */

import dotenv from 'dotenv';
import { logger } from '../utils/logger';

// .envファイル読み込み
dotenv.config();

/**
 * 必須環境変数の検証
 */
export function validateEnvironment(): void {
  const requiredVars: string[] = [
    // 現時点では必須なし (すべてデフォルト値あり)
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  logger.info('Environment variables validated successfully');
}

/**
 * 環境変数取得 (型安全)
 */
export const env = {
  // サーバー設定
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || 'localhost',

  // Yahoo Finance
  YAHOO_FINANCE_TIMEOUT: parseInt(process.env.YAHOO_FINANCE_TIMEOUT || '10000', 10),
  YAHOO_FINANCE_RETRY: parseInt(process.env.YAHOO_FINANCE_RETRY || '3', 10),

  // キャッシュ
  CACHE_ENABLED: process.env.CACHE_ENABLED === 'true',
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '300', 10),

  // レート制限
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // ログ
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE_PATH: process.env.LOG_FILE_PATH || './logs',

  // Python実行
  pythonPath: process.env.PYTHON_PATH || 'python3',
  pythonTimeout: parseInt(process.env.PYTHON_TIMEOUT || '30000', 10),
} as const;

/**
 * 開発環境判定
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * 本番環境判定
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * テスト環境判定
 */
export const isTest = env.NODE_ENV === 'test';
