// キャラクター保管所の見分けのテスト。
// 形式の見分けの入口から、キャラクター保管所のアリアンロッド2E のシートだけを、コマの中身の組み立てに渡すことと、
// 同じキャラクターを書いたゆとシートのシートと、同じ欄とパレットになることと、
// 取り込んだコマのパレットの参照が、どれも値のある項目に当たることを確かめる。
import { TestBed } from '@angular/core/testing';
import { GameCharacter } from '@axe/domain/character/game-character';
import { parseImportedCharacterJson } from '@axe/domain/character/import/character-import-format';
import { ImportedCharacter } from '@axe/domain/character/import/imported-character';
import {
  buildCharasheetAr2eCharacter,
  isCharasheetAr2eCharacter,
} from '@axe/domain/character/import/system-profiles/charasheet-ar2e-profile';
import { evaluateCharacterReferences } from '@axe/domain/chat/chat-palette';
import {
  elementOf,
  findFieldOf,
  paletteLinesOf,
  referenceNamesOf,
  withImportedPiece,
} from '@axe/testing/ar2e/ar2e-piece';
import { SheetChange, withoutKeys, withValues } from '@axe/testing/ar2e/sheet-changes';
import { baseCharasheet, charasheetWith } from '@axe/testing/charasheet-ar2e/charasheet-ar2e-fixtures';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { baseSheet } from '@axe/testing/ytsheet-ar2e/ytsheet-ar2e-fixtures';

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
});

/**
 * 中間の形の欄から、値を除いた並び（見出しと項目の名前、種類、設定、リソースか）を取り出す。
 *
 * @param imported 取り込みの中間の形
 * @returns 欄の並び
 */
function layoutOf(imported: ImportedCharacter) {
  return imported.sections.map((section) => ({
    label: section.label,
    groups: section.groups.map((group) => ({
      label: group.label,
      settings: group.settings,
      fields: group.fields.map((field) => ({
        label: field.label,
        kind: field.kind,
        settings: field.settings,
        resource: field.resource != null,
      })),
    })),
  }));
}

describe('取り込みの対象（仕様書「取り込みの対象」「キャラクター保管所の取り込みの対象」）', () => {
  it('キャラクター保管所のアリアンロッド2E のシートを見分け、専用の取り込みで読む', () => {
    expect(isCharasheetAr2eCharacter(baseCharasheet())).toBe(true);
    const imported = parseImportedCharacterJson(baseCharasheet());
    expect([imported?.sourceFormat, imported?.dicebot]).toEqual(['charasheet', 'Arianrhod']);
  });

  it.each(['dx3', 'coc', 'arianrhod', ''])(
    'ほかのシステム（game が %j）のシートは見分けず、フォーク元の読み取りに回す',
    (game) => {
      const other = charasheetWith(withValues({ game }));
      expect(isCharasheetAr2eCharacter(other)).toBe(false);
      expect(buildCharasheetAr2eCharacter(other)).toBeNull();
      expect(parseImportedCharacterJson(other)?.sourceFormat).toBe('charasheet');
      expect(parseImportedCharacterJson(other)?.commands).not.toContain('//--- 判定');
    }
  );

  it('ゆとシートのアリアンロッド2E のシートは見分けない', () => {
    expect(isCharasheetAr2eCharacter(baseSheet())).toBe(false);
  });

  it('同じキャラクターを書いたゆとシートのシートと、同じパレットと、同じ並びの欄になる', () => {
    const fromCharasheet = parseImportedCharacterJson(baseCharasheet())!;
    const fromYtsheet = parseImportedCharacterJson(baseSheet())!;
    expect(fromCharasheet.commands).toBe(fromYtsheet.commands);
    expect(layoutOf(fromCharasheet)).toEqual(layoutOf(fromYtsheet));
  });
});

describe('取り込んだコマのパレットと欄（仕様書「キャラクター保管所の値の加工」「キャラクター保管所にない値の補い」「キャラクター保管所の右手と左手の合計の仕方」）', () => {
  /**
   * パレットのすべての送れる行で、どの参照も、コマの中の値のある項目にちょうど 1 つ当たり、
   * 参照を埋めた後に参照が残らないことを確かめる。
   *
   * @param piece コマ
   * @throws {Error} 項目に当たらない参照か、値のない項目への参照か、埋めた後に残る参照があるとき（テストの失敗）
   * @throws {TypeError} コマにチャットパレットがないとき
   */
  function expectEveryReferenceFilled(piece: GameCharacter): void {
    for (const line of paletteLinesOf(piece)) {
      for (const name of referenceNamesOf(line)) {
        const field = findFieldOf(piece, name);
        expect(field, name).not.toBeNull();
        expect(field!.value, name).not.toBe('');
      }
      expect(referenceNamesOf(evaluateCharacterReferences(line, piece).text), line).toEqual([]);
    }
  }

  it.each<[string, SheetChange[]]>([
    ['命中の合計がなく、合計しない', []],
    ['命中の合計があり、全部表示', [withValues({ IL_type: '片手剣', BSUM1T: '7', BSUM2T: '12' })]],
    [
      '魔術・呪歌・錬金術の判定を使わない（値を補う）',
      [withoutKeys('THG6', 'THG7', 'THG8', 'dice_majutu', 'dice_juka', 'dice_renkin')],
    ],
  ])('%s: パレットの全部の参照が、値のある項目に当たる', (_, changes) => {
    withImportedPiece(charasheetWith(...changes), expectEveryReferenceFilled);
  });

  it('全部表示のときは、右手・左手・合計の命中判定の行を作る', () => {
    withImportedPiece(charasheetWith(withValues({ BSUM1T: '7', BSUM2T: '12' })), (piece) => {
      expect(paletteLinesOf(piece).filter((line) => line.includes(' 命中判定'))).toEqual([
        '{命中ダイス}D6+{右手命中}>? 命中判定≪試しの剣≫(右手)',
        '{命中ダイス}D6+{左手命中}>? 命中判定≪試しの短剣≫(左手)',
        '{命中ダイス}D6+{命中}>? 命中判定≪試しの剣≫≪試しの短剣≫',
      ]);
    });
  });

  it('スキルの説明のコストは、0 か空なら「―」', () => {
    withImportedPiece(charasheetWith(), (piece) => {
      expect(elementOf(piece, 'スキル/DRの直後/テストガード').value).toContain('[コスト:―]');
      expect(elementOf(piece, 'スキル/パッシブ/トレーニング:筋力').value).toContain('[コスト:―]');
    });
  });
});
