#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import json
import numpy as np
import pandas as pd
import talib

def calculate_indicator(indicator, candles, parameters):
    """
    インジケーターを計算
    """
    try:
        # DataFrameに変換
        df = pd.DataFrame(candles)
        
        # 必要なカラムを取得
        close = df['close'].values
        high = df['high'].values
        low = df['low'].values
        open_prices = df['open'].values
        volume = df['volume'].values
        
        # インジケーターを計算
        if indicator == 'sma':
            period = parameters.get('period', 20)
            values = talib.SMA(close, timeperiod=period)
            
            return {
                'success': True,
                'displayType': 'single-line',
                'values': [None if np.isnan(v) else float(v) for v in values],
                'lineConfig': {
                    'color': '#2196F3',
                    'lineWidth': 2
                },
                'metadata': {
                    'period': period,
                    'calculatedPoints': len([v for v in values if not np.isnan(v)]),
                    'indicator': 'sma',
                    'version': '1.0.0',
                    'dataPoints': len(candles)
                }
            }
        
        elif indicator == 'ema':
            period = parameters.get('period', 20)
            values = talib.EMA(close, timeperiod=period)
            
            return {
                'success': True,
                'displayType': 'single-line',
                'values': [None if np.isnan(v) else float(v) for v in values],
                'lineConfig': {
                    'color': '#FF6B35',
                    'lineWidth': 2
                },
                'metadata': {
                    'period': period,
                    'calculatedPoints': len([v for v in values if not np.isnan(v)]),
                    'indicator': 'ema',
                    'version': '1.0.0',
                    'dataPoints': len(candles)
                }
            }
        
        elif indicator == 'rsi':
            period = parameters.get('period', 14)
            values = talib.RSI(close, timeperiod=period)
            
            return {
                'success': True,
                'displayType': 'single-line',
                'values': [None if np.isnan(v) else float(v) for v in values],
                'lineConfig': {
                    'color': '#9C27B0',
                    'lineWidth': 2
                },
                'metadata': {
                    'period': period,
                    'calculatedPoints': len([v for v in values if not np.isnan(v)]),
                    'indicator': 'rsi',
                    'version': '1.0.0',
                    'dataPoints': len(candles)
                }
            }
        
        elif indicator == 'macd':
            fast = parameters.get('fastPeriod', 12)
            slow = parameters.get('slowPeriod', 26)
            signal = parameters.get('signalPeriod', 9)
            
            macd, signal_line, histogram = talib.MACD(close, fastperiod=fast, slowperiod=slow, signalperiod=signal)
            
            return {
                'success': True,
                'displayType': 'multi-line',
                'values': {
                    'macd': [None if np.isnan(v) else float(v) for v in macd],
                    'signal': [None if np.isnan(v) else float(v) for v in signal_line],
                    'histogram': [None if np.isnan(v) else float(v) for v in histogram]
                },
                'lineConfig': {
                    'macd': {'color': '#2196F3', 'lineWidth': 2},
                    'signal': {'color': '#FF6B35', 'lineWidth': 2},
                    'histogram': {'color': '#4CAF50', 'lineWidth': 1}
                },
                'metadata': {
                    'fastPeriod': fast,
                    'slowPeriod': slow,
                    'signalPeriod': signal,
                    'indicator': 'macd',
                    'version': '1.0.0',
                    'dataPoints': len(candles)
                }
            }
        
        elif indicator == 'bollinger':
            period = parameters.get('period', 20)
            std_dev = parameters.get('stdDev', 2)
            
            upper, middle, lower = talib.BBANDS(close, timeperiod=period, nbdevup=std_dev, nbdevdn=std_dev)
            
            return {
                'success': True,
                'displayType': 'band',
                'values': {
                    'upper': [None if np.isnan(v) else float(v) for v in upper],
                    'middle': [None if np.isnan(v) else float(v) for v in middle],
                    'lower': [None if np.isnan(v) else float(v) for v in lower]
                },
                'lineConfig': {
                    'upper': {'color': '#2196F3', 'lineWidth': 1},
                    'middle': {'color': '#FFC107', 'lineWidth': 2},
                    'lower': {'color': '#2196F3', 'lineWidth': 1}
                },
                'metadata': {
                    'period': period,
                    'stdDev': std_dev,
                    'indicator': 'bollinger',
                    'version': '1.0.0',
                    'dataPoints': len(candles)
                }
            }
        
        else:
            return {
                'success': False,
                'error': f'Unknown indicator: {indicator}'
            }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == '__main__':
    try:
        # 標準入力からJSONデータを読み取る
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        
        indicator = data['indicator']
        candles = data['candles']
        parameters = data.get('parameters', {})
        
        # インジケーターを計算
        result = calculate_indicator(indicator, candles, parameters)
        
        # 結果を出力
        print(json.dumps(result))
        sys.exit(0)
    
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)
