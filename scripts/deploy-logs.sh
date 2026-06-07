#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "==> ビルドログ（直近）"
railway logs --build 2>&1 | tail -40
