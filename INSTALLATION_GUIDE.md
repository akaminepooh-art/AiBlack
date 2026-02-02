# 📦 インストールガイド - Trading Platform Phase 5

**完全版インストール手順書**  
**対象OS**: Windows 10/11  
**所要時間**: 約15分

---

## 📋 事前準備

### **必須ソフトウェア**

1. **Python 3.13**
   - ダウンロード: https://www.python.org/downloads/
   - インストール時に「Add Python to PATH」をチェック

2. **Node.js v20.x LTS**
   - ダウンロード: https://nodejs.org/
   - 推奨: LTS版（Long Term Support）

3. **Visual C++ Redistributable**
   - ダウンロード: https://aka.ms/vs/17/release/vc_redist.x64.exe
   - TA-Lib動作に必要

4. **OpenAI APIキー**
   - 取得: https://platform.openai.com/api-keys
   - クレジットカード登録が必要

### **推奨ソフトウェア**

- Git for Windows（バージョン管理）
- Visual Studio Code（コード編集）

---

## 🚀 フルインストール手順

### **ステップ1: プロジェクトの配置**

#### **オプションA: 新規インストール**

```cmd
cd C:\Trading
# このパッケージを trading-platform にリネームして配置
```

#### **オプションB: 既存プロジェクトの上書き**

```cmd
cd C:\Trading

# バックアップ作成
ren trading-platform trading-platform-backup-%date:~0,4%%date:~5,2%%date:~8,2%

# 新しいプロジェクトを配置
# （このパッケージを trading-platform にリネーム）

# .envファイルを復元（既存のAPIキーがある場合）
copy trading-platform-backup-*\.env trading-platform\.env
```

---

### **ステップ2: TA-Lib C/C++ライブラリのインストール**

#### **方法A: 事前ビルド版（推奨）**

1. **TA-Libをダウンロード**
   ```
   http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-msvc.zip
   ```

2. **解凍して配置**
   ```cmd
   # C:\ta-lib に解凍
   # 構造:
   # C:\ta-lib\
   #   ├── c\
   #   │   ├── include\
   #   │   └── lib\
   ```

3. **環境変数を設定**
   ```cmd
   # システム環境変数に追加
   setx TA_INCLUDE_PATH "C:\ta-lib\c\include"
   setx TA_LIBRARY_PATH "C:\ta-lib\c\lib"
   setx PATH "%PATH%;C:\ta-lib\c\lib"
   ```

4. **コマンドプロンプトを再起動**

#### **方法B: ビルド済みWheel（簡単）**

TA-Lib C/C++ライブラリが不要な場合、Wheel直接インストール：

```cmd
# Wheelをダウンロード
# https://github.com/cgohlke/talib-build/releases/
# 例: TA_Lib-0.4.28-cp313-cp313-win_amd64.whl

pip install TA_Lib-0.4.28-cp313-cp313-win_amd64.whl
```

---

### **ステップ3: Python仮想環境のセットアップ**

```cmd
cd C:\Trading\trading-platform

# 仮想環境を作成
py -m venv venv

# 仮想環境を有効化
venv\Scripts\activate

# pipをアップグレード
python -m pip install --upgrade pip

# 依存関係をインストール
pip install numpy>=1.26.0
pip install pandas>=2.1.0
pip install TA-Lib==0.6.7
```

**期待される出力**:
```
Successfully installed numpy-2.4.1 pandas-3.0.0 TA-Lib-0.6.8
```

**動作確認**:
```cmd
python -c "import talib; print('TA-Lib version:', talib.__version__)"
```

**期待される出力**:
```
TA-Lib version: 0.6.8
```

---

### **ステップ4: 環境変数の設定**

```cmd
cd C:\Trading\trading-platform

# .env.exampleから.envを作成
copy .env.example .env

# .envファイルを編集
notepad .env
```

**`.env` ファイルの内容**:

```env
# Node.js Server Configuration
NODE_ENV=development
PORT=3001
HOST=localhost

# Yahoo Finance API
YAHOO_FINANCE_BASE_URL=https://query1.finance.yahoo.com
YAHOO_FINANCE_TIMEOUT=10000
YAHOO_FINANCE_RETRY=3

# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL=300

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# 🆕 OpenAI API (Phase 5) - 必須
OPENAI_API_KEY=sk-proj-YOUR_API_KEY_HERE  # ← ここを変更
```

**重要**: `OPENAI_API_KEY` を実際のAPIキーに置き換えてください。

---

### **ステップ5: Node.js依存関係のインストール**

```cmd
cd C:\Trading\trading-platform

# 依存関係をインストール
npm install
```

**期待される出力**:
```
added 278 packages, and audited 278 packages in 5s

60 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

**インストールされる主要パッケージ**:
- express (Webサーバー)
- typescript (TypeScript)
- openai (GPT-4 Vision) ← **Phase 5で追加**
- lightweight-charts (チャート表示)
- winston (ロギング)
- その他273パッケージ

---

### **ステップ6: TypeScriptビルド**

```cmd
npm run build
```

**期待される出力**:
```
> trading-platform@1.0.0 build
> tsc

（エラーなし - 正常終了）
```

**成功確認**:
```cmd
dir dist
```

以下のファイルが生成されていることを確認：
```
dist/
├── server.js
├── routes/
│   ├── index.js
│   ├── vision.js  ← Phase 5
│   └── ...
├── services/
│   ├── vision.service.js  ← Phase 5
│   └── ...
└── ...
```

---

### **ステップ7: サーバー起動**

```cmd
# 仮想環境が有効化されていることを確認
# プロンプトに (venv) が表示されているか確認

