/**
 * シートのデータを変える道具。
 *
 * どのサイトのシートのデータ（JSON を読んだもの）も、1 か所ずつ変える。
 * サイトごとの架空のシートの土台にかけて、書き方の組み合わせや、境目の値を作る。
 */

/** シートのデータ（JSON を読んだもの）。どのサイトのものでもよい */
export type SheetData = Record<string, unknown>;

/** シートのデータを 1 か所変える道具 */
export type SheetChange = (sheet: SheetData) => void;

/**
 * シートのデータに、変える道具を順にかける。
 *
 * @param sheet 変えるシートのデータ
 * @param changes 変える道具（かける順）
 * @returns 変えたシートのデータ（渡したもの）
 */
export function sheetFrom(sheet: SheetData, ...changes: SheetChange[]): SheetData {
  for (const change of changes) change(sheet);
  return sheet;
}

/**
 * 項目の値を置き換える道具を作る。ない項目は足す。
 *
 * @param values 項目名と値
 * @returns シートのデータを変える道具
 */
export function withValues(values: SheetData): SheetChange {
  return (sheet) => Object.assign(sheet, values);
}

/**
 * 項目を消す道具を作る。
 *
 * @param keys 消す項目名
 * @returns シートのデータを変える道具
 */
export function withoutKeys(...keys: string[]): SheetChange {
  return (sheet) => {
    // どのサイトも、値のない項目を、項目ごと出さないことがあるため
    for (const key of keys) delete sheet[key];
  };
}
