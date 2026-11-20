/**
 * キャラクター保管所の読み手。
 *
 * キャラクター保管所の記録を、ルールの言葉のアリアンロッド2E のキャラクターに読み替える。
 * ない値をルールの計算で補い、合計の有無から合計の仕方を決め、スキルの 4 つの表を並べ、所持品の表を文字に並べ、
 * 空の名前を題名に戻す。手が武器を持つかは、手に持つものの見分けで決める。
 * 欄の並べ方と、アックスの書き方は持たない。
 */
import { CharasheetRecord } from '@axe/domain/character/import/charasheet-record';
import { readSheetInteger } from '@axe/domain/character/import/sheet-number';
import {
  AR2E_ABILITIES,
  AR2E_BASE_CHECK_DICE,
  AR2E_SPECIAL_CHECKS,
  Ar2eAbilityId,
  Ar2eCheckId,
  Ar2eSpecialCheckId,
} from '@axe/domain/character/import/system-profiles/ar2e/ar2e-catalog';
import {
  Ar2eAbilityScore,
  Ar2eBattle,
  Ar2eCharacter,
  Ar2eCheckScore,
  Ar2eConnection,
  Ar2eHand,
  Ar2eProfile,
  Ar2eSkill,
} from '@axe/domain/character/import/system-profiles/ar2e/ar2e-character';
import { ar2eHandOf } from '@axe/domain/character/import/system-profiles/ar2e/ar2e-hand';

/** 能力値と、キャラクター保管所の能力値の番号 */
const ABILITY_NUMBERS: Readonly<Record<Ar2eAbilityId, number>> = {
  str: 1,
  dex: 2,
  agi: 3,
  int: 4,
  sen: 5,
  mnd: 6,
  luk: 7,
};

/** 特殊な判定と、キャラクター保管所の合計とダイス数の項目名 */
const SPECIAL_CHECK_KEYS: Readonly<Record<Ar2eSpecialCheckId, { readonly total: string; readonly dice: string }>> = {
  trapDetect: { total: 'THG1', dice: 'dice_wanatanti' },
  trapRelease: { total: 'THG2', dice: 'dice_wanakaijo' },
  dangerDetect: { total: 'THG3', dice: 'dice_kanti' },
  enemyLore: { total: 'THG4', dice: 'dice_sikibetu' },
  appraisal: { total: 'THG5', dice: 'dice_kantei' },
  magic: { total: 'THG6', dice: 'dice_majutu' },
  song: { total: 'THG7', dice: 'dice_juka' },
  alchemy: { total: 'THG8', dice: 'dice_renkin' },
};

/** シートの表示画面のアドレスの、シートの番号の前の部分 */
const SHEET_URL_BASE = 'https://charasheet.vampire-blood.net/';

/** 所持品の表の列と、1 行の文字に書く項目の言葉（作成画面の表の見出し） */
const ITEM_COLUMNS: readonly (readonly [string, string])[] = [
  ['weight', '重量'],
  ['price', '価格'],
  ['memo', '効果・備考など'],
];

/** 表の 1 行。列の名前（`name`、`timing` など）で、書かれたままの文字を取り出す */
type TableRow = (column: string) => string;

/** スキルの表の 1 行と、その行の Lv（表によって元の項目が違う） */
interface SkillRow {
  readonly row: TableRow;
  readonly level: string;
}

/**
 * キャラクター保管所の記録を、アリアンロッド2E のキャラクターに読み替える。
 *
 * @param record キャラクター保管所の記録
 * @returns アリアンロッド2E のキャラクター
 */
export function readCharasheetAr2eCharacter(record: CharasheetRecord): Ar2eCharacter {
  const abilities = abilitiesOf(record);
  const battle = battleOf(record);
  return {
    name: record.isMissing('pc_name') ? record.text('data_title') : record.text('pc_name'),
    // キャラクター保管所のデータに、色の項目がないため
    color: '',
    resources: {
      hp: record.number('NP8'),
      mp: record.number('NP9'),
      fate: record.number('V_fate'),
      // キャラクター保管所に項目がないので、ルールの計算（幸運の能力値）で補う
      fateLimit: abilities.luk.bonus,
    },
    abilities,
    checks: checksOf(record, abilities),
    battle,
    hands: { right: handOf(record, 'R'), left: handOf(record, 'L') },
    // キャラクター保管所には合計の仕方の項目がなく、作成画面は、右手と左手の種別が同じときだけ合計を出すため
    handedness: battle.accuracy.total != null ? 'all' : 'separate',
    skills: skillsOf(record),
    geises: [],
    connections: namedRowsOf(record, 'cone').map((row): Ar2eConnection => ({
      name: row('name'),
      relation: row('kankei'),
      note: '',
    })),
    belongings: { money: record.number('money'), items: itemsOf(record) },
    profile: profileOf(record),
  };
}

