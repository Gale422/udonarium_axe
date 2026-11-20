// 動きのテスト。
// 取り込みから組み立てまで通したコマと、そのパレットの行を、アックスの本物の処理（参照、リソース操作、バフ、ダイス）で確かめる。
import { TestBed } from '@angular/core/testing';
import { buffKindMarkOf } from '@axe/domain/character/buff-kind';
import { buffEffectTimingOf, buffExpires, BuffTiming, buffTimingOf } from '@axe/domain/character/buff-timing';
import { DEFAULT_STATUS_AILMENTS } from '@axe/domain/character/builtin-status-ailments';
import { GameCharacter } from '@axe/domain/character/game-character';
import { parseImportedCharacterJson } from '@axe/domain/character/import/character-import-format';
import {
  buildYtsheetAr2eCharacter,
  isYtsheetAr2eCharacter,
} from '@axe/domain/character/import/system-profiles/ytsheet-ar2e-profile';
import { StatusAilmentCatalog } from '@axe/domain/character/status-ailment-catalog';
import { evaluateCharacterReferences } from '@axe/domain/chat/chat-palette';
import { DataElement, DataElementAttribute } from '@axe/domain/data/data-element';
import {
  elementOf,
  filledLineOf,
  findElementOf,
  findFieldOf,
  importAr2ePiece,
  loadArianrhod,
  paletteLinesOf,
  referenceNamesOf,
  sendLine,
  withFixedDice,
  withImportedPiece,
} from '@axe/testing/ar2e/ar2e-piece';
import { SheetChange, withoutKeys, withValues } from '@axe/testing/ar2e/sheet-changes';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { baseSheet, sheetWith, withRows, withSkills } from '@axe/testing/ytsheet-ar2e/ytsheet-ar2e-fixtures';
import GameSystemClass from 'bcdice/lib/game_system';

// パレットの行を送る下準備（`sendLine`）は、送る処理を、アプリの部品の組から取り出して使う
beforeEach(() => {
  TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
});

/**
 * パレットの送れる行のうち、書き出しが同じ最初の行を探す。
 *
 * @param piece コマ
 * @param start 行の書き出し
 * @returns 見つかった行
 * @throws {Error} 書き出しが同じ行がないとき
 * @throws {TypeError} コマにチャットパレットがないとき
 */
function lineStartingWith(piece: GameCharacter, start: string): string {
  const line = paletteLinesOf(piece).find((candidate) => candidate.startsWith(start));
  if (!line) throw new Error(`パレットにない: ${start}`);
  return line;
}

/**
 * リソースの現在値を、数として読む。
 *
 * @param piece コマ
 * @param name リソースの名前か、見出しをたどる参照
 * @returns 現在値
 * @throws {Error} リソースが見つからないか、2 つ以上あるとき
 * @throws {TypeError} コマに、データの一番上の要素がないとき
 */
function currentOf(piece: GameCharacter, name: string): number {
  return Number(elementOf(piece, name).currentValue);
}

/**
 * リソースの現在値を書き換える。
 *
 * @param piece コマ
 * @param name リソースの名前か、見出しをたどる参照
 * @param value 新しい現在値
 * @throws {Error} リソースが見つからないか、2 つ以上あるとき
 * @throws {TypeError} コマに、データの一番上の要素がないとき
 */
function setCurrent(piece: GameCharacter, name: string, value: number): void {
  elementOf(piece, name).currentValue = value;
}

/**
 * 毒と衰弱の行の強さ n を、数に書き換える。
 *
 * @param line 毒か衰弱を付ける行
 * @param strength 強さ
 * @returns 強さを書き換えた行
 */
function withStrength(line: string, strength: number): string {
  return line.replace('(n*5)', `(${strength}*5)`);
}

