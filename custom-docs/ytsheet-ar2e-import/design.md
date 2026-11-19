# ゆとシートのアリアンロッド2E の取り込みの設計書

- 仕様: `spec.md`
- フォーク元のファイルへの変更: `../fork-changes.md`
- コードの置き場所: `src/app/domain/character/import/`（以下、この下のパス）

## 取り込みの設計の方針

- 要件は、データを適切にコマに設定することなので、アックスのコマのデータの形（欄の種類や属性）は変えず、変えるのは、取り込みの途中でデータを運ぶ入れ物（中間の形）だけにする
- 概念は、どれも「何が変わると変わるか」が 1 つになるように切り分ける
- フォーク元のファイルは、新しいファイルの処理を呼ぶ行を足すだけにし、組み立ての既存の処理を新しいファイルへ移さない。移すと、載せ直しでぶつかりやすいため
- 中間の形の型は、フォーク元のファイルを変えずに、新しいファイルの型の拡張（`declare module`）で広げる
  - そのため、リソースの項目は、別の種類の項目の型にせず、数値の項目に、省略できるリソースの値（最大値）を足したものとして表す。別の種類にすると、フォーク元の項目の型の分かれ道を書き換えることになるため
  - 「項目の値の形を、項目の種類ごとの型で持つ」形からは外れるが、フォーク元の変更を少なくする方針（`udonarium-axe/CLAUDE.md`）を優先する

## 取り込みの概念

