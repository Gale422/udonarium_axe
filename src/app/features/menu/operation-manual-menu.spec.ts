/**
 * 操作マニュアルを開く項目の、メニューの項目の一覧・既定の並び・人ごとの並び・ホットバー・スマートフォン版の画面のメニュー・押したときの処理のテスト。
 */
import { readFileSync } from 'node:fs';

import { TestBed } from '@angular/core/testing';
import { SUPPORTED_LANGS } from '@axe/application/i18n/transloco.config';
import { MenuLayoutService } from '@axe/application/ui/menu-layout.service';
import { Hotbar } from '@axe/domain/hotbar/hotbar';
import { emptyHotbarSlotDraft } from '@axe/domain/hotbar/hotbar-draft';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ASSIGNABLE_PEER_ROLES } from '@axe/domain/peer/peer-role';
import { DEFAULT_MENU_LAYOUTS } from '@axe/domain/ui/builtin-menu-layouts';
import { MENU_SURFACES, MenuCommand, menuCommandOf, menuCommandsFor, MenuSurface } from '@axe/domain/ui/menu-command';
import { isMenuGroup, MenuGroup, menuItemsOf, MenuLayout } from '@axe/domain/ui/menu-layout';
import {
  moveMenuNode,
  moveMenuNodeInto,
  parentOfMenuNode,
  placeMenuNode,
  removeMenuNode,
} from '@axe/domain/ui/menu-layout-edit';
import { HotbarSlotEditorComponent } from '@axe/features/hotbar/hotbar-editor/hotbar-slot-editor.component';
import { HotbarRunnerService } from '@axe/features/hotbar/hotbar-runner.service';
import { MenuCommandService } from '@axe/features/menu/menu-command.service';
import {
  gameMasterMobileMenuItems,
  MobileMenuItem,
  sharedMobileMenuItems,
} from '@axe/features/mobile/mobile-shell/mobile-menu-items';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

const KEY = 'operationManual';
const MANUAL_ENTRY = '/docs/manual/';

/** 表示の言語ごとの、項目の名前。 */
const LABELS: Readonly<Record<(typeof SUPPORTED_LANGS)[number], string>> = {
  ja: '操作マニュアル',
  en: 'User manual',
  ko: '조작 매뉴얼',
};

/** メニューごとの、既定の並びで「操作マニュアル」を置く所。 */
const DEFAULT_PLACES: readonly (readonly [MenuSurface, readonly string[]])[] = [
  ['fab', [`display/${KEY}`]],
  ['gmToolbar', []],
  ['plToolbar', []],
  ['chatTools', []],
];

/**
 * 項目の一覧から、操作マニュアルを開く項目を引く。
 * @returns 操作マニュアルを開く項目
 */
function operationManual(): MenuCommand {
  const command = menuCommandOf(KEY);
  expect(command).toBeTruthy();
  return command!;
}

/**
 * メニューの並びに置かれた項目を、上から順に、小窓の中のものは小窓の名前を付けて挙げる。
 * @param layout メニューの並び
 * @returns 置かれた項目の、`小窓の名前/項目の名前` か `項目の名前` の並び
 */
function placesIn(layout: MenuLayout): string[] {
  return layout.nodes.flatMap((node) =>
    isMenuGroup(node) ? node.items.map((item) => `${node.id}/${item.command}`) : [node.command]
  );
}

/**
 * FABメニューの既定の並びの小窓を引く。
 * @param id 小窓の名前
 * @returns 小窓
 */
function defaultGroup(id: string): MenuGroup {
  const group = DEFAULT_MENU_LAYOUTS.fab.nodes.find((node): node is MenuGroup => isMenuGroup(node) && node.id === id);
  expect(group).toBeTruthy();
  return group!;
}

/**
 * メニューの並びの中の、「操作マニュアル」の場所を読む。
 * @param layout メニューの並び
 * @returns `小窓の名前/小窓の中の何番目か`。メニュー直下なら `メニュー直下/何番目か`、ないときは `なし`
 */
