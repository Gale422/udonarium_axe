/**
 * このサーバーの利用ガイドの設定のテスト。フォーク元の利用ガイドの、今の設定を土台にして確かめる。
 */
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import type { DefaultTheme, HeadConfig } from 'vitepress';

import HOSTED_GUIDE_PLACES from '../../../src/app/infrastructure/hosted-guide/hosted-guide-places.json' with { type: 'json' };
import upstream from '../../.vitepress/config.ts';
import { FORK_PAGES, FORK_PAGES_PATH } from './catalog.ts';
import hosted from './config.ts';

const configRoot = resolve(import.meta.dirname, '..');
const website = resolve(configRoot, '..');
const repository = resolve(website, '..');
const MANUAL_PATH = `/${HOSTED_GUIDE_PLACES.manual}`;
const theme = hosted.themeConfig as DefaultTheme.Config;
const upstreamTheme = upstream.themeConfig as DefaultTheme.Config;
const sidebar = theme.sidebar as DefaultTheme.SidebarMulti;
const upstreamSidebar = upstreamTheme.sidebar as DefaultTheme.SidebarMulti;
const catalogLinks = FORK_PAGES.map((page) => page.link).sort();
const otherNavLinks = upstreamTheme.nav!.flatMap((item) =>
  'link' in item && item.link !== MANUAL_PATH ? [item.link] : []
);

/**
 * 上の帯の「操作マニュアル」が、そのパスのページを開いているときに選ばれた状態になるかを読む。
 * @param path 利用ガイドの中のページのパス
 * @returns 選ばれた状態になるか
 */
function manualNavIsActiveOn(path: string): boolean {
  const manual = theme.nav!.find((item) => 'link' in item && item.link === MANUAL_PATH) as DefaultTheme.NavItemWithLink;
  return new RegExp(manual.activeMatch!).test(path);
}

/**
 * 頭の情報から、アイコンのリンクの指し先を読む。
 * @param head 頭の情報
 * @returns アイコンのリンクの指し先
 */
function iconLinks(head: HeadConfig[]): string[] {
  return head
    .filter(([tag, attributes]) => tag === 'link' && ['icon', 'apple-touch-icon'].includes(attributes.rel))
    .map(([, attributes]) => attributes.href);
}

/**
 * サイドバーの項目を、群の名前とページのリンクの組にする。群でない項目は、リンクだけにする。
 * @param items サイドバーの項目
 * @returns 群ごとの、群の名前とページのリンク
 */
function shape(items: DefaultTheme.SidebarItem[]): (string | [string, string[]])[] {
  return items.map((item) =>
    Array.isArray(item.items) ? [item.text!, item.items.map(({ link }) => link!)] : item.link!
  );
}

/**
 * 上の帯の項目を、選ばれた状態の決まりを除いて読む。
 * @param nav 上の帯
 * @returns 選ばれた状態の決まりを除いた項目
 */
function withoutActiveMatch(nav: DefaultTheme.NavItem[]): object[] {
  return nav.map((item) => {
    const { activeMatch: _activeMatch, ...rest } = item as DefaultTheme.NavItemWithLink;
    return rest;
  });
}

describe('このサーバーの利用ガイドの公開', () => {
  it('アプリと同じサイトの /docs/ の下に置く', () => {
    expect(hosted.base).toBe('/docs/');
  });

  it('ページは、フォーク元の利用ガイド全体から読み、フォーク元の利用ガイドの中と同じ並びで置く', () => {
    expect(upstream.srcDir).toBeUndefined();
    expect(resolve(configRoot, hosted.srcDir!)).toBe(website);
  });

  it('アプリの出力の中の、利用ガイドの置き場所に作る', () => {
    expect(resolve(configRoot, hosted.outDir!)).toBe(resolve(repository, 'dist', 'docs'));
  });

  it('共有したときに出す、公開先のアドレスを含む印を作らない', () => {
    expect(upstream.transformPageData).toBeTypeOf('function');
    expect(hosted.transformPageData).toBeUndefined();
  });
});