| 概念 | 意味 | 変わるのは | 持たないもの |
| --- | --- | --- | --- |
| ゆとシートの記録 | ゆとシートが出す項目名と値。文字・数として取り出し、欠けは「なし」で返す | ゆとシートの書式 | ルールの意味、アックスの書き方 |
| ゆとシートの文字 | HTML の書き方を戻し、ゆとシートの画面に表示されるとおりにした文字 | ゆとシートの文字の書式 | アックスの事情 |
| 読み手 | 記録を、ルールの言葉のキャラクターに読み替える。版の違いの補い、手の見分け、取得元の言葉、ダイス数の補い | ゆとシートの版や、人による書き癖 | 欄の並べ方、アックスの書き方 |
| アリアンロッド2E のキャラクター | ルールの言葉で見たキャラクター | ルールの捉え方 | ゆとシートの項目名、アックスの名前 |
| アリアンロッド2E の一覧 | ルールが決めている固定の一覧。能力値、判定の種類、バッドステータスと回復のタイミング、タイミングの並びと分け方 | ルール | キャラクターごとの値 |
| 攻撃の組み合わせ | 手と合計の仕方から決まる、命中とダメージの行の組（右手・左手・合計と、その武器） | 合計の仕方の決まり | 行の文字、欄の名前 |
| 参照の名前 | 欄とパレットの間の約束。決まった項目の名前と、スキルの置き場（見出しと項目の名前）。シートのデータから作る名前は、参照で読めるように半角に直すだけで、重なっても変えない | アックスの参照の決まり、ゆとシートの変数名 | 欄の見た目、パレットの文面 |
| 欄の案 | コマの見出し・項目・設定 | 欄の案を変えたいとき | パレット、ゆとシートの項目名 |
| パレットの案 | 見出しの並びと行の書き方 | パレットの案を変えたいとき | 欄の見た目、ゆとシートの項目名 |
| アックスの書き方 | アックスが読む書き方。見出しの行、参照の形と `/` `\` の逃がし、参照で読める名前（半角）、`LZ`、`/デバフ`、名前を囲む ≪≫ | アックス | ゲームのルール |
| 見分けと組み立て | 貼られたデータがアリアンロッド2E の PC かを見分け、ほかの概念をつないで中間の形を作る | 取り込みの流れ | 個々の決まり |
| 取り込みの中間の形（フォーク元） | 取り込みの共通の入れ物。項目のリソースの値（`ImportedResource`）、項目の設定、見出しの設定は、別々の型にして `imported-character-extension.ts` に置き、そのファイルの型の拡張で、項目（`resource`、`settings`）と見出し（`settings`）に、省略できる項目として足す。リソースの項目は、種類が数値で、値が現在値、`resource` の最大値を持つ項目 | フォーク元 | ゲームの事情 |
| 広げた分の組み立て | 取り込みの中間の形を広げた分（項目のリソースの値、項目と見出しの設定）を、アックスの欄と属性に直す。リソースの値のある項目からはリソースの欄を作り、設定は欄と見出しの属性に書く。属性の名前と書き方は、アックスの画面の設定欄と組み立てが書くものと同じにする | アックスの欄の形と属性 | ゲームの事情 |

- 欄の案とパレットの案は、お互いを知らない。どちらも、ルールの言葉と参照の名前だけを使う
- 手の概念は「武器を持つか持たないか」だけを表す（盾と空は、どの合計の仕方でも同じ扱いのため）
- シートの値は、書かれたまま運ぶ（仕様書「ゆとシートの値の扱い」）
  - どの概念も、変な値を見分けて直す処理を持たない。値のせいで動かない行は、シートの値のせいとして扱う
  - ただし、変な値でも、取り込みの処理が壊れてはいけない
    - 例: スキルの名前が決まった項目の名前と重なっても、決まった項目の設定はそのスキルに付かない

### 取り込みの概念テスト

- 誰が、何に対して、何をするか
  - ゆとシートの文字が、記録の文字を、ゆとシートの画面に表示されるとおりの文字に読む
  - 読み手が、記録を、アリアンロッド2E のキャラクターに読み替える
  - アリアンロッド2E の一覧が、スキルのタイミングと判定を分類する
  - 参照の名前が、スキルの置き場と、シートのデータから作る名前を決める
  - 攻撃の組み合わせが、手と合計の仕方から、命中とダメージの行の組を決める
  - 欄の案が、キャラクターと置き場から、見出しと項目と設定を並べる
  - パレットの案が、スキルの置き場と行の組から、パレットの文を書く
  - アックスの書き方が、名前を参照で読める名前にし、参照や操作の行の形を書く
  - 広げた分の組み立てが、リソースの値のある項目をリソースの欄にし、項目と見出しの設定を、アックスの属性に直す
  - 見分けと組み立てが、これらをつないで、中間の形を作る

## 取り込みのファイルの分け方

```text
imported-character-extension.ts     取り込みの中間の形を広げる型
ytsheet-record.ts                   ゆとシートの記録
ytsheet-text.ts                     ゆとシートの文字
axe-notation.ts                     アックスの書き方
imported-field-attributes.ts        広げた分の組み立て
system-profiles/
  ytsheet-ar2e-profile.ts           見分けと組み立て
  ytsheet-ar2e/
    ar2e-character.ts               アリアンロッド2E のキャラクター（型だけ）
    ar2e-catalog.ts                 アリアンロッド2E の一覧
    ar2e-character-reader.ts        読み手
    attack-plan.ts                  攻撃の組み合わせ
    reference-names.ts              参照の名前
    ar2e-sheet-layout.ts            欄の案
    ar2e-palette.ts                 パレットの案
