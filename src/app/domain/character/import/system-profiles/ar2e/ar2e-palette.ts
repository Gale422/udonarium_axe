/**
 * パレットの案。
 *
 * 見出しの並びと行の書き方。スキルの置き場と攻撃の組み合わせから、チャットパレットの文を書く。キャラクターの値は読まない。
 * 欄の見た目と、サイトの項目名は持たない。行は、パレットの変数を使わず、欄を参照する。
 */
import {
  AxeBuffEnding,
  damageOverTimeDebuffCommand,
  debuffCommand,
  maxPathReferenceTo,
  paletteHeadingLine,
  pathReferenceTo,
  referenceTo,
  removeBuffCommand,
  resourceCommand,
  skillMark,
  TARGET_NUMBER,
} from '@axe/domain/character/import/axe-notation';
import {
  AR2E_BAD_STATUSES,
  AR2E_CHECKS,
  Ar2eBadStatus,
  Ar2eCheck,
  ar2eCheckOf,
  Ar2eRecovery,
  skillCheckOf,
} from '@axe/domain/character/import/system-profiles/ar2e/ar2e-catalog';
import { Ar2eSkill } from '@axe/domain/character/import/system-profiles/ar2e/ar2e-character';
import { AttackHand, AttackLine, AttackPlan } from '@axe/domain/character/import/system-profiles/ar2e/attack-plan';
import {
  AR2E_FIELD_NAMES,
  checkFieldNames,
  handFieldNames,
  PlacedSkill,
  resourceFieldPath,
  SKILL_SECTION_NAME,
  SkillHeading,
} from '@axe/domain/character/import/system-profiles/ar2e/reference-names';

const N = AR2E_FIELD_NAMES;

/** パレットの見出しのかたまり。見出しの行の下に行を並べる。空の行は、かたまりの中の区切り */
interface PaletteBlock {
  readonly heading: string;
  readonly lines: readonly string[];
}

/**
 * 判定で比べる相手。
 *
 * - `ask`: 比べる値を `?` にする。結果の数を見て、使う人が決める
 * - `targetNumber`: 比べる値を `{目標値}` にする。送るときに、チャットから取った目標値に置き換わる
 */
type Comparison = 'ask' | 'targetNumber';

/** 比べる相手ごとの違い。同じ見出しのかたまりを、この違いだけを変えて作る */
interface ComparisonForm {
  /** 判定で比べる値 */
  readonly value: string;
  /** ダメージの適用で、ダメージとして読む量。空なら、使う人が書き足す */
  readonly damage: string;
  /** ダメージの適用の行の後ろの、使う人への案内。何の後にダメージを書くかを受け取る */
  readonly hint: (after: string) => string;
}

/** 比べる相手ごとの違い */
const COMPARISON_FORMS: Readonly<Record<Comparison, ComparisonForm>> = {
  ask: { value: '?', damage: '', hint: (after) => `（${after}の後にダメージを書く）` },
  targetNumber: { value: TARGET_NUMBER, damage: TARGET_NUMBER, hint: () => '' },
};

/** 行の手ごとの、行の終わりに付ける手の書き方 */
const HAND_MARKS: Readonly<Record<AttackHand, string>> = { right: '(右手)', left: '(左手)', total: '' };

/**
 * 回復のタイミングが、アックスのバフの消えるタイミングに合うバッドステータスの、消え方と行の説明。
 * ここにない回復のタイミングのバッドステータスは、消えないバフとして付け、外す行を作る。
 */
const ENDINGS_BY_RECOVERY: Readonly<Partial<Record<Ar2eRecovery, { ending: AxeBuffEnding; note: string }>>> = {
  クリンナップ: { ending: { rounds: 1, timing: 'ラウンド終了' }, note: 'クリンナップで回復' },
  行動の権利を得たとき: { ending: { rounds: 1, timing: '手番開始' }, note: '行動の権利を得たときに回復' },
  メインプロセス終了時: { ending: { rounds: 1, timing: '手番終了' }, note: 'メインプロセス終了時に回復' },
};

/** 毒と衰弱が、ラウンドの終わりごとに失わせる HP の式。`n` は、使う人が強さに書き換える */
const HP_LOST_EACH_ROUND = '-(n*5)';

/**
 * チャットパレットの文を書く。
 *
 * 判定、判定（目標値）、受動判定、受動判定（目標値）、リソース操作、バフ操作、能動判定の見出しのかたまりを、この順に、
 * 空の行を挟んで並べる。スキルがあれば、最後にスキルの見出しのかたまりを足す。
 *
 * @param skills スキルの置き場
 * @param attacks 命中判定とダメージの行の組
 * @returns チャットパレットの文
 */
