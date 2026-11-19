/**
 * 欄の案。
 *
 * アリアンロッド2E のキャラクターとスキルの置き場から、コマの見出し・項目・設定を、取り込みの中間の形で並べる。
 * パレットと、ゆとシートの項目名は持たない。
 */
import { skillMark } from '@axe/domain/character/import/axe-notation';
import { ImportedField, ImportedGroup, ImportedSection } from '@axe/domain/character/import/imported-character';
import { ImportedFieldSettings } from '@axe/domain/character/import/imported-character-extension';
import { AR2E_ABILITIES, AR2E_CHECKS } from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/ar2e-catalog';
import { Ar2eCharacter, Ar2eSkill } from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/ar2e-character';
import {
  abilityFieldNames,
  AR2E_FIELD_NAMES,
  checkFieldNames,
  RESOURCE_GROUP_NAME,
  RESOURCE_SECTION_NAME,
  sheetGroupNameOf,
  SKILL_SECTION_NAME,
  SkillHeading,
} from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/reference-names';

/** 決まった項目の識別子（`AR2E_FIELD_NAMES` の見出し） */
type FixedFieldId = keyof typeof AR2E_FIELD_NAMES;

/** 決まった中の見出しの名前 */
const BASIC_GROUP = '基本';

/**
 * 決まった項目ごとの設定。項目の種類ごとの設定の上に重ねる。
 * 決まった項目の識別子（`AR2E_FIELD_NAMES` の見出し）で引き、画面に出る名前では引かない。
 * 決まった項目と同じ名前のスキルに、その設定が付かないようにするため。
 */
const FIXED_FIELD_SETTINGS: Readonly<Partial<Record<FixedFieldId, ImportedFieldSettings>>> = {
  hp: { min: 0, changeEffect: true },
  mp: { min: 0, changeEffect: true },
  fate: { min: 0 },
  fateLimit: { min: 0 },
  movement: { unit: 'm', min: 0 },
  physicalDefense: { min: 0 },
  magicalDefense: { min: 0 },
  money: { unit: 'G', min: 0 },
  level: { min: 1 },
};

/** 項目の種類 */
type FieldKind = 'number' | 'dice' | 'text' | 'note' | 'resource';

/**
 * 項目の種類ごとの設定。ここにない種類は、設定なし。
 * ダイス数の項目は、「2D」と読めるように単位 D を付ける。
 */
const KIND_SETTINGS: Readonly<Partial<Record<FieldKind, ImportedFieldSettings>>> = {
  dice: { unit: 'D' },
};

/** 0 か空なら「―」にするコストの書き方（ゆとシートの閲覧画面と同じ） */
const COST_SHOWN_AS_NONE: ReadonlySet<string> = new Set(['', '0']);

/** コストが 0 か空のときの表示 */
const NO_COST = '―';

/**
 * コマの欄を並べる。中身のない欄は作らない。
 *
 * @param character アリアンロッド2E のキャラクター
 * @param skills スキルの置き場
 * @returns 取り込みの中間の形の欄の並び
 */
export function layoutAr2eSheet(character: Ar2eCharacter, skills: readonly SkillHeading[]): ImportedSection[] {
  return [
    resourceSection(character),
    abilitySection(character),
    checkSection(character),
    battleSection(character),
    skillSection(skills),
    belongingsSection(character),
    geisSection(character),
    connectionSection(character),
    profileSection(character),
  ].filter((section) => section.groups.length > 0);
}

/**
 * リソースの欄を作る。中の見出し「基本」に、HP・MP・フェイトのリソースの項目と、
 * フェイト使用上限・行動値・移動力・物理防御力・魔法防御力の数値の項目を置き、ポップアップ表示を付ける。
 *
 * @param character アリアンロッド2E のキャラクター
 * @returns リソースの欄
 */
