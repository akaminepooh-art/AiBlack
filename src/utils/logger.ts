/**
 * Winston ロガー設定
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// ログディレクトリ作成
const logDir = process.env.LOG_FILE_PATH || './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ログレベル
const logLevel = process.env.LOG_LEVEL || 'info';

// カスタムフォーマット
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`;
    }
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

// カラーフォーマット (コンソール用)
const coloredFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level}: ${message}`;
  })
);

// ロガーインスタンス作成
export const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  transports: [
    // コンソール出力
    new winston.transports.Console({
      format: coloredFormat,
    }),
    // ファイル出力 (すべてのログ)
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // ファイル出力 (エラーのみ)
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
    }),
  ],
});

// 開発環境では詳細ログ
if (process.env.NODE_ENV === 'development') {
  logger.debug('Logger initialized in development mode');
}

export default logger;