export function writeAr2ePalette(skills: readonly SkillHeading[], attacks: AttackPlan): string {
  const blocks: PaletteBlock[] = [
    checkBlock('判定', 'ask'),
    checkBlock('判定（目標値）', 'targetNumber'),
    passiveBlock('受動判定', 'ask'),
    passiveBlock('受動判定（目標値）', 'targetNumber'),
    resourceBlock(),
    buffBlock(),
    activeBlock(attacks),
    ...(skills.length > 0 ? [skillBlock(skills, attacks)] : []),
  ];
  return blocks.map((block) => [paletteHeadingLine(block.heading), ...block.lines].join('\n')).join('\n\n');
}

/**
 * 振り方 `{ダイス数の項目}D6+{値の項目}` を作る。
 *
 * @param dice ダイス数の項目の名前
 * @param value 値の項目の名前
 * @returns 振り方
 */
function rollOf(dice: string, value: string): string {
  return `${referenceTo(dice)}D6+${referenceTo(value)}`;
}

/**
 * 振り方の後ろに、比べる部分 `>=値` を付ける。値は、比べる相手で決まる。
 *
 * @param roll 振り方
 * @param comparison 比べる相手
 * @returns 比べる部分を付けた振り方
 */
function comparedRoll(roll: string, comparison: Comparison): string {
  return `${roll}>=${COMPARISON_FORMS[comparison].value}`;
}

/**
 * 判定の振り方を作る。
 *
 * @param check 判定
 * @returns 判定のダイス数と固定値の項目を読む振り方
 */
function checkRoll(check: Ar2eCheck): string {
  const names = checkFieldNames(check);
  return rollOf(names.dice, names.modifier);
}

/** 回避判定の振り方 */
const EVASION_ROLL = rollOf(N.evasionDice, N.evasion);

/**
 * 命中判定の振り方を作る。比べる部分は `>?` にする。
 *
 * @param hand 行の手
 * @returns 命中ダイスと、その手の命中の項目を読む振り方
 */
function accuracyRoll(hand: AttackHand): string {
  // 比べるのは受ける側なので、比べる相手ごとに分けず、`>?` の 1 種類にする
  return `${rollOf(N.accuracyDice, handFieldNames(hand).accuracy)}>?`;
}

/**
 * ダメージの振り方を作る。
 *
 * @param hand 行の手
 * @returns 攻撃ダイスと、その手の攻撃力の項目を読む振り方
 */
function damageRoll(hand: AttackHand): string {
  return rollOf(N.attackDice, handFieldNames(hand).attack);
}

/**
 * 判定の行の名前を作る。能力値の判定は「【筋力】判定」、特殊な判定は、判定で終わる名前にする。
 *
 * @param check 判定
 * @returns 判定の行の名前
 */
function checkLabel(check: Ar2eCheck): string {
  if (check.kind === 'ability') return `【${check.name}】判定`;
  return check.name.endsWith('判定') ? check.name : `${check.name}判定`;
}

/**
 * 判定の見出しのかたまりを作る。判定ごとに、比べる部分を付けた振り方と、判定の行の名前を並べる。
 *
 * @param heading 見出し
 * @param comparison 比べる相手
 * @returns 判定の見出しのかたまり
 */
function checkBlock(heading: string, comparison: Comparison): PaletteBlock {
  return {
    heading,
    lines: AR2E_CHECKS.map((check) => `${comparedRoll(checkRoll(check), comparison)} ${checkLabel(check)}`),
  };
}

/**
 * 受動判定の見出しのかたまりを作る。回避判定の行と、物理・魔法・貫通のダメージの適用の行を並べる。
 *
 * ダメージの適用は、比べる相手のダメージとして読む量を使う。量が空なら、使う人がダメージを書き足す形になる。
 *
 * @param heading 見出し
 * @param comparison 比べる相手
 * @returns 受動判定の見出しのかたまり
 */
function passiveBlock(heading: string, comparison: Comparison): PaletteBlock {
  const { damage, hint } = COMPARISON_FORMS[comparison];
  const appliedTo = (defense: string) => resourceCommand(N.hp, `-(${damage}-${referenceTo(defense)})`);
  return {
    heading,
    lines: [
      `${comparedRoll(EVASION_ROLL, comparison)} 回避判定`,
      `${appliedTo(N.physicalDefense)} 物理ダメージ適用${hint('(')}`,
      `${appliedTo(N.magicalDefense)} 魔法ダメージ適用${hint('(')}`,
      `${resourceCommand(N.hp, `-${damage}`)} 貫通ダメージ適用${hint('-')}`,
    ],
  };
}

/**
 * リソース操作の見出しのかたまりを作る。フェイト使用、HP と MP の全回復、HP と MP のポーションの行を並べる。
 *
 * @returns リソース操作の見出しのかたまり
 */
