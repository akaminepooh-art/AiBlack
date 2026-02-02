# 🚀 Trading Platform デプロイガイド

## 📦 このプロジェクトについて

AI BLACK ScopeZX - トレーディングプラットフォーム
- フロントエンド: HTML/CSS/JavaScript
- バックエンド: Node.js/Express + TypeScript
- 指標計算: Python
- 認証: パスワード `akirakira`

---

## 🎯 デプロイ戦略

### フェーズ1: Render（開発・テスト）
- 無料枠で動作確認
- 15分でスリープ（初回アクセス30秒待ち）
- **今回実施**

### フェーズ2: Railway（本番運用）
- スリープなし
- 使った分だけ課金（$5-10/月程度）
- Renderで動作確認後に移行

---

## ⚡ クイックスタート（Render）

### ステップ1: GitHubリポジトリ作成

1. **GitHub.comにアクセス**: https://github.com
2. **新しいリポジトリを作成**:
   - 「New repository」をクリック
   - Repository name: `trading-platform`
   - Public または Private を選択
   - 「Create repository」をクリック

3. **このプロジェクトをプッシュ**:

```bash
# プロジェクトディレクトリに移動
cd trading-platform

# Gitリポジトリを初期化
git init

# すべてのファイルをステージング
git add .

# 初回コミット
git commit -m "Initial commit for Render deployment"

# GitHubのリモートリポジトリを追加（YOUR_USERNAMEを自分のユーザー名に変更）
git remote add origin https://github.com/YOUR_USERNAME/trading-platform.git

# メインブランチに変更
git branch -M main

# プッシュ
git push -u origin main
```

---

### ステップ2: Renderでデプロイ

#### 2-1. Renderアカウント作成

1. https://render.com にアクセス
2. 「Get Started」をクリック
3. GitHubアカウントでサインアップ

#### 2-2. 新しいWebサービスを作成

1. **ダッシュボードにアクセス**: https://dashboard.render.com
2. **「New +」→「Web Service」をクリック**
3. **「Connect a repository」でGitHubを選択**
4. **リポジトリを接続**:
   - 「Configure account」をクリック
   - Renderにリポジトリへのアクセスを許可
   - `trading-platform`リポジトリを選択

#### 2-3. サービス設定

以下の設定を入力:

```
Name: trading-platform
Region: Singapore (日本に最も近い)
Branch: main
Root Directory: (空欄のまま)
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
```

#### 2-4. プラン選択

- **Free**: 無料（15分でスリープ）← まずはこれで試す
- **Starter**: $7/月（常時稼働）

「Free」を選択してください。

#### 2-5. 環境変数設定

「Advanced」ボタンをクリックして展開し、以下の環境変数を追加:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `HOST` | `0.0.0.0` |
| `PYTHON_PATH` | `python3` |
| `PYTHON_INDICATORS_DIR` | `./python-indicators` |
| `PYTHON_TIMEOUT` | `30000` |
| `CACHE_ENABLED` | `true` |
| `CACHE_TTL` | `300` |
| `RATE_LIMIT_WINDOW` | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | `100` |
| `LOG_LEVEL` | `info` |

#### 2-6. デプロイ実行

1. **「Create Web Service」をクリック**
2. **ビルドが開始されます**（5-10分かかります）
3. **ログを確認**:
   - ビルド進行状況が表示されます
   - エラーが出た場合はログを確認

#### 2-7. デプロイ完了

- デプロイが完了すると、URLが発行されます
- 例: `https://trading-platform-xxxx.onrender.com`
- このURLをコピーしてください

---

### ステップ3: 動作確認

1. **RenderのURLにアクセス**
   - ブラウザで `https://trading-platform-xxxx.onrender.com` を開く

2. **認証ページが表示される**
   - パスワード: `akirakira`
   - 「ログイン」をクリック

3. **メインアプリが表示される**
   - チャートが表示されればOK！
   - 銘柄を検索してデータが取得できるか確認

4. **ブラウザコンソールを確認**（F12キー）
   - エラーがないか確認
   - API接続が成功しているか確認

---

## 🔄 Railwayへの移行（本番運用時）

Renderで動作確認ができたら、Railwayへ移行します。

### ステップ1: Railwayアカウント作成

1. https://railway.app にアクセス
2. 「Start a New Project」をクリック
3. GitHubアカウントでサインアップ

### ステップ2: プロジェクト作成

1. **「New Project」をクリック**
2. **「Deploy from GitHub repo」を選択**
3. **リポジトリを選択**: `trading-platform`
4. **「Deploy Now」をクリック**

### ステップ3: 環境変数設定

1. プロジェクトダッシュボードで「Variables」タブをクリック
2. Renderで設定した環境変数をすべてコピー:

