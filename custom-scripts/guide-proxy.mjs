/**
 * 手元の確認用の起動が、アプリの開発用サーバー（ng serve）に渡す中継の設定。
 * 利用ガイドの置き場所への問い合わせを、手元の確認用の起動が動かした利用ガイドの開発用サーバーへ中継する。
 * ページの自動の読み直しの接続も、同じ置き場所の下を通るので、一緒に中継する。
 */
// 置き場所のファイルは、アプリの開発用サーバーが Node.js でじかに読んでも注意が出ないよう、型付きのファイルではなく JSON で書いてある
import HOSTED_GUIDE_PLACES from '../src/app/infrastructure/hosted-guide/hosted-guide-places.json' with { type: 'json' };

// 利用ガイドの開発用サーバーの番号は起動のたびに選ぶので、手元の確認用の起動から受け取る
const target = process.env.HOSTED_GUIDE_DEV_SERVER;
if (!target) {
  throw new Error('この中継の設定は、手元の確認用の起動（node custom-scripts/start-with-guide.mjs）から使います');
}

export default {
  // 送り先の名前は中継の先に合わせる。アプリを端末の名前で開いたときも、利用ガイドの開発用サーバーが、知らない名前として拒まないため
  [HOSTED_GUIDE_PLACES.guide]: { target, ws: true, changeOrigin: true },
};
