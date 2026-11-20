/**
 * 操作マニュアルのサイドバーの、このフォークの機能のページの足し方のテスト。架空のページと群で確かめる。
 */
import type { DefaultTheme } from 'vitepress';

import type { ForkPage } from './catalog.ts';
import { operationManualSidebar } from './manual-sidebar.ts';

/**
 * 架空の目次の 1 行を作る。
 * @param group 群の名前
 * @param text ページの題
 * @returns 目次の 1 行
 */
function page(group: string, text: string): ForkPage {
  return { group, text, link: `/fork/${text}` };
}

/**
 * 架空のフォーク元の群を作る。
 * @param text 群の名前
 * @param pages 群の中のフォーク元のページの題
 * @returns 群の項目
 */
function group(text: string, pages: string[]): DefaultTheme.SidebarItem {
  return { text, items: pages.map((title) => ({ text: title, link: `/manual/${title}` })) };
}

/**
 * サイドバーの項目を、群の名前とページの題の組にする。群でない項目は、題だけにする。
 * @param items サイドバーの項目
 * @returns 群ごとの、群の名前とページの題
 */
function shape(items: DefaultTheme.SidebarItem[]): (string | [string, string[]])[] {
  return items.map((item) =>
    Array.isArray(item.items) ? [item.text!, item.items.map(({ text }) => text!)] : item.text!
  );
}

describe('このフォークの機能のページの分け方', () => {
  const pages = [page('群イ', '足した1'), page('群ア', '足した2'), page('群イ', '足した3')];
  const entry: DefaultTheme.SidebarItem = { text: '使いかた', link: '/manual/' };

  it.each([
    {
      case: 'フォーク元の並びが群ア・群イ・群ウ（群でない項目が先頭）',
      upstream: [entry, group('群ア', ['元1']), group('群イ', ['元2']), group('群ウ', ['元3'])],
      pages,
      expected: ['使いかた', ['群ア', ['元1', '足した2']], ['群イ', ['元2', '足した1', '足した3']], ['群ウ', ['元3']]],
    },
    {
      case: 'フォーク元の並びが群ウ・群イ・群ア（群でない項目が途中）',
      upstream: [group('群ウ', ['元3']), group('群イ', ['元2']), entry, group('群ア', ['元1'])],
      pages,
      expected: [['群ウ', ['元3']], ['群イ', ['元2', '足した1', '足した3']], '使いかた', ['群ア', ['元1', '足した2']]],
    },
    {
      case: 'フォーク元のページのない群がある',
      upstream: [group('群ア', []), group('群イ', ['元2'])],
      pages,
      expected: [
        ['群ア', ['足した2']],
        ['群イ', ['元2', '足した1', '足した3']],
      ],
    },
    {
      case: 'このフォークの機能のページがない',
      upstream: [entry, group('群ア', ['元1'])],
      pages: [],
      expected: ['使いかた', ['群ア', ['元1']]],
    },
  ])(
    '$case とき、群ごとに、フォーク元のページの後ろに、その群のページを目次の順で足し、ほかの項目と群の順はフォーク元のままにする',
    ({ upstream, pages: added, expected }) => {
      expect(shape(operationManualSidebar(upstream, added))).toEqual(expected);
    }
  );

  it.each([true, false])(
    'ページを足す群の、ページの並びのほかの設定（畳むか: %s）は、フォーク元のまま残す',
    (collapsed) => {
      const folded = { ...group('群イ', ['元2']), collapsed };

      expect(operationManualSidebar([group('群ア', []), folded], pages)[1].collapsed).toBe(collapsed);
    }
  );

  it.each([
    ['フォーク元のサイドバーにない名前', '群エ'],
    ['フォーク元の群でない項目と同じ名前', '使いかた'],
    ['フォーク元の群の名前の後ろに空白が付いた名前', '群ア '],
  ])('ページの群が%s（%s）のときは、そのページの題と群を示して止める', (_, stray) => {
    expect(() =>
      operationManualSidebar([entry, group('群ア', [])], [page('群ア', '足した1'), page(stray, '足した4')])
    ).toThrow(`フォーク元の操作マニュアルのサイドバーにない群です: 足した4（${stray}）`);
  });
});
