#!/usr/bin/env node
/**
 * このサーバーの利用ガイドの部品をそろえる手順。部品が入っていないか、部品の一覧が入れたときから変わったときだけ入れ直す。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const website = join(dirname(fileURLToPath(import.meta.url)), '..', 'website');
const wanted = createHash('sha256')
  .update(readFileSync(join(website, 'package-lock.json')))
  .digest('hex');
// 入れたときの部品の一覧の中身の印。部品の置き場所の中に置くので、置き場所を消すと印も消える
const mark = join(website, 'node_modules', '.hosted-guide-lock-hash');

// 毎回入れ直すと、送信の前の確認のたびに時間がかかり、動いている開発用サーバーの部品も消して入れ直すので、要るときだけ入れる。
// 部品の一覧が変わったかは、ファイルの日時ではなく中身で比べる。日時は、写しや取り出しで変わり、変わっていない一覧も新しく見えるため。
// 入れ直すときは、部品の一覧どおりに入れる npm ci を使う
if (!existsSync(mark) || readFileSync(mark, 'utf8') !== wanted) {
  const result = spawnSync('npm ci --no-audit --no-fund', { cwd: website, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(
      `[install-guide] 利用ガイドの部品を入れられませんでした（終了コード: ${result.status ?? result.signal}）`
    );
    process.exit(result.status ?? 1);
  }
  writeFileSync(mark, wanted);
}
