#!/usr/bin/env bash
# 公開の作成。フォーク元のアプリの作成をそのまま呼び、このフォークとの違いを直してから、
# このサーバーの利用ガイドをアプリの出力の中に作る。
set -euo pipefail
cd "$(dirname "$0")/.."

# フォーク元が作成に手順を足しても、そのまま従うため、フォーク元の作成を丸ごと呼ぶ
npm run build
# フォーク元の作成は、リリース用の設定の雛形を写すので、このフォークの設定で上書きする
cp src/assets/config.json dist/assets/config.json
# リリース用の圧縮ファイルは、Cloudflare Pages の 1 ファイルの大きさの上限を超えるので消す
rm -f dist/axe_*.zip

bash custom-scripts/build-guide.sh
