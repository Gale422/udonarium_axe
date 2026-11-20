/**
 * このサーバーの利用ガイド。フォーク元の利用ガイドのページと設定を土台にし、このフォークの機能のページを足し、
 * このサーバーに合わない所（置き場所、アイコン、フォーク元の公開先を指すもの、操作マニュアルのサイドバー、
 * 上の帯の「操作マニュアル」の選ばれた状態）だけを上書きする。
 */
import { type DefaultTheme, defineConfig, type HeadConfig } from 'vitepress';

import HOSTED_GUIDE_PLACES from '../../../src/app/infrastructure/hosted-guide/hosted-guide-places.json' with { type: 'json' };
import upstream from '../../.vitepress/config.ts';
import { FORK_PAGES, FORK_PAGES_PATH } from './catalog.ts';
import { operationManualSidebar } from './manual-sidebar.ts';

const MANUAL_PATH = `/${HOSTED_GUIDE_PLACES.manual}`;

const upstreamTheme = upstream.themeConfig as DefaultTheme.Config;
const upstreamSidebar = upstreamTheme.sidebar as DefaultTheme.SidebarMulti;

/**
 * フォーク元の利用ガイドのサイドバーから、操作マニュアルの項目の並びを取り出す。
 * @param sidebar フォーク元の利用ガイドのサイドバー
 * @returns 操作マニュアルのサイドバーの項目
 * @throws フォーク元のサイドバーに、操作マニュアルの項目の並びがないとき
 */
function upstreamManualItems(sidebar: DefaultTheme.SidebarMulti): DefaultTheme.SidebarItem[] {
  const items = sidebar[MANUAL_PATH];
  if (!Array.isArray(items)) throw new Error('フォーク元のサイドバーに、操作マニュアルの項目の並びがありません');
  return items;
}

/**
 * 上の帯の「操作マニュアル」を、このフォークの機能のページを開いているときも、選ばれた状態にする。
 * @param nav フォーク元の利用ガイドの上の帯
 * @returns 上の帯
 * @throws フォーク元の上の帯に、操作マニュアルの入口へのリンクがないとき
 */
function navWithForkPages(nav: readonly DefaultTheme.NavItem[]): DefaultTheme.NavItem[] {
  const isManualEntry = (item: DefaultTheme.NavItem) => 'link' in item && item.link === MANUAL_PATH;
  if (!nav.some(isManualEntry)) throw new Error('フォーク元の上の帯に、操作マニュアルの入口へのリンクがありません');
  return nav.map((item) =>
    isManualEntry(item) ? { ...item, activeMatch: `^(${MANUAL_PATH}|${FORK_PAGES_PATH})` } : item
  );
}

const manualSidebar = operationManualSidebar(upstreamManualItems(upstreamSidebar), FORK_PAGES);

const appIcons: HeadConfig[] = [
  ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  ['link', { rel: 'apple-touch-icon', href: '/assets/icons/icon-180.png' }],
];
const iconRels = new Set(appIcons.map(([, attributes]) => attributes.rel));

export default defineConfig({
  ...upstream,
  // ページは、フォーク元の利用ガイド全体を読む。このフォークの機能のページも、その中のフォルダに置く
  srcDir: '..',
  base: HOSTED_GUIDE_PLACES.guide,
  outDir: `../../dist${HOSTED_GUIDE_PLACES.guide}`,
  // 作業用の控えは、フォーク元の利用ガイドの控えの置き場所の下に置く。そこは、記録と書式の確かめから外されているため
  cacheDir: '../.vitepress/cache/hosted-guide',
  // 共有したときに出す印は、公開先のアドレスを書かないと作れないので付けない
  transformPageData: undefined,
  // アイコンは、同じサイトにあるアプリのものに差し替える。フォーク元のアイコンの指し先は、フォーク元の置き場所の下のため
  head: [
    ...appIcons,
    ...(upstream.head ?? []).filter(([tag, attributes]) => tag !== 'link' || !iconRels.has(attributes.rel)),
  ],
  themeConfig: {
    ...upstreamTheme,
    nav: navWithForkPages(upstreamTheme.nav ?? []),
    // このフォークの機能のページを開いているときも、操作マニュアルのサイドバーを出す
    sidebar: {
      ...upstreamSidebar,
      [MANUAL_PATH]: manualSidebar,
      [FORK_PAGES_PATH]: manualSidebar,
    },
    socialLinks: undefined,
    editLink: undefined,
  },
});