describe('取り込みの対象（仕様書「取り込みの対象」「ゆとシートの取り込みの対象」）', () => {
  it('アリアンロッド2E の PC のシートを見分け、専用の取り込みで読む', () => {
    expect(isYtsheetAr2eCharacter(baseSheet())).toBe(true);
    expect(parseImportedCharacterJson(baseSheet())?.dicebot).toBe('Arianrhod');
  });

  it('エネミーとギルドのシート（type がある）は、汎用の読み取りに回す', () => {
    const enemy = sheetWith(withValues({ type: 'm' }));
    expect(isYtsheetAr2eCharacter(enemy)).toBe(false);
    expect(buildYtsheetAr2eCharacter(enemy)).toBeNull();
    expect(parseImportedCharacterJson(enemy)?.dicebot).toBe('');
  });

  it('ほかのシステムのシートは見分けない', () => {
    const sw25 = sheetWith(withValues({ sheetURL: 'https://yutorize.work/ytsheet/sw2.5/?id=abc' }));
    expect(isYtsheetAr2eCharacter(sw25)).toBe(false);
  });

  it('読めないシートの応答は、取り込まない', () => {
    const refused = { result: 'error', message: '閲覧権限がありません。', data: null };
    expect(isYtsheetAr2eCharacter(refused)).toBe(false);
    expect(parseImportedCharacterJson(refused)).toBeNull();
  });
});

describe('取り込んだコマの欄と欄の設定（仕様書「コマのダイスボット」「取り込んだコマの欄」「欄の項目の設定」「欄の設定の書き方」）', () => {
  let piece: GameCharacter;
  beforeEach(() => (piece = importAr2ePiece(baseSheet())));
  afterEach(() => piece.destroy());

  it('コマの名前、チャットの色、ダイスボット', () => {
    expect(piece.name).toBe('架空の冒険者(テスト)');
    expect(piece.chatColorCode[0]).toBe('#336699');
    expect(piece.chatPalette!.dicebot).toBe('Arianrhod');
  });

  it('欄の並び。後ろの「立ち絵位置」と「コマ画像」は、アックスがコマを作るときに足す', () => {
    const sections = piece.detailDataElement!.children.map((section) => section.name);
    expect(sections).toEqual([
      'リソース',
      '能力値',
      '判定',
      '戦闘',
      'スキル',
      '携行品・所持品',
      'プロフィール',
      '立ち絵位置',
      'コマ画像',
    ]);
  });

  it('HP と MP は、最小値 0（下限のベース）と増減でエフェクトを持つリソースで、コマのバーと効果音は付けない', () => {
    for (const name of ['HP', 'MP']) {
      const resource = elementOf(piece, name);
      expect(resource.isNumberResource).toBe(true);
      expect(resource.value).toBe(resource.currentValue === '' ? '' : Number(resource.currentValue));
      expect(resource.getAttribute(DataElementAttribute.MIN_BASE)).toBe('0');
      expect(resource.getAttribute(DataElementAttribute.CHANGE_EFFECT)).toBe('true');
      expect(resource.getAttribute(DataElementAttribute.PIECE_GAUGE)).toBe('');
      expect(resource.getAttribute(DataElementAttribute.CHANGE_SOUND)).toBe('');
      expect(resource.getAttribute(DataElementAttribute.MIN)).toBe('');
    }
    expect(elementOf(piece, 'HP').value).toBe(60);
    expect(elementOf(piece, 'MP').value).toBe(40);
  });

  it('リソースの欄の中の見出し「基本」に、ポップアップ表示を付ける', () => {
    expect(elementOf(piece, 'リソース/基本').getAttribute(DataElementAttribute.POPUP)).toBe('true');
    expect(elementOf(piece, '戦闘/基本').getAttribute(DataElementAttribute.POPUP)).toBe('');
  });

  it('数値の項目の単位と最小値', () => {
    const settings = (name: string) => [
      elementOf(piece, name).getAttribute(DataElementAttribute.UNIT),
      elementOf(piece, name).getAttribute(DataElementAttribute.MIN),
    ];
    expect(settings('移動力')).toEqual(['m', '0']);
    expect(settings('物理防御力')).toEqual(['', '0']);
    expect(settings('筋力判定ダイス')).toEqual(['D', '']);
    expect(settings('命中ダイス')).toEqual(['D', '']);
    expect(settings('所持金')).toEqual(['G', '0']);
    expect(settings('CL')).toEqual(['', '1']);
    expect(settings('行動値')).toEqual(['', '']);
  });

  it('参照元は、アドレスをリンクにする長文の欄', () => {
    const source = elementOf(piece, '参照元');
    expect(source.isNote).toBe(true);
    expect(source.value).toBe('https://yutorize.work/ytsheet/ar2e/?id=testsheet');
  });

  it('値がない決まった項目も作る', () => {
    withImportedPiece(sheetWith(withoutKeys('classSupport', 'level')), (piece2) => {
      expect(elementOf(piece2, 'サポートクラス').value).toBe('');
      expect(elementOf(piece2, 'CL').value).toBe('');
      expect(elementOf(piece2, '称号クラス').value).toBe('');
    });
  });
});