function resourceSection(character: Ar2eCharacter): ImportedSection {
  const { resources, battle } = character;
  return section(RESOURCE_SECTION_NAME, [
    {
      label: RESOURCE_GROUP_NAME,
      settings: { popup: true },
      fields: [
        resourceField(fixed('hp'), resources.hp),
        resourceField(fixed('mp'), resources.mp),
        resourceField(fixed('fate'), resources.fate),
        numberField(fixed('fateLimit'), resources.fateLimit),
        numberField(fixed('initiative'), battle.initiative),
        numberField(fixed('movement'), battle.movement),
        numberField(fixed('physicalDefense'), battle.physicalDefense),
        numberField(fixed('magicalDefense'), battle.magicalDefense),
      ],
    },
  ]);
}

/**
 * 能力値の欄を作る。能力値ごとに、基本値と能力値の数値の項目を置く。
 *
 * @param character アリアンロッド2E のキャラクター
 * @returns 能力値の欄
 */
function abilitySection(character: Ar2eCharacter): ImportedSection {
  const fields = AR2E_ABILITIES.flatMap((ability) => {
    const names = abilityFieldNames(ability);
    const score = character.abilities[ability.id];
    return [numberField(named(names.base), score.base), numberField(named(names.bonus), score.bonus)];
  });
  return section('能力値', [{ label: BASIC_GROUP, fields }]);
}

/**
 * 判定の欄を作る。中の見出し「能力値判定」と「特殊な判定」に、判定ごとのダイス数と固定値の項目を置く。
 *
 * @param character アリアンロッド2E のキャラクター
 * @returns 判定の欄
 */
function checkSection(character: Ar2eCharacter): ImportedSection {
  const fieldsOf = (kind: 'ability' | 'special') =>
    AR2E_CHECKS.filter((check) => check.kind === kind).flatMap((check) => {
      const names = checkFieldNames(check);
      const score = character.checks[check.id];
      return [diceField(named(names.dice), score.dice), numberField(named(names.modifier), score.modifier)];
    });
  return section('判定', [
    { label: '能力値判定', fields: fieldsOf('ability') },
    { label: '特殊な判定', fields: fieldsOf('special') },
  ]);
}

/**
 * 戦闘の欄を作る。命中・攻撃力・回避のダイス数と値、右手と左手の命中と攻撃力の項目を置く。
 *
 * @param character アリアンロッド2E のキャラクター
 * @returns 戦闘の欄
 */
function battleSection(character: Ar2eCharacter): ImportedSection {
  const { accuracy, attack, evasion } = character.battle;
  return section('戦闘', [
    {
      label: BASIC_GROUP,
      fields: [
        diceField(fixed('accuracyDice'), accuracy.dice),
        numberField(fixed('accuracy'), accuracy.total),
        diceField(fixed('attackDice'), attack.dice),
        numberField(fixed('attack'), attack.total),
        diceField(fixed('evasionDice'), evasion.dice),
        numberField(fixed('evasion'), evasion.modifier),
        numberField(fixed('rightAccuracy'), accuracy.right),
        numberField(fixed('rightAttack'), attack.right),
        numberField(fixed('leftAccuracy'), accuracy.left),
        numberField(fixed('leftAttack'), attack.left),
      ],
    },
  ]);
}

/**
 * スキルの欄を作る。タイミングの見出しを中の見出しにし、スキルごとに、スキルの説明の長文の項目を置く。
 *
 * @param skills スキルの置き場
 * @returns スキルの欄
 */
function skillSection(skills: readonly SkillHeading[]): ImportedSection {
  return section(
    SKILL_SECTION_NAME,
    skills.map((heading) => ({
      label: heading.name,
      fields: heading.skills.map((placed) => noteField(named(placed.itemName), skillDescriptionOf(placed.skill))),
    }))
  );
}

