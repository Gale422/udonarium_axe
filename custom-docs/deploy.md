# 公開の設定

- 自分用のブランチ custom-settings を、Cloudflare Pages で公開する設定と、その仕組み
- 公開先のアドレス、プロジェクトの名前、バックエンドの置き場所は、この文書には書かない（リポジトリの外に書いてある）

## Cloudflare Pages への公開の流れ

- GitHub の自分のフォークと結び付け、custom-settings への送信のたびに、Cloudflare 側で作成して公開する
- バックエンド（部屋のサーバー）のアドレスは、`src/assets/config.json` の `backend.url`。バックエンドの側で、公開先のアドレスからの接続を許可する
- フォーク元の自動処理（GitHub の Actions）は main への送信でだけ動き、custom-settings への送信では動かない
- 本番以外のブランチ（main など）を送信すると、試しの公開の作成が走るが、main には公開の作成の手順（`custom-scripts/build-pages.sh`）がないので失敗する。要らなければ、Cloudflare Pages の設定で、試しの公開をするブランチを「なし」にする

## Cloudflare Pages の作成の設定

- プロダクションブランチ: `custom-settings`
- フレームワークプリセット: None
- ビルドコマンド: `bash custom-scripts/build-pages.sh`。作成の手順をリポジトリの中に置き、手順の直しも送信だけで公開に届くようにする
- ビルド出力ディレクトリ: `dist`。`angular.json` の出力先が `dist` そのもののため
- ルートディレクトリ: 空。`package.json` がリポジトリのいちばん上の階層にあるため
- 環境変数 `NODE_VERSION`: `24`。作成の道具（`@angular/build`）が受け付ける Node.js の版のうち、フォーク元がテストと公開に使っている版に合わせる

## 公開の作成の手順

- フォーク元の本番用の作成（`npm run build`）をそのまま呼び、その後で、このフォークとの違いを直す。フォーク元が作成に手順を足しても、そのまま従うため
- 本番用の作成が写す設定ファイルの雛形を、自分の `src/assets/config.json` で上書きする
- 本番用の作成が作るアプリ全体の圧縮ファイルは、素材を全部含むので、Cloudflare Pages の 1 ファイル 25MB の上限を超える。そのため消す
- 最後に、このサーバーの利用ガイドを、アプリの出力の中の利用ガイドの置き場所に作る（`custom-docs/hosted-guide/`）

## 本番用の作成（npm run build）の仕組み

- `angular.json` の本番用の設定で、`src/assets/config.json` を素材から除き、作成の最後に、設定ファイルの雛形 `src/assets/config.json.example` を `dist/assets/config.json` に写す。雛形がないと、作成が止まる
- アプリ全体の圧縮ファイル `dist/axe_<版>.zip` を作る
- 設定ファイルの雛形と圧縮ファイルは、フォーク元のリリースで配るためのもの
  - 圧縮ファイルは、リリースの設定（`.releaserc.json`）が GitHub のリリースに付ける
  - 自分のサーバーに置く人は、リリースから圧縮ファイルを取って広げ、`assets/config.json` を自分のサーバーのアドレスに書き換える（`website/guide/quickstart.md`）
- フォーク元も、自分のサイトに公開するときは、作成の後で `dist/assets/config.json` を自分の値で書き換え、圧縮ファイルを上げない（`.github/workflows/deploy.yml`）
