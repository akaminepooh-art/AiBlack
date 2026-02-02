# ⚡ クイックスタートガイド

**5分でRenderにデプロイ！**

---

## 📝 準備するもの

- ✅ GitHubアカウント
- ✅ Renderアカウント（GitHubで登録可能）
- ✅ このプロジェクトのファイル

---

## 🚀 デプロイ手順（3ステップ）

### ステップ1: GitHubにプッシュ（2分）

```bash
cd trading-platform

git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/trading-platform.git
git branch -M main
git push -u origin main
```

**YOUR_USERNAMEを自分のGitHubユーザー名に変更してください**

---

### ステップ2: Renderでデプロイ（2分）

1. **Renderにアクセス**: https://render.com
2. **GitHubでサインアップ**
3. **「New +」→「Web Service」**
4. **リポジトリを接続**: `trading-platform`
5. **設定**:
   ```
   Name: trading-platform
   Region: Singapore
   Runtime: Node
   Build: npm install && npm run build
   Start: npm start
   Plan: Free
   ```
6. **環境変数を追加**（下記参照）
7. **「Create Web Service」**

---

### ステップ3: 環境変数設定（1分）

「Advanced」をクリックして、以下を追加:

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

---

## ✅ 完了！

5-10分後、RenderがURLを発行します:
- 例: `https://trading-platform-xxxx.onrender.com`

URLにアクセスして、パスワード `akirakira` でログイン！

---

## 🔄 Railway移行（本番運用時）

Renderで動作確認したら、Railwayへ移行:

1. https://railway.app にアクセス
2. GitHubでサインアップ
3. 「New Project」→「Deploy from GitHub repo」
4. 同じリポジトリを選択
5. 環境変数をコピー
6. ドメイン生成

**完了！Railwayはスリープなしで常時稼働します。**

---

## 💰 コスト

| サービス | 料金 | 用途 |
|---------|------|------|
| Render Free | $0/月 | 開発・テスト |
| Railway | $5-10/月 | 本番運用 |

---

## 🆘 問題が発生したら？

1. `DEPLOYMENT_GUIDE.md` を読む（詳細手順）
2. `CHECKLIST.md` で確認（チェックリスト）
3. Renderの「Logs」タブでエラー確認

---

**それでは、デプロイを楽しんでください！🚀**
