/**
 * ゆとシートの見分け。
 *
 * 貼られたデータが、ゆとシートのアリアンロッド2E の PC かを見分け、ゆとシートの読み手でまとめたキャラクターを、
 * コマの中身の組み立てに渡す。
 * ほかのシステムの取り込みと同じく、「見分ける関数」と「組み立てる関数」の組で受け持つ。
 */
import {
  asString,
  createEmptyImportedCharacter,
  ImportedCharacter,
  isNonEmptyScalar,
} from '@axe/domain/character/import/imported-character';
import { fillAr2ePieceContents } from '@axe/domain/character/import/system-profiles/ar2e/ar2e-piece-contents';
import { readYtsheetAr2eCharacter } from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/ytsheet-ar2e-reader';
import { YtsheetRecord } from '@axe/domain/character/import/ytsheet-record';

/** アリアンロッド2E のシートのアドレスに入る部分 */
const AR2E_SHEET_PATH = '/ar2e/';

/**
 * 貼られたデータが、ゆとシートのアリアンロッド2E の PC のシートかを見分ける。
 *
 * シートのアドレスが `/ar2e/` を含み、エネミーとギルドの印（`type`）がないものを、PC のシートとする。
 *
 * @param parsed JSON を読んだもの
 * @returns ゆとシートのアリアンロッド2E の PC のシートなら true
 */
export function isYtsheetAr2eCharacter(parsed: unknown): boolean {
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  const record = parsed as Record<string, unknown>;
  return asString(record['sheetURL']).includes(AR2E_SHEET_PATH) && !isNonEmptyScalar(record['type']);
}

/**
 * ゆとシートのアリアンロッド2E の PC のシートを、ゆとシートの読み手でアリアンロッド2E のキャラクターにまとめ、
 * コマの中身の組み立てで、取り込みの中間の形にする。
 *
 * @param parsed JSON を読んだもの
 * @returns 取り込みの中間の形。アリアンロッド2E の PC のシートでなければ null
 */
export function buildYtsheetAr2eCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isYtsheetAr2eCharacter(parsed)) return null;
  const character = readYtsheetAr2eCharacter(new YtsheetRecord(parsed as Record<string, unknown>));
  return fillAr2ePieceContents(createEmptyImportedCharacter('ytsheet'), character);
}
