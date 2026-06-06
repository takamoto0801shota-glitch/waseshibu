#!/usr/bin/env bash
# GitHub + Railway 初回セットアップ
# 事前に `gh auth login` と `railway login` を完了してください。
set -euo pipefail

REPO_NAME="${1:-waseshibu}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> GitHub 認証確認"
gh auth status

echo "==> GitHub リポジトリ作成 & push"
if ! git remote get-url origin &>/dev/null; then
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
else
  git push -u origin main
fi

echo "==> Railway 認証確認"
railway whoami

echo ""
echo "==> 次のステップ（Railway ダッシュボード）"
echo "1. https://railway.com で New Project → Deploy from GitHub repo"
echo "2. リポジトリ: $REPO_NAME / ブランチ: main"
echo "3. Variables に OPENAI_API_KEY を設定"
echo "4. Settings → Networking → Generate Domain"
echo ""
echo "または CLI で:"
echo "  railway init"
echo "  railway variables set OPENAI_API_KEY=sk-..."
echo "  railway domain"
echo "  railway up"
