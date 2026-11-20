/**
 * このフォークの機能のページの、リンクのテスト。
 * 利用ガイドのほかのページへのリンクと、見出しへのリンクが、手元の利用ガイドにあるページと見出しを指しているかを確かめる。
 * フォーク元が、ページや見出しの名前を変えたことに、公開の前に気付くため。作成は、見出しがあるかを確かめないため。
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { slugify } from '../../.vitepress/slugify.mjs';
import HOSTED_GUIDE_PLACES from '../../../src/app/infrastructure/hosted-guide/hosted-guide-places.json' with { type: 'json' };
import { FORK_PAGES } from './catalog.ts';

const website = resolve(import.meta.dirname, '..', '..');
const UPSTREAM_PUBLIC_SITE = 'xelltis.github.io/udonarium_axe';

/** リンクの書き方の種類。 */
type LinkKind = 'サイトの中のパス' | 'ページの中の見出し' | 'ほかの書き方';

/** ページの中の 1 つのリンク。 */
interface PageLink {
  readonly kind: LinkKind;
  /** リンクに書かれた指し先 */
  readonly target: string;
}

/**
 * マークダウンを、コードの囲み（```と~~~）の外の行だけにする。
 * @param markdown ページのマークダウン
 * @returns コードの囲みの外の行
 */
function linesOutsideFences(markdown: string): string[] {
  const lines: string[] = [];
  let fence: string | undefined;
  for (const line of markdown.split('\n')) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
    if (fence === undefined && marker) {
      fence = marker;
      continue;
    }
    // 囲みは、開いたのと同じ記号で、同じ数以上を並べた行で閉じる
    if (fence !== undefined) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = undefined;
      continue;
    }
    lines.push(line);
  }
  return lines;
}

/**
 * マークダウンの見出しの名前を、フォーク元の利用ガイドと同じ決まりで作る。
 * `{#名前}` があればその名前、なければ見出しの文から作り、同じ名前の 2 つ目からは `-1`、`-2` を付ける。
 * @param markdown ページのマークダウン
 * @returns 見出しの名前
 */
