/**
 * キャラクター保管所のアリアンロッド2E の取り込みのテストの架空のシート。
 *
 * 架空のシートの土台（`baseCharasheet`）を、1 か所ずつ変える道具で、書き方の組み合わせや、境目の値を作る。
 * 土台は、ゆとシートの取り込みのテストの架空のキャラクターと、同じキャラクターを書いたもの。
 * 架空のシートを、キャラクター保管所の読み手でアリアンロッド2E のキャラクターに読む部品（`charasheetAr2eCharacterOf`）も置く。
 */
import { CharasheetRecord } from '@axe/domain/character/import/charasheet-record';
import { Ar2eCharacter } from '@axe/domain/character/import/system-profiles/ar2e/ar2e-character';
import { readCharasheetAr2eCharacter } from '@axe/domain/character/import/system-profiles/charasheet-ar2e/charasheet-ar2e-reader';
import { SheetChange, SheetData, sheetFrom } from '@axe/testing/ar2e/sheet-changes';

/** スキルの表の列の並び */
const SKILL_COLUMNS = ['name', 'lv', 'timing', 'hantei', 'taisho', 'range', 'cost', 'page', 'memo', 'shozoku'] as const;

/** スキルの表の列の名前 */
export type SkillColumn = (typeof SKILL_COLUMNS)[number];

/** スキルの表の 1 行。書かない列は空 */
export type SkillTableRow = Partial<Record<SkillColumn, string>>;

/** 架空のキャラクターのスキル。ゆとシートの架空のキャラクターと同じスキル */
const BASE_SKILLS: readonly SkillTableRow[] = [
  {
    name: 'トレーニング：筋力',
    lv: '1',
    timing: 'パッシブ',
    hantei: '―',
    taisho: '自身',
    range: '―',
    cost: '―',
    page: '―',
    memo: '【筋力基本値】に+1する（架空の効果）。',
    shozoku: '一般',
  },
  {
    name: 'テストブースト',
    lv: '1',
    timing: 'セットアップ',
    hantei: '自動成功',
    taisho: '自身',
    range: '―',
    cost: '5',
    page: 'シーン1回',
    memo: '攻撃力に+5する。',
    shozoku: 'ウォーリア',
  },
  {
    name: 'テストヒール',
    lv: '1',
    timing: 'メジャー',
    hantei: '魔術判定',
    taisho: '単体',
    range: '20m',
    cost: '4',
    page: '―',
    memo: '《テストヒール》で、対象のHPを回復する。',
    shozoku: 'アコライト',
  },
  {
    name: 'テストスラッシュ',
    lv: '2',
    timing: 'メジャー',
    hantei: '命中判定',
    taisho: '単体',
    range: '武器',
    cost: '3',
    page: '―',
    memo: '武器攻撃を行なう。',
    shozoku: 'ウォーリア',
  },
  {
    name: 'テストガード',
    lv: '1',
    timing: 'DRの直後',
    hantei: '自動成功',
    taisho: '自身',
    range: '―',
    cost: '0',
    page: '―',
    memo: 'ダメージに-5する。',
    shozoku: 'ウォーリア',
  },
  {
    name: 'テストアイテム',
    lv: '1',
    timing: 'アイテム',
    hantei: '―',
    taisho: '自身',
    range: '―',
    cost: '―',
    page: '―',
    memo: 'ポーションを1個得る。',
    shozoku: '一般',
  },
];

/**
 * 架空のキャラクター 1 人のデータを作る。呼ぶたびに新しく作る。
 *
 * キャラクター保管所の `<番号>.js` の書き方（数も文字、表は列ごとの配列、改行は CRLF）にそろえた、作り物の値。
 * 右手と左手に、種別の違う武器を持ち（命中の合計がない）、魔術・呪歌・錬金術の判定も使う。
 * スキルは、スキルの表に 6 つで、種族スキルと最初のメインクラスのスキルはない。
 *
 * @returns 架空のキャラクターのデータ
 */
