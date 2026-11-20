/**
 * ゆとシートの読み手。
 *
 * ゆとシートの記録を、ルールの言葉のアリアンロッド2E のキャラクターに読み替える。
 * 版の違いの補い、取得元の言葉、ダイス数の補いもここで行う。手が武器を持つかは、手に持つものの見分けで決める。
 * 欄の並べ方と、アックスの書き方は持たない。
 */
import { normalizeHexColor } from '@axe/domain/character/import/imported-character';
import {
  AR2E_ABILITIES,
  AR2E_CHECKS,
  AR2E_SPECIAL_CHECKS,
  Ar2eAbilityId,
  Ar2eCheckId,
} from '@axe/domain/character/import/system-profiles/ar2e/ar2e-catalog';
import {
  Ar2eAbilityScore,
  Ar2eBattle,
  Ar2eCharacter,
  Ar2eCheckScore,
  Ar2eConnection,
  Ar2eGeis,
  Ar2eHand,
  Ar2eHandedness,
  Ar2eProfile,
  Ar2eSkill,
} from '@axe/domain/character/import/system-profiles/ar2e/ar2e-character';
import { ar2eHandOf } from '@axe/domain/character/import/system-profiles/ar2e/ar2e-hand';
import { YtsheetRecord } from '@axe/domain/character/import/ytsheet-record';
import { readYtsheetText } from '@axe/domain/character/import/ytsheet-text';

/** 能力値と、ゆとシートの項目名に入る記号 */
const ABILITY_KEYS: Readonly<Record<Ar2eAbilityId, string>> = {
  str: 'Str',
  dex: 'Dex',
  agi: 'Agi',
  int: 'Int',
  sen: 'Sen',
  mnd: 'Mnd',
  luk: 'Luk',
};

/** 判定と、ゆとシートの項目名に入る記号。能力値の判定は、能力値の記号 */
const CHECK_KEYS: Readonly<Record<Ar2eCheckId, string>> = {
  ...ABILITY_KEYS,
  trapDetect: 'TrapDetect',
  trapRelease: 'TrapRelease',
  dangerDetect: 'DangerDetect',
  enemyLore: 'EnemyLore',
  appraisal: 'Appraisal',
  magic: 'Magic',
  song: 'Song',
  alchemy: 'Alchemy',
};

/** 右手と左手の合計の仕方の記号 */
const HANDEDNESS_CODES: ReadonlyMap<number, Ar2eHandedness> = new Map<number, Ar2eHandedness>([
  [1, 'separate'],
  [2, 'both'],
  [3, 'accuracyOnly'],
  [4, 'all'],
]);

/** 合計の仕方がないときの合計の仕方。ゆとシートの閲覧画面も「合計しない」として表示する */
const HANDEDNESS_WHEN_UNSET: Ar2eHandedness = 'separate';

/** 右手と左手の値がない古いシートの合計の仕方。手ごとの値がないので、合計の値で振るしかない */
const HANDEDNESS_WITHOUT_HAND_VALUES: Ar2eHandedness = 'both';

/** スキルの取得元の記号と、ゆとシートの閲覧画面の言葉（`power` は別に扱う） */
const SKILL_SOURCE_WORDS: ReadonlyMap<string, string> = new Map([
  ['general', '一般'],
  ['race', '種族'],
  ['style', '流派'],
  ['faith', '天恵'],
  ['geis', '誓約'],
  ['add', '他スキル'],
  ['another', '異才'],
]);

/**
 * ゆとシートの記録を、アリアンロッド2E のキャラクターに読み替える。
 *
 * @param record ゆとシートの記録
 * @returns アリアンロッド2E のキャラクター
 */
export function readYtsheetAr2eCharacter(record: YtsheetRecord): Ar2eCharacter {
  return {
    name: nameOfPiece(record),
    color: normalizeHexColor(lineText(record, 'nameColor').split(',')[0]),
    resources: {
      hp: record.number('hpTotal'),
      mp: record.number('mpTotal'),
      fate: record.number('fateTotal'),
      fateLimit: record.number('fateLimit'),
    },
    abilities: abilitiesOf(record),
    checks: checksOf(record),
    battle: battleOf(record),
    hands: { right: handOf(record, 'HandR'), left: handOf(record, 'HandL') },
    handedness: handednessOf(record),
    skills: skillsOf(record),
    geises: geisesOf(record),
    connections: connectionsOf(record),
    belongings: { money: record.number('moneyTotal'), items: multilineText(record, 'items') },
    profile: profileOf(record),
  };
}

/**
 * 項目の値を、1 行の欄の文字として読む。
 *
 * @param record ゆとシートの記録
 * @param key 項目名
 * @returns 画面に表示されるとおりの文字（前後の空白を除く）
 */
function lineText(record: YtsheetRecord, key: string): string {
  return readYtsheetText(record.text(key), 'line');
}

