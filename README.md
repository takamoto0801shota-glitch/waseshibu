# わせしぶ（Atlas）

欲望を利用して学力向上を実現する意思決定OS。勉強は通貨、欲望が主役。

**開発・確認は Railway 上で行います。** ローカル `npm run dev` は補助用途のみ。

## 開発フロー

```
Cursor（コード編集）
    ↓ git push
GitHub（main ブランチ）
    ↓ 自動デプロイ
Railway（本番環境）
```

1. Cursor で変更
2. `main` に push
3. Railway が自動ビルド・デプロイ（数分）
4. Railway の URL で動作確認

## デプロイ URL

> Railway ダッシュボード → サービス → **Settings → Networking → Public URL**

初回セットアップ後、この README の「デプロイ URL」欄を更新してください。

| 環境 | URL |
|------|-----|
| Production | _（Railway デプロイ後に記載）_ |

## 技術スタック

- Next.js 15 + TypeScript + Tailwind CSS v4
- Zustand（localStorage: `waseshibu-v6`）
- OpenAI API（リズム調整・ロードマップ微調整）
- Railway（ホスティング）

## 画面フロー

```
/ → /menu（ロードマップ） → /session → /complete
```

## 環境変数

| 変数 | 必須 | 説明 |
|------|------|------|
| `OPENAI_API_KEY` | 推奨 | OpenAI API キー。未設定時はルールベース動作 |
| `PORT` | 自動 | Railway が自動設定 |
| `NODE_ENV` | 自動 | Railway が `production` を設定 |

詳細は [`.env.example`](./.env.example) を参照。

### Railway での設定手順

1. [Railway](https://railway.com) でプロジェクトを開く
2. サービス → **Variables**
3. `OPENAI_API_KEY` を追加（Raw モード推奨）
4. 保存後、自動で再デプロイ

## 初回セットアップ（GitHub + Railway）

### 1. GitHub リポジトリ

```bash
git init
git add .
git commit -m "Initial commit: waseshibu Atlas"
gh auth login
gh repo create waseshibu --public --source=. --remote=origin --push
```

### 2. Railway 連携

```bash
railway login
railway init          # 新規プロジェクト作成
railway link          # 既存プロジェクトに接続する場合
```

Railway ダッシュボードで:

1. **New Project** → **Deploy from GitHub repo**
2. `waseshibu` リポジトリを選択
3. **Settings → Source** で `main` ブランチを指定
4. **Variables** に `OPENAI_API_KEY` を設定
5. **Settings → Networking** で **Generate Domain** をクリック

`main` への push で自動デプロイが有効になります。

## 日常の開発

```bash
# 変更をコミット
git add .
git commit -m "変更内容の説明"
git push origin main
# → Railway が自動デプロイ
```

## ドキュメント

- [仕様書](./docs/仕様書.md)
- [開発ガイド](./docs/開発ガイド.md)

## ローカル開発（任意）

```bash
npm install
cp .env.example .env.local
# OPENAI_API_KEY を .env.local に設定
npm run dev
```

本番確認は Railway URL を使用してください。
