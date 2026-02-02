#!/usr/bin/env python3
"""
RSI (相対力指数) インジケーター
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import numpy as np
from typing import Dict, Any, List
from indicator_interface import IndicatorBase, CandleData, main_runner
from talib_wrapper import TALibWrapper


class RSIIndicator(IndicatorBase):
    """RSIインジケーター"""

    def __init__(self):
        super().__init__()
        self.name = "rsi"
        self.version = "1.0.0"
        self.display_type = "single-line"
        self.chart_type = "sub"

    def get_metadata(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'displayName': 'Relative Strength Index (RSI)',
            'version': self.version,
            'displayType': self.display_type,
            'chartType': self.chart_type,
            'parameters': self.get_parameter_definitions(),
            'description': 'Momentum oscillator measuring speed and magnitude of price changes'
        }

    def get_parameter_definitions(self) -> List[Dict[str, Any]]:
        return [
            {
                'name': 'period',
                'displayName': 'Period',
                'type': 'number',
                'default': 14,
                'min': 2,
                'max': 50,
                'step': 1,
                'description': 'Number of periods for RSI calculation'
            },
            {
                'name': 'color',
                'displayName': 'Line Color',
                'type': 'color',
                'default': '#9C27B0',
                'description': 'RSI line color'
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
            },
            {
                'name': 'overbought',
                'displayName': 'Overbought Level',
                'type': 'number',
                'default': 70,
                'min': 50,
                'max': 90,
                'step': 5,
                'description': 'Overbought threshold line'
            },
            {
                'name': 'oversold',
                'displayName': 'Oversold Level',
                'type': 'number',
                'default': 30,
                'min': 10,
                'max': 50,
                'step': 5,
                'description': 'Oversold threshold line'
            }
        ]

    def validate_params(self, params: Dict[str, Any]) -> bool:
        """パラメータバリデーション"""
        period = params.get('period', 14)
        if not isinstance(period, int) or period < 1:
            return False
        return True

    def calculate(self, candle_data: List[CandleData], params: Dict[str, Any]) -> Dict[str, Any]:
        """RSI計算"""
        period = params.get('period', 14)
        color = params.get('color', '#9C27B0')
        line_width = params.get('lineWidth', 2)
        overbought = params.get('overbought', 70)
        oversold = params.get('oversold', 30)

        df = pd.DataFrame(candle_data)
        close_array = df['close'].values
        rsi_values = TALibWrapper.RSI(close_array, timeperiod=period)

        values = []
        for i, value in enumerate(rsi_values):
            if not np.isnan(value):
                values.append({
                    'time': int(candle_data[i]['time']),
                    'value': float(value)
                })

        current_rsi = float(rsi_values[-1]) if not np.isnan(rsi_values[-1]) else None

        return {
            'success': True,
            'displayType': 'single-line',
            'values': values,
            'lineConfig': {
                'color': color,
                'lineWidth': line_width,
                'lineStyle': 'solid',
                'title': f'RSI({period})'
            },
            'levels': [
                {'value': overbought, 'color': '#ef5350', 'style': 'dashed'},
                {'value': 50, 'color': '#666', 'style': 'solid'},
                {'value': oversold, 'color': '#66BB6A', 'style': 'dashed'}
            ],
            'metadata': {
                'period': period,
                'overbought': overbought,
                'oversold': oversold,
                'currentValue': current_rsi,
                'calculatedPoints': len(values),
                'interpretation': self._interpret_rsi(current_rsi) if current_rsi else None
            }
        }

    def _interpret_rsi(self, rsi: float) -> str:
        """RSI値の解釈"""
        if rsi > 70:
            return 'Overbought (買われすぎ)'
        elif rsi < 30:
            return 'Oversold (売られすぎ)'
        else:
            return 'Neutral (中立)'


if __name__ == '__main__':
    main_runner(RSIIndicator)
