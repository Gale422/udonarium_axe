/**
 * このフォークの機能の目次。このフォークの機能のページの一覧で、ページごとの題、使う場面の群、変えたフォーク元の機能の説明のページを持つ。
 * 群の順とフォーク元のページは持たず、操作マニュアルのサイドバーが、フォーク元の利用ガイドの設定から読む。
 */

/** このフォークの機能のページを置く、利用ガイドの中のフォルダのパス。 */
export const FORK_PAGES_PATH = '/fork-manual/';

/** このフォークの機能の目次の 1 行。 */
export interface ForkPage {
  /** 使う場面の群の名前。フォーク元の操作マニュアルのサイドバーの群の名前と同じもの */
  readonly group: string;
  /** サイドバーに出す題 */
  readonly text: string;
  /** 利用ガイドの中のページのパス */
  readonly link: string;
  /** フォーク元の機能を変えた機能のとき、操作マニュアルの、その機能の説明の、利用ガイドの中のパス。新しく足した機能にはない */
  readonly changes?: string;
}

export const FORK_PAGES: readonly ForkPage[] = [
  {
    group: '基本の操作',
    text: 'アプリから操作マニュアルを開く',
    link: `${FORK_PAGES_PATH}hosted-guide`,
  },
  {
    group: 'キャラクター',
    text: 'アリアンロッド2Eのキャラクターの取り込み',
    link: `${FORK_PAGES_PATH}ar2e-import`,
    changes: '/manual/character-import',
  },
  {
    group: 'キャラクター',
    text: 'リソースの増減の数字',
    link: `${FORK_PAGES_PATH}resource-change-effect`,
    changes: '/manual/character#ダメージと回復の演出',
  },
];
