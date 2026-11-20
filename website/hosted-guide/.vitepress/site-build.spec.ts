/**
 * このサーバーの利用ガイドを作った結果のテスト。サイトを一時フォルダに作り、できたページを確かめる。
 */
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { build, type DefaultTheme } from 'vitepress';

import HOSTED_GUIDE_PLACES from '../../../src/app/infrastructure/hosted-guide/hosted-guide-places.json' with { type: 'json' };
import upstream from '../../.vitepress/config.ts';
import { FORK_PAGES } from './catalog.ts';

const configRoot = resolve(import.meta.dirname, '..');
const website = resolve(configRoot, '..');
const GUIDE = HOSTED_GUIDE_PLACES.guide;

/**
 * フォルダの下のファイルを、フォルダからの「/」区切りのパスで全部挙げる。
 * @param folder 調べるフォルダ
 * @param skip 中を調べないフォルダの名前
 * @returns ファイルのパス
 */
function filesUnder(folder: string, skip: readonly string[] = []): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || skip.includes(entry.name)) return [];
      return filesUnder(join(folder, entry.name), skip).map((path) => `${entry.name}/${path}`);
    }
    return [entry.name];
  });
}

/**
 * 利用ガイドの中のページのパスから、作ったページのファイルの、出力先からのパスを決める。
 * @param link 利用ガイドの中のページのパス（`/` で始まる）
 * @returns 作ったページのファイルのパス
 */
function builtPage(link: string): string {
  return link.endsWith('/') ? `${link.slice(1)}index.html` : `${link.slice(1)}.html`;
}

describe('このサーバーの利用ガイドを作った結果', () => {
  let outDir: string;
  let pages: Map<string, string>;

  beforeAll(async () => {
    outDir = mkdtempSync(join(tmpdir(), 'hosted-guide-'));
    await build(configRoot, { outDir });
    pages = new Map(
      filesUnder(outDir)
        .filter((path) => path.endsWith('.html'))
        .map((path) => [path, readFileSync(join(outDir, path), 'utf8')])
    );
  }, 180_000);

  afterAll(() => {
    rmSync(outDir, { recursive: true, force: true });
  });

  describe('このサーバーの利用ガイドの公開', () => {
    it('フォーク元の利用ガイドの全部のページを、フォーク元の利用ガイドの中と同じ並びで作る', () => {
      const sources = filesUnder(website, ['node_modules', 'public', 'scripts']).filter((path) => path.endsWith('.md'));
      const missing = sources.filter((path) => !pages.has(path.replace(/\.md$/, '.html')));

      expect(sources.length).toBeGreaterThan(FORK_PAGES.length);
      expect(missing).toEqual([]);
    });

    it.each(FORK_PAGES)('このフォークの機能のページ「$text」を作る', ({ link }) => {
      expect(pages.has(builtPage(link))).toBe(true);
    });

    it('どのページにも、共有したときに出す、公開先のアドレスを含む印を入れない', () => {
      const marked = [...pages].filter(([, html]) => /property="og:|name="twitter:|rel="canonical"/.test(html));

      expect(pages.size).toBeGreaterThan(0);
      expect(marked.map(([path]) => path)).toEqual([]);
    });
  });

  describe('このサーバーの利用ガイドの見た目', () => {
    it('フォーク元の利用ガイドの見た目の、配色と部品の書き方を使う', () => {
      const upstreamStyle = readFileSync(resolve(website, '.vitepress', 'theme', 'style.css'), 'utf8');
      const styles = filesUnder(join(outDir, 'assets'))
        .filter((path) => path.endsWith('.css'))
        .map((path) => readFileSync(join(outDir, 'assets', path), 'utf8'))
        .join('\n');

      // 手順の番号の見出しの書き方は、フォーク元の見た目だけが持つもの
      expect(upstreamStyle).toContain('.axe-step-number');
      expect(styles).toContain('.axe-step-number');
    });

    it('どのページにも、フォーク元の GitHub と、ページを編集するリンクを出さない', () => {
      const editText = (upstream.themeConfig as DefaultTheme.Config).editLink!.text!;
      const linked = [...pages].filter(([, html]) => html.includes('VPSocialLink') || html.includes(editText));

      expect(linked.map(([path]) => path)).toEqual([]);
    });

    it('どのページの、ブラウザのタブのアイコンも、アプリのアイコンを指す', () => {
      const icons = new Set(
        [...pages.values()].flatMap((html) =>
          [...html.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)].map((match) => match[1])
        )
      );

      expect([...icons].sort()).toEqual(['/assets/icons/icon-180.png', '/favicon.svg']);
    });
  });

  describe('このフォークの機能のページの分け方', () => {
    it.each(FORK_PAGES)(
      'ページ「$text」に、このフォークの機能のページが並ぶサイドバーを出し、上の帯の「操作マニュアル」を選ばれた状態にする',
      ({ link }) => {
        const html = pages.get(builtPage(link))!;
        const manualEntry = `${GUIDE}${HOSTED_GUIDE_PLACES.manual}`;

        expect(html).toMatch(
          new RegExp(`class="[^"]*\\bVPNavBarMenuLink\\b[^"]*\\bactive\\b[^"]*" href="${manualEntry}"`)
        );
        for (const page of FORK_PAGES) expect(html).toContain(`href="${GUIDE}${page.link.slice(1)}"`);
      }
    );
  });

  describe('アプリの操作マニュアルを開くメニューの項目', () => {
    it('開く先の、利用ガイドの操作マニュアルの入口のページを作る', () => {
      expect(existsSync(join(outDir, HOSTED_GUIDE_PLACES.manual, 'index.html'))).toBe(true);
    });
  });
});
