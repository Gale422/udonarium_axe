/**
 * 見分けと組み立て。
 *
 * 貼られたデータが、ゆとシートのアリアンロッド2E の PC かを見分け、ほかの概念をつないで、取り込みの中間の形を作る。
 * ほかのシステムの取り込みと同じく、「見分ける関数」と「組み立てる関数」の組で受け持つ。
 */
import {
  asString,
  createEmptyImportedCharacter,
  ImportedCharacter,
  isNonEmptyScalar,
} from '@axe/domain/character/import/imported-character';
import { readAr2eCharacter } from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/ar2e-character-reader';
import { writeAr2ePalette } from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/ar2e-palette';
import { layoutAr2eSheet } from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/ar2e-sheet-layout';
import { planAttacks } from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/attack-plan';
import { placeSkills } from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/reference-names';
import { YtsheetRecord } from '@axe/domain/character/import/ytsheet-record';

/** アリアンロッド2E のシートのアドレスに入る部分 */
const AR2E_SHEET_PATH = '/ar2e/';

/** 取り込んだコマのダイスボット */
const AR2E_DICEBOT = 'Arianrhod';

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
 * ゆとシートのアリアンロッド2E の PC のシートから、取り込みの中間の形を作る。
 *
 * シートをアリアンロッド2E のキャラクターに読み、スキルの置き場と攻撃の組み合わせを決めてから、
 * コマの名前、チャットの色、ダイスボット、欄、パレットを置く。中間の形のリソース・パラメータ・メモ・参照元には置かない。
 *
 * @param parsed JSON を読んだもの
 * @returns 取り込みの中間の形。アリアンロッド2E の PC のシートでなければ null
 */
export function buildYtsheetAr2eCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isYtsheetAr2eCharacter(parsed)) return null;
  const character = readAr2eCharacter(new YtsheetRecord(parsed as Record<string, unknown>));
  const skills = placeSkills(character.skills);
  const attacks = planAttacks(character.hands, character.handedness);

  const imported = createEmptyImportedCharacter('ytsheet');
  // 中間の形のリソース・パラメータ・メモ・参照元には置かない。アックスの組み立てが、それらから同じ名前の欄を別に作り、重なるため
  imported.name = character.name;
  imported.color = character.color;
  imported.dicebot = AR2E_DICEBOT;
  imported.sections = layoutAr2eSheet(character, skills);
  imported.commands = writeAr2ePalette(skills, attacks);
  return imported;
}
