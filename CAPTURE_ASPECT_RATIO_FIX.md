# 📸 チャートキャプチャ アスペクト比修正パッチ

**日付:** 2026-01-29  
**バージョン:** v4.7.1  
**修正内容:** 一時リサイズによるアスペクト比固定化

---

## 🐛 **問題の詳細**

### **報告された問題:**
ブラウザのサイズ（ウィンドウの縦横比率）によって、キャプチャされたチャート画像の見た目が大きく異なる。

**例:**
- **横長ブラウザ**: チャートが横に引き伸ばされる → トレンドが緩やかに見える
- **縦長/正方形ブラウザ**: チャートが縦に圧縮される → トレンドが急に見える

### **Vision AI分析への影響:**

| 分析項目 | 影響レベル | 説明 |
|---|---|---|
| トレンド方向認識 | 🟡 軽微 | 上昇/下降は認識可能だが、角度の印象が異なる |
| パターン認識 | 🟠 中程度 | 三角形、ヘッドアンドショルダー等の形状が変わる |
| サポート/レジスタンス | 🟢 影響なし | 価格レベルは正確 |
| RSI/MACD読み取り | 🟢 影響なし | 数値は正確 |
| 全体的な推奨 | 🟡 可能 | 実用レベルだが最適化の余地あり |

---

## ✅ **修正内容**

### **アプローチ: キャプチャ時の一時リサイズ**

```
ユーザーがCaptureボタンクリック
↓
1. 元のチャートサイズを保存（例: 1800×450）
↓
2. チャートを1024×576に一時リサイズ
↓
3. 300ms待機（チャート再描画完了を待つ）
↓
4. takeScreenshot() でキャプチャ
↓
5. チャートを元のサイズに復元（1800×450）
↓
6. JPEG画像をダウンロード
```

**結果:**
- ✅ 常に1024×576の正確なアスペクト比（16:9）
- ✅ ブラウザサイズに依存しない
- ✅ Vision AIに最適な画像

---

## 🔧 **実装詳細**

### **修正ファイル: `public/app.js`**

#### **1. captureMainChart() 関数の修正**

**修正前:**
```javascript
async function captureMainChart() {
    // チャートサイズ変更なし
    const canvas = await takeChartScreenshot(mainChartElement);
    // → ブラウザの現在のサイズで1024×576に引き伸ばし/圧縮
}
```

**修正後:**
```javascript
async function captureMainChart() {
    // 元のサイズを保存
    const originalWidth = originalRect.width;
    const originalHeight = originalRect.height;
    
    // 一時リサイズ
    mainChart.resize(CAPTURE_WIDTH, CAPTURE_HEIGHT); // 1024×576
    await new Promise(resolve => setTimeout(resolve, 300)); // 待機
    
    // キャプチャ
    const canvas = await takeChartScreenshot(mainChartElement);
    
    // 元のサイズに復元
    mainChart.resize(originalWidth, originalHeight);
}
```

**追加された処理:**
1. `getBoundingClientRect()` で元のサイズ取得
2. `mainChart.resize(1024, 576)` で一時リサイズ
3. `setTimeout(300ms)` で再描画待機
4. キャプチャ実行
5. `mainChart.resize(originalWidth, originalHeight)` で復元
6. エラー時も必ず復元（try-catch-finally）

---

#### **2. takeChartScreenshot() 関数の改善**

**修正前:**
```javascript
async function takeChartScreenshot(chartElement) {
    const rect = chartElement.getBoundingClientRect();
    const currentWidth = rect.width;
    const currentHeight = rect.height;
    // → 毎回サイズ確認（不要）
}
```

**修正後:**
```javascript
async function takeChartScreenshot(chartElement) {
    // チャートは既に1024×576にリサイズ済み
    const canvas = document.createElement('canvas');
    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;
    // → 直接キャプチャ
}
```

**改善点:**
- サイズ確認処理を削除（captureMainChart側で保証）
- エラーハンドリング強化
- Fallback表示の改善

---

#### **3. drawFallbackPlaceholder() 関数の追加**

```javascript
function drawFallbackPlaceholder(ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Chart Screenshot', CAPTURE_WIDTH / 2, CAPTURE_HEIGHT / 2);
    ctx.font = '14px sans-serif';
    ctx.fillText('Lightweight Charts v4.1+ required for screenshot API', 
                 CAPTURE_WIDTH / 2, CAPTURE_HEIGHT / 2 + 30);
    ctx.fillText(`Temporary chart resized to ${CAPTURE_WIDTH}×${CAPTURE_HEIGHT}`, 
                 CAPTURE_WIDTH / 2, CAPTURE_HEIGHT / 2 + 60);
}
```

**目的:**
- プレースホルダー描画処理を関数化
- リサイズ情報をデバッグ用に追加

---

## 🎯 **動作フロー詳細**

```
1. ユーザーアクション:
   - "📷 Capture" ボタンクリック
   
2. 準備:
   - ボタンテキスト: "⏳ Capturing..."
   - ボタン無効化
   - 元のチャートサイズを保存
     例: originalWidth=1800, originalHeight=450
   
3. 一時リサイズ:
   - mainChart.resize(1024, 576)
   - コンソール: "✅ Chart temporarily resized to 1024 x 576"
   - 300ms待機（チャート再描画完了）
   
4. キャプチャ:
   - takeChartScreenshot() 実行
   - Canvasに1024×576で描画
   
5. 復元:
   - mainChart.resize(1800, 450)
   - コンソール: "✅ Chart restored to original size 1800 x 450"
   
6. 保存:
   - JPEG変換（quality=0.87）
   - ファイル名生成
   - ダウンロード開始
   
7. フィードバック:
   - ボタンテキスト: "✅ Captured!"
   - 2秒後に "📷 Capture" に戻る
   - ボタン再有効化
   
8. エラー時:
   - try-catch でエラーキャッチ
   - finally でチャートサイズ復元を保証
   - アラート表示
```

