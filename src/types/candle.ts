/**
 * ローソク足データ型定義
 */

/**
 * 1本のローソク足データ
 */
export interface CandleData {
  /** Unix timestamp (秒) */
  time: number;
  /** 始値 */
  open: number;
  /** 高値 */
  high: number;
  /** 安値 */
  low: number;
  /** 終値 */
  close: number;
  /** 出来高 */
  volume: number;
}

/**
 * ローソク足データ取得リクエスト
 */
export interface CandleRequest {
  /** 銘柄シンボル (例: AAPL, EURUSD=X) */
  symbol: string;
  /** タイムフレーム (1m, 5m, 15m, 1h, 4h, 1d, 1w, 1M) */
  interval: string;
  /** 取得期間 (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max) */
  range?: string;
  /** 開始日 (YYYY-MM-DD) */
  startDate?: string;
  /** 終了日 (YYYY-MM-DD) */
  endDate?: string;
}

/**
 * クォートデータ
 */
export interface QuoteData {
  /** 銘柄シンボル */
  symbol: string;
  /** 現在価格 */
  price: number;
  /** 価格変動 */
  change: number;
  /** 価格変動率 (%) */
  changePercent: number;
  /** 出来高 */
  volume: number;
  /** 市場時間 */
  marketTime?: number;
  /** 高値 (当日) */
  dayHigh?: number;
  /** 安値 (当日) */
  dayLow?: number;
}