/**
 * 能力値ごとに、基本値と能力値を読む。
 *
 * @param record キャラクター保管所の記録
 * @returns 能力値ごとの値
 */
function abilitiesOf(record: CharasheetRecord): Record<Ar2eAbilityId, Ar2eAbilityScore> {
  const scores = {} as Record<Ar2eAbilityId, Ar2eAbilityScore>;
  for (const ability of AR2E_ABILITIES) {
    const number = ABILITY_NUMBERS[ability.id];
    scores[ability.id] = { base: record.number(`NK${number}`), bonus: record.number(`NP${number}`) };
  }
  return scores;
}

/**
 * 判定ごとに、ダイス数と固定値を読む。キャラクター保管所にない値は、ルールの計算で補う。
 *
 * 能力値の判定は、判定の基本のダイス数と、その能力値にする。
 * 特殊な判定は、値がなければ、判定の基本のダイス数と、元になる能力値にする。
 *
 * @param record キャラクター保管所の記録
 * @param abilities 能力値ごとの値
 * @returns 判定ごとの振り方
 */
function checksOf(
  record: CharasheetRecord,
  abilities: Readonly<Record<Ar2eAbilityId, Ar2eAbilityScore>>
): Record<Ar2eCheckId, Ar2eCheckScore> {
  const scores = {} as Record<Ar2eCheckId, Ar2eCheckScore>;
  for (const ability of AR2E_ABILITIES) {
    // キャラクター保管所には、能力値の判定の項目がないため
    scores[ability.id] = { dice: AR2E_BASE_CHECK_DICE, modifier: abilities[ability.id].bonus };
  }
  for (const check of AR2E_SPECIAL_CHECKS) {
    const keys = SPECIAL_CHECK_KEYS[check.id];
    scores[check.id] = {
      // 作成画面で入力欄が無効の判定（チェックのない判定など）は、値が保存されないため
      dice: record.isMissing(keys.dice) ? AR2E_BASE_CHECK_DICE : record.number(keys.dice),
      modifier: record.isMissing(keys.total) ? abilities[check.ability].bonus : record.number(keys.total),
    };
  }
  return scores;
}

/**
 * 戦闘の値（命中、攻撃力、回避、防御力、行動値、移動力）を読む。
 *
 * @param record キャラクター保管所の記録
 * @returns 戦闘の値
 */
function battleOf(record: CharasheetRecord): Ar2eBattle {
  return {
    accuracy: {
      dice: record.number('dice_meichu'),
      total: record.number('BSUM1T'),
      right: record.number('BSUM1R'),
      left: record.number('BSUM1L'),
    },
    attack: {
      dice: record.number('dice_attack'),
      total: record.number('BSUM2T'),
      right: record.number('BSUM2R'),
      left: record.number('BSUM2L'),
    },
    evasion: { dice: record.number('dice_kaihi'), modifier: record.number('BSUM3') },
    physicalDefense: record.number('BSUM4'),
    magicalDefense: record.number('BSUM5'),
    initiative: record.number('BSUM6'),
    movement: record.number('BSUM7'),
  };
}

/**
 * 手に持つものの名前・種別・攻撃の値を読み、手に持つものの見分けで、武器を持つ手かを決める。
 *
 * @param record キャラクター保管所の記録
 * @param part 部位の記号（右手は `R`、左手は `L`）
 * @returns 手。武器を持つなら、その名前
 */
function handOf(record: CharasheetRecord, part: 'R' | 'L'): Ar2eHand {
  return ar2eHandOf({
    name: record.text(`I${part}_name`),
    type: record.text(`I${part}_type`),
    attack: record.number(`BI${part}2`),
  });
}

/**
 * 表の行を見て、名前があるかを見る。
 *
 * @param row 表の 1 行
 * @returns 名前の列が空でなければ true
 */
const isNamed = (row: TableRow): boolean => row('name') !== '';

