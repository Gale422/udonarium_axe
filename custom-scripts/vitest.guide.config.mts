/**
 * このサーバーの利用ガイドと、手元の確認用の起動の中継の設定のテストの設定。
 * アプリのテストの設定は src/ の下のテストだけを流すので、この設定で、アプリのコードの外のテストを Node.js の上で流す。
 */
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: resolve(import.meta.dirname, '..'),
    include: ['website/hosted-guide/**/*.spec.ts', 'custom-scripts/**/*.spec.mjs'],
    environment: 'node',
    globals: true,
    unstubEnvs: true,
  },
});