function whereIs(layout: MenuLayout): string {
  if (!menuItemsOf(layout).some((item) => item.command === KEY)) return 'なし';
  const parent = parentOfMenuNode(layout, KEY);
  if (parent === null) return `メニュー直下/${layout.nodes.findIndex((node) => node.id === KEY)}`;
  const group = layout.nodes.find((node) => node.id === parent) as MenuGroup;
  return `${parent}/${group.items.findIndex((item) => item.id === KEY)}`;
}

describe('アプリの操作マニュアルを開くメニューの項目', () => {
  it('名前の表は、アプリの全部の表示の言語を挙げている', () => {
    expect(Object.keys(LABELS).sort()).toEqual([...SUPPORTED_LANGS].sort());
  });

  it.each(SUPPORTED_LANGS.map((language) => [language, LABELS[language]]))(
    '表示の言語が %s のときは「%s」の名前で出る',
    (language, name) => {
      const dictionary = JSON.parse(readFileSync(`src/assets/i18n/${language}.json`, 'utf-8'));
      const label = operationManual()
        .labelKey.split('.')
        .reduce((node, part) => node?.[part], dictionary);

      expect(label).toBe(name);
    }
  );

  it.each(ASSIGNABLE_PEER_ROLES)(
    '役割が %s の人は、「項目を足す」の一覧のうち、FABメニュー・GMツール・PLツールのものだけから選べる',
    (role) => {
      const offeredOn = MENU_SURFACES.filter((surface) =>
        menuCommandsFor(surface, role).some((command) => command.key === KEY)
      );

      expect(offeredOn).toEqual(['fab', 'gmToolbar', 'plToolbar']);
    }
  );

  it('既定の並びの表は、全部のメニューを挙げている', () => {
    expect(DEFAULT_PLACES.map(([surface]) => surface)).toEqual([...MENU_SURFACES]);
  });

  it.each(DEFAULT_PLACES)('既定の並びで、%s のメニューに置く所は %j', (surface, expected) => {
    expect(
      placesIn(DEFAULT_MENU_LAYOUTS[surface]).filter((place) => place.endsWith(`/${KEY}`) || place === KEY)
    ).toEqual(expected);
  });

  it.each([
    ['上', -1, 'display/menuEditor'],
    ['下', 1, 'display/useMobileLayout'],
  ] as const)('既定のFABメニューの「表示」の小窓で、「操作マニュアル」のすぐ%sの項目は %s', (_, step, expected) => {
    const places = placesIn(DEFAULT_MENU_LAYOUTS.fab);

    expect(places[places.indexOf(`display/${KEY}`) + step]).toBe(expected);
  });

  describe('「メニューの編集」でFABメニューを組み替えた人', () => {
    const display = defaultGroup('display');
    const at = display.items.findIndex((item) => item.id === KEY);
    const other = DEFAULT_MENU_LAYOUTS.fab.nodes.find(
      (node): node is MenuGroup => isMenuGroup(node) && node.id !== 'display'
    )!;

    /**
     * 新しく開いた画面の、人ごとのメニューの並びの部品を作る。
     * @returns 人ごとのメニューの並びの部品
     */
    function freshLayouts(): MenuLayoutService {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      return TestBed.inject(MenuLayoutService);
    }

    it('の並びには、次に開いたときも自動では足さず、「初期配置に戻す」で既定の並びに戻すと出る', () => {
      freshLayouts().save('fab', { nodes: [{ id: 'mine', command: 'chat' }] });
      const layouts = freshLayouts();

      expect(whereIs(layouts.layoutOf('fab')())).toBe('なし');
      layouts.reset('fab');
      expect(whereIs(layouts.layoutOf('fab')())).toBe(`display/${at}`);
    });

    it.each<[string, (layout: MenuLayout) => MenuLayout, string]>([
      ['ひとつ上へ動かす', (layout) => moveMenuNode(layout, KEY, -1), `display/${at - 1}`],
      ['ひとつ下へ動かす', (layout) => moveMenuNode(layout, KEY, 1), `display/${at + 1}`],
      ['いちばん上へ動かす', (layout) => placeMenuNode(layout, KEY, { parent: 'display', index: 0 }), 'display/0'],
      [
        'いちばん下へ動かす',
        (layout) => placeMenuNode(layout, KEY, { parent: 'display', index: display.items.length }),
        `display/${display.items.length - 1}`,
      ],
      [
        '移す先の「メニュー直下」へ移す',
        (layout) => moveMenuNodeInto(layout, KEY, null),
        `メニュー直下/${DEFAULT_MENU_LAYOUTS.fab.nodes.length}`,
      ],
      [
        `移す先のほかの小窓（${other.id}）へ移す`,
        (layout) => moveMenuNodeInto(layout, KEY, other.id),
        `${other.id}/${other.items.length}`,
      ],
      ['外す', (layout) => removeMenuNode(layout, KEY), 'なし'],
    ])('は、既定の並びの「操作マニュアル」を%sと、次に開いたときの場所は %s', (_, edit, expected) => {
      const layouts = freshLayouts();
      layouts.save('fab', edit(layouts.layoutOf('fab')()));

      expect(whereIs(freshLayouts().layoutOf('fab')())).toBe(expected);
    });
  });

  describe('ホットバー', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ imports: [HotbarSlotEditorComponent], providers: [...TEST_PROVIDERS] });
    });

    it.each(ASSIGNABLE_PEER_ROLES)(
      '役割が %s の人は、枠の種類「メニューの項目」で選べ、その枠を押すと、操作マニュアルの入口のページを新しいタブで開く',
      async (role) => {
        PeerCursor.createMyCursor().role = role;
        const editor = TestBed.createComponent(HotbarSlotEditorComponent);
        editor.componentInstance.setFrom({ page: 1, slotIndex: 3 }, emptyHotbarSlotDraft('menu'));
        editor.detectChanges();
        await editor.whenStable();
        const offered = [
          ...(editor.nativeElement as HTMLElement).querySelectorAll<HTMLOptionElement>(
            '[data-testid="hotbar-editor-menu"] option'
          ),
        ].map((option) => option.value);

        expect(offered).toContain(KEY);

        const draft = emptyHotbarSlotDraft('menu');
        draft.payload = { kind: 'menu', command: KEY };
        Hotbar.ownerId = 'me';
        const hotbar = new Hotbar('Hotbar_for_operation_manual');
        hotbar.initialize();
        const slot = hotbar.put(0, 0, draft)!;
        const open = vi.spyOn(window, 'open').mockReturnValue(null);

        expect(TestBed.inject(HotbarRunnerService).run(slot, null, { page: 0, slotIndex: 0 })).toEqual({ ok: true });
        expect(open).toHaveBeenCalledExactlyOnceWith(MANUAL_ENTRY, '_blank', 'noopener');
      }
    );
  });

  it.each<[string, () => MobileMenuItem[]]>([
    ['全員に出す', sharedMobileMenuItems],
    ['GMだけに出す', gameMasterMobileMenuItems],
  ])('スマートフォン版の画面のメニューの、%s項目には出ない', (_, items) => {
    const { labelKey } = operationManual();

    expect(items().length).toBeGreaterThan(0);
    expect(items().filter((item) => item.labelKey === labelKey)).toEqual([]);
  });

  describe('押したとき', () => {
    let commands: MenuCommandService;

    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
      commands = TestBed.inject(MenuCommandService);
    });

    it.each(ASSIGNABLE_PEER_ROLES)(
      '役割が %s の人が押すと、利用ガイドの操作マニュアルの入口のページを新しいタブで開く',
      (role) => {
        PeerCursor.createMyCursor().role = role;
        const open = vi.spyOn(window, 'open').mockReturnValue(null);

        expect(commands.run(operationManual())).toBe('done');
        expect(open).toHaveBeenCalledExactlyOnceWith(MANUAL_ENTRY, '_blank', 'noopener');
      }
    );
  });
});
