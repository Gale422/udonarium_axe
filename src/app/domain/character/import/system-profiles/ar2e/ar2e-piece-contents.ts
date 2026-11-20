/**
 * コマの中身の組み立て。
 *
 * アリアンロッド2E のキャラクターから、スキルの置き場と攻撃の組み合わせを決め、欄の案とパレットの案で、
 * 取り込みの中間の形に、コマの名前・チャットの色・ダイスボット・欄・パレットを入れる。
 * どのサイトから来たキャラクターかは知らない。
 */
import { ImportedCharacter } from '@axe/domain/character/import/imported-character';
import { Ar2eCharacter } from '@axe/domain/character/import/system-profiles/ar2e/ar2e-character';
import { writeAr2ePalette } from '@axe/domain/character/import/system-profiles/ar2e/ar2e-palette';
import { layoutAr2eSheet } from '@axe/domain/character/import/system-profiles/ar2e/ar2e-sheet-layout';
import { planAttacks } from '@axe/domain/character/import/system-profiles/ar2e/attack-plan';
import { placeSkills } from '@axe/domain/character/import/system-profiles/ar2e/reference-names';

/** 取り込んだコマのダイスボット */
const AR2E_DICEBOT = 'Arianrhod';

/**
 * アリアンロッド2E のキャラクターから、スキルの置き場と攻撃の組み合わせを決め、
 * 取り込みの中間の形に、コマの名前、チャットの色、ダイスボット、欄、パレットを入れる。
 *
 * @param imported 中身を入れる、取り込みの中間の形
 * @param character アリアンロッド2E のキャラクター
 * @returns 中身を入れた、取り込みの中間の形（渡したもの）
 */
export function fillAr2ePieceContents(imported: ImportedCharacter, character: Ar2eCharacter): ImportedCharacter {
  const skills = placeSkills(character.skills);
  const attacks = planAttacks(character.hands, character.handedness);
  // 中間の形のリソース・パラメータ・メモ・参照元には置かない。アックスの組み立てが、それらから同じ名前の欄を別に作り、重なるため
  imported.name = character.name;
  imported.color = character.color;
  imported.dicebot = AR2E_DICEBOT;
  imported.sections = layoutAr2eSheet(character, skills);
  imported.commands = writeAr2ePalette(skills, attacks);
  return imported;
}