describe('パレットの参照（仕様書「シートの値の扱い」「シートのデータから作る名前」「重なった名前」）', () => {
  /**
   * パレットのすべての送れる行で、どの参照も、アックスの参照の処理でコマの中の項目にちょうど 1 つ当たり、
   * 参照を埋めた後に参照が残らないことを確かめる。
   *
   * @param piece コマ
   * @throws {Error} 項目に当たらない参照か、埋めた後に残る参照があるとき（テストの失敗）
   * @throws {TypeError} コマにチャットパレットがないとき
   */
  function expectEveryReferenceFound(piece: GameCharacter): void {
    for (const line of paletteLinesOf(piece)) {
      for (const name of referenceNamesOf(line)) expect(findFieldOf(piece, name), name).not.toBeNull();
      expect(referenceNamesOf(evaluateCharacterReferences(line, piece).text), line).toEqual([]);
    }
  }

  /**
   * 架空のシートを変えてコマにし、パレットのすべての参照が見つかることを確かめてから、コマを片付ける。
   *
   * @param changes 架空のシートを変える道具（かける順）
   * @throws {Error} 架空のシートを取り込めないとき、見つからない参照か、埋めた後に残る参照があるとき（テストの失敗）
   */
  function expectEveryReferenceFoundIn(...changes: SheetChange[]): void {
    withImportedPiece(sheetWith(...changes), expectEveryReferenceFound);
  }

  it('架空のキャラクターのパレットの全部の参照が見つかる', () => {
    expectEveryReferenceFoundIn();
  });

  it('パレットに、アックスのパレットの変数として読まれる行がない（仕様書「取り込んだコマのチャットパレット」）', () => {
    withImportedPiece(baseSheet(), (piece) => {
      expect(piece.chatPalette!.paletteVariables).toEqual([]);
    });
  });

  it('スキル名に「/」「[ ]」「"」、ルビ、全角の記号があっても見つかる', () => {
    expectEveryReferenceFoundIn(
      withSkills(
        { Name: 'アタック/ブレイク', Timing: 'メジャー', Roll: '命中判定', Cost: '3' },
        { Name: '[カバーリング]', Timing: 'リアクション' },
        { Name: '"引用"の技', Timing: 'パッシブ' },
        { Name: '|魔剣《まけん》', Timing: 'メジャー', Roll: '魔術判定', Cost: '2' },
        { Name: 'トレーニング：筋力', Timing: 'パッシブ' },
        { Name: '円\\記号', Timing: 'ﾊﾟｯｼﾌﾞ' }
      )
    );
  });

  it('変な名前のスキルも、書かれたまま載る。そのスキルの説明の行は読めないが、ほかの行は読める', () => {
    const sheet = sheetWith(
      withSkills(
        { Name: '全力^', Timing: 'メジャー', Cost: '1' },
        { Name: 'ヒール', Timing: 'メジャー' },
        { Name: 'ヒール', Timing: 'メジャー' },
        { Name: 'toString', Timing: 'パッシブ' },
        { Name: '　' }
      )
    );
    withImportedPiece(sheet, (piece) => {
      const names = (group: string) =>
        elementOf(piece, `スキル/${group}`).children.map((child) => (child as DataElement).name);
      expect(names('メジャー')).toEqual(['全力^', 'ヒール', 'ヒール']);
      expect(names('パッシブ')).toEqual(['toString']);
      expect(names('効果参照')).toEqual(['　']);
      const unreadable = ['{スキル/メジャー/全力^}', '{スキル/メジャー/ヒール}', '{スキル/効果参照/　}'];
      const lines = paletteLinesOf(piece);
      expect(lines).toEqual(expect.arrayContaining(unreadable));
      for (const line of lines) {
        if (unreadable.includes(line)) {
          expect(filledLineOf(piece, line), line).toBe('');
        } else {
          for (const name of referenceNamesOf(line)) expect(findFieldOf(piece, name), name).not.toBeNull();
        }
      }
      expect(filledLineOf(piece, '{スキル/パッシブ/toString}')).toMatch(/^≪toString≫/);
    });
  });

  it('決まった項目と同じ名前のスキル・誓約・コネクションは、名前を変えず、決まった項目の設定も付かない', () => {
    const sheet = sheetWith(
      withSkills({ Name: '移動力', Timing: 'パッシブ' }, { Name: 'X', Timing: 'HP' }),
      withRows('geis', 'geisNum', [{ Name: 'MP', Cost: '5' }]),
      withRows('connection', 'connectionNum', [{ Name: '目標値', Relation: '友人' }])
    );
    withImportedPiece(sheet, (piece) => {
      const skill = elementOf(piece, 'スキル/パッシブ/移動力');
      expect(skill.getAttribute(DataElementAttribute.UNIT)).toBe('');
      expect(skill.getAttribute(DataElementAttribute.MIN)).toBe('');
      expect(elementOf(piece, 'リソース/基本/移動力').getAttribute(DataElementAttribute.UNIT)).toBe('m');
      expect(elementOf(piece, 'スキル/HP/X')).toBeTruthy();
      expect(elementOf(piece, '誓約/MP/成長点').value).toBe(5);
      expect(elementOf(piece, 'コネクション/目標値/関係').value).toBe('友人');
      // 名前だけの参照は、コマ全体で同じ名前が 2 つあると読めない
      expect(findElementOf(piece, '移動力')).toBeNull();
    });
  });
});

