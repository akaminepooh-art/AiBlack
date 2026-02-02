/**
 * 統一インジケーターインターフェイス型定義
 * (Phase 2で使用予定)
 */

import { CandleData } from './candle';

/**
 * インジケーターリクエスト
 */
export interface IndicatorRequest {
  /** インジケーター名 */
  name: string;
  /** ローソク足データ配列 */
  candleData: CandleData[];
  /** パラメータ */
  params: Record<string, any>;
  /** メタデータ */
  metadata?: {
    symbol?: string;
    interval?: string;
    timezone?: string;
  };
}

/**
 * インジケーターレスポンス (基本)
 */
export interface IndicatorResponse {
  success: boolean;
  displayType?: string;
  metadata?: Record<string, any>;
}

/**
 * 単一ラインインジケーターレスポンス
 */
export interface SingleLineIndicatorResponse extends IndicatorResponse {
  success: true;
  displayType?: 'single-line';
  values: Array<{
    time: number;
    value: number;
    metadata?: any;
  }>;
  lineConfig?: {
    color?: string;
    lineWidth?: number;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
    title?: string;
  };
}

/**
 * 複数ラインインジケーターレスポンス
 */
export interface MultiLineIndicatorResponse extends IndicatorResponse {
  success: true;
  renderType: 'multi-line';
  values: Array<{
    time: number;
    lines: Record<string, number>;
  }>;
  lineDefinitions: Record<string, {
    label: string;
    color: string;
    lineWidth?: number;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
  }>;
}

/**
 * インジケーターエラーレスポンス
 */
export interface IndicatorErrorResponse extends IndicatorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    details?: string;
  };
}

/**
 * インジケーター結果 (成功 or エラー)
 */
export type IndicatorResult =
  | SingleLineIndicatorResponse
  | MultiLineIndicatorResponse
  | IndicatorErrorResponse;
