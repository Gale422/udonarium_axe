/**
 * キャラクター保管所の見分け。
 *
 * 貼られたデータが、キャラクター保管所のアリアンロッド2E のシートかを見分け、キャラクター保管所の読み手でまとめた
 * キャラクターを、コマの中身の組み立てに渡す。
 * ほかのシステムの取り込みと同じく、「見分ける関数」と「組み立てる関数」の組で受け持つ。
 */
import { CharasheetRecord } from '@axe/domain/character/import/charasheet-record';
import { createEmptyImportedCharacter, ImportedCharacter } from '@axe/domain/character/import/imported-character';
import { fillAr2ePieceContents } from '@axe/domain/character/import/system-profiles/ar2e/ar2e-piece-contents';
import { readCharasheetAr2eCharacter } from '@axe/domain/character/import/system-profiles/charasheet-ar2e/charasheet-ar2e-reader';
import { isCharasheetGame } from '@axe/domain/character/import/system-profiles/charasheet-shared';

/** キャラクター保管所の、アリアンロッド2E のシステムの印 */
const AR2E_GAME = 'ara2';

/**
 * 貼られたデータが、キャラクター保管所のアリアンロッド2E のシートかを見分ける。
 * キャラクター保管所のシートで、システムの印（`game`）が `ara2` のものを、アリアンロッド2E のシートとする。
 *
 * @param parsed JSON を読んだもの
 * @returns キャラクター保管所のアリアンロッド2E のシートなら true
 */
export function isCharasheetAr2eCharacter(parsed: unknown): boolean {
  return isCharasheetGame(parsed, AR2E_GAME);
}

/**
 * キャラクター保管所のアリアンロッド2E のシートを、キャラクター保管所の読み手でアリアンロッド2E のキャラクターにまとめ、
 * コマの中身の組み立てで、取り込みの中間の形にする。
 *
 * @param parsed JSON を読んだもの
 * @returns 取り込みの中間の形。キャラクター保管所のアリアンロッド2E のシートでなければ null
 */
export function buildCharasheetAr2eCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isCharasheetAr2eCharacter(parsed)) return null;
  const character = readCharasheetAr2eCharacter(new CharasheetRecord(parsed as Record<string, unknown>));
  return fillAr2ePieceContents(createEmptyImportedCharacter('charasheet'), character);
}