/**
 * 項目の値を、複数行の欄の文字として読む。
 *
 * @param record ゆとシートの記録
 * @param key 項目名
 * @returns 画面に表示されるとおりの文字
 */
function multilineText(record: YtsheetRecord, key: string): string {
  return readYtsheetText(record.text(key), 'multiline');
}

/**
 * コマの名前を読む。`namePlate` が空なら、`name` を読む。
 *
 * @param record ゆとシートの記録
 * @returns コマの名前
 */
function nameOfPiece(record: YtsheetRecord): string {
  const plate = lineText(record, 'namePlate');
  return plate === '' ? lineText(record, 'name') : plate;
}

/**
 * 能力値ごとに、基本値と能力値（ボーナス）を読む。
 *
 * @param record ゆとシートの記録
 * @returns 能力値ごとの値
 */
function abilitiesOf(record: YtsheetRecord): Record<Ar2eAbilityId, Ar2eAbilityScore> {
  const scores = {} as Record<Ar2eAbilityId, Ar2eAbilityScore>;
  for (const ability of AR2E_ABILITIES) {
    const key = ABILITY_KEYS[ability.id];
    scores[ability.id] = { base: record.number(`stt${key}Base`), bonus: record.number(`stt${key}Total`) };
  }
  return scores;
}

/**
 * 判定ごとに、ダイス数と固定値を読む。
 * 特殊な判定でダイス数がないものは、元の能力値の判定のダイス数から補う。
 *
 * @param record ゆとシートの記録
 * @returns 判定ごとの振り方
 */
function checksOf(record: YtsheetRecord): Record<Ar2eCheckId, Ar2eCheckScore> {
  const scores = {} as Record<Ar2eCheckId, Ar2eCheckScore>;
  for (const check of AR2E_CHECKS) {
    const key = CHECK_KEYS[check.id];
    scores[check.id] = { dice: record.number(`roll${key}Dice`), modifier: record.number(`roll${key}`) };
  }
  // 特殊な判定でダイス数がないものだけ、上で読んだダイス数を、補ったダイス数で上書きする
  for (const check of AR2E_SPECIAL_CHECKS) {
    const score = scores[check.id];
    if (score.dice == null)
      scores[check.id] = { ...score, dice: supplementedDice(record, CHECK_KEYS[check.id], scores[check.ability].dice) };
  }
  return scores;
}

/**
 * 特殊な判定のダイス数を、元の能力値の判定のダイス数に、足すダイス数を足して求める。
 *
 * @param record ゆとシートの記録
 * @param key 特殊な判定の、ゆとシートの項目名に入る記号
 * @param abilityDice 元の能力値の判定のダイス数
 * @returns ダイス数。元の能力値の判定のダイス数がないときは null
 */
function supplementedDice(record: YtsheetRecord, key: string, abilityDice: number | null): number | null {
  if (abilityDice == null) return null;
  // ゆとシートの計算と同じ求め方
  return abilityDice + (record.number(`roll${key}DiceAdd`) ?? 0);
}

/**
 * 戦闘の値（命中、攻撃力、回避、防御力、行動値、移動力）を読む。
 *
 * @param record ゆとシートの記録
 * @returns 戦闘の値
 */
function battleOf(record: YtsheetRecord): Ar2eBattle {
  return {
    accuracy: {
      dice: record.number('battleDiceAcc'),
      total: record.number('battleTotalAcc'),
      right: record.number('battleTotalAccR'),
      left: record.number('battleTotalAccL'),
    },
    attack: {
      dice: record.number('battleDiceAtk'),
      total: record.number('battleTotalAtk'),
      right: record.number('battleTotalAtkR'),
      left: record.number('battleTotalAtkL'),
    },
    evasion: { dice: record.number('battleDiceEva'), modifier: record.number('battleTotalEva') },
    physicalDefense: record.number('battleTotalDef'),
    magicalDefense: record.number('battleTotalMDef'),
    initiative: record.number('battleTotalIni'),
    movement: record.number('battleTotalMove'),
  };
}

/**
 * 手に持つものの名前・種別・攻撃の値を読み、手に持つものの見分けで、武器を持つ手かを決める。
 *
 * @param record ゆとシートの記録
 * @param part 部位の記号（`HandR` か `HandL`）
 * @returns 手。武器を持つなら、その名前
 */
function handOf(record: YtsheetRecord, part: 'HandR' | 'HandL'): Ar2eHand {
  return ar2eHandOf({
    name: lineText(record, `armament${part}Name`),
    type: lineText(record, `armament${part}Type`),
    attack: record.number(`armament${part}Atk`),
  });
}

/**
 * 右手と左手の合計の仕方を読む。
 *
 * 右手の命中の値（`battleTotalAccR`）がないシートは、両手を合計する。
 * そうでなければ合計の仕方の記号を読み、記号がないか、知らない記号なら、合計しない。
 *
 * @param record ゆとシートの記録
 * @returns 右手と左手の合計の仕方
 */