/**
 * スキルの説明の文を作る。並びと言葉は、ゆとシートのスキルの表と同じ。空の項目と、中身が全部空の行は省く。
 * コストが 0 か空なら「―」にする。
 *
 * @param skill スキル
 * @returns スキルの説明の文
 */
export function skillDescriptionOf(skill: Ar2eSkill): string {
  const item = (label: string, text: string) => (text === '' ? '' : `[${label}:${text}]`);
  const cost = COST_SHOWN_AS_NONE.has(skill.cost) ? NO_COST : skill.cost;
  return [
    skillMark(skill.name) + item('取得元', skill.source) + item('分類', skill.category),
    item('Lv', skill.level) + item('タイミング', skill.timing) + item('判定', skill.check),
    item('対象', skill.target) + item('射程', skill.range),
    `[コスト:${cost}]` + item('使用条件', skill.requirement),
    skill.effect === '' ? '' : `[効果]:${skill.effect}`,
  ]
    .filter((line) => line !== '')
    .join('\n');
}

/**
 * 携行品・所持品の欄を作る。所持金と、携行品・所持品の内容の項目を置く。
 *
 * @param character アリアンロッド2E のキャラクター
 * @returns 携行品・所持品の欄
 */
function belongingsSection(character: Ar2eCharacter): ImportedSection {
  const { belongings } = character;
  return section('携行品・所持品', [
    {
      label: BASIC_GROUP,
      fields: [numberField(fixed('money'), belongings.money), noteField(fixed('items'), belongings.items)],
    },
  ]);
}

/**
 * 誓約の欄を作る。誓約ごとに、誓約の名前の中の見出しに、成長点と恩恵・束縛などの項目を置く。
 *
 * @param character アリアンロッド2E のキャラクター
 * @returns 誓約の欄。誓約がなければ、中の見出しのない欄
 */
function geisSection(character: Ar2eCharacter): ImportedSection {
  return section(
    '誓約',
    character.geises.map((geis) => ({
      label: sheetGroupNameOf(geis.name),
      fields: [numberField(fixed('geisGrowth'), geis.growth), noteField(fixed('geisNote'), geis.note)],
    }))
  );
}

/**
 * コネクションの欄を作る。コネクションごとに、相手の名前の中の見出しに、関係と備考の項目を置く。
 *
 * @param character アリアンロッド2E のキャラクター
 * @returns コネクションの欄。コネクションがなければ、中の見出しのない欄
 */
function connectionSection(character: Ar2eCharacter): ImportedSection {
  return section(
    'コネクション',
    character.connections.map((connection) => ({
      label: sheetGroupNameOf(connection.name),
      fields: [
        textField(fixed('connectionRelation'), connection.relation),
        textField(fixed('connectionNote'), connection.note),
      ],
    }))
  );
}

/**
 * プロフィールの欄を作る。
 *
 * @param character アリアンロッド2E のキャラクター
 * @returns プロフィールの欄
 */
function profileSection(character: Ar2eCharacter): ImportedSection {
  const { profile } = character;
  return section('プロフィール', [
    {
      label: BASIC_GROUP,
      fields: [
        textField(fixed('player'), profile.player),
        numberField(fixed('level'), profile.level),
        textField(fixed('race'), profile.race),
        textField(fixed('gender'), profile.gender),
        textField(fixed('age'), profile.age),
        textField(fixed('mainClass'), profile.mainClass),
        textField(fixed('supportClass'), profile.supportClass),
        textField(fixed('titleClass'), profile.titleClass),
        textField(fixed('guild'), profile.guild),
        noteField(fixed('note'), profile.note),
        noteField(fixed('sheetUrl'), profile.sheetUrl),
      ],
    },
  ]);
}

/**
 * 欄を作る。
 *
 * @param label 欄の名前
 * @param groups 中の見出し
 * @returns 欄
 */
function section(label: string, groups: ImportedGroup[]): ImportedSection {
  return { label, groups };
}