export function baseCharasheet(): SheetData {
  const sheet: SheetData = {
    game: 'ara2',
    data_id: 1234567,
    data_title: '架空の題名',
    pc_name: '架空の冒険者',
    V_level: '5',
    shuzoku: 'ヒューリン',
    manual_shuzoku: '',
    sex: '女',
    age: '20',
    main_class: 'ウォーリア',
    support_class: 'アコライト',
    pc_making_memo: '容姿\r\n経歴',
    NP8: '60',
    NP9: '40',
    V_fate: '4',
    dice_meichu: '2',
    BSUM1T: '',
    BSUM1R: '5',
    BSUM1L: '3',
    dice_attack: '2',
    BSUM2T: '',
    BSUM2R: '9',
    BSUM2L: '4',
    dice_kaihi: '2',
    BSUM3: '4',
    BSUM4: '8',
    BSUM5: '6',
    BSUM6: '7',
    BSUM7: '9',
    IR_name: '試しの剣',
    IR_type: '片手剣',
    BIR2: '7',
    IL_name: '試しの短剣',
    IL_type: '短剣',
    BIL2: '2',
    money: '1000',
    item_name: ['回復薬', ''],
    item_weight: ['1', ''],
    item_price: ['30', ''],
    item_memo: ['HPを回復する', ''],
    cone_name: [''],
    cone_kankei: [''],
    shuzoku_skill_name: '',
    m_cls_skill_name: '',
    V_mcls_skill_lv: '',
  };
  const abilities: readonly (readonly [number, number])[] = [
    [12, 4],
    [10, 3],
    [9, 3],
    [8, 2],
    [9, 3],
    [11, 3],
    [7, 2],
  ];
  abilities.forEach(([base, bonus], index) => {
    Object.assign(sheet, { [`NK${index + 1}`]: String(base), [`NP${index + 1}`]: String(bonus) });
  });
  const specialChecks: readonly (readonly [string, number])[] = [
    ['dice_wanatanti', 3],
    ['dice_wanakaijo', 3],
    ['dice_kanti', 3],
    ['dice_sikibetu', 2],
    ['dice_kantei', 2],
    ['dice_majutu', 5],
    ['dice_juka', 3],
    ['dice_renkin', 3],
  ];
  specialChecks.forEach(([diceKey, total], index) => {
    Object.assign(sheet, { [diceKey]: '2', [`THG${index + 1}`]: String(total) });
  });
  withSkillTable('skill', ...BASE_SKILLS)(sheet);
  withSkillTable('ippanskill')(sheet);
  return sheet;
}

/**
 * 架空のキャラクターのデータを作り、変える道具を順にかける。
 *
 * @param changes 変える道具（かける順）
 * @returns 変えたデータ
 */
export function charasheetWith(...changes: SheetChange[]): SheetData {
  return sheetFrom(baseCharasheet(), ...changes);
}

/**
 * キャラクター保管所のデータを、キャラクター保管所の読み手で、アリアンロッド2E のキャラクターに読む。
 *
 * @param sheet キャラクター保管所のデータ
 * @returns アリアンロッド2E のキャラクター
 */
export function charasheetAr2eCharacterOf(sheet: SheetData): Ar2eCharacter {
  return readCharasheetAr2eCharacter(new CharasheetRecord(sheet));
}

/**
 * 行を足せるスキルの表（スキル、一般スキル）を、渡した行だけにする道具を作る。列ごとの配列にして書く。
 *
 * @param prefix 表の項目名の頭（`skill` か `ippanskill`）
 * @param rows 表の行（表の順）
 * @returns 架空のシートを変える道具
 */
export function withSkillTable(prefix: 'skill' | 'ippanskill', ...rows: SkillTableRow[]): SheetChange {
  return (sheet) => {
    for (const column of SKILL_COLUMNS) sheet[`${prefix}_${column}`] = rows.map((row) => row[column] ?? '');
  };
}

/**
 * 1 行だけのスキルの表（種族スキル、最初のメインクラスのスキル）を、渡した行にする道具を作る。
 * Lv は、最初のメインクラスのスキルだけ `V_mcls_skill_lv` に書き、種族スキルには書かない。
 *
 * @param prefix 表の項目名の頭（`shuzoku_skill` か `m_cls_skill`）
 * @param row 表の行
 * @returns 架空のシートを変える道具
 */
export function withSingleSkill(prefix: 'shuzoku_skill' | 'm_cls_skill', row: SkillTableRow): SheetChange {
  return (sheet) => {
    for (const column of SKILL_COLUMNS) {
      if (column === 'lv') continue;
      sheet[`${prefix}_${column}`] = row[column] ?? '';
    }
    if (prefix === 'm_cls_skill') sheet['V_mcls_skill_lv'] = row.lv ?? '';
  };
}

/**
 * 表（所持品、コネクションなど）の列を、渡した行だけにする道具を作る。
 *
 * @param columns 列の項目名（行の値の順）
 * @param rows 表の行（列の順の値）
 * @returns 架空のシートを変える道具
 */
export function withTable(columns: readonly string[], rows: readonly (readonly string[])[]): SheetChange {
  return (sheet) => {
    columns.forEach((column, index) => {
      sheet[column] = rows.map((row) => row[index] ?? '');
    });
  };
}

/** 所持品の表の列 */
export const ITEM_TABLE_COLUMNS = ['item_name', 'item_weight', 'item_price', 'item_memo'] as const;

/** コネクションの表の列 */
export const CONNECTION_TABLE_COLUMNS = ['cone_name', 'cone_kankei'] as const;
