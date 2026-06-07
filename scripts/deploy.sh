#!/usr/bin/env bash
# わせしぶ → Railway 本番デプロイ
# 使い方: npm run deploy
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Railway デプロイを開始します"

if ! command -v railway >/dev/null 2>&1; then
  echo "エラー: Railway CLI がありません"
  echo "  npm install -g @railway/cli"
  echo "  railway login"
  exit 1
fi

if ! railway status >/dev/null 2>&1; then
  echo "エラー: Railway プロジェクトに未リンクです"
  echo "  cd $(pwd)"
  echo "  railway login"
  echo "  railway link   # プロジェクト atlas → サービス atlas を選択"
  exit 1
fi

echo "==> ローカルでビルド確認 (npm run build)"
npm run build

echo "==> 最新コードを Railway にアップロードしてビルド"
railway up --detach

echo ""
echo "デプロイをキューに入れました。"
echo "  状態確認:  npm run deploy:status"
echo "  ログ確認:  npm run deploy:logs"
echo "  本番を開く: npm run deploy:open"
echo ""
railway domain 2>/dev/null || true
