#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "==> 直近のデプロイ"
railway deployment list 2>/dev/null | head -8 || railway status