```

- ゆとシートとアックスに共通の概念（ゆとシートの記録、ゆとシートの文字、アックスの書き方、広げた分の組み立て）は、アリアンロッド2E のことを知らないので、ほかのシステムでも使えるように `import/` の直下に置く
- アリアンロッド2E だけの概念は `system-profiles/ytsheet-ar2e/` に置く

### 取り込みの部品の作り

- 状態を持たない変換は関数にする
- クラスは「ゆとシートの記録」だけ（生の記録を隠し、読み手の関数を短くするため）
- 「同じ形で、違いだけを書く」部品は、工場の関数にする。継承は使わない
  - 欄の案: 項目の種類ごとの工場（数値、ダイス数、テキスト、長文、リソース）
  - パレットの案: 見出しのかたまり（見出しと行）を作る関数を、見出しの並びの順に呼ぶ
  - 判定と受動判定の行: 比べる相手（使う人が決めるか、目標値を使うか）だけを変えて、同じ関数で作る
    - 比べる相手ごとの違い（比べる値、ダメージとして読む量、使う人への案内）は、1 つの表にまとめる
  - 振り方 `{ダイス数の項目}D6+{値の項目}` と、比べる部分 `>=値` は、それぞれ 1 つの関数で作る
- 既定の処理を土台にし、条件付きの処理が上書きする
  - スキルの使う行: 判定の部分の既定は空。判定の選択肢の種類（判定、回避判定）ごとの振り方が上書きし、命中判定は攻撃の組み合わせが上書きする
  - 判定のダイス数: 既定は記録の値。特殊な判定だけ、ないときに、元の能力値の判定のダイス数で補う
    - 仕様書の「能力値と判定の値の読み方」と、その下の「ダイス数がない特殊な判定のダイス数」の重なりと同じ形
    - 元の能力値は、特殊な判定だけが持つ。能力値の判定の元の能力値はその判定自身で、持つ意味がないため
  - 欄の設定: 既定（設定なし）の上に、項目の種類ごとの設定（ダイス数は単位 D）、決まった項目ごとの設定の表の順に重ねる
    - 範囲の狭い指定ほど優先する、仕様書の書き方と同じ重ね方。どの種類の項目も、同じ重ね方の関数を通る
    - 決まった項目ごとの設定の表は、決まった項目の識別子（`AR2E_FIELD_NAMES` の見出し）で引く。識別子 1 つから名前と設定の組を引き（`fixed`）、項目を作る部品はその組を受け取るので、名前と設定を取り違えない
      - 画面に出る名前で引くと、決まった項目と同じ名前のスキルに、その設定が付いてしまうため
      - スキルの項目は、決まった項目ごとの設定を渡さない、ふつうの長文の項目になる
- 決まりは 1 か所に書き、ほかはそこから作る
  - 判定の選択肢の名前は、判定の一覧の名前から作る
  - バッドステータスが自然に消えるかの見分けは、付ける行と外す行の両方が同じ関数を使う
  - 参照で読める名前への直し方は、アックス本体が参照の名前を半角に直す関数（`toHalfWidth`）をそのまま使う
- アックスの書き方のうち、パレットの書き方の例の行（`&!バフ名/項目/+/量/R数` など）は、使う人への書き方の例なので、パレットの案に置く。キャラクターのデータから作る書き方（参照、リソース操作、バッドステータスのバフ）は、アックスの書き方に置く

### 取り込みの部品の主な型と関数

- 並びは、「取り込みのファイルの分け方」の図と同じ
- `imported-character-extension.ts`
  - `ImportedResource`、`ImportedFieldSettings`、`ImportedGroupSettings`: 項目のリソースの値、項目の設定、見出しの設定の型
  - 型の拡張（`declare module`）: 中間の形の項目（`ImportedField`）に `resource` と `settings` を、見出し（`ImportedGroup`）に `settings` を、省略できる項目として足す
- `ytsheet-record.ts`
  - `YtsheetRecord`: `text(key)`、`number(key)`、`firstWholeNumber(...keys)`、`indexesOf(prefix, suffix)`
    - `firstWholeNumber`: 最初に数として読めた値の整数の部分（小数の部分は 0 に向けて切り捨てる）を、書かれた数字から、桁に限りのない整数（`bigint`）で返す。行の数を、書かれた数のとおりに比べるため
    - `indexesOf`: 番号の付いた項目のうち、記録にある番号を、桁に限りのない整数で返す
- `ytsheet-text.ts`
  - `readYtsheetText(raw, shape)`: 記録の文字を、ゆとシートの画面に表示されるとおりの文字に読む。`shape` は欄の形で、次の 3 つ
    - `line`（1 行の欄）: 前後の半角の空白・タブ・改行の文字を除き、HTML の書き方を戻す
    - `multiline`（複数行の欄）: HTML の書き方を戻す
    - `url`（アドレスの欄。項目名が `URL` で終わる欄）: 1 行の欄と同じく前後を除き、HTML の書き方は戻さない
- `axe-notation.ts`
  - `referableNameOf`: 名前を、アックスの参照で読める名前にする（全角の英数字と記号を半角に）
  - `referenceTo`、`pathReferenceTo`、`maxPathReferenceTo`、`TARGET_NUMBER`: 参照の形
  - `paletteHeadingLine`、`resourceCommand`、`skillMark`、`debuffCommand`、`damageOverTimeDebuffCommand`、`removeBuffCommand`
  - `AxeBuffTiming`、`AxeBuffEnding`: バフの消えるタイミングと残りの数
- `imported-field-attributes.ts`
  - `createImportedResourceElement(field, resource)`: 項目と、そのリソースの値から、アックスのリソースの欄を作る。最大値を値に、項目の値を現在値に置き、最小値は下限のベースに書く
    - アックスの組み立ての写しであることと、ずれへの備え: `../fork-changes.md`「imported-character-factory.ts への変更」
  - `withImportedFieldSettings`: リソースでない項目の設定を、アックスの属性として書く。最小値は `min` に書く
  - `withImportedGroupSettings`: 中の見出しの設定を、アックスの属性として書く
- `system-profiles/ytsheet-ar2e-profile.ts`
  - `isYtsheetAr2eCharacter(parsed)`、`buildYtsheetAr2eCharacter(parsed)`
- `system-profiles/ytsheet-ar2e/ar2e-character.ts`
  - `Ar2eCharacter` と、その中の型（能力値、判定、戦闘、手、合計の仕方、スキル、誓約、コネクション、プロフィール）
- `system-profiles/ytsheet-ar2e/ar2e-catalog.ts`
  - `AR2E_ABILITIES`、`AR2E_CHECKS`（能力値の判定と特殊な判定）、`AR2E_SPECIAL_CHECKS`（特殊な判定。ダイス数の元になる能力値を持つ）、`AR2E_BAD_STATUSES`、`AR2E_TIMINGS`、`AR2E_NONE_MARKS`（「なし」の書き方）
  - `timingOf`: タイミングの文字を、決まったタイミングに分ける。どれにも当たらなければ null（書かれたままのタイミングになる）
  - `ar2eCheckOf`: 判定を識別子で引く
  - `skillCheckOf`、`Ar2eSkillCheck`: 判定の文字を、判定の選択肢に分ける
- `system-profiles/ytsheet-ar2e/ar2e-character-reader.ts`
  - `readAr2eCharacter(record)`
- `system-profiles/ytsheet-ar2e/attack-plan.ts`
  - `planAttacks(hands, handedness)`: 命中判定とダメージの行の組
- `system-profiles/ytsheet-ar2e/reference-names.ts`
  - 決まった項目の名前（`AR2E_FIELD_NAMES`、`abilityFieldNames`、`checkFieldNames`、`handFieldNames`）
  - `SKILL_SECTION_NAME`
  - `resourceFieldPath(name)`、`RESOURCE_SECTION_NAME`、`RESOURCE_GROUP_NAME`: リソースの欄の項目までの見出しの道。全回復の行の見出しをたどる参照と、欄の案のリソースの欄の見出しが使う
  - `placeSkills(skills)`、`SkillHeading`、`PlacedSkill`: スキルの置き場（タイミングの見出しと項目の名前）
  - `sheetGroupNameOf(name)`: 誓約とコネクションの見出しの名前
- `system-profiles/ytsheet-ar2e/ar2e-sheet-layout.ts`
  - `layoutAr2eSheet(character, skills)`: 中間の形の欄の並び
  - `skillDescriptionOf(skill)`: スキルの説明の文
- `system-profiles/ytsheet-ar2e/ar2e-palette.ts`
  - `writeAr2ePalette(skills, attacks)`: パレットの文
    - キャラクターの値は読まない。行は欄を参照するので、決まった項目の名前、スキルの置き場、行の組だけで書ける

## 取り込みの処理の流れ

1. 利用者が、ゆとシートのキャラクターのアドレスを貼る
2. 既存の `import-source.ts` が、`mode=json` のアドレスに直して取ってくる（変更なし）
3. `character-import-format.ts` が、`isYtsheetAr2eCharacter` で見分ける（ソード・ワールド2.5 の前）
4. `buildYtsheetAr2eCharacter` が、次の順に作る
   1. `YtsheetRecord` で記録を包む
   2. `readAr2eCharacter` でキャラクターに読み替える
   3. `placeSkills` でスキルの置き場を決める
   4. `planAttacks` で命中とダメージの行の組を決める
   5. `layoutAr2eSheet` で欄を並べる
   6. `writeAr2ePalette` でパレットを書く
   7. 中間の形に、名前・色・ダイスボット・欄・パレットを入れる
      - 中間の形のリソース・パラメータ・メモ・参照元は使わない（既存の組み立てが同じ名前の欄を別に作り、重なるため）
5. 既存の `imported-character-factory.ts` がコマを組み立てる
   - 組み立てに足した行が、`imported-field-attributes.ts` を呼ぶ。リソースの値のある項目はリソースの欄にし、項目と見出しの設定は属性に書く

## 取り込みの仕様書の見出しと受け持ちの対応表

- 仕様を変えるときは、この表で直すファイルを決める
- 受け持ちは 1 つの概念。手伝いの列は、受け持ちが使う部品

| 仕様書の見出し | 受け持ちの概念 | 受け持ちのファイル | 手伝い |
| --- | --- | --- | --- |
| 取り込みの対象 | 見分けと組み立て | `system-profiles/ytsheet-ar2e-profile.ts` | `character-import-format.ts`（呼び出しの 1 行） |
| ゆとシートの値の扱い | どの概念も、変な値を見分けて直す処理を持たない | 加工する所は、その見出しの受け持ちのファイル | |
| ゆとシートの値の読み方 | 読み手 | `ytsheet-ar2e/ar2e-character-reader.ts` | `ytsheet-record.ts`、`ytsheet-text.ts` |
| ゆとシートの文字の読み方 | ゆとシートの文字 | `ytsheet-text.ts` | |
| 参照元のアドレスの読み方 | ゆとシートの文字 | `ytsheet-text.ts`（アドレスの欄の形） | `ar2e-character-reader.ts`（参照元をアドレスの欄として読む） |
| コマの名前と色の読み方 | 読み手 | `ytsheet-ar2e/ar2e-character-reader.ts` | |
| 能力値と判定の値の読み方 | 読み手 | `ytsheet-ar2e/ar2e-character-reader.ts` | `ar2e-catalog.ts` |
| ダイス数がない特殊な判定のダイス数 | 読み手 | `ytsheet-ar2e/ar2e-character-reader.ts` | `ar2e-catalog.ts`（元の能力値） |
| 戦闘とリソースの値の読み方 | 読み手 | `ytsheet-ar2e/ar2e-character-reader.ts` | |
| 手に持つものの読み方 | 読み手 | `ytsheet-ar2e/ar2e-character-reader.ts` | |
| 右手と左手の合計の仕方の読み方 | 読み手 | `ytsheet-ar2e/ar2e-character-reader.ts` | |
| 右手と左手の値がないキャラクターの合計の仕方 | 読み手 | `ytsheet-ar2e/ar2e-character-reader.ts` | |
| 番号の付いた行の読み方 | 読み手 | `ytsheet-ar2e/ar2e-character-reader.ts` | `ytsheet-record.ts`（記録にある番号） |
| スキルの値の読み方 | 読み手 | `ytsheet-ar2e/ar2e-character-reader.ts` | |
| スキルの取得元の言葉 | 読み手 | `ytsheet-ar2e/ar2e-character-reader.ts` | |
| 誓約とコネクションの値の読み方 | 読み手 | `ytsheet-ar2e/ar2e-character-reader.ts` | |
| 携行品とプロフィールの値の読み方 | 読み手 | `ytsheet-ar2e/ar2e-character-reader.ts` | |
| アックスに載せる文字 | アックスの書き方 | `axe-notation.ts`（`skillMark`） | 呼ぶ側: `ar2e-sheet-layout.ts`、`ar2e-palette.ts` |
| シートのデータから作る名前 | 参照の名前 | `ytsheet-ar2e/reference-names.ts` | `axe-notation.ts`（`referableNameOf`） |
| 重なった名前 | 参照の名前 | `ytsheet-ar2e/reference-names.ts` | `ar2e-sheet-layout.ts`（決まった項目の設定を、決まった項目にだけ付ける） |
| スキルのタイミングの見出し | 参照の名前 | `ytsheet-ar2e/reference-names.ts` | `ar2e-catalog.ts`、`axe-notation.ts` |
| スキルのタイミングの分け方 | アリアンロッド2E の一覧 | `ytsheet-ar2e/ar2e-catalog.ts` | |
| コマのダイスボット | 見分けと組み立て | `system-profiles/ytsheet-ar2e-profile.ts` | |
| 取り込んだコマの欄（下の見出しのうち、この表に行のないもの） | 欄の案 | `ytsheet-ar2e/ar2e-sheet-layout.ts` | `reference-names.ts`、`axe-notation.ts` |
| リソースの欄 | 欄の案 | `ytsheet-ar2e/ar2e-sheet-layout.ts` | `reference-names.ts`、`imported-field-attributes.ts`（リソースの値のある項目から、リソースの欄を作る） |
| スキルの説明 | 欄の案 | `ytsheet-ar2e/ar2e-sheet-layout.ts` | |
| 欄の項目の設定 | 欄の案 | `ytsheet-ar2e/ar2e-sheet-layout.ts` | |
| 欄の設定の書き方 | 広げた分の組み立て | `imported-field-attributes.ts` | `imported-character-factory.ts`（呼び出し） |
| 取り込んだコマのチャットパレット | パレットの案 | `ytsheet-ar2e/ar2e-palette.ts` | `axe-notation.ts`、`reference-names.ts` |
| 判定・受動判定・リソース操作・バフ操作の見出しのかたまり | パレットの案 | `ytsheet-ar2e/ar2e-palette.ts` | `ar2e-catalog.ts`、`reference-names.ts`（リソースの欄の見出しの道） |
| バッドステータスの行 | パレットの案 | `ytsheet-ar2e/ar2e-palette.ts` | `ar2e-catalog.ts`（一覧と回復のタイミング）、`axe-notation.ts` |
| 能動判定の見出しのかたまり | パレットの案 | `ytsheet-ar2e/ar2e-palette.ts` | `attack-plan.ts` |
| 能動判定の手の組み合わせ（下の見出しすべて） | 攻撃の組み合わせ | `ytsheet-ar2e/attack-plan.ts` | |
| パレットのスキルの見出しのかたまり（下の見出しすべて） | パレットの案 | `ytsheet-ar2e/ar2e-palette.ts` | `ar2e-catalog.ts`（`skillCheckOf`）、`attack-plan.ts` |

## 取り込みのテストの作り

- テストは、例をいくつか試すのでなく、仕様書から書き写した一覧や表を、全部の対象に当てる
  - 例: 決まったタイミングのすべて、判定の選択肢のすべて、合計の仕方と手の持ち方の全部の組み、パレットのリソース操作の行とダイスを振る行のすべて、バッドステータスのすべて
  - 当てた対象の数が、書き写した一覧や表の数と同じかも確かめ、対象が 0 件のまま通る空振りを防ぐ
- 仕様書の見出しは、どれも、少なくとも 1 つのテストのまとまりで確かめる
- 架空のシートと下準備は `src/app/testing/ytsheet-ar2e/` に置く
  - `ytsheet-ar2e-fixtures.ts`: 架空のシートの土台と、それを 1 か所ずつ変える道具（手の持ち方、合計の仕方、スキル、誓約とコネクションの行、項目を消す、など）。各テストには、変える呼び出しだけを書く
    - 架空のシートを読み手でキャラクターに読む部品（`ar2eCharacterOf`）も、ここに置く。単体のテストが、コマ・チャット・ダイスの部品まで読み込まないようにするため
    - 土台（`baseSheet`）は、架空のキャラクター 1 人。名前も値も作り物で、どの本物のキャラクターの写しでもない
    - 境目の値、改行の入った名前、変な記号の名前、手の組み合わせなどは、見本で見つかった形を元に、土台を変えて作る
  - `ytsheet-ar2e-piece.ts`: 本物の処理を呼ぶ下準備
    - 取り込みから組み立てまで通してコマを作る（`importAr2ePiece`）。作ったコマを渡し、使い終わったら片付ける形もある（`withImportedPiece`。渡した処理が待つ処理なら、待ち終わってから片付ける）
    - 参照が当たる要素を、パレットとリソース操作が欄を探すのと同じ入口で探し、見出しでなく項目のときだけ返す（`findFieldOf`）。参照が見出しに当たると、その行は空の発言になって動かないため
    - パレットの行を、パレットから送るときと同じ順（行を入力欄に入れる → パレットの埋め方で参照を埋める → 目標値を入れる → ダイスを振る → リソース操作とバフ）で通す（`sendLine`）
    - 本物のダイスの仕組み（アリアンロッド）を、目を固定して振る（`withFixedDice`）。面の数より大きい目は面の数にする（リソース操作が中で `1D1` を振るため）
- 単体のテスト: 概念のファイルごとに 1 つ（同じフォルダに `.spec.ts`）
- 動きのテスト（`system-profiles/ytsheet-ar2e-profile.spec.ts`）
  - 架空のキャラクターのコマの欄とパレットが、仕様のとおりか
  - パレットの全部の参照が、本物の参照の処理で、できたコマの中の項目（見出しでないもの）にちょうど 1 つずつ当たるか（`{目標値}` を除く）
  - リソース操作、バフ、ダイスが、本物の処理で思ったとおりに動くか
- 変な値のテスト: 変な値でも、書かれたまま載り、取り込みの処理が壊れないか
  - 例: 決まった項目と同じ名前のスキルに、決まった項目の設定が付かないこと
- 手元だけのテスト（`*.local.spec.ts`）: 本物のキャラクターのデータを、リポジトリの外の `udonarium-axe/_reference/ytsheet-ar2e-samples/` から読むテスト
  - 見本が見つからないときは、飛ばさずに、見本の場所を示して失敗する。手元だけのテストのファイルは、見本と同じ手元にしかないので、見本がないのは異常で、黙って飛ばすと、走ったつもりで確かめが抜けるため
  - `system-profiles/ytsheet-ar2e-samples.local.spec.ts`: 見本のフォルダの中のシートのデータを、数を決めずに全部読み、取り込みの対象の見分けに当たるものを全部取り込む
    - 見分けに当たらないもの（閲覧できないシートのエラーの応答など）は外す
    - 見分けに当たって取り込んだシートが 1 つ以上あることを確かめ、空振りを防ぐ。見本の数は取り直しや足しで変わるので、決まった数とは比べない
    - どのシートも、専用の取り込みを通ったか（コマのダイスボットがアリアンロッドか）。専用の取り込みが中間の形を作れないと、汎用の読み取りに回ってパレットのないコマになり、参照の確かめが空のまま通ってしまうため
    - パレットの参照のうち、項目に当たらないものは、仕様書で動かないと決めたシートの名前を指すものだけか。認めるのは次の 4 つで、左がテストの中の呼び名、右が仕様書の項目
      - 空白だけの名前: 仕様書「シートのデータから作る名前」の、空白だけの名前
      - 重なった見出し: 仕様書「重なった名前」の、前後の空白だけ違うタイミングの見出し
      - 同じ見出しの重なったスキル: 仕様書「重なった名前」の、同じタイミングの見出しの中の同じ名前のスキル
      - 欄の名前との重なり: 仕様書「重なった名前」の、決まった項目の名前か「目標値」と同じ名前
      - どれも、シートの名前を前後の空白を除いて比べ、シートのスキルの置き場にその名前があるときだけ認める。取り込みの処理が作った重なりを見逃さないため
    - 参照を埋めた振り方の行に、値の抜けがないか
