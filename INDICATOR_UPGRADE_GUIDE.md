# インジケーター改修ガイド

## 概要
既存インジケーターを詳細設定に対応させるための改修ガイドです。

## 改修が必要な理由
- **動的登録**: フロントエンドのコード変更なしで新しいインジケーターを追加
- **パラメータUI**: ユーザーがGUIでパラメータ（期間、色、線の太さなど）を調整可能
- **並行開発**: プラットフォーム側とインジケーター側を独立して開発可能

## 改修内容

### 1. 基底クラス (`indicator_interface.py`) - ✅ 完了
- `chart_type` 属性を追加 ('main' or 'sub')
- `get_metadata()` メソッドを追加
- `get_parameter_definitions()` メソッドを追加
- メタデータ取得モードを `run()` メソッドに追加

### 2. 各インジケーターの改修

#### 必要な変更
1. **`__init__()` メソッド**
   ```python
   def __init__(self):
       super().__init__()
       self.name = "indicator_name"
       self.version = "1.0.0"
       self.display_type = "single-line"  # or "multi-line"
       self.chart_type = "main"  # or "sub"
   ```

2. **`get_metadata()` メソッドを追加**
   ```python
   def get_metadata(self) -> Dict[str, Any]:
       return {
           'name': self.name,
           'displayName': 'Indicator Display Name',
           'version': self.version,
           'displayType': self.display_type,
           'chartType': self.chart_type,
           'parameters': self.get_parameter_definitions(),
           'description': 'Indicator description'
       }
   ```

3. **`get_parameter_definitions()` メソッドを追加**
   ```python
   def get_parameter_definitions(self) -> List[Dict[str, Any]]:
       return [
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
   ```

4. **`calculate()` メソッドでパラメータを使用**
   ```python
   def calculate(self, candle_data: List[CandleData], params: Dict[str, Any]) -> Dict[str, Any]:
       period = params.get('period', 20)
       color = params.get('color', '#2196F3')
       line_width = params.get('lineWidth', 2)
       
       # ... 計算処理 ...
       
       return {
           'success': True,
           'displayType': 'single-line',
           'values': values,
           'lineConfig': {
               'color': color,
               'lineWidth': line_width,
               'lineStyle': 'solid',
               'title': f'INDICATOR({period})'
           },
           'metadata': {
               'period': period,
               'calculatedPoints': len(values)
           }
       }
   ```

## パラメータ型定義

### 1. number (数値)
```python
{
    'name': 'period',
    'displayName': 'Period',
    'type': 'number',
    'default': 20,
    'min': 1,
    'max': 200,
    'step': 1,
    'description': 'Number of periods'
}
```

### 2. color (色)
```python
{
    'name': 'color',
    'displayName': 'Line Color',
    'type': 'color',
    'default': '#2196F3',
    'description': 'Line color on chart'
}
```

### 3. select (選択)
```python
{
    'name': 'maType',
    'displayName': 'MA Type',
    'type': 'select',
    'default': 'SMA',
    'options': [
        {'value': 'SMA', 'label': 'Simple'},
        {'value': 'EMA', 'label': 'Exponential'},
        {'value': 'WMA', 'label': 'Weighted'}
    ],
    'description': 'Moving average type'
}
```

## 既存インジケーターの改修状況

### ✅ 完了
- `indicator_interface.py` - 基底クラス
- `sma.py` - Simple Moving Average
- `ema.py` - Exponential Moving Average

### ⚠️ 未完了（同じパターンで改修可能）
- `rsi.py` - Relative Strength Index
- `macd.py` - MACD
- `bollinger.py` - Bollinger Bands

## RSI の改修例

```python
class RSIIndicator(IndicatorBase):
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

    def calculate(self, candle_data: List[CandleData], params: Dict[str, Any]) -> Dict[str, Any]:
        period = params.get('period', 14)
        color = params.get('color', '#9C27B0')
        line_width = params.get('lineWidth', 2)
        overbought = params.get('overbought', 70)
        oversold = params.get('oversold', 30)
        
        # ... RSI計算 ...
        
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
                'calculatedPoints': len(values)
            }
        }
```

## Bollinger Bands の改修例

```python
class BollingerIndicator(IndicatorBase):
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
```

## 改修のベネフィット

1. **拡張性**: 新しいインジケーターを追加しても、フロントエンドのコード変更不要
2. **柔軟性**: ユーザーがパラメータを自由に調整可能
3. **保守性**: インジケーターの定義がPython側に集約され、管理が容易
4. **並行開発**: プラットフォーム側とインジケーター側を独立して開発可能
5. **ドキュメント化**: パラメータ定義がコード内に明示され、自己文書化される

## 次のステップ

1. ✅ 基底クラスの拡張（完了）
2. ✅ SMA、EMA の改修（完了）
3. ⚠️ RSI、MACD、Bollinger の改修（残り3つ）
4. ⚠️ バックエンドAPIの追加（`/api/indicator/metadata`）
5. ⚠️ フロントエンドの動的UI生成
6. ⚠️ パラメータ調整ダイアログの実装
