/*
 * 画面の取り込みが呼ぶ入口から、ゆとシートのアリアンロッド2E の取り込みにつながることの確かめ。
 * 入口に貼ったデータとアドレスで、取り込みの動きのテストと同じ流れで作るコマと、同じコマができるかを見る。
 */
import { TestBed } from '@angular/core/testing';
import { GameCharacter } from '@axe/domain/character/game-character';
import { collectDataElements } from '@axe/domain/data/data-element-tree';
import { CharacterImportService } from '@axe/features/character/import-character/character-import.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { baseSheet } from '@axe/testing/ytsheet-ar2e/ytsheet-ar2e-fixtures';
import { importAr2ePiece } from '@axe/testing/ytsheet-ar2e/ytsheet-ar2e-piece';

/** 架空のシートのアドレス。ゆとシートのアリアンロッド2E の、1 人分の画面のアドレスの形 */
const SHEET_URL = 'https://yutorize.work/ytsheet/ar2e/?id=test0001';
/** 架空のシートのデータのアドレス。画面のアドレスに `mode=json` を付けた形 */
const SHEET_JSON_URL = 'https://yutorize.work/ytsheet/ar2e/?id=test0001&mode=json';

describe('取り込みの対象', () => {
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
    const piece = importAr2ePiece(baseSheet());
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

  it.each<[string, () => string, string[]]>([
    ['シートのデータ', () => JSON.stringify(baseSheet()), []],
    ['シートのアドレス', () => SHEET_URL, [SHEET_JSON_URL]],
  ])(
    '貼られた%sから、アリアンロッド2E の取り込みでコマを作る。取ってくるのは、データのアドレスだけ',
    async (_, pasted, fetchedUrls) => {
      const fetched = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        if (String(input) !== SHEET_JSON_URL) throw new TypeError(`取ってくるはずのないアドレス: ${String(input)}`);
        return { ok: true, status: 200, text: async () => JSON.stringify(baseSheet()) } as Response;
      });

      const piece = await importFromScreen(pasted());

      expect(fetched.mock.calls.map(([input]) => String(input))).toEqual(fetchedUrls);
      expect(piece.chatPalette?.dicebot).toBe('Arianrhod');
      expect(contentsOf(piece)).toEqual(contentsOf(expectedPiece()));
    }
  );
});
