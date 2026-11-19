/**
 * アリアンロッド2E の一覧。
 *
 * ルールが決めている固定の一覧。能力値、判定、スキルのタイミングと判定の分け方、バッドステータス。
 * キャラクターごとの値と、ゆとシートの項目名は持たない。
 */

/** 能力値の識別子 */
export type Ar2eAbilityId = 'str' | 'dex' | 'agi' | 'int' | 'sen' | 'mnd' | 'luk';

/** 特殊な判定の識別子 */
export type Ar2eSpecialCheckId =
  'trapDetect' | 'trapRelease' | 'dangerDetect' | 'enemyLore' | 'appraisal' | 'magic' | 'song' | 'alchemy';

/** 判定の識別子。能力値の判定は、能力値と同じ識別子 */
export type Ar2eCheckId = Ar2eAbilityId | Ar2eSpecialCheckId;

/** 能力値 */
export interface Ar2eAbility {
  readonly id: Ar2eAbilityId;
  /** 能力値の名前（例: 筋力） */
  readonly name: string;
}

/** 能力値の判定 */
export interface Ar2eAbilityCheck {
  readonly id: Ar2eAbilityId;
  readonly kind: 'ability';
  /** 能力値の名前（例: 筋力） */
  readonly name: string;
}

/** 特殊な判定 */
export interface Ar2eSpecialCheck {
  readonly id: Ar2eSpecialCheckId;
  readonly kind: 'special';
  /** 判定の名前（例: トラップ探知、魔術判定） */
  readonly name: string;
  /** ダイス数の元になる能力値。ゆとシートは、この能力値の判定のダイス数に、足すダイス数を足して求める */
  readonly ability: Ar2eAbilityId;
}

/** 判定。能力値の判定か、特殊な判定 */
export type Ar2eCheck = Ar2eAbilityCheck | Ar2eSpecialCheck;

/** 能力値の並び */
export const AR2E_ABILITIES: readonly Ar2eAbility[] = [
  { id: 'str', name: '筋力' },
  { id: 'dex', name: '器用' },
  { id: 'agi', name: '敏捷' },
  { id: 'int', name: '知力' },
  { id: 'sen', name: '感知' },
  { id: 'mnd', name: '精神' },
  { id: 'luk', name: '幸運' },
];

/** 特殊な判定の並び */
export const AR2E_SPECIAL_CHECKS: readonly Ar2eSpecialCheck[] = [
  { id: 'trapDetect', kind: 'special', name: 'トラップ探知', ability: 'sen' },
  { id: 'trapRelease', kind: 'special', name: 'トラップ解除', ability: 'dex' },
  { id: 'dangerDetect', kind: 'special', name: '危険感知', ability: 'sen' },
  { id: 'enemyLore', kind: 'special', name: 'エネミー識別', ability: 'int' },
  { id: 'appraisal', kind: 'special', name: 'アイテム鑑定', ability: 'int' },
  { id: 'magic', kind: 'special', name: '魔術判定', ability: 'int' },
  { id: 'song', kind: 'special', name: '呪歌判定', ability: 'mnd' },
  { id: 'alchemy', kind: 'special', name: '錬金術判定', ability: 'dex' },
];

/** 判定の並び。能力値の判定の後に、特殊な判定 */
export const AR2E_CHECKS: readonly Ar2eCheck[] = [
  ...AR2E_ABILITIES.map((ability): Ar2eAbilityCheck => ({ id: ability.id, kind: 'ability', name: ability.name })),
  ...AR2E_SPECIAL_CHECKS,
];

/**
 * 判定を、識別子で引く。
 *
 * @param id 判定の識別子
 * @returns 判定
 */
export function ar2eCheckOf(id: Ar2eCheckId): Ar2eCheck {
  return AR2E_CHECKS.find((check) => check.id === id)!;
}

/** スキルの決まったタイミング。並びは、スキルのタイミングの見出しを並べる順 */
export const AR2E_TIMINGS = [
  'パッシブ',
  'メイキング',
  '戦闘前',
  'セットアップ',
  'イニシアチブ',
  'フリー',
  'ムーブ',
  'レガシー',
  'マイナー',
  'メジャー',
  '判定の直前',
  '判定の直後',
  'DRの直前',
  'DRの直後',
  'リアクション',
  'クリンナップ',
  '戦闘不能',
  '効果参照',
  'アイテム',
] as const;

/** スキルの決まったタイミング */
export type Ar2eTiming = (typeof AR2E_TIMINGS)[number];

/** 「なし」の書き方。アリアンロッド2E の表で、何もないことを表す書き方 */
export const AR2E_NONE_MARKS: ReadonlySet<string> = new Set(['―', 'ー', '-']);

