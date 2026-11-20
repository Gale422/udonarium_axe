/**
 * シートの値の読み方。
 *
 * 外のサイトのシートの 1 つの値を、10 進の数として読む。どのサイトの記録も使う。
 * サイトの項目名は持たない。
 */

/** 10 進の数の書き方（符号と小数を含む）。「1e+20」のような書き方は、数として読まない */
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * シートの値を、10 進の数として読む。文字の数も、前後の空白を除いて読む。小数も読む。
 *
 * @param raw シートの値（JSON を読んだもの）
 * @returns 数。10 進の数として読めないときと、有限の数にならないときは null
 */
export function readSheetNumber(raw: unknown): number | null {
  // シートのサイトは、数も文字で出すことが多いため、文字の数も読む
  const text = typeof raw === 'string' ? raw.trim() : null;
  const value = typeof raw === 'number' ? raw : text !== null && DECIMAL.test(text) ? Number(text) : null;
  return value !== null && Number.isFinite(value) ? value : null;
}

/**
 * シートの値を 10 進の数として読み、整数のときだけ返す。
 *
 * @param raw シートの値（JSON を読んだもの）
 * @returns 整数。10 進の数として読めないときと、整数でないときは null
 */
export function readSheetInteger(raw: unknown): number | null {
  const value = readSheetNumber(raw);
  return Number.isInteger(value) ? value : null;
}