npm run dev
```

**期待される出力**:
```
> trading-platform@1.0.0 dev
> nodemon --exec ts-node src/server.ts

[nodemon] starting `ts-node src/server.ts`
🚀 Server running on http://localhost:3001
Environment: development
Yahoo Finance service initialized
Cache service initialized
Vision Service initialized  ← 🆕 Phase 5
Environment validated successfully
Server: http://localhost:3001
API Base: http://localhost:3001/api
Cache: Enabled
```

**重要な確認ポイント**:
- ✅ "Vision Service initialized" が表示される
- ✅ エラーメッセージがない
- ✅ ポート3001でサーバーが起動

---

### **ステップ8: 動作確認**

#### **8-1: ヘルスチェック**

ブラウザで以下を開く：
- `http://localhost:3001/api/health`

**期待されるレスポンス**:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-30T...",
  "services": {
    "yahooFinance": "healthy",
    "cache": "healthy",
    "python": "healthy"
  }
}
```

#### **8-2: Vision API ヘルスチェック**

ブラウザで以下を開く：
- `http://localhost:3001/api/vision/health`

**期待されるレスポンス**:
```json
{
  "success": true,
  "service": "Vision API",
  "status": "healthy",
  "timestamp": "2026-01-30T..."
}
```

#### **8-3: フロントエンド動作確認**

1. ブラウザで `http://localhost:3001` を開く
2. **AI BLACK TRADING** のUIが表示される
3. シンボルを選択（例: USDJPY=X）
4. Interval: 15m、Range: 1d を選択
5. 「📥 Load Data」ボタンをクリック
6. チャートが表示される
7. **🤖 Analyze Chart** ボタンをクリック
8. 免責モーダルが表示される
9. チェックボックスをON → 「同意して続ける」
10. Vision Panelがスライドイン
11. Quick Analysis結果が表示される ✅

---

## ✅ インストール完了チェックリスト

### **環境チェック**
- [ ] Python 3.13インストール済み
- [ ] Node.js v20+インストール済み
- [ ] TA-Lib C/C++ライブラリ設置済み
- [ ] Visual C++ Redistributableインストール済み
- [ ] OpenAI APIキー取得済み

### **プロジェクトセットアップ**
- [ ] プロジェクトを `C:\Trading\trading-platform` に配置
- [ ] `.env` ファイル作成・APIキー設定完了
- [ ] Python仮想環境作成・有効化完了
- [ ] Python依存関係インストール完了（TA-Lib動作確認済み）
- [ ] Node.js依存関係インストール完了

### **ビルド・起動**
- [ ] `npm run build` 成功
- [ ] `npm run dev` でサーバー起動成功
- [ ] "Vision Service initialized" 表示確認
- [ ] `/api/health` でヘルスチェック成功
- [ ] `/api/vision/health` でVision API確認成功

### **動作確認**
- [ ] `http://localhost:3001` でUI表示
- [ ] チャートデータロード成功
- [ ] 🤖 Analyze Chart ボタン動作
- [ ] Quick Analysis結果表示成功
- [ ] Ask AI機能動作確認

---

## 🐛 トラブルシューティング

### **問題1: Python not found**

**症状**:
```
'python' is not recognized as an internal or external command
```

**解決策**:
1. Pythonを再インストール（"Add to PATH"をチェック）
2. または `py` コマンドを使用：
   ```cmd
   py -m venv venv
   ```

---

### **問題2: TA-Lib import error**

**症状**:
```
ImportError: DLL load failed while importing _ta_lib
```

**解決策**:
1. Visual C++ Redistributableをインストール
2. TA-Lib C/C++ライブラリのパス確認
3. 環境変数 `TA_LIBRARY_PATH` 確認
4. コマンドプロンプトを再起動

---

### **問題3: OPENAI_API_KEY is not set**

**症状**:
```
Error: OPENAI_API_KEY is not set in environment variables
```

**解決策**:
1. `.env` ファイルを確認
   ```cmd
   notepad .env
   ```
2. APIキーが正しく設定されているか確認
3. サーバーを再起動
   ```cmd
   # Ctrl+C でサーバー停止
   npm run dev
   ```

---

### **問題4: ポート3001が使用中**

**症状**:
```
Error: listen EADDRINUSE: address already in use :::3001
```

**解決策**:
1. 既存のプロセスを終了
   ```cmd
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F
   ```
2. または `.env` でポート変更
   ```env
   PORT=3002
   ```

---

### **問題5: npm install失敗**

**症状**:
```
npm ERR! code ENOENT
```

**解決策**:
```cmd
# キャッシュクリア
npm cache clean --force

# node_modules削除
rmdir /s /q node_modules
del package-lock.json

# 再インストール
npm install
```

---

## 📚 次のステップ

### **Phase 5機能を試す**
1. 様々なシンボルで分析（外国為替、株式、暗号通貨）
2. 異なる時間軸で比較（1m, 15m, 1h, 1d）
3. インジケーターの組み合わせを変える
4. Ask AIで質問応答をテスト

### **Phase 6の準備**
- 分析履歴保存機能の実装
- データベース設計（SQLite or MongoDB）
- エクスポート機能（PDF/JSON）

---

## 📞 サポート

インストール中に問題が発生した場合:
1. エラーメッセージを正確にコピー
2. 以下の情報を確認：
   - OS バージョン
   - Python バージョン (`python --version`)
   - Node.js バージョン (`node --version`)
   - エラーが発生したステップ
3. 上記情報とエラーメッセージをお知らせください

---

**インストール完了おめでとうございます！** 🎉  
Phase 5 Vision AI機能をお楽しみください！
