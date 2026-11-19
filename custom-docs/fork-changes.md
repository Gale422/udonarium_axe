# フォーク元のファイルに加えた変更

- custom-settings で、フォーク元のファイルに加えた変更と、フォーク元のファイルに頼る追加の一覧。フォーク元の更新を取り込んで載せ直したときに、自分の変更を、その目的から直すために使う
- どの行を足したか、元はどうだったかは、git の履歴（`git diff main...custom-settings -- <ファイル>`）で見る
- 載せ直しでぶつかったときは、フォーク元の変更を先に受け入れ、その上に、各変更の「目的」を満たすように自分の変更を書き直し、「確かめ方」で確かめる
- 各変更は、次の項目で書く
  - ファイル: 変えたファイルと、その役目
  - 変更: 何を足したり変えたりしたか
  - 目的: なぜ変えたか
  - 確かめ方: 変更が働いていることを確かめるテストや手順
  - フォーク元が変えたときの直し方: ぶつかったときと、ぶつからずに壊れうるときの直し方

## src/assets/config.json の追加

- ファイル: `src/assets/config.json`（アプリの設定ファイル。フォーク元の `.gitignore` で除外され、フォーク元には設定ファイルの雛形 `src/assets/config.json.example` だけがある）
- 変更: `git add -f` で記録に入れた。一度記録に入れると、以後の変更は、除外の指定と関係なく追跡される。設定ファイルの雛形は消さず、名前も変えない
- 目的: 公開先（Cloudflare Pages）で、自分の接続の方式とバックエンドのアドレスを使う
- 確かめ方: Cloudflare Pages のビルドコマンド（`deploy.md`「Cloudflare Pages の作成の設定」）が通ること
- フォーク元が変えたときの直し方: フォーク元が設定ファイルの雛形の項目を変えたら、`config.json` にも同じ項目をそろえる

## three-fence.spec.ts と bundled-models.spec.ts への変更

- ファイル: `src/app/infrastructure/three-fence.spec.ts` と `src/app/core/storage/bundled-models.spec.ts`（フォーク元のテスト）
- 変更: どちらも、`import { join } from 'node:path';` を `import { join } from 'node:path/posix';` にした
- 目的: この手元（Windows）でも、送信の前の自動確認（`npx vitest run`）を通し、送信できるようにする
  - Windows では `node:path` の `join` が、場所の区切りを「\」で組み立てるが、どちらのテストも、組み立てた場所を「/」で区切って比べていたので落ちていた
  - `node:path/posix` の `join` は、いつも「/」で組み立てる。Linux では今までと同じ動きになる
- 確かめ方: この手元で `npx vitest run src/app/infrastructure/three-fence.spec.ts src/app/core/storage/bundled-models.spec.ts` を流し、2 つが通ること
- フォーク元が変えたときの直し方
  - フォーク元が `join` の読み込みの行を変えたら、フォーク元の行を受け入れ、この手元で流して落ちるなら、区切りを「/」にそろえる同じ考え方で直し直す
  - フォーク元が Windows でも通るように直したら、自分の変更をやめる

## .gitignore への変更

- ファイル: `.gitignore`
- 変更: 終わりに、空行と、`*.local.spec.ts` を除外する行を足した
- 目的: 本物のキャラクターのデータを読む手元だけのテスト（`*.local.spec.ts`）を記録に入れない。手元だけの除外の設定（`.git/info/exclude`）は記録に残らず、取り違えて記録に入れるおそれがあるので、記録に残る `.gitignore` にした
- 確かめ方: `git status` に、手元だけのテストのファイルが出ないこと
- フォーク元が変えたときの直し方: フォーク元が `.gitignore` の終わりに行を足したら、両方を残す
