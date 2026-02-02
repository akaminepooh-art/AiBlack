/**
 * グローバルエラーハンドリングミドルウェア
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { isDevelopment } from '../config/environment';
import { ErrorResponse } from '../types/api';

/**
 * カスタムエラークラス
 */
export class AppError extends Error {
  public statusCode: number;
  public type: string;
  public details?: string;

  constructor(message: string, statusCode: number = 500, type: string = 'InternalError', details?: string) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * エラーハンドリングミドルウェア
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // エラーログ
  logger.error(`Error: ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  // AppError判定
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const errorType = isAppError ? err.type : 'InternalError';

  // エラーレスポンス作成
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      type: errorType,
      message: err.message || 'Internal server error',
      statusCode,
    },
  };

  // 開発環境ではスタックトレースを含める
  if (isDevelopment && err.stack) {
    errorResponse.error.details = err.stack;
  }

  // AppErrorの場合、detailsを追加
  if (isAppError && err.details) {
    errorResponse.error.details = err.details;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 404エラーハンドラー
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      type: 'NotFoundError',
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      statusCode: 404,
    },
  };

  res.status(404).json(errorResponse);
};
