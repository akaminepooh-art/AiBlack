# インジケーター開発クイックスタート

## 📋 このガイドについて

このドキュメントは、**AI Black Trading Platform** で新しいテクニカルインジケーターを開発するための完全ガイドです。

**対象読者**: このプラットフォームについて事前知識がないAI開発者・エージェント

**完全版**: `INDICATOR_DEVELOPMENT_GUIDE.txt` (35KB, 17章構成)

---

## 🚀 5分で始める

### **Step 1: テンプレートをコピー**

```bash
cd python-indicators/standard
cp sma.py your_indicator.py
```

### **Step 2: 必須項目を編集**

```python
class YourIndicator(IndicatorBase):
    def __init__(self):
        super().__init__()
        self.name = 'your_indicator'      # ← 変更
        self.version = '1.0.0'
        self.display_type = 'single-line' # または 'multi-line', 'histogram'
        self.chart_type = 'main'          # または 'sub'
    
    # メタデータ定義
    def get_metadata(self): ...
    
    # パラメータ定義（UIが自動生成される）
    def get_parameter_definitions(self): ...
    
    # 計算ロジック
    def calculate(self, candle_data, params): ...
```

### **Step 3: ファイル配置**

```bash
# ファイルを配置するだけ（フロントエンド・バックエンドの変更不要）
mv your_indicator.py python-indicators/standard/
```

### **Step 4: サーバー再起動**

```bash
cd /path/to/trading-platform
npm start
```

→ ブラウザでアクセス → インジケーター選択ボックスに**自動的に表示**される！

---

## 📚 ドキュメント構成

### **1. クイックスタート（本ファイル）**
- 5分で始める手順
- 最小限の実装例

### **2. 完全開発ガイド（INDICATOR_DEVELOPMENT_GUIDE.txt）**

**17章構成、35KB:**

| 章 | 内容 |
|---|---|
| 1 | プラットフォーム概要 |
| 2 | ファイル構成 |
| 3 | 基底クラス仕様 |
| 4 | メソッド実装詳細 |
| 5 | TA-Lib ラッパー使用方法 |
| 6 | 完全な実装例（SMA, RSI, Bollinger） |
| 7 | テスト方法 |
| 8 | デバッグのヒント |
| 9 | チェックリスト |
| 10 | 配置とデプロイ |
| 11 | トラブルシューティング |
| 12 | 参考リソース |
| 13 | 開発フローの推奨手順 |
| 14 | 制約事項と注意点 |
| 15 | サンプルタスク |
| 16 | FAQ |
| 17 | まとめ |

---

## 🎯 重要なポイント

### **✅ やること**

1. **`IndicatorBase` を継承**
2. **4つのメソッドを実装**
   - `get_metadata()` - 基本情報
   - `get_parameter_definitions()` - パラメータ定義
   - `calculate()` - 計算ロジック
   - `validate_params()` - パラメータ検証（オプション）
3. **NaN値をフィルタリング**
4. **time を `int`、value を `float` にキャスト**
5. **エラーハンドリング**

### **❌ やらないこと**

- フロントエンド（public/app.js）の変更
- バックエンド（src/）の変更
- 外部APIの呼び出し
- ファイルI/O
- 複雑な前処理（全てメモリ内で処理）

---

## 📝 最小限の実装例

```python
"""
Simple Moving Average (SMA) Indicator
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import numpy as np
from indicator_interface import IndicatorBase, main_runner
from talib_wrapper import TALibWrapper


class SMAIndicator(IndicatorBase):
    def __init__(self):
        super().__init__()
        self.name = 'sma'
        self.version = '1.0.0'
        self.display_type = 'single-line'
        self.chart_type = 'main'
    
    def get_metadata(self):
        return {
            'name': self.name,
            'displayName': 'Simple Moving Average (SMA)',
            'version': self.version,
            'displayType': self.display_type,
            'chartType': self.chart_type,
            'description': 'Calculate simple moving average'
        }
    
    def get_parameter_definitions(self):
        return [
            {
                'name': 'period',
                'displayName': 'Period',
                'type': 'number',
                'default': 20,
                'min': 1,
                'max': 200,
                'step': 1
            },
            {
                'name': 'color',
                'displayName': 'Line Color',
                'type': 'color',
                'default': '#2196F3'
            }
        ]
    
    def calculate(self, candle_data: list, params: dict) -> dict:
        try:
            period = int(params.get('period', 20))
            color = params.get('color', '#2196F3')
            
            df = pd.DataFrame(candle_data)
            close_array = df['close'].values
            sma_values = TALibWrapper.SMA(close_array, timeperiod=period)
            
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
                    'lineWidth': 2,
                    'title': f'SMA({period})'
                }
            }
        except Exception as e:
            return {
                'success': False,
                'error': {'type': 'CalculationError', 'message': str(e)}
            }


if __name__ == '__main__':
    main_runner(SMAIndicator)
```

---

## 🧪 テスト方法

### **1. ローカルテスト**

```bash
cd python-indicators/standard

# 構文チェック
python3 -c "import your_indicator"

# メタデータ取得
echo '{"mode": "metadata"}' | python3 your_indicator.py
```

### **2. サーバー経由テスト**

```bash
# サーバー起動
npm start

# メタデータ取得
curl http://localhost:3001/api/indicator/metadata/your_indicator
```

