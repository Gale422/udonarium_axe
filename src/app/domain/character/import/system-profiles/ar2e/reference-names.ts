/**
 * 参照の名前。
 *
 * 欄とパレットの間の約束。決まった項目の名前と、スキルの置き場（タイミングの見出しと項目の名前）を決める。
 * 欄の見た目と、パレットの文面は持たない。
 */
import { referableNameOf } from '@axe/domain/character/import/axe-notation';
import {
  AR2E_NONE_MARKS,
  AR2E_TIMINGS,
  Ar2eAbility,
  Ar2eCheck,
  timingOf,
} from '@axe/domain/character/import/system-profiles/ar2e/ar2e-catalog';
import { Ar2eSkill } from '@axe/domain/character/import/system-profiles/ar2e/ar2e-character';
import { AttackHand } from '@axe/domain/character/import/system-profiles/ar2e/attack-plan';

/**
 * 決まった項目の名前のうち、能力値と判定以外のもの。
 * 名前は、ゆとシートの自動パレットの変数名にそろえる。
 */
export const AR2E_FIELD_NAMES = {
  hp: 'HP',
  mp: 'MP',
  fate: 'フェイト',
  fateLimit: 'フェイト使用上限',
  initiative: '行動値',
  movement: '移動力',
  physicalDefense: '物理防御力',
  magicalDefense: '魔法防御力',
  accuracyDice: '命中ダイス',
  accuracy: '命中',
  attackDice: '攻撃ダイス',
  attack: '攻撃力',
  evasionDice: '回避ダイス',
  evasion: '回避',
  rightAccuracy: '右手命中',
  rightAttack: '右手攻撃力',
  leftAccuracy: '左手命中',
  leftAttack: '左手攻撃力',
  money: '所持金',
  items: '携行品・所持品の内容',
  geisGrowth: '成長点',
  geisNote: '恩恵・束縛など',
  connectionRelation: '関係',
  connectionNote: '備考',
  player: 'PL',
  level: 'CL',
  race: '種族',
  gender: '性別',
  age: '年齢',
  mainClass: 'メインクラス',
  supportClass: 'サポートクラス',
  titleClass: '称号クラス',
  guild: '所属ギルド',
  note: '容姿・経歴・その他メモ',
  sheetUrl: '参照元',
} as const;

/** スキルの欄の名前 */
export const SKILL_SECTION_NAME = 'スキル';

/** リソースの欄の名前 */
export const RESOURCE_SECTION_NAME = 'リソース';

/** リソースの欄の中の見出しの名前 */
export const RESOURCE_GROUP_NAME = '基本';

/**
 * リソースの欄の項目までの、見出しの道を作る。
 *
 * @param name リソースの欄の項目の名前
 * @returns 外側の見出しから項目までの名前の並び
 */
export function resourceFieldPath(name: string): readonly string[] {
  return [RESOURCE_SECTION_NAME, RESOURCE_GROUP_NAME, name];
}

/**
 * 能力値の欄の、基本値と能力値の項目の名前（例: 筋力基本値、筋力）を作る。
 *
 * @param ability 能力値
 * @returns 基本値と能力値の項目の名前
 */
export function abilityFieldNames(ability: Ar2eAbility): { readonly base: string; readonly bonus: string } {
  return { base: `${ability.name}基本値`, bonus: ability.name };
}

/**
 * 判定の欄の、ダイス数と固定値の項目の名前を作る。
 * 能力値の判定は「筋力判定ダイス」「筋力判定」、特殊な判定は「トラップ探知ダイス」「トラップ探知」など。
 *
 * @param check 判定
 * @returns ダイス数と固定値の項目の名前
 */
export function checkFieldNames(check: Ar2eCheck): { readonly dice: string; readonly modifier: string } {
  const modifier = check.kind === 'ability' ? `${check.name}判定` : check.name;
  return { dice: `${modifier}ダイス`, modifier };
}

