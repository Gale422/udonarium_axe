#!/usr/bin/env bash
# このサーバーの利用ガイドの作成。フォーク元の利用ガイドの部品をそろえ、このサーバーの利用ガイドを作る。
# 出力先は、このサーバーの利用ガイドの設定が、利用ガイドの置き場所から決める。
set -euo pipefail
cd "$(dirname "$0")/.."

node custom-scripts/install-guide.mjs
cd website
# フォーク元の作成の前の手順（アプリのアイコンを利用ガイドに写す）を、そのまま呼ぶ。
# フォーク元が手順を足しても従うためと、利用ガイドの入口のページが、アイコンの絵を使うため
npm run prebuild
npx vitepress build hosted-guide