function resourceBlock(): PaletteBlock {
  return {
    heading: 'リソース操作',
    lines: [
      `${resourceCommand(N.fate, '-1')} フェイト使用`,
      // 最大値は、名前だけの参照（`{HP^}`）でなく、見出しをたどる参照で読む。
      // 同じ名前のバフがあると、名前だけの参照は読めずに空になり、HP や MP が 0 になるため
      `${resourceCommand(N.hp, `=${maxPathReferenceTo(resourceFieldPath(N.hp))}`)} HP全回復`,
      `${resourceCommand(N.mp, `=${maxPathReferenceTo(resourceFieldPath(N.mp))}`)} MP全回復`,
      `${resourceCommand(N.hp, '+2D6')} HPポーション`,
      `${resourceCommand(N.mp, '+2D6')} MPポーション`,
    ],
  };
}

/**
 * バフ操作の見出しのかたまりを作る。
 * バフの書き方の例の行、対象に付ける書き方の例の行、バッドステータスを付ける行、バッドステータスを外す行を、空の行で区切って並べる。
 * 付ける行と外す行を交互にせず、かたまりで並べる。外す行は、時間で消えないバッドステータスの分だけ作る。
 *
 * @returns バフ操作の見出しのかたまり
 */
function buffBlock(): PaletteBlock {
  const recovering = AR2E_BAD_STATUSES.filter((status) => badStatusFormOf(status).kind !== 'timed');
  return {
    heading: 'バフ操作',
    lines: [
      '&!バフ名/項目/+/量/R数 値を動かすバフ',
      '&バフ名/効果/R数 覚え書きのバフ',
      '&バフ名- バフを外す',
      '&*デバフ- バッドステータスをすべて外す',
      '&*- バフとバッドステータスをすべて外す',
      '',
      't&!バフ名/項目/+/量/R数 対象に値を動かすバフ',
      't&バフ名/効果/R数 対象に覚え書きのバフ',
      't&バフ名- 対象のバフを外す',
      '',
      ...AR2E_BAD_STATUSES.map(badStatusLine),
      '',
      ...recovering.map(recoveryLine),
    ],
  };
}

/**
 * バッドステータスをバフにする形。付ける行と外す行は、どちらもこれだけで見分ける。
 *
 * - `losesHp`: ラウンドの終わりごとに HP を減らし続ける、消えないバフ（毒と衰弱）
 * - `timed`: アックスのバフの消えるタイミングで消えるバフ
 * - `lasting`: 消えないバフ。外す行で外す
 */
type BadStatusForm =
  | { readonly kind: 'losesHp' }
  | { readonly kind: 'timed'; readonly ending: AxeBuffEnding; readonly note: string }
  | { readonly kind: 'lasting' };

/**
 * バッドステータスをバフにする形を決める。
 * HP を失うものは `losesHp`、回復のタイミングがアックスのバフの消えるタイミングに合うものは `timed`、ほかは `lasting`。
 *
 * @param status バッドステータス
 * @returns バフにする形
 */
function badStatusFormOf(status: Ar2eBadStatus): BadStatusForm {
  if (status.losesHpEachRound) return { kind: 'losesHp' };
  const timed = ENDINGS_BY_RECOVERY[status.recovery];
  return timed ? { kind: 'timed', ...timed } : { kind: 'lasting' };
}

/**
 * バッドステータスを付ける行を作る。
 *
 * @param status バッドステータス
 * @returns バッドステータスを付ける行
 */
function badStatusLine(status: Ar2eBadStatus): string {
  const form = badStatusFormOf(status);
  if (form.kind === 'losesHp') {
    return `${damageOverTimeDebuffCommand(status.name, N.hp, HP_LOST_EACH_ROUND)} ${status.name}(n)（nを書き換える）`;
  }
  if (form.kind === 'timed') return `${debuffCommand(status.name, form.ending)} ${status.name}（${form.note}）`;
  return `${debuffCommand(status.name, 'lasting')} ${status.name}`;
}

/**
 * バッドステータスを外す行を作る。回復のタイミングが効果参照のものは、タイミングを書かない。
 *
 * @param status バッドステータス
 * @returns バッドステータスを外す行
 */
function recoveryLine(status: Ar2eBadStatus): string {
  const when = status.recovery === '効果参照' ? '' : `（${status.recovery}）`;
  return `${removeBuffCommand(status.name)} ${status.name}の回復${when}`;
}

/**
 * 能動判定の見出しのかたまりを作る。命中判定の行をすべて並べた後に、ダメージの行を並べる。
 *
 * @param attacks 命中判定とダメージの行の組
 * @returns 能動判定の見出しのかたまり
 */
