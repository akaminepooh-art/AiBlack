# AI Black Trading Platform - ドキュメント一覧

このプロジェクトには複数のドキュメントが含まれています。目的に応じて適切なドキュメントを参照してください。

---

## 📚 **ドキュメント一覧**

### **1. プロジェクト概要**

| ファイル | 説明 | 対象読者 |
|---|---|---|
| **README.md** | プロジェクトの概要、セットアップ手順、基本的な使用方法 | 全員 |
| **package.json** | Node.js依存関係とスクリプト定義 | 開発者 |
| **.env.example** | 環境変数のテンプレート | 管理者 |

---

### **2. リリース情報**

| ファイル | 説明 | 対象読者 |
|---|---|---|
| **RELEASE_NOTES.md** | v4.0 リリースノート（メタデータ対応） | 全員 |
| **DYNAMIC_UI_RELEASE_NOTES.md** | v4.5 リリースノート（動的UI完成版） | 全員 |

---

### **3. インジケーター開発**

| ファイル | サイズ | 説明 | 対象読者 |
|---|---|---|---|
| **INDICATOR_DEV_QUICKSTART.md** | 8KB | 5分で始めるクイックスタート | AI開発者 |
| **INDICATOR_DEVELOPMENT_GUIDE.txt** | 35KB | 完全開発ガイド（17章構成） | AI開発者 |
| **INDICATOR_UPGRADE_GUIDE.md** | 中 | 既存インジケーターの改修ガイド | 開発者 |

**推奨読順:**
1. `INDICATOR_DEV_QUICKSTART.md` - まずこれを読む
2. `INDICATOR_DEVELOPMENT_GUIDE.txt` - 詳細を理解する
3. 既存インジケーター（`python-indicators/standard/*.py`）を読む

---

### **4. 検証・テスト**

| ファイル | 説明 | 対象読者 |
|---|---|---|
| **PHASE4_VERIFICATION_REPORT.md** | Phase 4 動作確認レポート（サーバー側） | 開発者・QA |

---

## 🎯 **目的別ガイド**

### **はじめてプラットフォームを使う**
1. `README.md` - セットアップ手順
2. ブラウザで http://localhost:3001 にアクセス
3. Market Data をロード → インジケーター追加

---

### **新しいインジケーターを開発したい（AI開発者向け）**

#### **クイックスタート（5分）**
```bash
# 1. ドキュメントを読む
cat INDICATOR_DEV_QUICKSTART.md

# 2. テンプレートをコピー
cd python-indicators/standard
cp sma.py your_indicator.py

# 3. 編集して配置
vim your_indicator.py

# 4. サーバー再起動
npm start
```

#### **詳細ガイド（30分）**
```bash
# 完全ガイドを読む（17章、35KB）
cat INDICATOR_DEVELOPMENT_GUIDE.txt

# 重要な章：
# - 第3章: 基底クラス仕様
# - 第4章: メソッド実装詳細
# - 第6章: 完全な実装例
# - 第11章: トラブルシューティング
```

**重要な情報:**

✅ **`INDICATOR_DEVELOPMENT_GUIDE.txt` には以下が含まれます:**
- プラットフォームの完全な仕様
- 必須メソッドの実装方法
- TA-Lib ラッパーの使用方法
- 3つの完全な実装例（SMA, RSI, Bollinger Bands）
- テスト・デバッグ方法
- トラブルシューティング
- FAQ
- チェックリスト

**このガイドだけで、事前知識ゼロからインジケーター開発が可能です！**

---

### **既存インジケーターを改修したい**
1. `INDICATOR_UPGRADE_GUIDE.md` - 改修ガイド
2. `python-indicators/standard/*.py` - 既存実装を参照

---

### **プラットフォームの動作確認**
1. `PHASE4_VERIFICATION_REPORT.md` - 検証結果
2. サーバー起動 → API テスト

---

## 📂 **ファイル構造**

```
trading-platform/
├── README.md                              # プロジェクト概要
├── DOCUMENTATION_INDEX.md                 # 本ファイル
│
├── RELEASE_NOTES.md                       # v4.0 リリースノート
├── DYNAMIC_UI_RELEASE_NOTES.md           # v4.5 リリースノート
│
├── INDICATOR_DEV_QUICKSTART.md           # インジケーター開発クイックスタート
├── INDICATOR_DEVELOPMENT_GUIDE.txt       # 完全開発ガイド（35KB）
├── INDICATOR_UPGRADE_GUIDE.md            # 改修ガイド
│
├── PHASE4_VERIFICATION_REPORT.md         # 動作確認レポート
│
├── python-indicators/                     # Pythonインジケーター
│   ├── indicator_interface.py            # 基底クラス
│   ├── talib_wrapper.py                  # TA-Lib ラッパー
│   ├── requirements.txt                  # Python依存関係
│   └── standard/                         # 標準インジケーター
│       ├── sma.py                        # 最もシンプルな例
│       ├── ema.py
│       ├── rsi.py                        # サブチャート例
│       ├── macd.py
│       └── bollinger.py                  # multi-line例
│
├── src/                                   # TypeScriptバックエンド
├── public/                                # フロントエンド
└── dist/                                  # ビルド済みファイル
```

---

## 🔍 **キーワード検索**

