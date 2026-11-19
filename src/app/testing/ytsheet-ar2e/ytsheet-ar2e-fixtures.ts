/**
 * ゆとシートのアリアンロッド2E の取り込みのテストの架空のシート。
 *
 * 架空のシートの土台（`baseSheet`）を、1 か所ずつ変える道具で、書き方の組み合わせや、境目の値を作る。
 * 架空のシートを、読み手でアリアンロッド2E のキャラクターに読む部品（`ar2eCharacterOf`）も置く。
 */
import { Ar2eCharacter } from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/ar2e-character';
import { readAr2eCharacter } from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/ar2e-character-reader';
import { YtsheetRecord } from '@axe/domain/character/import/ytsheet-record';

/** ゆとシートのデータ（JSON を読んだもの） */
export type YtsheetSheet = Record<string, unknown>;

/** 架空のシートを 1 か所変える道具 */
export type SheetChange = (sheet: YtsheetSheet) => void;

/** 能力値の記号と、基本値・能力値・判定のダイス数・判定の固定値 */
const ABILITY_VALUES: readonly (readonly [string, number, number, number, number])[] = [
  ['Str', 12, 4, 2, 4],
  ['Dex', 10, 3, 2, 3],
  ['Agi', 9, 3, 2, 3],
  ['Int', 8, 2, 2, 2],
  ['Sen', 9, 3, 2, 3],
  ['Mnd', 11, 3, 2, 3],
  ['Luk', 7, 2, 2, 2],
];

/** 特殊な判定の記号と、判定のダイス数・判定の固定値 */
const SPECIAL_CHECK_VALUES: readonly (readonly [string, number, number])[] = [
  ['TrapDetect', 2, 3],
  ['TrapRelease', 2, 3],
  ['DangerDetect', 2, 3],
  ['EnemyLore', 2, 2],
  ['Appraisal', 2, 2],
  ['Magic', 2, 5],
  ['Song', 2, 3],
  ['Alchemy', 2, 3],
];

/** 架空のキャラクターのスキル */
const BASE_SKILLS: readonly SheetRow[] = [
  {
    Name: 'トレーニング：筋力',
    Type: 'general',
    Lv: '1',
    Timing: 'パッシブ',
    Roll: '―',
    Target: '自身',
    Range: '―',
    Cost: '―',
    Reqd: '―',
    Note: '【筋力基本値】に+1する（架空の効果）。',
  },
  {
    Name: 'テストブースト',
    Type: 'ウォーリア',
    Lv: '1',
    Timing: 'セットアップ',
    Roll: '自動成功',
    Target: '自身',
    Range: '―',
    Cost: '5',
    Reqd: 'シーン1回',
    Note: '攻撃力に+5する。',
  },
  {
    Name: 'テストヒール',
    Type: 'アコライト',
    Category: '魔術',
    Lv: '1',
    Timing: 'メジャー',
    Roll: '魔術判定',
    Target: '単体',
    Range: '20m',
    Cost: '4',
    Reqd: '―',
    Note: '《テストヒール》で、対象のHPを回復する。',
  },
  {
    Name: 'テストスラッシュ',
    Type: 'ウォーリア',
    Lv: '2',
    Timing: 'メジャー',
    Roll: '命中判定',
    Target: '単体',
    Range: '武器',
    Cost: '3',
    Reqd: '―',
    Note: '武器攻撃を行なう。',
  },
  {
    Name: 'テストガード',
    Type: 'ウォーリア',
    Lv: '1',
    Timing: 'DRの直後',
    Roll: '自動成功',
    Target: '自身',
    Range: '―',
    Cost: '0',
    Reqd: '―',
    Note: 'ダメージに-5する。',
  },
  {
    Name: 'テストアイテム',
    Type: 'general',
    Lv: '1',
    Timing: 'アイテム',
    Roll: '―',
    Target: '自身',
    Range: '―',
    Cost: '―',
    Reqd: '―',
    Note: 'ポーションを1個得る。',
  },
];

/**
 * 架空のキャラクター 1 人のデータを作る。呼ぶたびに新しく作る。
 *
 * ゆとシートの `mode=json` の書き方（数も文字、改行は `&lt;br&gt;`）にそろえた、作り物の値。
 * 右手と左手に別々の武器を持ち（合計しない）、スキルはタイミングと判定とコストの違う 6 つ。
 *
 * @returns 架空のキャラクターのデータ
 */
export function baseSheet(): YtsheetSheet {
  const sheet: YtsheetSheet = {
    name: '架空の冒険者',
    namePlate: '架空の冒険者(テスト)',
    nameColor: '#336699',
    playerName: '架空のPL',
    level: '5',
    race: 'ヒューリン',
    gender: '女',
    age: '20',
    classMain: 'ウォーリア',
    classSupport: 'アコライト',
    sheetURL: 'https://yutorize.work/ytsheet/ar2e/?id=testsheet',
    hpTotal: '60',
    mpTotal: '40',
    fateTotal: '4',
    fateLimit: '3',
    battleDiceAcc: '2',
    battleTotalAcc: '5',
    battleTotalAccR: '5',
    battleTotalAccL: '3',
    battleDiceAtk: '2',
    battleTotalAtk: '9',
    battleTotalAtkR: '9',
    battleTotalAtkL: '4',
    battleDiceEva: '2',
    battleTotalEva: '4',
    battleTotalDef: '8',
    battleTotalMDef: '6',
    battleTotalIni: '7',
    battleTotalMove: '9',
    armamentHandRName: '試しの剣',
    armamentHandRType: '片手剣',
    armamentHandRAtk: '7',
    armamentHandLName: '試しの短剣',
    armamentHandLType: '短剣',
    armamentHandLAtk: '2',
    handedness: '1',
    moneyTotal: '1000',
    items: '回復薬×2&lt;br&gt;ロープ',
  };
  for (const [key, base, total, dice, modifier] of ABILITY_VALUES) {
    Object.assign(sheet, {
      [`stt${key}Base`]: String(base),
      [`stt${key}Total`]: String(total),
      [`roll${key}Dice`]: String(dice),
      [`roll${key}`]: String(modifier),
    });
  }
  for (const [key, dice, modifier] of SPECIAL_CHECK_VALUES) {
    Object.assign(sheet, { [`roll${key}Dice`]: String(dice), [`roll${key}`]: String(modifier) });
  }
  withSkills(...BASE_SKILLS)(sheet);
  return sheet;
}