describe('このサーバーの利用ガイドの見た目', () => {
  it.each(['title', 'description', 'lang', 'markdown', 'cleanUrls', 'lastUpdated'] as const)(
    'サイトの %s は、フォーク元の設定をそのまま使う',
    (key) => {
      expect(upstream[key]).toBeDefined();
      expect(hosted[key]).toBe(upstream[key]);
    }
  );

  it.each([
    ['左のサイドバー', 'sidebarMenuLabel'],
    ['右のページの中の目次', 'outline'],
    ['検索欄', 'search'],
    ['前後のページ送り', 'docFooter'],
    ['ダークとライトの切り替え', 'darkModeSwitchLabel'],
    ['トップへ戻るリンク', 'returnToTopLabel'],
  ] as const)('%sの設定（%s）は、フォーク元の設定をそのまま使う', (_name, key) => {
    expect(upstreamTheme[key]).toBeDefined();
    expect(theme[key]).toBe(upstreamTheme[key]);
  });

  it('上の帯は、フォーク元の上の帯の項目のまま並べる', () => {
    expect(upstreamTheme.nav!.length).toBeGreaterThan(0);
    expect(withoutActiveMatch(theme.nav!)).toEqual(withoutActiveMatch(upstreamTheme.nav!));
  });

  it('フォーク元の GitHub と、ページを編集するリンクは出さない', () => {
    expect(upstreamTheme.socialLinks).toBeDefined();
    expect(upstreamTheme.editLink).toBeDefined();
    expect(theme.socialLinks).toBeUndefined();
    expect(theme.editLink).toBeUndefined();
  });

  it('アイコンは、フォーク元のものに代えて、同じサイトにあるアプリのものを指す', () => {
    expect(iconLinks(hosted.head!)).toEqual(['/favicon.svg', '/assets/icons/icon-180.png']);
  });
});

describe('このフォークの機能のページの分け方', () => {
  it('目次の 1 行ごとに、このフォークの機能のページのフォルダにページのファイルが 1 つあり、目次にないページのファイルはない', () => {
    const files = readdirSync(resolve(website, FORK_PAGES_PATH.slice(1)))
      .filter((name) => name.endsWith('.md'))
      .map((name) => `${FORK_PAGES_PATH}${name.replace(/\.md$/, '')}`);

    expect(catalogLinks.length).toBeGreaterThan(0);
    expect(files.sort()).toEqual(catalogLinks);
  });

  it('操作マニュアルのサイドバーは、フォーク元の群ごとに、フォーク元のページの後ろに、その群のこのフォークの機能のページを目次の順で並べる', () => {
    const expected = shape(upstreamSidebar[MANUAL_PATH] as DefaultTheme.SidebarItem[]).map((entry) =>
      typeof entry === 'string'
        ? entry
        : [entry[0], [...entry[1], ...FORK_PAGES.filter((page) => page.group === entry[0]).map(({ link }) => link)]]
    );

    expect(shape(sidebar[MANUAL_PATH] as DefaultTheme.SidebarItem[])).toEqual(expected);
  });

  it('このフォークの機能のページを開いているときも、操作マニュアルのサイドバーを出し、ほかのサイドバーはフォーク元のままにする', () => {
    expect(sidebar[FORK_PAGES_PATH]).toBe(sidebar[MANUAL_PATH]);
    expect(Object.keys(sidebar).sort()).toEqual([...Object.keys(upstreamSidebar), FORK_PAGES_PATH].sort());
    for (const key of Object.keys(upstreamSidebar).filter((key) => key !== MANUAL_PATH)) {
      expect(sidebar[key]).toBe(upstreamSidebar[key]);
    }
  });

  it.each([MANUAL_PATH, `${MANUAL_PATH}screen`, ...catalogLinks])(
    '上の帯の「操作マニュアル」は、%s を開いているとき、選ばれた状態になる',
    (path) => {
      expect(manualNavIsActiveOn(path)).toBe(true);
    }
  );

  it.each(['/', ...otherNavLinks, `/start${MANUAL_PATH}`, `${FORK_PAGES_PATH.slice(0, -1)}s/`])(
    '上の帯の「操作マニュアル」は、%s を開いているときは、選ばれた状態にならない',
    (path) => {
      expect(manualNavIsActiveOn(path)).toBe(false);
    }
  );
});
