/*
 * 画面の取り込みが呼ぶ入口から、サイトごとのアリアンロッド2E の取り込みにつながることの確かめ。
 * 入口に貼ったデータとアドレスで、取り込みの動きのテストと同じ流れで作るコマと、同じコマができるかを見る。
 */
import { TestBed } from '@angular/core/testing';
import { GameCharacter } from '@axe/domain/character/game-character';
import { collectDataElements } from '@axe/domain/data/data-element-tree';
import { CharacterImportService } from '@axe/features/character/import-character/character-import.service';
import { importAr2ePiece } from '@axe/testing/ar2e/ar2e-piece';
import { SheetData } from '@axe/testing/ar2e/sheet-changes';
import { baseCharasheet } from '@axe/testing/charasheet-ar2e/charasheet-ar2e-fixtures';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { baseSheet } from '@axe/testing/ytsheet-ar2e/ytsheet-ar2e-fixtures';

/** サイトごとの、貼るものと、そのとき取ってくるデータのアドレス */
interface Ar2eImportSite {
  /** 仕様書の、そのサイトの取り込みの対象の見出し */
  readonly heading: string;
  /** 架空のシートの土台 */
  readonly base: () => SheetData;
  /** 貼るものの説明、貼る文字、取ってくるデータのアドレス */
  readonly pastes: readonly (readonly [string, string, readonly string[]])[];
}

const SITES: readonly Ar2eImportSite[] = [
  {
    heading: 'ゆとシートの取り込みの対象',
    base: baseSheet,
    pastes: [
      ['シートのデータ', JSON.stringify(baseSheet()), []],
      // 架空のシートの、1 人分の画面のアドレスの形。データのアドレスは、画面のアドレスに `mode=json` を付けた形
      [
        'シートのアドレス',
        'https://yutorize.work/ytsheet/ar2e/?id=test0001',
        ['https://yutorize.work/ytsheet/ar2e/?id=test0001&mode=json'],
      ],
    ],
  },
  {
    heading: 'キャラクター保管所の取り込みの対象',
    base: baseCharasheet,
    pastes: [
      ['シートのデータ', JSON.stringify(baseCharasheet()), []],
      // 架空のシートの、1 人分の表示画面のアドレスの形。データのアドレスは、アドレスの最後の部分に `.js` を付けた形
      [
        'シートのアドレス',
        'https://charasheet.vampire-blood.net/1234567',
        ['https://charasheet.vampire-blood.net/1234567.js'],
      ],
      // 一覧に並ぶ、`m` で始まるもう 1 つの形のアドレス
      [
        'シートのもう 1 つの形のアドレス',
        'https://charasheet.vampire-blood.net/m0123456789abcdef0123456789abcdef',
        ['https://charasheet.vampire-blood.net/m0123456789abcdef0123456789abcdef.js'],
      ],
    ],
  },
];

describe.each(SITES)('取り込みの対象（仕様書「$heading」）', (site) => {
  const made: GameCharacter[] = [];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
  });

  afterEach(() => {
    for (const character of made.splice(0)) character.destroy();
    vi.restoreAllMocks();
  });

  /**
   * コマの欄とパレットを、比べやすい形に書き出す
   * @param piece コマ
   * @returns 名前、ダイスボット、パレット、欄の全部の要素の属性と値
   */
  function contentsOf(piece: GameCharacter) {
    return {
      name: piece.name,
      dicebot: piece.chatPalette?.dicebot,
      palette: piece.chatPalette?.getPalette(),
      fields: collectDataElements(piece.rootDataElement).map((element) => ({
        ...element.toAttributes(),
        value: element.value,
      })),
    };
  }

  /**
   * 架空のシートの土台からコマを作り、後で片付けるコマに入れる
   * @returns 作ったコマ
   */
  function expectedPiece(): GameCharacter {
    const piece = importAr2ePiece(site.base());
    made.push(piece);
    return piece;
  }

  /**
   * 取り込みのサービスに貼られた文字を渡してコマを作り、後で片付けるコマに入れる
   * @param text 貼られた文字
   * @returns 取り込んだコマ
   * @throws {Error} 取り込みが失敗を返したとき
   */
  async function importFromScreen(text: string): Promise<GameCharacter> {
    const result = await TestBed.inject(CharacterImportService).importFromText(text);
    if (result.character) made.push(result.character);
    if (result.error || !result.character) throw new Error(`取り込めなかった: ${result.error}`);
    return result.character;
  }

  it.each(site.pastes)(
    '貼られた%sから、アリアンロッド2E の取り込みでコマを作る。取ってくるのは、データのアドレスだけ',
    async (_, pasted, fetchedUrls) => {
      const fetched = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        if (!fetchedUrls.includes(String(input))) throw new TypeError(`取ってくるはずのないアドレス: ${String(input)}`);
        return { ok: true, status: 200, text: async () => JSON.stringify(site.base()) } as Response;
      });

      const piece = await importFromScreen(pasted);

      expect(fetched.mock.calls.map(([input]) => String(input))).toEqual(fetchedUrls);
      expect(piece.chatPalette?.dicebot).toBe('Arianrhod');
      expect(contentsOf(piece)).toEqual(contentsOf(expectedPiece()));
    }
  );
});
