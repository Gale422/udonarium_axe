/**
 * ゆとシートの記録。
 *
 * ゆとシートが出すデータ（`mode=json`）の項目名と値。値を文字か数として取り出し、ない値は「なし」で返す。
 * ルールの意味とアックスの書き方は持たない。
 */
import { asString } from '@axe/domain/character/import/imported-character';

/** 10 進の数の書き方（符号と小数を含む）。「1e+20」のような書き方は、数として読まない */
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

/** ゆとシートの記録。生の記録を隠し、項目名で文字か数を取り出す */
export class YtsheetRecord {
  /**
   * ゆとシートのデータを、記録として持つ。
   *
   * @param raw ゆとシートのデータ（JSON を読んだもの）
   */
  constructor(private readonly raw: Readonly<Record<string, unknown>>) {}

  /**
   * 項目の値を、文字として取り出す。有限の数の値も文字にする。
   *
   * ゆとシートの書き方（HTML の書き方など）は戻さない。
   *
   * @param key 項目名
   * @returns 値の文字。ないときと、文字でも有限の数でもないときは空
   */
  text(key: string): string {
    return asString(this.raw[key]);
  }

  /**
   * 項目の値を、10 進の数として取り出す。文字の数も、前後の空白を除いて読む。小数も読む。
   *
   * @param key 項目名
   * @returns 数。ないときと、10 進の数として読めないときと、有限の数にならないときは null
   */
  number(key: string): number | null {
    const raw = this.raw[key];
    // ゆとシートは、数もほとんど文字で出すため、文字の数も読む
    const text = typeof raw === 'string' ? raw.trim() : null;
    const value = typeof raw === 'number' ? raw : text !== null && DECIMAL.test(text) ? Number(text) : null;
    return value !== null && Number.isFinite(value) ? value : null;
  }
}