describe('パレットのリソース操作（仕様書「受動判定の見出しのかたまり」「リソース操作の見出しのかたまり」「スキルの使う行」）', () => {
  let piece: GameCharacter;
  let system: GameSystemClass;
  beforeEach(async () => {
    piece = importAr2ePiece(baseSheet());
    system = withFixedDice(await loadArianrhod(), [3]);
  });
  afterEach(() => piece.destroy());

  /**
   * 「(の後にダメージを書く」行の `:HP-(` の後に、ダメージを書き足す。
   *
   * @param line ダメージの適用の行
   * @param damage ダメージ
   * @returns ダメージを書き足した行
   */
  const withDamage = (line: string, damage: number) => line.replace(/^(:HP-\()/, `$1${damage}`);

  /** リソース操作の行ごとの、送る前の値、行に書き足すもの、目標値、送った後の値 */
  interface ResourceLineCase {
    readonly start: string;
    readonly before?: Readonly<Record<string, number>>;
    readonly edit?: (line: string) => string;
    readonly targetNumber?: number;
    readonly after: Readonly<Record<string, number>>;
  }

  /**
   * 仕様書「受動判定の見出しのかたまり」「リソース操作の見出しのかたまり」の、リソース操作の行のすべて。
   * 架空のキャラクターは HP 60、MP 40、フェイト 4、物理防御力 8、魔法防御力 6。ダイスの目はどれも 3
   */
  const RESOURCE_LINE_CASES: readonly ResourceLineCase[] = [
    { start: ':HP-(-{物理防御力})LZ', edit: (line) => withDamage(line, 20), after: { HP: 60 - (20 - 8) } },
    { start: ':HP-(-{魔法防御力})LZ', edit: (line) => withDamage(line, 20), after: { HP: 60 - (20 - 6) } },
    { start: ':HP-LZ', edit: (line) => line.replace(':HP-', ':HP-30'), after: { HP: 30 } },
    { start: ':HP-({目標値}-{物理防御力})LZ', targetNumber: 25, after: { HP: 60 - (25 - 8) } },
    { start: ':HP-({目標値}-{魔法防御力})LZ', targetNumber: 25, after: { HP: 60 - (25 - 6) } },
    { start: ':HP-{目標値}LZ', targetNumber: 25, after: { HP: 60 - 25 } },
    { start: ':フェイト-1LZ', after: { フェイト: 3 } },
    { start: ':HP={リソース/基本/HP^}LZ', before: { HP: 10 }, after: { HP: 60 } },
    { start: ':MP={リソース/基本/MP^}LZ', before: { MP: 1 }, after: { MP: 40 } },
    { start: ':HP+2D6LZ', before: { HP: 30 }, after: { HP: 36 } },
    { start: ':MP+2D6LZ', before: { MP: 20 }, after: { MP: 26 } },
  ];

  it('リソース操作の行は、11 行すべてが、本物の処理で思ったとおりに値を動かし、ほかのリソースは動かさない', async () => {
    const resourceLines = paletteLinesOf(piece).filter((line) => line.startsWith(':'));
    expect(resourceLines.map((line) => RESOURCE_LINE_CASES.filter((c) => line.startsWith(c.start)).length)).toEqual(
      resourceLines.map(() => 1)
    );
    expect(resourceLines).toHaveLength(RESOURCE_LINE_CASES.length);
    for (const c of RESOURCE_LINE_CASES) {
      const start = { HP: 60, MP: 40, フェイト: 4, ...c.before };
      for (const [name, value] of Object.entries(start)) setCurrent(piece, name, value);
      const line = lineStartingWith(piece, c.start);
      await sendLine(piece, c.edit ? c.edit(line) : line, system, c.targetNumber ?? null);
      const after = { ...start, ...c.after };
      expect(
        { HP: currentOf(piece, 'HP'), MP: currentOf(piece, 'MP'), フェイト: currentOf(piece, 'フェイト') },
        c.start
      ).toEqual(after);
    }
  });

  it('物理ダメージ適用: ダメージから物理防御力を引いて減らす', async () => {
    await sendLine(piece, withDamage(lineStartingWith(piece, ':HP-(-{物理防御力})LZ'), 20), system);
    expect(currentOf(piece, 'HP')).toBe(60 - (20 - 8));
  });

  it('物理ダメージ適用: 防御力が上回っても、回復しない（Z）', async () => {
    await sendLine(piece, withDamage(lineStartingWith(piece, ':HP-(-{物理防御力})LZ'), 5), system);
    expect(currentOf(piece, 'HP')).toBe(60);
  });

  it('魔法ダメージ適用: ダメージから魔法防御力を引いて減らす', async () => {
    await sendLine(piece, withDamage(lineStartingWith(piece, ':HP-(-{魔法防御力})LZ'), 20), system);
    expect(currentOf(piece, 'HP')).toBe(60 - (20 - 6));
  });

  it('貫通ダメージ適用: 書き足したダメージだけ減らし、0 より下にならない（L）', async () => {
    const line = lineStartingWith(piece, ':HP-LZ');
    await sendLine(piece, line.replace(':HP-', ':HP-30'), system);
    expect(currentOf(piece, 'HP')).toBe(30);
    await sendLine(piece, line.replace(':HP-', ':HP-100'), system);
    expect(currentOf(piece, 'HP')).toBe(0);
  });

  it('目標値の行: 目標値をダメージとして読み、防御力を引いて減らす', async () => {
    await sendLine(piece, lineStartingWith(piece, ':HP-({目標値}-{物理防御力})LZ'), system, 25);
    expect(currentOf(piece, 'HP')).toBe(60 - (25 - 8));
  });

  it('目標値の行: 目標値が見つからないときは、HP を変えない', async () => {
    const { sent } = await sendLine(piece, lineStartingWith(piece, ':HP-{目標値}LZ'), system);
    expect(sent).toContain('{目標値}');
    expect(currentOf(piece, 'HP')).toBe(60);
  });

  it('HP 全回復と MP 全回復は、最大値に戻す', async () => {
    setCurrent(piece, 'HP', 10);
    setCurrent(piece, 'MP', 1);
    await sendLine(piece, lineStartingWith(piece, ':HP={リソース/基本/HP^}LZ'), system);
    await sendLine(piece, lineStartingWith(piece, ':MP={リソース/基本/MP^}LZ'), system);
    expect(currentOf(piece, 'HP')).toBe(60);
    expect(currentOf(piece, 'MP')).toBe(40);
  });

  it('全回復は、使う人が「HP」「MP」という名前のバフを付けていても、0 にせず最大値に戻す（仕様書「重なった名前」）', async () => {
    await sendLine(piece, '&HP/覚え書き/3', system);
    await sendLine(piece, '&MP/覚え書き/3', system);
    expect(findElementOf(piece, 'HP')).toBeNull();
    expect(findElementOf(piece, 'MP')).toBeNull();
    // 同じ名前のバフがあると、名前だけでは欄を指せないので、見出しをたどって指す
    const hp = 'リソース/基本/HP';
    const mp = 'リソース/基本/MP';
    setCurrent(piece, hp, 10);
    setCurrent(piece, mp, 10);
    await sendLine(piece, lineStartingWith(piece, ':HP={リソース/基本/HP^}LZ'), system);
    await sendLine(piece, lineStartingWith(piece, ':MP={リソース/基本/MP^}LZ'), system);
    expect(currentOf(piece, hp)).toBe(60);
    expect(currentOf(piece, mp)).toBe(40);
  });

  it('ポーション: 6 が 2 つ出ても合計を読み、最大値を超えない（L）', async () => {
    const sixes = withFixedDice(await loadArianrhod(), [6]);
    setCurrent(piece, 'HP', 30);
    await sendLine(piece, lineStartingWith(piece, ':HP+2D6LZ'), sixes);
    expect(currentOf(piece, 'HP')).toBe(42);
    setCurrent(piece, 'HP', 55);
    await sendLine(piece, lineStartingWith(piece, ':HP+2D6LZ'), sixes);
    expect(currentOf(piece, 'HP')).toBe(60);
  });

  it('フェイト使用: 1 減らし、0 より下にならない', async () => {
    await sendLine(piece, lineStartingWith(piece, ':フェイト-1LZ'), system);
    expect(currentOf(piece, 'フェイト')).toBe(3);
    setCurrent(piece, 'フェイト', 0);
    await sendLine(piece, lineStartingWith(piece, ':フェイト-1LZ'), system);
    expect(currentOf(piece, 'フェイト')).toBe(0);
  });

  it('スキルの使う行: 判定を振り、MP をコストだけ減らす', async () => {
    const { roll } = await sendLine(
      piece,
      lineStartingWith(piece, '{魔術判定ダイス}D6+{魔術判定}>=? ≪テストヒール≫'),
      system
    );
    expect(roll).toContain('(2D6+5>=?)');
    expect(currentOf(piece, 'MP')).toBe(36);
  });

  it('スキルの使う行: 判定のないスキルは、MP をコストだけ減らす', async () => {
    await sendLine(piece, lineStartingWith(piece, '≪テストブースト≫ :MP-5LZ'), system);
    expect(currentOf(piece, 'MP')).toBe(35);
  });
});

describe('パレットのバフ（仕様書「バッドステータスの行」）', () => {
  let piece: GameCharacter;
  let system: GameSystemClass;
  beforeEach(async () => {
    piece = importAr2ePiece(baseSheet());
    system = withFixedDice(await loadArianrhod(), [3]);
  });
  afterEach(() => piece.destroy());

  /**
   * コマに付いているバフを、名前で探す。
   *
   * @param name バフの名前
   * @returns 見つかったバフ。なければ null
   */
  const buffNamed = (name: string) => piece.buffs.find(name);

  /**
   * 仕様書「バッドステータスの行」の表から書いた、バッドステータスごとの消え方。
   * 回復のタイミングがアックスの消えるタイミングに合うものは、そのタイミング。合わないものは 'lasting'（外す行で外す）
   */
  const SPEC_BAD_STATUSES: readonly { readonly name: string; readonly ending: BuffTiming | 'lasting' }[] = [
    { name: '放心', ending: 'roundEnd' },
    { name: '逆上', ending: 'roundEnd' },
    { name: 'ノックバック', ending: 'roundEnd' },
    { name: 'スタン', ending: 'turnStart' },
    { name: '恐怖', ending: 'turnEnd' },
    { name: '縛鎖', ending: 'lasting' },
    { name: 'スリップ', ending: 'lasting' },
    { name: '威圧', ending: 'lasting' },
    { name: '狂戦士化', ending: 'lasting' },
    { name: '毒', ending: 'lasting' },
    { name: '衰弱', ending: 'lasting' },
  ];

  /**
   * バッドステータスを付ける行を探す。毒と衰弱の行は、強さ n を 3 に書き換える。
   *
   * @param name バッドステータスの名前
   * @returns 付ける行
   * @throws {Error} パレットにないとき
   */
  const attachLineOf = (name: string) => {
    const line = paletteLinesOf(piece).find((candidate) => new RegExp(`^&!?${name}/`).test(candidate));
    if (!line) throw new Error(`パレットにない: ${name}`);
    return withStrength(line, 3);
  };

  /** コマ自身の手番（手番の開始と終わりで数を減らすときに渡す） */
  const ownTurn = () => ({ identifier: piece.identifier, name: piece.name });

  it('バッドステータスを付ける行は、仕様書の 11 個すべてがあり、どれもデバフの区分で付く', async () => {
    const lines = paletteLinesOf(piece).filter((line) => /^&!?[^/*]+\/.*\/デバフ /.test(line));
    expect(lines).toHaveLength(SPEC_BAD_STATUSES.length);
    for (const { name } of SPEC_BAD_STATUSES) await sendLine(piece, attachLineOf(name), system);
    for (const { name } of SPEC_BAD_STATUSES) expect(buffKindMarkOf(buffNamed(name)!), name).toBe('debuff');
  });

  it('回復のタイミングが合うものは、5 つすべてが、その消えるタイミングで残り 1 で付き、そのタイミングが来ると消える', async () => {
    for (const { name, ending } of SPEC_BAD_STATUSES) {
      if (ending === 'lasting') continue;
      await sendLine(piece, attachLineOf(name), system);
      const buff = buffNamed(name)!;
      expect([buffTimingOf(buff), Number(buff.value)], name).toEqual([ending, 1]);
      piece.buffs.expireAt(ending, ownTurn());
      expect(buffNamed(name), name).toBeNull();
    }
  });

  it('回復のタイミングが合わないものは、6 つすべてが、どのタイミングでも消えず、外す行で外れる。外す行は、この 6 つの分だけある', async () => {
    // 「&バフ名- バフを外す」は、使う人への書き方の例の行なので除く
    const removeLines = paletteLinesOf(piece).filter(
      (line) => /^&[^/*!]+- /.test(line) && !line.startsWith('&バフ名-')
    );
    const lasting = SPEC_BAD_STATUSES.filter(({ ending }) => ending === 'lasting').map(({ name }) => name);
    expect(removeLines.map((line) => line.slice(1, line.indexOf('-')))).toEqual(lasting);
    for (const name of lasting) {
      await sendLine(piece, attachLineOf(name), system);
      expect(buffExpires(buffNamed(name)!), name).toBe(false);
      piece.buffs.expireOneRound();
      piece.buffs.expireAt('turnStart', ownTurn());
      piece.buffs.expireAt('turnEnd', ownTurn());
      expect(buffNamed(name), name).not.toBeNull();
      await sendLine(piece, lineStartingWith(piece, `&${name}- `), system);
      expect(buffNamed(name), name).toBeNull();
    }
  });

  it('毒と衰弱は、どちらも、ラウンドが終わるたびに HP を強さ×5 減らし、外しても HP は戻らない', async () => {
    for (const name of ['毒', '衰弱']) {
      setCurrent(piece, 'HP', 60);
      await sendLine(piece, attachLineOf(name), system);
      expect(buffEffectTimingOf(buffNamed(name)!), name).toBe('roundEnd');
      expect(currentOf(piece, 'HP'), name).toBe(60);
      piece.buffs.expireOneRound();
      expect(currentOf(piece, 'HP'), name).toBe(45);
      piece.buffs.expireOneRound();
      expect(currentOf(piece, 'HP'), name).toBe(30);
      await sendLine(piece, lineStartingWith(piece, `&${name}- `), system);
      expect(buffNamed(name), name).toBeNull();
      expect(currentOf(piece, 'HP'), name).toBe(30);
    }
  });

  it('毒で減っても、HP は 0 より下にならない（最小値の設定）', async () => {
    setCurrent(piece, 'HP', 10);
    await sendLine(piece, withStrength(lineStartingWith(piece, '&!毒/'), 3), system);
    piece.buffs.expireOneRound();
    expect(currentOf(piece, 'HP')).toBe(0);
  });

  describe('部屋の状態異常の一覧に同じ名前があるとき（アックスの決まり）', () => {
    let saved: typeof StatusAilmentCatalog.instance.ailments;
    beforeEach(() => {
      saved = [...StatusAilmentCatalog.instance.ailments];
      StatusAilmentCatalog.instance.ailments = [...DEFAULT_STATUS_AILMENTS];
    });
    afterEach(() => (StatusAilmentCatalog.instance.ailments = saved));

    it('恐怖を付ける行は、新しい部屋の初めの一覧の中身（効果の文「命中-2」）で付く。値は動かない', async () => {
      await sendLine(piece, lineStartingWith(piece, '&恐怖//1/手番終了/デバフ'), system);
      const fear = buffNamed('恐怖')!;
      expect(String(fear.currentValue ?? '')).toBe('命中-2');
      expect(buffTimingOf(fear)).toBe('turnEnd');
      expect(buffKindMarkOf(fear)).toBe('debuff');
      expect(elementOf(piece, '命中').value).toBe(5);
    });

    it('毒を付ける行は値を動かすバフなので、部屋の一覧を見ない', async () => {
      await sendLine(piece, withStrength(lineStartingWith(piece, '&!毒/'), 3), system);
      piece.buffs.expireOneRound();
      expect(currentOf(piece, 'HP')).toBe(45);
    });
  });

  it('&*デバフ- で、バッドステータスがすべて外れ、ほかのバフは残る', async () => {
    await sendLine(piece, '&!加護/命中/+/2/3', system);
    for (const name of ['放心', '縛鎖']) await sendLine(piece, lineStartingWith(piece, `&${name}//`), system);
    await sendLine(piece, lineStartingWith(piece, '&*デバフ-'), system);
    expect(piece.buffs.list().map((buff) => buff.name)).toEqual(['加護']);
  });
});

describe('パレットのダイス（仕様書「判定の見出しのかたまり」「能動判定の見出しのかたまり」。資料「アックスのダイス（bcdice 4.10.0 のアリアンロッド）」）', () => {
  let piece: GameCharacter;
  /** 目がどれも 3 のダイス */
  let threes: GameSystemClass;
  beforeEach(async () => {
    piece = importAr2ePiece(baseSheet());
    threes = withFixedDice(await loadArianrhod(), [3]);
  });
  afterEach(() => piece.destroy());

  it('判定の行は、比べる値を ? にして振られる', async () => {
    const { roll } = await sendLine(
      piece,
      lineStartingWith(piece, '{筋力判定ダイス}D6+{筋力判定}>=? 【筋力】判定'),
      threes
    );
    expect(roll).toBe('Arianrhod : (2D6+4>=?) → 6[3,3]+4 → 10');
  });

  it('判定（目標値）の行は、目標値と比べて振られる', async () => {
    const line = lineStartingWith(piece, '{筋力判定ダイス}D6+{筋力判定}>={目標値}');
    expect((await sendLine(piece, line, threes, 13)).roll).toBe('Arianrhod : (2D6+4>=13)\n→ 6[3,3]+4\n→ 10\n→ 失敗');
  });

  it('判定（目標値）の行は、目標値が見つからないと振られない', async () => {
    const line = lineStartingWith(piece, '{筋力判定ダイス}D6+{筋力判定}>={目標値}');
    expect((await sendLine(piece, line, threes)).roll).toBe('');
  });

  it('命中判定は >? で振られ、6 が 2 つでクリティカルになる', async () => {
    const system = withFixedDice(await loadArianrhod(), [6]);
    const { roll } = await sendLine(piece, lineStartingWith(piece, '{命中ダイス}D6+{右手命中}>?'), system);
    expect(roll).toBe('Arianrhod : (2D6+5>?)\n→ 12[6,6]+5\n→ 17\n→ クリティカル(+2D6)');
  });

  it('ダイスを振る行は、39 行すべてが、本物のダイスの仕組みで、行の振り方のとおりに振られる', async () => {
    // 判定 15 ×2（? と目標値）、回避判定 2、能動判定 4（右手と左手の命中判定とダメージ）、スキルの使う行 3
    const rollLines = paletteLinesOf(piece).filter((line) => /^\{[^}]+\}D6/.test(line));
    expect(rollLines).toHaveLength(15 * 2 + 2 + 4 + 3);
    for (const line of rollLines) {
      const { sent, roll } = await sendLine(piece, line, threes, 13);
      // チャットは、→ が 3 つ以上ある結果を、→ の前で改行して出すので、改行を空白に戻して比べる
      const oneLine = roll.replace(/\n/g, ' ');
      expect(oneLine.startsWith(`Arianrhod : (${sent.split(' ')[0]}) → `), `${line} → ${roll}`).toBe(true);
    }
  });

  it('ダメージの行は、合計を振る', async () => {
    const { roll } = await sendLine(piece, lineStartingWith(piece, '{攻撃ダイス}D6+{右手攻撃力}'), threes);
    expect(roll).toBe('Arianrhod : (2D6+9) → 6[3,3]+9 → 15');
  });
});