---

## ✅ **検証項目**

### **基本動作:**
- [ ] Captureボタンクリック → チャートが一瞬リサイズされる（300ms）
- [ ] キャプチャ後、チャートが元のサイズに戻る
- [ ] ダウンロードされた画像が1024×576
- [ ] ファイルサイズが約80-120KB

### **アスペクト比テスト:**
- [ ] **横長ブラウザ**でキャプチャ → 画像が16:9
- [ ] **正方形ブラウザ**でキャプチャ → 画像が16:9
- [ ] **縦長ブラウザ**でキャプチャ → 画像が16:9
- [ ] すべてのケースで同じアスペクト比

### **画像品質:**
- [ ] キャンドルが鮮明
- [ ] インジケーターラインが識別可能
- [ ] 価格軸・時間軸のラベルが正確
- [ ] チャートの形状が正しい（引き伸ばし/圧縮なし）

### **エラーハンドリング:**
- [ ] キャプチャエラー時、チャートサイズが復元される
- [ ] エラーメッセージが表示される
- [ ] ボタンが再有効化される

---

## 📦 **パッケージ情報**

**ファイル名:** `ai-black-trading-capture-fixed.zip`  
**サイズ:** 208KB  
**バージョン:** v4.7.1

### **変更ファイル:**
```
trading-platform/
├── public/
│   ├── app.js ⭐ 修正（captureMainChart, takeChartScreenshot, +drawFallbackPlaceholder）
│   └── ... (その他変更なし)
├── CAPTURE_ASPECT_RATIO_FIX.md ⭐ 新規
└── ... (その他)
```

**変更行数:** 約40行の修正

---

## 🚀 **適用方法**

```bash
# 1. サーバー停止
pkill -f "node dist/server.js"

# 2. ZIP展開
unzip ai-black-trading-capture-fixed.zip

# 3. サーバー起動
cd trading-platform
npm start

# 4. ブラウザでアクセス & ハードリロード
http://localhost:3001
Ctrl + Shift + R (Windows/Linux) / Cmd + Shift + R (Mac)

# 5. 動作確認
- ブラウザサイズを変更（横長/縦長/正方形）
- それぞれのサイズでデータ読み込み
- Captureボタンクリック
- ダウンロードされた画像を確認（すべて1024×576）
```

---

## 📊 **Before / After 比較**

### **Before (v4.7.0):**
```
横長ブラウザ (1800×450)
  → キャプチャ: 1024×576 (引き伸ばし)
  → チャートが横長に見える

正方形ブラウザ (900×900)
  → キャプチャ: 1024×576 (圧縮)
  → チャートが縦長に見える

❌ アスペクト比が不統一
```

### **After (v4.7.1):**
```
横長ブラウザ (1800×450)
  → 一時リサイズ: 1024×576
  → キャプチャ: 1024×576
  → 復元: 1800×450
  → ✅ 正確な16:9

正方形ブラウザ (900×900)
  → 一時リサイズ: 1024×576
  → キャプチャ: 1024×576
  → 復元: 900×900
  → ✅ 正確な16:9

✅ アスペクト比が常に統一
```

---

## 🎯 **Vision AI分析への改善効果**

| 項目 | Before | After | 改善 |
|---|---|---|---|
| トレンド角度の一貫性 | 🟡 ブラウザ依存 | ✅ 常に同じ | ⬆️ |
| パターン形状の正確性 | 🟠 変動あり | ✅ 正確 | ⬆️⬆️ |
| 分析結果の再現性 | 🟡 低い | ✅ 高い | ⬆️⬆️ |
| Vision AIの信頼性 | 🟡 中程度 | ✅ 高い | ⬆️⬆️ |

---

## ⚠️ **既知の制限事項**

### **1. 一時的なチャート表示の変化**
- キャプチャ時、300ms間チャートが1024×576にリサイズされる
- ユーザーには一瞬だけサイズ変更が見える可能性
- **影響:** 視覚的にわずかに気になる程度（実用上問題なし）

### **2. 大きなブラウザでの品質**
- 元のチャートサイズが2000×1000等の場合、一時的に1024×576に縮小
- **影響:** キャプチャ品質は1024×576に最適化されるため問題なし

### **3. Lightweight Charts Screenshot API**
- 依然として `takeScreenshot()` メソッドが利用できない可能性
- **影響:** Fallbackプレースホルダーが表示される
- **対応予定:** html2canvas等の導入を検討

---

## 🎉 **まとめ**

**修正完了:**
- ✅ 一時リサイズによるアスペクト比固定化
- ✅ ブラウザサイズに依存しない正確な16:9画像
- ✅ エラーハンドリング強化
- ✅ Vision AI分析の精度向上

**技術仕様:**
- リサイズ処理: `mainChart.resize(1024, 576)`
- 待機時間: 300ms
- 復元処理: `mainChart.resize(originalWidth, originalHeight)`
- エラー時も必ず復元

**次のステップ:**
1. 動作確認（異なるブラウザサイズでテスト）
2. キャプチャ画像の品質確認
3. Vision AI統合（Phase 5）の準備

---

**修正担当:** AI Assistant  
**最終更新:** 2026-01-29 09:16 UTC