/**
 * 行を足せる表（列ごとの配列の表）の、全部の行を作る。行の数は、名前の列の長さ。
 *
 * @param record キャラクター保管所の記録
 * @param prefix 表の項目名の頭（`skill`、`cone` など）
 * @returns 表の行（表の順）
 */
function tableRowsOf(record: CharasheetRecord, prefix: string): TableRow[] {
  return Array.from(
    { length: record.rowCount(`${prefix}_name`) },
    (_, index) => (column: string) => record.cellText(`${prefix}_${column}`, index)
  );
}

/**
 * 行を足せる表の、名前のある行だけを作る。
 *
 * @param record キャラクター保管所の記録
 * @param prefix 表の項目名の頭
 * @returns 名前のある行（表の順）
 */
function namedRowsOf(record: CharasheetRecord, prefix: string): TableRow[] {
  return tableRowsOf(record, prefix).filter(isNamed);
}

/**
 * スキルの 4 つの表を、作成画面の順（種族スキル、最初のメインクラスのスキル、スキル、一般スキル）に読み、
 * 名前のあるスキルだけを返す。種族スキルの Lv は空、最初のメインクラスのスキルの Lv は `V_mcls_skill_lv`。
 *
 * @param record キャラクター保管所の記録
 * @returns 名前のあるスキル（作成画面の順）
 */
function skillsOf(record: CharasheetRecord): Ar2eSkill[] {
  const singleRow =
    (prefix: string): TableRow =>
    (column) =>
      record.text(`${prefix}_${column}`);
  const listRows = (prefix: string): SkillRow[] =>
    tableRowsOf(record, prefix).map((row) => ({ row, level: row('lv') }));
  const rows: SkillRow[] = [
    // 種族スキルには Lv の列がない（作成画面に「★」と出るだけ）ため
    { row: singleRow('shuzoku_skill'), level: '' },
    { row: singleRow('m_cls_skill'), level: record.text('V_mcls_skill_lv') },
    ...listRows('skill'),
    ...listRows('ippanskill'),
  ];
  return rows.filter(({ row }) => isNamed(row)).map(skillOf);
}

/**
 * スキルの表の 1 行を、スキルに読む。分類は空にする。
 *
 * @param skillRow スキルの表の 1 行と、その行の Lv
 * @returns スキル
 */
function skillOf({ row, level }: SkillRow): Ar2eSkill {
  return {
    name: row('name'),
    source: row('shozoku'),
    // キャラクター保管所には、分類の列がないため
    category: '',
    level,
    timing: row('timing'),
    check: row('hantei'),
    target: row('taisho'),
    range: row('range'),
    cost: row('cost'),
    costPoints: readSheetInteger(row('cost')),
    requirement: row('page'),
    effect: row('memo'),
  };
}

/**
 * 所持品の表を、名前のある行ごとに `名称[重量:…][価格:…][効果・備考など:…]` の 1 行にし、改行でつなぐ。空の項目は省く。
 *
 * @param record キャラクター保管所の記録
 * @returns 携行品・所持品の文字
 */
function itemsOf(record: CharasheetRecord): string {
  return namedRowsOf(record, 'item')
    .map(
      (row) =>
        row('name') +
        ITEM_COLUMNS.map(([column, label]) => {
          const value = row(column);
          return value === '' ? '' : `[${label}:${value}]`;
        }).join('')
    )
    .join('\n');
}

/**
 * プロフィールを読む。
 * 種族は、パーソナルデータの種族がなければ、能力値の欄に手で書いた種族を読む。
 * 参照元は、シートの番号から、表示画面のアドレスを作る。
 *
 * @param record キャラクター保管所の記録
 * @returns プロフィール
 */
function profileOf(record: CharasheetRecord): Ar2eProfile {
  return {
    // PL、称号クラス、所属ギルドは、キャラクター保管所に項目がないため空
    player: '',
    level: record.number('V_level'),
    race: record.isMissing('shuzoku') ? record.text('manual_shuzoku') : record.text('shuzoku'),
    gender: record.text('sex'),
    age: record.text('age'),
    mainClass: record.text('main_class'),
    supportClass: record.text('support_class'),
    titleClass: '',
    guild: '',
    note: record.text('pc_making_memo'),
    // キャラクター保管所のデータにはアドレスがなく、このアドレスが、そのシートの表示画面のため
    sheetUrl: record.isMissing('data_id') ? '' : `${SHEET_URL_BASE}${record.text('data_id')}`,
  };
}