### **3. ブラウザテスト**

1. http://localhost:3001 にアクセス
2. Market Data をロード
3. Indicator セレクトから選択
4. パラメータ調整ダイアログが表示される
5. チャートに描画される

---

## 🔍 トラブルシューティング

### **Q: セレクトボックスに表示されない**

**確認項目:**
- [ ] ファイルが `python-indicators/standard/` にあるか
- [ ] ファイル名が `{self.name}.py` と一致しているか
- [ ] 構文エラーがないか
- [ ] サーバーを再起動したか
- [ ] ブラウザをハードリロードしたか（Ctrl+Shift+R）

**デバッグ:**
```bash
curl http://localhost:3001/api/indicator/metadata | grep your_indicator
```

---

### **Q: "Python process timeout" エラー**

**原因:** 計算に30秒以上かかっている

**対処:**
- データ点数を確認
- 計算ロジックを最適化
- numpy/pandas のベクトル演算を活用

---

### **Q: チャートに何も表示されない**

**確認項目:**
- [ ] `values` 配列が空でないか
- [ ] NaN値をフィルタしているか
- [ ] `time` が `int` 型か
- [ ] `value` が `float` 型か

**デバッグ:**
```python
import sys
print(f"Values count: {len(values)}", file=sys.stderr)
```

---

## 📦 利用可能なTA-Lib関数

### **移動平均系**
- `TALibWrapper.SMA(close, timeperiod=30)` - 単純移動平均
- `TALibWrapper.EMA(close, timeperiod=30)` - 指数移動平均
- `TALibWrapper.WMA(close, timeperiod=30)` - 加重移動平均

### **モメンタム系**
- `TALibWrapper.RSI(close, timeperiod=14)` - RSI
- `TALibWrapper.STOCH(high, low, close, ...)` - ストキャスティクス
- `TALibWrapper.CCI(high, low, close, timeperiod=14)` - CCI
- `TALibWrapper.MOM(close, timeperiod=10)` - モメンタム

### **トレンド系**
- `TALibWrapper.MACD(close, fastperiod=12, slowperiod=26, signalperiod=9)`
- `TALibWrapper.ADX(high, low, close, timeperiod=14)` - ADX

### **ボラティリティ系**
- `TALibWrapper.BBANDS(close, timeperiod=20, nbdevup=2, nbdevdn=2)`
- `TALibWrapper.ATR(high, low, close, timeperiod=14)` - ATR

### **出来高系**
- `TALibWrapper.OBV(close, volume)` - OBV

**完全なリストは `talib_wrapper.py` を参照**

---

## 📋 開発チェックリスト

新規インジケーター実装時の確認項目：

- [ ] ファイル名が `{name}.py` と一致
- [ ] `IndicatorBase` を継承
- [ ] `__init__()` で4つのプロパティを設定
- [ ] `get_metadata()` を実装
- [ ] `get_parameter_definitions()` を実装
- [ ] `calculate()` を実装
- [ ] 返却値に `'success': True` を含む
- [ ] `values` 配列に `time` と `value` を含む
- [ ] NaN値をフィルタリング
- [ ] `time` を `int()` でキャスト
- [ ] `value` を `float()` でキャスト
- [ ] エラーハンドリング実装
- [ ] `if __name__ == '__main__': main_runner(YourIndicator)` を記述
- [ ] Pythonの構文エラーなし
- [ ] ローカルテスト完了
- [ ] サーバーテスト完了
- [ ] ブラウザテスト完了

---

## 🎓 次のステップ

1. **既存インジケーターを読む**
   - `python-indicators/standard/sma.py` - 最もシンプル
   - `python-indicators/standard/rsi.py` - サブチャート例
   - `python-indicators/standard/bollinger.py` - multi-line例

2. **簡単なインジケーターを実装**
   - WMA（加重移動平均）
   - Momentum
   - ROC（変化率）

3. **完全開発ガイドを読む**
   - `INDICATOR_DEVELOPMENT_GUIDE.txt`

4. **複雑なインジケーターに挑戦**
   - Ichimoku Cloud
   - Stochastic RSI
   - Awesome Oscillator

---

## 📞 サポート

**質問がある場合:**
- `INDICATOR_DEVELOPMENT_GUIDE.txt` の FAQ章を参照
- プロジェクトの GitHub Issues
- 既存インジケーターのコードを参照

**重要なファイル:**
- `INDICATOR_DEVELOPMENT_GUIDE.txt` - 完全ガイド（35KB）
- `python-indicators/indicator_interface.py` - 基底クラス
- `python-indicators/talib_wrapper.py` - TA-Lib ラッパー
- `python-indicators/standard/sma.py` - 最もシンプルな実装例

---

## 🎉 重要なメッセージ

**このプラットフォームの最大の特徴:**

✨ **Pythonファイルを配置するだけで、UIが自動生成される**

- フロントエンドの変更不要
- バックエンドの変更不要
- パラメータ調整ダイアログも自動生成
- メインチャート/サブチャートも自動配置

**あなたがやることは:**
1. Pythonスクリプトを書く
2. ファイルを配置する
3. サーバーを再起動する

**それだけです！** 🚀

---

**開発ガイドバージョン**: 1.0.0  
**最終更新日**: 2026-01-29  
**対象プラットフォーム**: Phase 4.5（動的UI完成版）
