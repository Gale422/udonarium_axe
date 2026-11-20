#!/usr/bin/env bash
# このサーバーの利用ガイドと、手元の確認用の起動の中継の設定のテスト。
# 利用ガイドの部品をそろえてから、アプリのコードの外のテスト用の設定で流す。テストは、利用ガイドを一時フォルダに作って確かめる。
set -euo pipefail
cd "$(dirname "$0")/.."

node custom-scripts/install-guide.mjs
# 公開の作成と同じく、フォーク元の作成の前の手順を通す。フォーク元がその手順を変えて止まるようになったことに、公開の前に気付くため
(cd website && npm run prebuild)
npx vitest run --config custom-scripts/vitest.guide.config.mts
