#!/usr/bin/env python3
"""
単純移動平均 (SMA) インジケーター
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import numpy as np
from typing import Dict, Any, List
from indicator_interface import IndicatorBase, CandleData, main_runner
from talib_wrapper import TALibWrapper


class SMAIndicator(IndicatorBase):
    """単純移動平均インジケーター"""

    def __init__(self):
        super().__init__()
        self.name = "sma"
        self.version = "1.0.0"
        self.display_type = "single-line"
        self.chart_type = "main"

    def get_metadata(self) -> Dict[str, Any]:
        """メタデータを返す"""
        return {
            'name': self.name,
            'displayName': 'Simple Moving Average (SMA)',
            'version': self.version,
            'displayType': self.display_type,
            'chartType': self.chart_type,
            'parameters': self.get_parameter_definitions(),
            'description': 'Calculate simple moving average of closing prices'
        }

    def get_parameter_definitions(self) -> List[Dict[str, Any]]:
        """パラメータ定義"""
        return [
            {
                'name': 'period',
                'displayName': 'Period',
                'type': 'number',
                'default': 20,
                'min': 1,
                'max': 200,
                'step': 1,
                'description': 'Number of periods for moving average'
            },
            {
                'name': 'color',
                'displayName': 'Line Color',
                'type': 'color',
                'default': '#2196F3',
                'description': 'Line color on chart'
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
        period = params.get('period', 20)
        if not isinstance(period, int) or period < 1:
            return False
        return True

    def calculate(self, candle_data: List[CandleData], params: Dict[str, Any]) -> Dict[str, Any]:
        """SMA計算"""
        # パラメータ取得
        period = params.get('period', 20)
        color = params.get('color', '#2196F3')
        line_width = params.get('lineWidth', 2)

        # DataFrameに変換
        df = pd.DataFrame(candle_data)
        close_array = df['close'].values

        # TA-LibでSMA計算
        sma_values = TALibWrapper.SMA(close_array, timeperiod=period)

        # 結果を整形
        values = []
        for i, value in enumerate(sma_values):
            if not np.isnan(value):
                values.append({
                    'time': int(candle_data[i]['time']),
                    'value': float(value)
                })

        return {
            'success': True,
            'displayType': 'single-line',
            'values': values,
            'lineConfig': {
                'color': color,
                'lineWidth': line_width,
                'lineStyle': 'solid',
                'title': f'SMA({period})'
            },
            'metadata': {
                'period': period,
                'calculatedPoints': len(values)
            }
        }


if __name__ == '__main__':
    main_runner(SMAIndicator)