### **「動的UI」について知りたい**
→ `DYNAMIC_UI_RELEASE_NOTES.md`

### **「インジケーター追加方法」を知りたい**
→ `INDICATOR_DEV_QUICKSTART.md` → `INDICATOR_DEVELOPMENT_GUIDE.txt`

### **「メタデータ」について知りたい**
→ `INDICATOR_DEVELOPMENT_GUIDE.txt` の第4章

### **「TA-Lib」の使い方を知りたい**
→ `INDICATOR_DEVELOPMENT_GUIDE.txt` の第5章

### **「エラー」のデバッグ方法を知りたい**
→ `INDICATOR_DEVELOPMENT_GUIDE.txt` の第8章、第11章

### **「パラメータ」の定義方法を知りたい**
→ `INDICATOR_DEVELOPMENT_GUIDE.txt` の第4-2章

---

## 📖 **推奨読順（目的別）**

### **ユーザー（プラットフォーム利用者）**
1. `README.md` - セットアップ
2. ブラウザで動作確認

### **AI開発者（インジケーター開発）**
1. `INDICATOR_DEV_QUICKSTART.md` - 5分で理解
2. `INDICATOR_DEVELOPMENT_GUIDE.txt` - 完全理解（30分）
3. 既存インジケーターのコードを読む（10分）
4. 実装開始！

### **プラットフォーム開発者**
1. `README.md` - プロジェクト概要
2. `RELEASE_NOTES.md` - v4.0 機能
3. `DYNAMIC_UI_RELEASE_NOTES.md` - v4.5 機能
4. `PHASE4_VERIFICATION_REPORT.md` - 検証結果
5. ソースコード

---

## 💡 **重要なポイント**

### **インジケーター開発の特徴**

✨ **Pythonファイルを配置するだけで動作する**

- フロントエンドの変更不要
- バックエンドの変更不要
- パラメータ調整UIが自動生成
- メインチャート/サブチャートも自動配置

**実装手順:**
1. `python-indicators/standard/your_indicator.py` を作成
2. `IndicatorBase` を継承して4つのメソッドを実装
3. サーバー再起動
4. ブラウザでUIに自動表示される！

詳細は `INDICATOR_DEVELOPMENT_GUIDE.txt` 参照。

---

## 🆕 **最新情報**

### **Phase 4.5（現在）**
- ✅ 動的UI生成完成
- ✅ パラメータ調整ダイアログ実装
- ✅ 全5インジケーター動作確認済み
- ✅ 完全開発ガイド作成

### **次のフェーズ（予定）**
- Phase 5: 描画ツール
- Phase 6: エクスポート機能
- Phase 7: 高度機能（アラート、バックテスト）

---

## 📞 **サポート**

### **質問がある場合:**
1. 該当するドキュメントのFAQ章を参照
2. `INDICATOR_DEVELOPMENT_GUIDE.txt` の第16章（FAQ）
3. プロジェクトの GitHub Issues
4. 既存コードを参照

### **バグ報告:**
- GitHub Issues にて報告
- `PHASE4_VERIFICATION_REPORT.md` を参考に詳細を記載

---

## 📊 **ドキュメントサイズ一覧**

| ファイル | サイズ | 章数 | 推定読了時間 |
|---|---|---|---|
| INDICATOR_DEV_QUICKSTART.md | 8KB | - | 5分 |
| INDICATOR_DEVELOPMENT_GUIDE.txt | 35KB | 17章 | 30分 |
| INDICATOR_UPGRADE_GUIDE.md | 中 | - | 10分 |
| DYNAMIC_UI_RELEASE_NOTES.md | 8KB | - | 10分 |
| RELEASE_NOTES.md | 中 | - | 5分 |
| PHASE4_VERIFICATION_REPORT.md | 5KB | - | 5分 |

**合計**: 約 60KB のドキュメント

---

## 🎓 **学習パス**

### **初心者向け（0 → インジケーター開発）**

**所要時間: 約1時間**

1. `INDICATOR_DEV_QUICKSTART.md` （5分）
2. `INDICATOR_DEVELOPMENT_GUIDE.txt` の第1-6章（20分）
3. `python-indicators/standard/sma.py` を読む（5分）
4. テンプレートをコピーして編集（10分）
5. ローカルテスト（5分）
6. サーバーテスト（5分）
7. ブラウザ確認（5分）
8. 完成！ 🎉

---

### **中級者向け（既にPythonを理解している）**

**所要時間: 約30分**

1. `INDICATOR_DEV_QUICKSTART.md` （3分）
2. `INDICATOR_DEVELOPMENT_GUIDE.txt` の第4-5章（10分）
3. 既存インジケーターを1つ読む（5分）
4. 実装開始（10分）
5. テスト・デプロイ（2分）

---

### **上級者向け（複雑なインジケーター開発）**

1. `INDICATOR_DEVELOPMENT_GUIDE.txt` 全章読破（30分）
2. 全既存インジケーターのコードを読む（15分）
3. 複雑なインジケーター実装（Ichimoku, Stochastic RSI等）

---

**ドキュメントインデックスバージョン**: 1.0.0  
**最終更新日**: 2026-01-29  
**対象プラットフォーム**: Phase 4.5（動的UI完成版）

---

**Happy Coding! 🚀**
