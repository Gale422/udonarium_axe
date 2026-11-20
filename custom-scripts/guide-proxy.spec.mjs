/**
 * 手元の確認用の起動が、アプリの開発用サーバーに渡す中継の設定のテスト。
 */

/**
 * 中継の設定を、今の環境変数で読み直す。
 * @returns 中継の設定
 * @throws 中継の設定が、読むときに止めたとき
 */
async function loadProxy() {
  vi.resetModules();
  return (await import('./guide-proxy.mjs')).default;
}

describe('このサーバーの利用ガイドの手元での確認', () => {
  it.each(['http://127.0.0.1:61234', 'http://127.0.0.1:1', 'http://localhost:5173'])(
    '利用ガイドの置き場所 /docs/ への問い合わせと、ページの自動の読み直しの接続を、起動が渡した利用ガイドの開発用サーバー %s へ中継する',
    async (server) => {
      vi.stubEnv('HOSTED_GUIDE_DEV_SERVER', server);

      expect(await loadProxy()).toEqual({
        '/docs/': { target: server, ws: true, changeOrigin: true },
      });
    }
  );

  it.each([
    ['渡されていない', undefined],
    ['空の文字の', ''],
  ])(
    '利用ガイドの開発用サーバーの場所が%sとき（手元の確認用の起動を通さずに使ったとき）は、起動のしかたを示して止める',
    async (_, server) => {
      vi.stubEnv('HOSTED_GUIDE_DEV_SERVER', server);

      await expect(loadProxy()).rejects.toThrow(
        'この中継の設定は、手元の確認用の起動（node custom-scripts/start-with-guide.mjs）から使います'
      );
    }
  );
});
