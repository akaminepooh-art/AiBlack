/**
 * API レスポンス型定義
 */

/**
 * 成功レスポンス
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  metadata?: Record<string, any>;
}

/**
 * エラーレスポンス
 */
export interface ErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    details?: string;
    code?: string;
    statusCode?: number;
  };
}

/**
 * APIレスポンス (成功 or エラー)
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

/**
 * ヘルスチェックレスポンス
 */
export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  environment?: string;
}

/**
 * ページネーション情報
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * ページネーション付きレスポンス
 */
export interface PaginatedResponse<T> extends SuccessResponse<T> {
  pagination: PaginationMeta;
}
