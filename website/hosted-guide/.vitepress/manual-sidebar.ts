/**
 * 操作マニュアルのサイドバー。フォーク元の操作マニュアルのサイドバーの群ごとに、フォーク元のページの後ろに、
 * その群のこのフォークの機能のページを足した並び。
 */
import type { DefaultTheme } from 'vitepress';

import type { ForkPage } from './catalog.ts';

/**
 * フォーク元の操作マニュアルのサイドバーの群ごとに、その群のこのフォークの機能のページを後ろに足す。
 * 群でない項目（ページの並びを持たない項目）は、そのまま残す。
 * @param upstreamItems フォーク元の操作マニュアルのサイドバーの項目（並び順）
 * @param pages このフォークの機能のページ（目次の順）
 * @returns 操作マニュアルのサイドバーの項目
 * @throws このフォークの機能のページの群の名前が、フォーク元の操作マニュアルのサイドバーの群の名前のどれとも同じでないとき
 */
export function operationManualSidebar(
  upstreamItems: readonly DefaultTheme.SidebarItem[],
  pages: readonly ForkPage[]
): DefaultTheme.SidebarItem[] {
  const groups = upstreamItems.filter((item) => Array.isArray(item.items)).map((item) => item.text);
  // 黙って落とすと、そのページがサイドバーから消えるため、作成を止める
  const strays = pages.filter((page) => !groups.includes(page.group));
  if (strays.length > 0) {
    const names = strays.map((page) => `${page.text}（${page.group}）`).join('、');
    throw new Error(`フォーク元の操作マニュアルのサイドバーにない群です: ${names}`);
  }
  return upstreamItems.map((item) => {
    if (!Array.isArray(item.items)) return item;
    const added = pages.filter((page) => page.group === item.text).map(({ text, link }) => ({ text, link }));
    return added.length > 0 ? { ...item, items: [...item.items, ...added] } : item;
  });
}
