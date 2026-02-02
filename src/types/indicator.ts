/**
 * Indicator Interface Types
 * Python インジケーターとの通信に使用する型定義
 */

// ===== 基本データ型 =====

/**
 * ローソク足データ
 */
export interface CandleData {
  time: number;       // UNIX timestamp (秒)
  open: number;       // 始値
  high: number;       // 高値
  low: number;        // 安値
  close: number;      // 終値
  volume: number;     // 出来高
}

/**
 * メタデータ
 */
export interface Metadata {
  symbol: string;     // シンボル (例: 'AAPL', 'EURUSD=X')
  interval: string;   // 時間足 (例: '1d', '1h', '5m')
  range: string;      // データ範囲 (例: '1mo', '1d')
  timestamp: string;  // リクエスト時刻 (ISO 8601)
}

// ===== リクエスト型 =====

/**
 * インジケーターリクエスト
 */
export interface IndicatorRequest {
  name: string;                      // インジケーター名 (例: 'sma', 'ema')
  candleData: CandleData[];          // ローソク足データ配列
  params: Record<string, any>;       // パラメータ (例: { period: 20 })
  metadata?: Metadata;               // メタデータ (オプション)
}

// ===== レスポンス型 =====

/**
 * インジケーター結果の基本型
 */
export interface IndicatorResult {
  time: number;                      // UNIX timestamp
  value: number | number[];          // 計算値 (単一またはMultiLine)
}

/**
 * インジケーターレスポンス (成功)
 */
export interface IndicatorResponse {
  success: true;
  data: IndicatorResult[];           // 計算結果配列
  metadata: {
    name: string;                    // インジケーター名
    params: Record<string, any>;     // 使用したパラメータ
    version: string;                 // インジケーターバージョン
    calculatedAt?: string;           // 計算時刻 (ISO 8601)
  };
}

/**
 * インジケーターレスポンス (エラー)
 */
export interface IndicatorErrorResponse {
  success: false;
  error: {
    type: string;                    // エラー種別
    message: string;                 // エラーメッセージ
    details?: string;                // 詳細情報 (スタックトレース等)
  };
}

// ===== Union型 =====

/**
 * インジケーター実行結果 (成功 or エラー)
 */
export type IndicatorExecutionResult = IndicatorResponse | IndicatorErrorResponse;