function handednessOf(record: YtsheetRecord): Ar2eHandedness {
  if (record.number('battleTotalAccR') == null) return HANDEDNESS_WITHOUT_HAND_VALUES;
  const code = record.number('handedness');
  return (code != null ? HANDEDNESS_CODES.get(code) : undefined) ?? HANDEDNESS_WHEN_UNSET;
}

/**
 * 名前のあるスキルを読む。行の数は `skillNum`、なければ `skillsNum` を読む。
 * コストの数は、コストの記録の値（HTML の書き方を戻す前）が整数のときだけ入れる。
 *
 * @param record ゆとシートの記録
 * @returns 名前のあるスキル（シートの順）
 */
function skillsOf(record: YtsheetRecord): Ar2eSkill[] {
  return namedRowsOf(record, ['skillNum', 'skillsNum'], (index) => {
    const field = (name: string) => lineText(record, `skill${index}${name}`);
    return {
      name: field('Name'),
      source: skillSourceOf(record, `skill${index}Type`),
      category: field('Category'),
      level: field('Lv'),
      timing: field('Timing'),
      check: field('Roll'),
      target: field('Target'),
      range: field('Range'),
      cost: field('Cost'),
      costPoints: record.integer(`skill${index}Cost`),
      requirement: field('Reqd'),
      effect: field('Note'),
    };
  });
}

/**
 * スキルの取得元を読む。記号はゆとシートの閲覧画面と同じ言葉にし、記号でないもの（クラス名）はそのまま読む。
 * `power` は「パワー」にし、CL1 のメインクラス（`classMainLv1`）があれば「パワー（クラス名）」にする。
 *
 * @param record ゆとシートの記録
 * @param key 取得元の項目名
 * @returns 取得元の言葉
 */
function skillSourceOf(record: YtsheetRecord, key: string): string {
  const source = lineText(record, key);
  if (source === 'power') {
    const powerClass = lineText(record, 'classMainLv1');
    return powerClass === '' ? 'パワー' : `パワー（${powerClass}）`;
  }
  return SKILL_SOURCE_WORDS.get(source) ?? source;
}

/**
 * 名前のある誓約を読む。行の数は `geisNum`、なければ `geisesNum` を読む。
 *
 * @param record ゆとシートの記録
 * @returns 名前のある誓約（シートの順）
 */
function geisesOf(record: YtsheetRecord): Ar2eGeis[] {
  return namedRowsOf(record, ['geisNum', 'geisesNum'], (index) => ({
    name: lineText(record, `geis${index}Name`),
    growth: record.number(`geis${index}Cost`),
    note: lineText(record, `geis${index}Note`),
  }));
}

/**
 * 名前のあるコネクションを読む。行の数は `connectionNum`、なければ `connectionsNum` を読む。
 *
 * @param record ゆとシートの記録
 * @returns 名前のあるコネクション（シートの順）
 */
function connectionsOf(record: YtsheetRecord): Ar2eConnection[] {
  return namedRowsOf(record, ['connectionNum', 'connectionsNum'], (index) => ({
    name: lineText(record, `connection${index}Name`),
    relation: lineText(record, `connection${index}Relation`),
    note: lineText(record, `connection${index}Note`),
  }));
}

/**
 * プロフィールを読む。
 * 種族が自由記入（`free`）なら `raceFree` を読む。参照元のアドレスは、アドレスの欄として読む。
 *
 * @param record ゆとシートの記録
 * @returns プロフィール
 */
function profileOf(record: YtsheetRecord): Ar2eProfile {
  const raceKey = lineText(record, 'race') === 'free' ? 'raceFree' : 'race';
  return {
    player: lineText(record, 'playerName'),
    level: record.number('level'),
    race: lineText(record, raceKey),
    gender: lineText(record, 'gender'),
    age: lineText(record, 'age'),
    mainClass: lineText(record, 'classMain'),
    supportClass: lineText(record, 'classSupport'),
    titleClass: lineText(record, 'classTitle'),
    guild: lineText(record, 'guildName'),
    note: multilineText(record, 'freeNote'),
    sheetUrl: readYtsheetText(record.text('sheetURL'), 'url'),
  };
}

/**
 * 番号の付いた行（スキル、誓約、コネクション）を、行の数まで読み、名前のある行だけを返す。
 *
 * @param record ゆとシートの記録
 * @param countKeys 行の数の項目名（見る順）
 * @param readRow 番号の行を読む関数
 * @returns 名前のある行（番号の順）
 */
function namedRowsOf<T extends { readonly name: string }>(
  record: YtsheetRecord,
  countKeys: string[],
  readRow: (index: number) => T
): T[] {
  const count = countKeys.map((key) => record.number(key)).find((value) => value !== null) ?? 0;
  const rows: T[] = [];
  for (let index = 1; index <= count; index++) rows.push(readRow(index));
  return rows.filter((row) => row.name !== '');
}