/** タイミングが空のスキルのタイミング */
const TIMING_WHEN_EMPTY: Ar2eTiming = '効果参照';

/** 「〇〇／メイキング」のような、2 つのタイミングを並べた書き方の区切り */
const TIMING_SEPARATOR = /[／/]/;

/**
 * スキルのタイミングを、決まったタイミングに分ける。
 *
 * 空なら、タイミングが空のスキルのタイミング（効果参照）にする。
 * そうでなければ、「／」か「/」で区切った最初の部分を、空白も含めて書かれたまま、決まったタイミングと比べる。
 *
 * @param text 書かれたタイミング
 * @returns 決まったタイミング。どれにも当たらない（書かれたままのタイミングになる）ときは null
 */
export function timingOf(text: string): Ar2eTiming | null {
  if (text === '') return TIMING_WHEN_EMPTY;
  const head = text.split(TIMING_SEPARATOR)[0];
  return AR2E_TIMINGS.find((timing) => timing === head) ?? null;
}

/**
 * スキルの判定の欄の選択肢のうち、ダイスを振る判定。
 *
 * - `check`: 能力値の判定と、魔術判定・呪歌判定・錬金術判定
 * - `evasion`: 回避判定
 * - `accuracy`: 命中判定
 */
export type Ar2eSkillCheck =
  | { readonly kind: 'check'; readonly check: Ar2eCheckId }
  | { readonly kind: 'evasion' }
  | { readonly kind: 'accuracy' };

/** 判定の欄の選択肢になる判定。能力値の判定と、特殊な判定のうちの 3 つ（選択肢の名前は、判定の名前と同じ） */
const SKILL_CHECK_IDS: readonly Ar2eCheckId[] = [
  ...AR2E_ABILITIES.map((ability) => ability.id),
  'magic',
  'alchemy',
  'song',
];

/** 判定の欄に書かれる選択肢と、そのダイスを振る判定 */
const SKILL_CHECKS: ReadonlyMap<string, Ar2eSkillCheck> = new Map<string, Ar2eSkillCheck>([
  ['命中判定', { kind: 'accuracy' }],
  ['回避判定', { kind: 'evasion' }],
  ...SKILL_CHECK_IDS.map((id): [string, Ar2eSkillCheck] => [ar2eCheckOf(id).name, { kind: 'check', check: id }]),
]);

/**
 * スキルの判定の欄を、ダイスを振る判定に分ける。書かれたままの文字を、判定の欄の選択肢と比べる。
 *
 * @param text 書かれた判定
 * @returns ダイスを振る判定。判定の欄の選択肢でないもの（自動成功、空欄、効果参照、自由に書いたものなど）は null
 */
export function skillCheckOf(text: string): Ar2eSkillCheck | null {
  return SKILL_CHECKS.get(text) ?? null;
}

/** バッドステータスが回復するタイミング */
export type Ar2eRecovery =
  | 'クリンナップ'
  | '行動の権利を得たとき'
  | 'メインプロセス終了時'
  | 'セットアップ終了時'
  | 'ムーブを使ったとき'
  | 'マイナーを使ったとき'
  | '効果参照';

/** バッドステータス */
export interface Ar2eBadStatus {
  readonly name: string;
  readonly recovery: Ar2eRecovery;
  /** ラウンドの終わりごとに、強さに応じて HP を失うか（毒と衰弱） */
  readonly losesHpEachRound: boolean;
}

/** バッドステータスの並び */
export const AR2E_BAD_STATUSES: readonly Ar2eBadStatus[] = [
  { name: '放心', recovery: 'クリンナップ', losesHpEachRound: false },
  { name: '逆上', recovery: 'クリンナップ', losesHpEachRound: false },
  { name: 'ノックバック', recovery: 'クリンナップ', losesHpEachRound: false },
  { name: 'スタン', recovery: '行動の権利を得たとき', losesHpEachRound: false },
  { name: '恐怖', recovery: 'メインプロセス終了時', losesHpEachRound: false },
  { name: '縛鎖', recovery: 'セットアップ終了時', losesHpEachRound: false },
  { name: 'スリップ', recovery: 'ムーブを使ったとき', losesHpEachRound: false },
  { name: '威圧', recovery: 'マイナーを使ったとき', losesHpEachRound: false },
  { name: '狂戦士化', recovery: 'マイナーを使ったとき', losesHpEachRound: false },
  { name: '毒', recovery: '効果参照', losesHpEachRound: true },
  { name: '衰弱', recovery: '効果参照', losesHpEachRound: true },
];
