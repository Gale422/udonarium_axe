#!/usr/bin/env node
/**
 * 手元の確認用の起動。`npm start` の代わりに `node custom-scripts/start-with-guide.mjs` で動かす。
 * このサーバーの利用ガイドの開発用サーバーを動かしてから、アプリの開発用サーバー（ng serve）を、
 * 利用ガイドの置き場所への問い合わせを利用ガイドの開発用サーバーへ中継する設定で動かす。
 * 後ろに書いた引数は、そのまま ng serve に渡す（例: `--port 4210`）。
 */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { constants as osConstants } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scripts = dirname(fileURLToPath(import.meta.url));
const root = join(scripts, '..');
const website = join(root, 'website');
// localhost の名前は、IPv4 と IPv6 のどちらに当たるかが環境で変わり、中継の先とずれることがあるため、番地で書く
const GUIDE_HOST = '127.0.0.1';

/**
 * 今あいている番号を 1 つ選ぶ。
 * @returns 選んだ番号
 * @throws {Error} 確かめのために待ち受けられなかったとき（返す約束の値が失敗になる）
 */
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, GUIDE_HOST, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

const installed = spawnSync(process.execPath, [join(scripts, 'install-guide.mjs')], { stdio: 'inherit' });
if (installed.status !== 0) process.exit(installed.status ?? 1);
// フォーク元の開発用サーバーの前の手順（アプリのアイコンを利用ガイドに写す）を、そのまま呼ぶ。
// フォーク元が手順を足しても従うためと、利用ガイドの入口のページが、アイコンの絵を使うため
const prepared = spawnSync('npm run predev', { cwd: website, stdio: 'inherit', shell: true });
if (prepared.status !== 0) process.exit(prepared.status ?? 1);
const port = await freePort();

// キー入力は、アプリの開発用サーバーだけに渡す。利用ガイドの開発用サーバーは、キー入力の欄がなければキーを読まない。
// 利用ガイドの開発用サーバーの出力は、受け取ってから同じ端末に流す。じかに端末へ出すと、ページを直すたびに端末の画面を消し、
// アプリの開発用サーバーが出したエラーを画面の外へ押し出すため
const guide = spawn(
  process.execPath,
  [
    join(website, 'node_modules', 'vitepress', 'bin', 'vitepress.js'),
    'dev',
    'hosted-guide',
    '--host',
    GUIDE_HOST,
    '--port',
    String(port),
    '--strictPort',
  ],
  { cwd: website, stdio: ['ignore', 'pipe', 'pipe'] }
);
guide.stdout.pipe(process.stdout);
guide.stderr.pipe(process.stderr);

const app = spawn(
  process.execPath,
  [
    join(root, 'node_modules', '@angular', 'cli', 'bin', 'ng.js'),
    'serve',
    '--proxy-config',
    'custom-scripts/guide-proxy.mjs',
    ...process.argv.slice(2),
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, HOSTED_GUIDE_DEV_SERVER: `http://${GUIDE_HOST}:${port}` },
  }
);

// 片方だけが動き続けると、アプリから利用ガイドが開けないことに気付きにくいため、どちらかが止まったら、もう片方も止める。
// 起動そのものが止められたときも、2 つのサーバーを残さないよう、両方を止める
const servers = [
  { name: '利用ガイドの開発用サーバー', child: guide },
  { name: 'アプリの開発用サーバー', child: app },
];
let stopping = false;

/**
 * まだ動いている開発用サーバーを止める。
 * @param exitCode 手元の確認用の起動の終了コード
 */
function stopServers(exitCode) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  // 止まっているサーバーへの止める指示は、何もせずに終わる
  for (const { child } of servers) child.kill();
}

for (const { name, child } of servers) {
  child.on('exit', (code, signal) => {
    if (stopping) return;
    console.error(
      `[start-with-guide] ${name}が止まったので、手元の確認用の起動を止めます（終了コード: ${code ?? signal}）`
    );
    stopServers(code ?? 1);
  });
  child.on('error', (error) => {
    if (stopping) return;
    console.error(`[start-with-guide] ${name}を動かせなかったので、手元の確認用の起動を止めます（${error.message}）`);
    stopServers(1);
  });
}
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  const exitCode = 128 + osConstants.signals[signal];
  // 止めている途中にもう一度止められたら、サーバーが止まるのを待たずに終わる。止まらないサーバーがあっても、起動を抜けられるため
  process.on(signal, () => (stopping ? process.exit(exitCode) : stopServers(exitCode)));
}