/** 欄に置く項目の名前と、項目ごとの設定 */
interface FieldName {
  readonly label: string;
  /** 決まった項目ごとの設定。決まった項目でない項目と、設定のない決まった項目では、ない */
  readonly individual?: ImportedFieldSettings;
}

/**
 * 決まった項目の識別子から、項目の名前と設定を引く。
 *
 * @param id 決まった項目の識別子
 * @returns 項目の名前と、決まった項目ごとの設定
 */
function fixed(id: FixedFieldId): FieldName {
  // 識別子 1 つから両方を引くので、名前と設定を取り違えない
  return { label: AR2E_FIELD_NAMES[id], individual: FIXED_FIELD_SETTINGS[id] };
}

/**
 * 決まった項目ごとの設定を持たない項目の名前を作る。
 *
 * @param label 項目の名前
 * @returns 決まった項目ごとの設定のない、項目の名前
 */
function named(label: string): FieldName {
  return { label };
}

/**
 * 数値の項目を作る。
 *
 * @param name 項目の名前と、決まった項目ごとの設定
 * @param value 値
 * @param kind 項目の種類（数値かダイス数）
 * @returns 数値の項目。値がないときは空
 */
function numberField(name: FieldName, value: number | null, kind: 'number' | 'dice' = 'number'): ImportedField {
  return withSettings({ label: name.label, value: value ?? '', kind: 'number' }, settingsOf(kind, name));
}

/**
 * ダイス数の項目を作る。数値の項目に、ダイス数の種類の設定を付ける。
 *
 * @param name 項目の名前と、決まった項目ごとの設定
 * @param value ダイス数
 * @returns ダイス数の項目。値がないときは空
 */
function diceField(name: FieldName, value: number | null): ImportedField {
  return numberField(name, value, 'dice');
}

/**
 * テキストの項目を作る。
 *
 * @param name 項目の名前と、決まった項目ごとの設定
 * @param text 文字
 * @returns テキストの項目
 */
function textField(name: FieldName, text: string): ImportedField {
  return withSettings({ label: name.label, value: text, kind: 'text' }, settingsOf('text', name));
}

/**
 * 長文の項目を作る。
 *
 * @param name 項目の名前と、決まった項目ごとの設定
 * @param value 文字
 * @returns 長文の項目
 */
function noteField(name: FieldName, value: string): ImportedField {
  return withSettings({ label: name.label, value, kind: 'note' }, settingsOf('note', name));
}

/**
 * リソースの項目を作る。数値の項目に、リソースの値を足し、現在値と最大値に同じ値を置く。
 *
 * @param name 項目の名前と、決まった項目ごとの設定
 * @param amount 値
 * @returns リソースの項目。値がないときは、現在値と最大値を空にする
 */
function resourceField(name: FieldName, amount: number | null): ImportedField {
  return withSettings(
    { label: name.label, value: amount ?? '', kind: 'number', resource: { max: amount } },
    settingsOf('resource', name)
  );
}

/**
 * 項目の設定を決める。既定（設定なし）の上に、種類ごとの設定、決まった項目ごとの設定の順に重ね、後から重ねた設定を優先する。
 *
 * @param kind 項目の種類
 * @param name 項目の名前と、決まった項目ごとの設定
 * @returns 重ねた設定。どれにもなければ undefined
 */
function settingsOf(kind: FieldKind, name: FieldName): ImportedFieldSettings | undefined {
  const byKind = KIND_SETTINGS[kind];
  return byKind || name.individual ? { ...byKind, ...name.individual } : undefined;
}

/**
 * 項目に設定を付ける。設定がないときは、設定の項目そのものを作らない。
 *
 * @param field 項目
 * @param settings 項目の設定
 * @returns 設定を付けた項目。設定がないときは、渡した項目
 */
function withSettings(field: ImportedField, settings: ImportedFieldSettings | undefined): ImportedField {
  return settings ? { ...field, settings } : field;
}
