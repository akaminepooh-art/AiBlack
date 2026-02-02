#!/usr/bin/env python3
"""
ボリンジャーバンド インジケーター
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import numpy as np
from typing import Dict, Any, List
from indicator_interface import IndicatorBase, CandleData, main_runner
from talib_wrapper import TALibWrapper


class BollingerBandsIndicator(IndicatorBase):
    """ボリンジャーバンドインジケーター"""

    def __init__(self):
        super().__init__()
        self.name = "bollinger"
        self.version = "1.0.0"
        self.display_type = "multi-line"
        self.chart_type = "main"

    def get_metadata(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'displayName': 'Bollinger Bands',
            'version': self.version,
            'displayType': self.display_type,
            'chartType': self.chart_type,
            'parameters': self.get_parameter_definitions(),
            'description': 'Volatility bands placed above and below a moving average'
        }

    def get_parameter_definitions(self) -> List[Dict[str, Any]]:
        return [
            {
                'name': 'period',
                'displayName': 'Period',
                'type': 'number',
                'default': 20,
                'min': 5,
                'max': 50,
                'step': 1,
                'description': 'Number of periods for moving average'
            },
            {
                'name': 'stdDev',
                'displayName': 'Standard Deviation',
                'type': 'number',
                'default': 2,
                'min': 1,
                'max': 3,
                'step': 0.1,
                'description': 'Number of standard deviations'
            },
            {
                'name': 'upperColor',
                'displayName': 'Upper Band Color',
                'type': 'color',
                'default': '#FF5252',
                'description': 'Upper band color'
            },
            {
                'name': 'middleColor',
                'displayName': 'Middle Band Color',
                'type': 'color',
                'default': '#2196F3',
                'description': 'Middle band (MA) color'
            },
            {
                'name': 'lowerColor',
                'displayName': 'Lower Band Color',
                'type': 'color',
                'default': '#66BB6A',
                'description': 'Lower band color'
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
        std_dev = params.get('stdDev', 2)
        
        if not isinstance(period, int) or period < 1:
            return False
        if not isinstance(std_dev, (int, float)) or std_dev <= 0:
            return False
        return True

    def calculate(self, candle_data: List[CandleData], params: Dict[str, Any]) -> Dict[str, Any]:
        """ボリンジャーバンド計算"""
        period = params.get('period', 20)
        std_dev = params.get('stdDev', 2)
        upper_color = params.get('upperColor', '#FF5252')
        middle_color = params.get('middleColor', '#2196F3')
        lower_color = params.get('lowerColor', '#66BB6A')
        line_width = params.get('lineWidth', 2)

        df = pd.DataFrame(candle_data)
        close_array = df['close'].values

        upper, middle, lower = TALibWrapper.BBANDS(
            close_array,
            timeperiod=period,
            nbdevup=std_dev,
            nbdevdn=std_dev
        )

        upper_values = []
        middle_values = []
        lower_values = []
        
        for i in range(len(candle_data)):
            if not np.isnan(middle[i]):
                upper_values.append({
                    'time': int(candle_data[i]['time']),
                    'value': float(upper[i])
                })
                middle_values.append({
                    'time': int(candle_data[i]['time']),
                    'value': float(middle[i])
                })
                lower_values.append({
                    'time': int(candle_data[i]['time']),
                    'value': float(lower[i])
                })

        return {
            'success': True,
            'displayType': 'multi-line',
            'lines': [
                {
                    'name': 'Upper',
                    'values': upper_values,
                    'config': {
                        'color': upper_color,
                        'lineWidth': line_width,
                        'title': f'BB Upper({period},{std_dev})'
                    }
                },
                {
                    'name': 'Middle',
                    'values': middle_values,
                    'config': {
                        'color': middle_color,
                        'lineWidth': line_width,
                        'title': f'BB Middle({period})'
                    }
                },
                {
                    'name': 'Lower',
                    'values': lower_values,
                    'config': {
                        'color': lower_color,
                        'lineWidth': line_width,
                        'title': f'BB Lower({period},{std_dev})'
                    }
                }
            ],
            'metadata': {
                'period': period,
                'stdDev': std_dev,
                'calculatedPoints': len(middle_values)
            }
        }


if __name__ == '__main__':
    main_runner(BollingerBandsIndicator)
