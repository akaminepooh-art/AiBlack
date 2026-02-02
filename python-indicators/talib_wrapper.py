"""
TA-Libラッパー
TA-Lib関数の統一インターフェイスを提供
"""

import sys
import numpy as np
from typing import Tuple, Optional

try:
    import talib
    TALIB_AVAILABLE = True
except ImportError:
    TALIB_AVAILABLE = False
    # 警告はstderrではなくログに記録（Node.jsでエラー扱いされないように）


class TALibWrapper:
    """TA-Lib関数のラッパークラス"""

    @staticmethod
    def check_availability() -> bool:
        """TA-Libが利用可能かチェック"""
        return TALIB_AVAILABLE

    # ========================
    # オーバーラップ研究
    # ========================

    @staticmethod
    def SMA(close: np.ndarray, timeperiod: int = 30) -> np.ndarray:
        """単純移動平均 (Simple Moving Average)"""
        if TALIB_AVAILABLE:
            return talib.SMA(close, timeperiod=timeperiod)
        else:
            # フォールバック実装
            return TALibWrapper._sma_fallback(close, timeperiod)

    @staticmethod
    def EMA(close: np.ndarray, timeperiod: int = 30) -> np.ndarray:
        """指数移動平均 (Exponential Moving Average)"""
        if TALIB_AVAILABLE:
            return talib.EMA(close, timeperiod=timeperiod)
        else:
            return TALibWrapper._ema_fallback(close, timeperiod)

    @staticmethod
    def BBANDS(
        close: np.ndarray,
        timeperiod: int = 5,
        nbdevup: float = 2,
        nbdevdn: float = 2,
        matype: int = 0
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """ボリンジャーバンド (upper, middle, lower)"""
        if TALIB_AVAILABLE:
            return talib.BBANDS(close, timeperiod, nbdevup, nbdevdn, matype)
        else:
            return TALibWrapper._bbands_fallback(close, timeperiod, nbdevup, nbdevdn)

    # ========================
    # モメンタム指標
    # ========================

    @staticmethod
    def RSI(close: np.ndarray, timeperiod: int = 14) -> np.ndarray:
        """相対力指数 (Relative Strength Index)"""
        if TALIB_AVAILABLE:
            return talib.RSI(close, timeperiod=timeperiod)
        else:
            return TALibWrapper._rsi_fallback(close, timeperiod)

    @staticmethod
    def MACD(
        close: np.ndarray,
        fastperiod: int = 12,
        slowperiod: int = 26,
        signalperiod: int = 9
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """MACD (macd, signal, histogram)"""
        if TALIB_AVAILABLE:
            return talib.MACD(close, fastperiod, slowperiod, signalperiod)
        else:
            return TALibWrapper._macd_fallback(close, fastperiod, slowperiod, signalperiod)

    @staticmethod
    def STOCH(
        high: np.ndarray,
        low: np.ndarray,
        close: np.ndarray,
        fastk_period: int = 5,
        slowk_period: int = 3,
        slowk_matype: int = 0,
        slowd_period: int = 3,
        slowd_matype: int = 0
    ) -> Tuple[np.ndarray, np.ndarray]:
        """ストキャスティクス (slowk, slowd)"""
        if TALIB_AVAILABLE:
            return talib.STOCH(
                high, low, close,
                fastk_period, slowk_period, slowk_matype,
                slowd_period, slowd_matype
            )
        else:
            return TALibWrapper._stoch_fallback(high, low, close, fastk_period)

    # ========================
    # ボラティリティ指標
    # ========================

    @staticmethod
    def ATR(
        high: np.ndarray,
        low: np.ndarray,
        close: np.ndarray,
        timeperiod: int = 14
    ) -> np.ndarray:
        """平均真の範囲 (Average True Range)"""
        if TALIB_AVAILABLE:
            return talib.ATR(high, low, close, timeperiod)
        else:
            return TALibWrapper._atr_fallback(high, low, close, timeperiod)

    # ========================
    # フォールバック実装
    # ========================

    @staticmethod
    def _sma_fallback(close: np.ndarray, period: int) -> np.ndarray:
        """SMAフォールバック実装"""
        result = np.full_like(close, np.nan, dtype=float)
        for i in range(period - 1, len(close)):
            result[i] = np.mean(close[i - period + 1:i + 1])
        return result

    @staticmethod
    def _ema_fallback(close: np.ndarray, period: int) -> np.ndarray:
        """EMAフォールバック実装"""
        result = np.full_like(close, np.nan, dtype=float)
        multiplier = 2 / (period + 1)
        
        # 初期値はSMA
        result[period - 1] = np.mean(close[:period])
        
        for i in range(period, len(close)):
            result[i] = (close[i] - result[i - 1]) * multiplier + result[i - 1]
        
        return result

    @staticmethod
    def _rsi_fallback(close: np.ndarray, period: int) -> np.ndarray:
        """RSIフォールバック実装"""
        delta = np.diff(close)
        gain = np.where(delta > 0, delta, 0)
        loss = np.where(delta < 0, -delta, 0)
        
        avg_gain = np.full(len(close), np.nan)
        avg_loss = np.full(len(close), np.nan)
        
        avg_gain[period] = np.mean(gain[:period])
        avg_loss[period] = np.mean(loss[:period])
        
        for i in range(period + 1, len(close)):
            avg_gain[i] = (avg_gain[i - 1] * (period - 1) + gain[i - 1]) / period
            avg_loss[i] = (avg_loss[i - 1] * (period - 1) + loss[i - 1]) / period
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi

    @staticmethod
    def _macd_fallback(
        close: np.ndarray,
        fast: int,
        slow: int,
        signal: int
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """MACDフォールバック実装"""
        ema_fast = TALibWrapper._ema_fallback(close, fast)
        ema_slow = TALibWrapper._ema_fallback(close, slow)
        
        macd_line = ema_fast - ema_slow
        
        # NaNでないMACD値を取得
        valid_macd = macd_line[~np.isnan(macd_line)]
        
        # シグナルラインが計算可能かチェック
        if len(valid_macd) < signal:
            # データが不足している場合、すべてNaNを返す
            return (
                macd_line,
                np.full_like(macd_line, np.nan),
                np.full_like(macd_line, np.nan)
            )
        
        signal_line_values = TALibWrapper._ema_fallback(valid_macd, signal)
        
        # signal_lineの長さを調整
        full_signal = np.full_like(macd_line, np.nan)
        valid_count = len(signal_line_values[~np.isnan(signal_line_values)])
        if valid_count > 0:
            full_signal[-valid_count:] = signal_line_values[~np.isnan(signal_line_values)]
        
        histogram = macd_line - full_signal
        
        return macd_line, full_signal, histogram

    @staticmethod
    def _bbands_fallback(
        close: np.ndarray,
        period: int,
        nbdevup: float,
        nbdevdn: float
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """ボリンジャーバンドフォールバック実装"""
        middle = TALibWrapper._sma_fallback(close, period)
        
        std = np.full_like(close, np.nan, dtype=float)
        for i in range(period - 1, len(close)):
            std[i] = np.std(close[i - period + 1:i + 1])
        
        upper = middle + (std * nbdevup)
        lower = middle - (std * nbdevdn)
        
        return upper, middle, lower

    @staticmethod
    def _atr_fallback(
        high: np.ndarray,
        low: np.ndarray,
        close: np.ndarray,
        period: int
    ) -> np.ndarray:
        """ATRフォールバック実装"""
        tr = np.maximum(
            high - low,
            np.maximum(
                np.abs(high - np.roll(close, 1)),
                np.abs(low - np.roll(close, 1))
            )
        )
        tr[0] = high[0] - low[0]
        
        return TALibWrapper._sma_fallback(tr, period)

    @staticmethod
    def _stoch_fallback(
        high: np.ndarray,
        low: np.ndarray,
        close: np.ndarray,
        period: int
    ) -> Tuple[np.ndarray, np.ndarray]:
        """ストキャスティクスフォールバック実装（簡易版）"""
        k = np.full_like(close, np.nan, dtype=float)
        
        for i in range(period - 1, len(close)):
            highest = np.max(high[i - period + 1:i + 1])
            lowest = np.min(low[i - period + 1:i + 1])
            
            if highest != lowest:
                k[i] = 100 * (close[i] - lowest) / (highest - lowest)
            else:
                k[i] = 50
        
        d = TALibWrapper._sma_fallback(k, 3)
        
        return k, d