/**
 * 行の手の、命中と攻撃力の項目の名前を引く。
 *
 * @param hand 行の手
 * @returns 命中と攻撃力の項目の名前
 */
export function handFieldNames(hand: AttackHand): HandFieldNames {
  return HAND_FIELD_NAMES[hand];
}

/** 命中と攻撃力の項目の名前 */
interface HandFieldNames {
  readonly accuracy: string;
  readonly attack: string;
}

/** 行の手ごとの、命中と攻撃力の項目の名前 */
const HAND_FIELD_NAMES: Readonly<Record<AttackHand, HandFieldNames>> = {
  right: { accuracy: AR2E_FIELD_NAMES.rightAccuracy, attack: AR2E_FIELD_NAMES.rightAttack },
  left: { accuracy: AR2E_FIELD_NAMES.leftAccuracy, attack: AR2E_FIELD_NAMES.leftAttack },
  total: { accuracy: AR2E_FIELD_NAMES.accuracy, attack: AR2E_FIELD_NAMES.attack },
};

/** 置き場の決まったスキル */
export interface PlacedSkill {
  readonly skill: Ar2eSkill;
  /** 欄のスキルの項目の名前 */
  readonly itemName: string;
}

/** スキルのタイミングの見出しと、その中のスキル（シートの順） */
export interface SkillHeading {
  readonly name: string;
  readonly skills: readonly PlacedSkill[];
}

/**
 * スキルの置き場を決める。スキルをタイミングの見出しごとに分け、見出しの中ではシートの順に並べる。
 * 見出しは、決まったタイミング（その順）、「なし」の書き方のタイミング、それ以外（出てきた順）の順に並べる。
 *
 * 項目の名前は、スキルの名前を、参照で読める名前（半角）にしたもので、重なっても変えない。
 *
 * @param skills 名前のあるスキル（シートの順）
 * @returns タイミングの見出しの並び。スキルのない見出しは含まない
 */
export function placeSkills(skills: readonly Ar2eSkill[]): readonly SkillHeading[] {
  const byHeading = new Map<string, PlacedSkill[]>();
  for (const skill of skills) {
    const heading = headingNameOf(skill);
    const placed = { skill, itemName: referableNameOf(skill.name) };
    const grouped = byHeading.get(heading);
    if (grouped) grouped.push(placed);
    else byHeading.set(heading, [placed]);
  }
  return orderedHeadings([...byHeading.keys()]).map((heading) => ({ name: heading, skills: byHeading.get(heading)! }));
}

/**
 * 誓約やコネクションの見出しの名前を、参照で読める名前（半角）にして作る。重なっても変えない。
 *
 * @param name 誓約やコネクションの名前
 * @returns 見出しの名前
 */
export function sheetGroupNameOf(name: string): string {
  return referableNameOf(name);
}

/**
 * スキルのタイミングの見出しの名前を作る。決まったタイミングはそのまま、書かれたままのタイミングは名前を半角に直す。
 *
 * @param skill スキル
 * @returns タイミングの見出しの名前
 */
function headingNameOf(skill: Ar2eSkill): string {
  return timingOf(skill.timing) ?? referableNameOf(skill.timing);
}

/**
 * タイミングの見出しを並べる。決まったタイミング（その順）→「なし」の書き方のタイミング → それ以外（出てきた順）。
 *
 * @param headings タイミングの見出しの名前（出てきた順）
 * @returns 並べた見出しの名前
 */
function orderedHeadings(headings: readonly string[]): string[] {
  const listed = AR2E_TIMINGS.filter((timing) => headings.includes(timing));
  const written = headings.filter((heading) => !listed.some((timing) => timing === heading));
  return [
    ...listed,
    ...written.filter((heading) => AR2E_NONE_MARKS.has(heading)),
    ...written.filter((heading) => !AR2E_NONE_MARKS.has(heading)),
  ];
}