function headingIds(markdown: string): Set<string> {
  const ids = new Set<string>();
  const seen = new Map<string, number>();
  for (const line of linesOutsideFences(markdown)) {
    const heading = line.match(/^#{1,6}\s+(.*?)\s*$/);
    if (!heading) continue;
    const custom = heading[1].match(/\{#([^}\s]+)\}\s*$/);
    if (custom) {
      ids.add(custom[1]);
      continue;
    }
    const id = slugify(heading[1].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, ''));
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    ids.add(count ? `${id}-${count}` : id);
  }
  return ids;
}

/**
 * マークダウンの、利用ガイドの中を指すリンクを読む。外のサイトへのリンクは読まない。
 * @param markdown ページのマークダウン
 * @returns 利用ガイドの中を指すリンク
 */
function guideLinks(markdown: string): PageLink[] {
  return linesOutsideFences(markdown)
    .flatMap((line) => [...line.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1]))
    .filter((target) => !/^[a-z]+:/i.test(target))
    .map((target) => ({
      kind: target.startsWith('#')
        ? 'ページの中の見出し'
        : target.startsWith('/')
          ? 'サイトの中のパス'
          : 'ほかの書き方',
      target,
    }));
}

/**
 * 利用ガイドの中のパスから、そのページのマークダウンのファイルを探す。
 * 利用ガイドでは、`manual/x` は `manual/x.md`、`manual/` は `manual/index.md` のページ。
 * @param path 利用ガイドの中のパス（`/` で始まる）
 * @returns ページのファイル。ないときは undefined
 */
function pageFile(path: string): string | undefined {
  const relative = path.slice(1);
  return [resolve(website, `${relative}.md`), resolve(website, relative, 'index.md')].find((file) => existsSync(file));
}

/**
 * リンクの指す先のページか見出しが、手元の利用ガイドにないかを見る。
 * @param target リンクに書かれた指し先（`/` で始まるパスか、`#` で始まる見出し）
 * @param here リンクを書いたページの、利用ガイドの中のパス
 * @returns 指す先がないか
 */
function isBroken(target: string, here: string): boolean {
  const [path, anchor] = target.split('#');
  const file = pageFile(path === '' ? here : path);
  if (!file) return true;
  return anchor !== undefined && !headingIds(readFileSync(file, 'utf8')).has(decodeURIComponent(anchor));
}

/**
 * ページのリンクのうち、指す先のページか見出しが、手元の利用ガイドにないものを挙げる。
 * @param link このフォークの機能のページの、利用ガイドの中のパス
 * @returns 指す先がないリンクと、読んだリンク
 */
function brokenLinks(link: string): { broken: string[]; links: PageLink[] } {
  const markdown = readFileSync(pageFile(link)!, 'utf8');
  const links = guideLinks(markdown);
  // ほかの書き方のリンクは、書き方そのものを別のテストで止めるので、ここでは指す先を調べない
  const broken = links
    .filter(({ kind }) => kind !== 'ほかの書き方')
    .filter(({ target }) => isBroken(target, link))
    .map(({ target }) => target);
  return { broken, links };
}

describe('このフォークの機能のページ', () => {
  it.each(FORK_PAGES)(
    'ページ「$text」の、利用ガイドのページと見出しへのリンクは、このサイトにあるページと見出しを指す',
    ({ link }) => {
      expect(brokenLinks(link).broken).toEqual([]);
    }
  );

  it.each(FORK_PAGES)('ページ「$text」は、フォーク元が公開している利用ガイドへリンクしない', ({ link }) => {
    expect(readFileSync(pageFile(link)!, 'utf8')).not.toContain(UPSTREAM_PUBLIC_SITE);
  });

  it.each(FORK_PAGES)(
    'ページ「$text」の、利用ガイドの中へのリンクは、/ で始まるパスか、# で始まる見出しで書く',
    ({ link }) => {
      // フォーク元の見出しへのリンクの確かめは、/ と # で始まるリンクしか読まないため
      expect(brokenLinks(link).links.filter(({ kind }) => kind === 'ほかの書き方')).toEqual([]);
    }
  );

  it.each(['サイトの中のパス', 'ページの中の見出し'] as const)(
    'リンクの読み取りは、%sのリンクも、どこかのページで拾っている',
    (kind) => {
      const links = FORK_PAGES.flatMap(({ link }) => brokenLinks(link).links);

      expect(links.filter((found) => found.kind === kind).length).toBeGreaterThan(0);
    }
  );

  it.each<[string, PageLink[]]>([
    ['[題](/manual/screen)', [{ kind: 'サイトの中のパス', target: '/manual/screen' }]],
    ['[題](/manual/)', [{ kind: 'サイトの中のパス', target: '/manual/' }]],
    ['[題](/manual/screen#見出し)', [{ kind: 'サイトの中のパス', target: '/manual/screen#見出し' }]],
    ['[題](#見出し)', [{ kind: 'ページの中の見出し', target: '#見出し' }]],
    ['[題](./screen)', [{ kind: 'ほかの書き方', target: './screen' }]],
    ['[題](screen)', [{ kind: 'ほかの書き方', target: 'screen' }]],
    ['[題](../manual/screen)', [{ kind: 'ほかの書き方', target: '../manual/screen' }]],
    ['[題](https://example.com/manual/)', []],
    ['[題](http://example.com/)', []],
  ])('リンクの読み取りは、%s を %j と読む', (markdown, expected) => {
    expect(guideLinks(markdown)).toEqual(expected);
  });

  it.each([
    ['# 見出し', ['見出し']],
    ['###### 見出し', ['見出し']],
    ['## 見出し {#名前}', ['名前']],
    ['## [リンク](/manual/)の見出し', ['リンクの見出し']],
    ['## 同じ\n## 同じ\n## 同じ', ['同じ', '同じ-1', '同じ-2']],
    ['####### 見出し', []],
    ['##見出し', []],
    ['見出し', []],
  ])('見出しの読み取りは、%j から、見出しの名前 %j を作る', (markdown, expected) => {
    expect([...headingIds(markdown)]).toEqual(expected);
  });

  it.each([
    ['/manual/screen', '/manual/'],
    ['/manual/', '/manual/screen'],
    ['/manual/screen#メニューを自分で組む', '/manual/'],
    ['#メニューを自分で組む', '/manual/screen'],
  ])('リンクの行き先の確かめは、%s（%s のページに書いたもの）を、行き先があるとする', (target, here) => {
    expect(isBroken(target, here)).toBe(false);
  });

  it.each([
    ['/manual/screens', '/manual/'],
    ['/manual/screen/', '/manual/'],
    ['/manual/screen#ない見出し', '/manual/'],
    ['#ない見出し', '/manual/screen'],
  ])('リンクの行き先の確かめは、%s（%s のページに書いたもの）を、行き先がないとする', (target, here) => {
    expect(isBroken(target, here)).toBe(true);
  });

  it.each(['```', '~~~'])('リンクと見出しの読み取りは、%s のコードの囲みの中を飛ばす', (fence) => {
    const markdown = ['## 外の見出し', fence, '## 中の見出し', '[中](/manual/x)', fence, '[外](#外の見出し)'].join(
      '\n'
    );

    expect([...headingIds(markdown)]).toEqual(['外の見出し']);
    expect(guideLinks(markdown).map(({ target }) => target)).toEqual(['#外の見出し']);
  });
});

describe('フォーク元の機能を変えた機能のページ', () => {
  const changedPages = FORK_PAGES.filter((page) => page.changes !== undefined);

  it('目次に、フォーク元の機能を変えた機能のページがある', () => {
    expect(changedPages.length).toBeGreaterThan(0);
  });

  it.each(changedPages)(
    'ページ「$text」は、操作マニュアルの、変えた機能の説明へリンクし、その説明はこのサイトにある',
    ({ link, changes }) => {
      const { links, broken } = brokenLinks(link);

      expect(changes!.startsWith(`/${HOSTED_GUIDE_PLACES.manual}`)).toBe(true);
      expect(links.map(({ target }) => target)).toContain(changes);
      expect(broken).not.toContain(changes);
    }
  );
});
