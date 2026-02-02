#!/usr/bin/env python3
"""
MACD インジケーター
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import numpy as np
from typing import Dict, Any, List
from indicator_interface import IndicatorBase, CandleData, main_runner
from talib_wrapper import TALibWrapper


class MACDIndicator(IndicatorBase):
    """MACDインジケーター"""

    def __init__(self):
        super().__init__()
        self.name = "macd"
        self.version = "1.0.0"
        self.display_type = "multi-line"
        self.chart_type = "sub"

    def get_metadata(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'displayName': 'MACD',
            'version': self.version,
            'displayType': self.display_type,
            'chartType': self.chart_type,
            'parameters': self.get_parameter_definitions(),
            'description': 'Moving Average Convergence Divergence - trend-following momentum indicator'
        }

    def get_parameter_definitions(self) -> List[Dict[str, Any]]:
        return [
            {
                'name': 'fastPeriod',
                'displayName': 'Fast Period',
                'type': 'number',
                'default': 12,
                'min': 5,
                'max': 50,
                'step': 1,
                'description': 'Fast EMA period'
            },
            {
                'name': 'slowPeriod',
                'displayName': 'Slow Period',
                'type': 'number',
                'default': 26,
                'min': 10,
                'max': 100,
                'step': 1,
                'description': 'Slow EMA period'
            },
            {
                'name': 'signalPeriod',
                'displayName': 'Signal Period',
                'type': 'number',
                'default': 9,
                'min': 2,
                'max': 50,
                'step': 1,
                'description': 'Signal line period'
            },
            {
                'name': 'macdColor',
                'displayName': 'MACD Line Color',
                'type': 'color',
                'default': '#2196F3',
                'description': 'MACD line color'
            },
            {
                'name': 'signalColor',
                'displayName': 'Signal Line Color',
                'type': 'color',
                'default': '#FF6B35',
                'description': 'Signal line color'
            },
            {
                'name': 'histogramColor',
                'displayName': 'Histogram Color',
                'type': 'color',
                'default': '#9C27B0',
                'description': 'Histogram color'
            },
            {
                'name': 'lineWidth',
                'displayName': 'Line Width',
                'type': 'number',
                'default': 2,
                'min': 1,
                'max': 5,
                'step': 1,
                'description': 'Line thickness'
            }
        ]

    def validate_params(self, params: Dict[str, Any]) -> bool:
        """パラメータバリデーション"""
        fast = params.get('fastPeriod', 12)
        slow = params.get('slowPeriod', 26)
        signal = params.get('signalPeriod', 9)
        
        if not all(isinstance(p, int) and p > 0 for p in [fast, slow, signal]):
            return False
        if fast >= slow:
            return False
        return True

    def calculate(self, candle_data: List[CandleData], params: Dict[str, Any]) -> Dict[str, Any]:
        """MACD計算"""
        fast_period = params.get('fastPeriod', 12)
        slow_period = params.get('slowPeriod', 26)
        signal_period = params.get('signalPeriod', 9)
        macd_color = params.get('macdColor', '#2196F3')
        signal_color = params.get('signalColor', '#FF6B35')
        histogram_color = params.get('histogramColor', '#9C27B0')
        line_width = params.get('lineWidth', 2)

        df = pd.DataFrame(candle_data)
        close_array = df['close'].values

        macd, signal, histogram = TALibWrapper.MACD(
            close_array,
            fastperiod=fast_period,
            slowperiod=slow_period,
            signalperiod=signal_period
        )

        macd_values = []
        signal_values = []
        histogram_values = []
        
        for i in range(len(candle_data)):
            if not np.isnan(macd[i]):
                macd_values.append({
                    'time': int(candle_data[i]['time']),
                    'value': float(macd[i])
                })
            if not np.isnan(signal[i]):
                signal_values.append({
                    'time': int(candle_data[i]['time']),
                    'value': float(signal[i])
                })
            if not np.isnan(histogram[i]):
                histogram_values.append({
                    'time': int(candle_data[i]['time']),
                    'value': float(histogram[i])
                })

        return {
            'success': True,
            'displayType': 'multi-line',
            'lines': [
                {
                    'name': 'MACD',
                    'values': macd_values,
                    'config': {
                        'color': macd_color,
                        'lineWidth': line_width,
                        'title': 'MACD'
                    }
                },
                {
                    'name': 'Signal',
                    'values': signal_values,
                    'config': {
                        'color': signal_color,
                        'lineWidth': line_width,
                        'title': 'Signal'
                    }
                },
                {
                    'name': 'Histogram',
                    'values': histogram_values,
                    'config': {
                        'color': histogram_color,
                        'lineWidth': 1,
                        'title': 'Histogram',
                        'style': 'histogram'
                    }
                }
            ],
            'metadata': {
                'fastPeriod': fast_period,
                'slowPeriod': slow_period,
                'signalPeriod': signal_period,
                'calculatedPoints': len(macd_values)
            }
        }


if __name__ == '__main__':
    main_runner(MACDIndicator)
