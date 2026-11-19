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

## imported-character.ts の型の拡張

- ファイル: `src/app/domain/character/import/imported-character.ts`（取り込みの中間の形）。このファイルは変えていない
- 変更: 新しいファイル `src/app/domain/character/import/imported-character-extension.ts` の終わりの型の拡張（`declare module`）で、このファイルの型に、省略できる項目を足した。型の検査のときだけ効き、動く処理は変わらない
  - `ImportedField`: `resource`（リソースの値。最大値）と `settings`（欄の設定）
  - `ImportedGroup`: `settings`（見出しの設定）
- 目的: ゆとシートのアリアンロッド2E の取り込みが、アックスに元からある欄の設定（単位、最小値、増減でエフェクト、ポップアップ）と、中の見出しの中のリソースの項目を、組み立てに運べるようにする。コマの機能は広げず、運ぶ入れ物だけを、フォーク元のファイルを変えずに広げる
- 確かめ方: `src/app/domain/character/import/imported-field-attributes.spec.ts` と `src/app/domain/character/import/system-profiles/ytsheet-ar2e-profile.spec.ts` が通ることと、`npm run build` の型の検査が通ること
- フォーク元が変えたときの直し方
  - フォーク元が `ImportedField` に `resource` か `settings`、`ImportedGroup` に `settings` という同じ名前の項目を違う型で足すと、載せ直しではぶつからないが、型の拡張と食い違って、型の検査が「後の宣言は同じ型でなければならない」で落ちる。そのときは、自分の項目の名前を変えるか、フォーク元の型に合わせる
  - フォーク元が中の見出しにリソースや設定を置けるようにしたときは、自分の型の拡張をやめて、フォーク元の形に合わせられないかを先に考える。合わせたら、設計書「取り込みの概念」の表の、取り込みの中間の形の行と、「取り込みの設計の方針」も直す

## imported-character-factory.ts への変更

- ファイル: `src/app/domain/character/import/imported-character-factory.ts`（中間の形からコマを組み立てる）
- 変更
  - `imported-field-attributes.ts` の 3 つの関数を読み込む行を足した。元の読み込みの行は変えていない
  - `appendSections`: 中の見出しを作った直後に、`withImportedGroupSettings(groupElement, group.settings)` を呼ぶ 1 行を足した
  - `createImportedField`: 最初に、リソースの値のある項目なら `createImportedResourceElement(field, field.resource)` で作って返す 1 行を足し、最後の `return` を、`withImportedFieldSettings` で設定を書いてから返す形に変えた。引数の型は元のまま
- 目的: 中間の形に足したリソースの値と設定を、アックスの欄と属性にする。欄と属性への直し方そのものは、新しいファイル `imported-field-attributes.ts` に置く
- 確かめ方: 次のテストが通ること
  - `src/app/domain/character/import/imported-field-attributes.spec.ts`。そのうち「組み立ては、中の見出しの項目のうち、リソースの値のある項目をリソースの欄に、ない項目を種類どおりの欄にする」が、組み立てに足した分かれ道を見張る
  - `src/app/domain/character/import/system-profiles/ytsheet-ar2e-profile.spec.ts`
  - フォーク元の `src/app/domain/character/import/imported-character-factory.spec.ts`（ほかの取り込みが変わらないこと）
- フォーク元が変えたときの直し方
  - フォーク元が `appendSections` や `createImportedField` を書き換えたときは、フォーク元の形を受け入れ、見出しの設定、リソースの分かれ道、項目の設定の 3 か所を、同じ位置に入れ直す
  - フォーク元が `appendStatuses` でリソースの欄を作る形（属性の組と現在値の置き方）を変えたときは、載せ直しではぶつからないが、`imported-field-attributes.ts` の `createImportedResourceElement` がその形の写しなので、`imported-field-attributes.spec.ts` の「アックスの組み立てが中間の形のリソースから作る欄と同じ形になる」のテストが落ちる。そこで写しをそろえる

## character-import-format.ts への変更

- ファイル: `src/app/domain/character/import/character-import-format.ts`（貼られたデータの形式の見分け）
- 変更: `ytsheet-ar2e-profile.ts` を読み込む行と、`parseImportedCharacterJson` の、ソード・ワールド2.5 を見分ける行の前に、アリアンロッド2E を見分けて組み立てる 1 行を足した
- 目的: ゆとシートのアリアンロッド2E の PC のシートを、ゆとシートの汎用の読み取りより先に、専用の取り込みで読む。ソード・ワールド2.5 の前に置くのは、ゆとシートの汎用の見分けより前で、ほかの専用の見分けとぶつからない位置にするため
- 確かめ方: `src/app/domain/character/import/system-profiles/ytsheet-ar2e-profile.spec.ts` と、フォーク元の `src/app/domain/character/import/character-import-format.spec.ts` が通ること
- フォーク元が変えたときの直し方: フォーク元が見分けの並びを変えたら、ゆとシートの汎用の見分け（`isYtsheetCharacter`）より前に、1 行を入れ直す

## .gitignore への変更

- ファイル: `.gitignore`
- 変更: 終わりに、空行と、`*.local.spec.ts` を除外する行を足した
- 目的: 本物のキャラクターのデータを読む手元だけのテスト（`*.local.spec.ts`）を記録に入れない。手元だけの除外の設定（`.git/info/exclude`）は記録に残らず、取り違えて記録に入れるおそれがあるので、記録に残る `.gitignore` にした
- 確かめ方: `git status` に、手元だけのテストのファイルが出ないこと
- フォーク元が変えたときの直し方: フォーク元が `.gitignore` の終わりに行を足したら、両方を残す