function activeBlock(attacks: AttackPlan): PaletteBlock {
  return {
    heading: '能動判定',
    lines: [
      ...attacks.accuracy.map((line) => `${accuracyRoll(line.hand)} 命中判定${weaponMarksOf(line)}`),
      ...attacks.damage.map((line) => `${damageRoll(line.hand)} ダメージ${weaponMarksOf(line)}`),
    ],
  };
}

/**
 * 行の武器の名前を `≪名前≫` にして並べ、手の書き方を付ける。
 *
 * @param line 命中判定かダメージの 1 行
 * @returns 武器の名前と手の書き方
 */
function weaponMarksOf(line: AttackLine): string {
  return line.weapons.map((weapon) => skillMark(weapon)).join('') + HAND_MARKS[line.hand];
}

/**
 * スキルの見出しのかたまりを作る。タイミングの見出しごとに、`【タイミング】` の見出しの行と、
 * スキルごとの説明の行と使う行を並べる。タイミングの見出しの間は、空の行で区切る。
 *
 * @param skills スキルの置き場
 * @param attacks 命中判定とダメージの行の組
 * @returns スキルの見出しのかたまり
 */
function skillBlock(skills: readonly SkillHeading[], attacks: AttackPlan): PaletteBlock {
  return {
    // 飾りに `=` を使うと、`//--- =…` がパレットの変数（名前 `---`）として読まれるので、`_/` で飾る
    heading: '_/_/_/_/_/スキル_/_/_/_/_/',
    lines: skills.flatMap((heading, index) => [
      ...(index > 0 ? [''] : []),
      paletteHeadingLine(`【${heading.name}】`),
      ...heading.skills.flatMap((placed) => skillLines(heading, placed, attacks)),
    ]),
  };
}

/**
 * スキルの説明の行（欄のスキルの項目を、見出しをたどって参照する行）と、使う行を作る。
 *
 * @param heading スキルのタイミングの見出し
 * @param placed 置き場の決まったスキル
 * @param attacks 命中判定とダメージの行の組
 * @returns スキルの説明の行と、使う行
 */
function skillLines(heading: SkillHeading, placed: PlacedSkill, attacks: AttackPlan): string[] {
  return [pathReferenceTo([SKILL_SECTION_NAME, heading.name, placed.itemName]), ...useLines(placed.skill, attacks)];
}

/** 判定の部分と、その後ろに付ける手の書き方 */
interface SkillRoll {
  readonly roll: string;
  readonly hand: string;
}

/** スキルの使う行の判定の部分の既定。空の判定の部分が 1 つ（ダイスを振らない） */
const NO_ROLL: readonly SkillRoll[] = [{ roll: '', hand: '' }];

/**
 * スキルの使う行を作る。判定の部分ごとに、判定の部分、`≪スキル名≫` と手の書き方、コストの部分を並べた 1 行。
 * コストの部分は、コストの数が 1 以上のとき、MP をその数だけ減らすリソース操作にする。
 * 判定の部分も、コストの部分も空の行は作らない。
 *
 * @param skill スキル
 * @param attacks 命中判定とダメージの行の組
 * @returns スキルの使う行
 */
function useLines(skill: Ar2eSkill, attacks: AttackPlan): string[] {
  const name = skillMark(skill.name);
  const cost = skill.costPoints != null && skill.costPoints >= 1 ? resourceCommand(N.mp, `-${skill.costPoints}`) : '';
  return skillRollsOf(skill, attacks)
    .filter((roll) => roll.roll !== '' || cost !== '')
    .map((roll) => [roll.roll, `${name}${roll.hand}`, cost].filter((part) => part !== '').join(' '));
}

/**
 * スキルの使う行の判定の部分を決める。既定は空（ダイスを振らない）で、判定の選択肢と攻撃の組み合わせが上書きする。
 *
 * - 判定の選択肢（能力値、魔術判定など、回避判定）なら、その判定の `>=?` の振り方
 * - 命中判定なら、能動判定の命中判定の行と同じ数だけ、その手の命中判定の振り方と手の書き方
 *
 * @param skill スキル
 * @param attacks 命中判定とダメージの行の組
 * @returns 判定の部分の並び
 */
function skillRollsOf(skill: Ar2eSkill, attacks: AttackPlan): readonly SkillRoll[] {
  const check = skillCheckOf(skill.check);
  if (check == null) return NO_ROLL;
  if (check.kind === 'accuracy') {
    return attacks.accuracy.map((line) => ({ roll: accuracyRoll(line.hand), hand: HAND_MARKS[line.hand] }));
  }
  const roll = check.kind === 'evasion' ? EVASION_ROLL : checkRoll(ar2eCheckOf(check.check));
  return [{ roll: comparedRoll(roll, 'ask'), hand: '' }];
}
