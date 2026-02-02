"""
インジケーター基底クラス
すべてのPythonインジケーターはこのクラスを継承する
"""

import sys
import json
from typing import Dict, Any, List, TypedDict
from abc import ABC, abstractmethod


class CandleData(TypedDict):
    """ローソク足データ型"""
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float


class IndicatorRequest(TypedDict):
    """インジケーターリクエスト型"""
    name: str
    candleData: List[CandleData]
    params: Dict[str, Any]
    metadata: Dict[str, Any]


class IndicatorBase(ABC):
    """インジケーター基底クラス"""

    def __init__(self):
        self.name = "base_indicator"
        self.version = "1.0.0"
        self.display_type = "single-line"
        self.chart_type = "main"  # 'main' or 'sub'

    @abstractmethod
    def calculate(self, candle_data: List[CandleData], params: Dict[str, Any]) -> Dict[str, Any]:
        """
        インジケーター計算処理（サブクラスで実装）
        
        Args:
            candle_data: ローソク足データ配列
            params: パラメータ辞書
            
        Returns:
            インジケーター結果辞書
        """
        pass

    def validate_params(self, params: Dict[str, Any]) -> bool:
        """
        パラメータバリデーション
        
        Args:
            params: パラメータ辞書
            
        Returns:
            バリデーション結果
        """
        return True

    def get_metadata(self) -> Dict[str, Any]:
        """
        インジケーターのメタデータを返す
        フロントエンドで動的にUIを生成するために使用
        
        Returns:
            メタデータ辞書
        """
        return {
            'name': self.name,
            'displayName': self.name.upper(),
            'version': self.version,
            'displayType': self.display_type,
            'chartType': self.chart_type,
            'parameters': self.get_parameter_definitions(),
            'description': 'No description available'
        }

    def get_parameter_definitions(self) -> List[Dict[str, Any]]:
        """
        パラメータ定義を返す
        サブクラスでオーバーライドして、各パラメータの定義を返す
        
        Returns:
            パラメータ定義のリスト
            
        Example:
            [
                {
                    'name': 'period',
                    'displayName': 'Period',
                    'type': 'number',
                    'default': 20,
                    'min': 1,
                    'max': 200,
                    'step': 1,
                    'description': 'Number of periods'
                },
                {
                    'name': 'color',
                    'displayName': 'Line Color',
                    'type': 'color',
                    'default': '#2196F3',
                    'description': 'Line color'
                }
            ]
        """
        return []

    def run(self) -> None:
        """
        メイン実行処理
        stdinからJSONを受け取り、stdoutにJSONを出力
        """
        try:
            # stdinからJSONリクエスト読み込み
            input_data = sys.stdin.read()
            request: IndicatorRequest = json.loads(input_data)

            # メタデータ取得モード
            if request.get('_mode') == 'metadata':
                metadata = self.get_metadata()
                metadata['success'] = True
                print(json.dumps(metadata, ensure_ascii=False))
                return

            # リクエスト検証
            if not request.get('candleData'):
                raise ValueError("candleData is required")

            if not isinstance(request['candleData'], list):
                raise ValueError("candleData must be an array")

            if len(request['candleData']) == 0:
                raise ValueError("candleData must not be empty")

            # パラメータ取得
            params = request.get('params', {})
            candle_data = request['candleData']
            
            # データ型変換（数値をfloatに変換）
            for candle in candle_data:
                candle['time'] = int(candle.get('time', 0))
                candle['open'] = float(candle.get('open', 0))
                candle['high'] = float(candle.get('high', 0))
                candle['low'] = float(candle.get('low', 0))
                candle['close'] = float(candle.get('close', 0))
                candle['volume'] = float(candle.get('volume', 0))

            # パラメータバリデーション
            if not self.validate_params(params):
                raise ValueError("Invalid parameters")

            # 計算実行
            result = self.calculate(candle_data, params)

            # メタデータ追加
            if 'metadata' not in result:
                result['metadata'] = {}

            result['metadata']['indicator'] = self.name
            result['metadata']['version'] = self.version
            result['metadata']['dataPoints'] = len(candle_data)

            # 結果をJSONで出力
            print(json.dumps(result, ensure_ascii=False))

        except Exception as e:
            # エラーレスポンス
            error_response = {
                'success': False,
                'error': {
                    'type': type(e).__name__,
                    'message': str(e),
                    'indicator': self.name
                }
            }
            print(json.dumps(error_response, ensure_ascii=False))
            sys.exit(1)


def main_runner(indicator_class):
    """
    インジケーター実行ヘルパー関数
    
    Args:
        indicator_class: IndicatorBaseを継承したクラス
    """
    indicator = indicator_class()
    indicator.run()
