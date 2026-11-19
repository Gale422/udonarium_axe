/**
 * ゆとシートの記録。
 *
 * ゆとシートが出すデータ（`mode=json`）の項目名と値。値を文字か数として取り出し、ない値は「なし」で返す。
 * ルールの意味とアックスの書き方は持たない。
 */
import { asString } from '@axe/domain/character/import/imported-character';

/**
 * 10 進の数の書き方（符号と小数を含む）。「1e1」「0x4」のような書き方は、数として読まない。
 * 1 つ目の組は符号、2 つ目の組は整数の部分の数字（「.5」のように整数の部分を書かないときは、ない）
 */
const DECIMAL = /^([+-]?)(?:(\d+)(?:\.\d*)?|\.\d+)$/;

/** 10 進の数として読んだ値と、その整数の部分（0 に向けて切り捨てたもの）を作る関数 */
interface DecimalValue {
  readonly value: number;
  readonly whole: () => bigint;
}

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
    return this.decimalOf(key)?.value ?? null;
  }

  /**
   * 番号の付いた項目（`skill3Name` のように、前の部分と後ろの部分の間に番号がある項目名）のうち、記録にある番号を取り出す。
   * 番号として読むのは、0 で始まらない 1 以上の整数だけ。
   *
   * @param prefix 項目名の、番号の前の部分（例: `skill`）
   * @param suffix 項目名の、番号の後ろの部分（例: `Name`）
   * @returns 記録にある番号（小さい順）
   */
  indexesOf(prefix: string, suffix: string): bigint[] {
    const indexes: bigint[] = [];
    for (const key of Object.keys(this.raw)) {
      if (!key.startsWith(prefix) || !key.endsWith(suffix)) continue;
      const number = key.slice(prefix.length, key.length - suffix.length);
      // 桁の多い番号も、項目名に書かれた番号とずれないように、桁に限りのない整数で持つ
      if (/^[1-9]\d*$/.test(number)) indexes.push(BigInt(number));
    }
    return indexes.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }

  /**
   * 項目名を順に見て、最初に数として読めた値（`number` の読み方）の、整数の部分を取り出す。
   * 文字の数は、書かれた数字から、小数の部分を切り捨てた整数を作る。
   *
   * @param keys 項目名（見る順）
   * @returns 整数の部分（0 に向けて切り捨てたもの）。どの項目も読めないときは null
   */
  firstWholeNumber(...keys: string[]): bigint | null {
    for (const key of keys) {
      const decimal = this.decimalOf(key);
      if (decimal) return decimal.whole();
    }
    return null;
  }

  /**
   * 項目の値を、10 進の数として読む。文字の数は、前後の空白を除いて読む。
   * 整数の部分を作る関数は、文字の数なら書かれた数字から作り、数の値なら小数の部分を切り捨てて作る。
   *
   * @param key 項目名
   * @returns 読んだ値と、整数の部分を作る関数。ないときと、10 進の数として読めないときと、有限の数にならないときは null
   */
  private decimalOf(key: string): DecimalValue | null {
    const raw = this.raw[key];
    if (typeof raw === 'number') {
      return Number.isFinite(raw) ? { value: raw, whole: () => BigInt(Math.trunc(raw)) } : null;
    }
    // ゆとシートは、数もほとんど文字で出すため、文字の数も読む
    if (typeof raw !== 'string') return null;
    const text = raw.trim();
    const match = DECIMAL.exec(text);
    const value = Number(text);
    if (!match || !Number.isFinite(value)) return null;
    const [, sign, digits = '0'] = match;
    // 桁の多い数も、書かれた数とずれないように、整数の部分はふつうの数を通さずに作る
    return { value, whole: () => (sign === '-' ? -BigInt(digits) : BigInt(digits)) };
  }
}