/**
 * 架空のキャラクターのデータを作り、変える道具を順にかける。
 *
 * @param changes 変える道具（かける順）
 * @returns 変えたデータ
 */
export function sheetWith(...changes: SheetChange[]): YtsheetSheet {
  const sheet = baseSheet();
  for (const change of changes) change(sheet);
  return sheet;
}

/**
 * ゆとシートのデータを、読み手で、アリアンロッド2E のキャラクターに読む。
 *
 * @param sheet ゆとシートのデータ
 * @returns アリアンロッド2E のキャラクター
 */
export function ar2eCharacterOf(sheet: YtsheetSheet): Ar2eCharacter {
  return readAr2eCharacter(new YtsheetRecord(sheet));
}

/**
 * 項目の値を置き換える道具を作る。ない項目は足す。
 *
 * @param values 項目名と値
 * @returns 架空のシートを変える道具
 */
export function withValues(values: YtsheetSheet): SheetChange {
  return (sheet) => Object.assign(sheet, values);
}

/**
 * 項目を消す道具を作る。
 *
 * @param keys 消す項目名
 * @returns 架空のシートを変える道具
 */
export function withoutKeys(...keys: string[]): SheetChange {
  return (sheet) => {
    // ゆとシートは、空の項目を空の値にせず、項目ごと出さないため
    for (const key of keys) delete sheet[key];
  };
}

/** 番号の付いた行の 1 行（`Name` などの項目名と値） */
export type SheetRow = Record<string, string>;

/**
 * 番号の付いた行（スキル、誓約、コネクション）を、渡した行だけにする道具を作る。
 * その種類の番号の付いた項目をすべて消し、行の数の項目に渡した行の数を書いて、渡した行を 1 番から順に書く。
 *
 * @param family 行の種類の項目名の頭（`skill`、`geis`、`connection`）
 * @param countKey 行の数の項目名
 * @param rows 行（1 番から順に）
 * @returns 架空のシートを変える道具
 */
export function withRows(family: string, countKey: string, rows: SheetRow[]): SheetChange {
  return (sheet) => {
    const ofFamily = new RegExp(`^${family}\\d+[A-Z]`);
    for (const key of Object.keys(sheet)) if (ofFamily.test(key)) delete sheet[key];
    sheet[countKey] = String(rows.length);
    rows.forEach((row, index) => {
      for (const [field, value] of Object.entries(row)) sheet[`${family}${index + 1}${field}`] = value;
    });
  };
}

/**
 * スキルを、渡したスキルだけにする道具を作る。行の数は `skillNum` に書く。
 *
 * @param skills スキルの行（1 番から順に）
 * @returns 架空のシートを変える道具
 */
export function withSkills(...skills: SheetRow[]): SheetChange {
  return withRows('skill', 'skillNum', skills);
}

/** 手に持つもの。項目名はゆとシートのまま（名前 `Name`、種別 `Type`、攻撃の値 `Atk`）。書かない項目は、ゆとシートと同じく項目ごとない */
export interface HandItem {
  Name?: string;
  Type?: string;
  Atk?: string;
}

/** 手に持つものの項目名 */
const HAND_ITEM_FIELDS = ['Name', 'Type', 'Atk'] as const;

/**
 * 右手と左手に持つものを置き換える道具を作る。持つものに書かない項目は、項目ごと消す。
 *
 * @param right 右手
 * @param left 左手
 * @returns 架空のシートを変える道具
 */
export function withHands(right: HandItem, left: HandItem): SheetChange {
  return (sheet) => {
    for (const [part, item] of [
      ['HandR', right],
      ['HandL', left],
    ] as const) {
      for (const field of HAND_ITEM_FIELDS) {
        const value = item[field];
        if (value === undefined) delete sheet[`armament${part}${field}`];
        else sheet[`armament${part}${field}`] = value;
      }
    }
  };
}

/**
 * 右手と左手の合計の仕方を置き換える道具を作る。
 *
 * @param code `1` 合計しない、`2` 両手を合計、`3` 命中のみ合計、`4` 全部表示。null なら項目を消す
 * @returns 架空のシートを変える道具
 */
export function withHandedness(code: string | null): SheetChange {
  return code == null ? withoutKeys('handedness') : withValues({ handedness: code });
}

/** 武器（種別あり） */
export const SWORD: HandItem = { Name: 'ロングソード', Type: '片手剣', Atk: '6' };
/** 2 本目の武器（種別あり） */
export const DAGGER: HandItem = { Name: 'ダガー', Type: '短剣', Atk: '2' };
/** 盾（種別が盾） */
export const SHIELD: HandItem = { Name: 'バックラー', Type: '盾' };
/** 空の手 */
export const EMPTY_HAND: HandItem = {};
/** 種別が空欄で、攻撃の値がある武器 */
export const UNTYPED_WEAPON: HandItem = { Name: '試しの拳', Atk: '7' };
/** 種別が空欄で、攻撃の値がない盾 */
export const UNTYPED_SHIELD: HandItem = { Name: '試しの盾' };