```
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
PYTHON_PATH=python3
PYTHON_INDICATORS_DIR=./python-indicators
PYTHON_TIMEOUT=30000
CACHE_ENABLED=true
CACHE_TTL=300
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

3. 「Add」をクリックして保存

### ステップ4: ドメイン生成

1. **「Settings」タブをクリック**
2. **「Generate Domain」をクリック**
3. **URLが発行されます**: 例 `https://trading-platform-production.up.railway.app`

### ステップ5: 動作確認

1. RailwayのURLにアクセス
2. 認証ページでパスワード `akirakira` を入力
3. メインアプリが表示されればOK！

### ステップ6: Renderのサービスを停止

Railwayで正常に動作することを確認したら:

1. Renderダッシュボードにアクセス
2. サービスを選択
3. 「Settings」→「Delete Web Service」でサービスを削除

---

## 🐛 トラブルシューティング

### 問題1: ビルドエラー

**症状**: `npm install`や`npm run build`が失敗

**解決策**:
1. ローカルで`npm run build`が成功するか確認
2. Node.jsバージョンを確認（18.0.0以上が必要）
3. `package.json`の`engines`設定を確認

### 問題2: アプリが起動しない

**症状**: デプロイ成功後、ページが表示されない

**解決策**:
1. Renderの「Logs」タブでエラーを確認
2. 環境変数が正しく設定されているか確認
3. `PORT`が`0.0.0.0`にバインドされているか確認

### 問題3: Python指標が動作しない

**症状**: チャート表示はできるが、指標計算でエラー

**解決策**:
1. Renderの「Shell」タブで確認:
   ```bash
   which python3
   python3 --version
   ```
2. `PYTHON_PATH`環境変数を確認
3. Pythonスクリプトのパスを確認

### 問題4: 15分でスリープする

**症状**: アクセスしないと自動的にスリープ

**これは正常です**:
- Renderの無料プランの仕様
- 常時稼働が必要な場合は有料プラン（$7/月）に変更
- またはRailwayへ移行

### 問題5: API接続エラー

**症状**: ブラウザコンソールにCORSエラー

**解決策**:
1. バックエンドのCORS設定を確認
2. 環境変数に`CORS_ORIGIN`を追加（必要に応じて）

---

## 📊 コスト比較

| プラン | 月額 | スリープ | 帯域幅 | おすすめ用途 |
|-------|------|---------|--------|-------------|
| **Render Free** | $0 | あり（15分） | 100GB | 開発・テスト |
| **Render Starter** | $7 | なし | 100GB | 小規模本番 |
| **Railway** | $5-10 | なし | 無制限 | 本番運用 |
| **Railway Pro** | $20+ | なし | 無制限 | 大規模運用 |

---

## 🔐 セキュリティ

### 認証パスワードの変更

現在のパスワード `akirakira` を変更する場合:

1. `public/auth.html` を編集
2. 以下の行を変更:
   ```javascript
   const VALID_PASSWORD = 'akirakira'; // 新しいパスワードに変更
   ```
3. GitHubにプッシュ
4. Renderが自動的に再デプロイ

### 環境変数の管理

- **.env ファイルはGitにコミットしない**（.gitignoreに含まれています）
- **APIキー等の機密情報は環境変数に設定**
- **本番環境では必ず`NODE_ENV=production`を設定**

---

## 📚 参考リンク

- **Render公式ドキュメント**: https://render.com/docs
- **Railway公式ドキュメント**: https://docs.railway.app
- **Node.js on Render**: https://render.com/docs/deploy-node-express-app
- **GitHub Guide**: https://guides.github.com

---

## 🆘 サポート

### よくある質問

**Q: デプロイに失敗します**
A: ビルドログを確認してください。ほとんどの場合、エラーメッセージが原因を示しています。

**Q: カスタムドメインを使いたい**
A: Renderの「Settings」→「Custom Domain」から設定できます（有料プランが必要な場合があります）

**Q: データベースは必要ですか？**
A: このアプリは現在データベースを使用していません。すべてYahoo Finance APIからリアルタイムでデータを取得します。

**Q: RailwayとRenderどちらが良いですか？**
A: 
- テスト・開発: Render無料版
- 本番運用: Railway（スリープなし、パフォーマンス良好）
- 大規模: Render Starter以上（専用インスタンス）

---

## 🎉 完了！

おめでとうございます！これでトレーディングプラットフォームがクラウドにデプロイされました。

次のステップ:
1. ✅ 動作確認
2. ✅ パフォーマンステスト
3. ✅ 必要に応じてRailwayへ移行
4. ✅ カスタムドメイン設定
5. ✅ モニタリング設定

---

**作成日**: 2026年1月31日
**バージョン**: 1.0
