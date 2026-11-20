/**
 * キャラクター保管所の記録。
 *
 * キャラクター保管所が出すデータ（`<番号>.js`）の項目名と値。値を文字か数として取り出し、
 * 表の列（配列）の何番目かの値も同じ読み方で取り出す。ない値は「なし」で返す。
 * ルールの意味とアックスの書き方は持たない。
 */
import { asString } from '@axe/domain/character/import/imported-character';
import { readSheetNumber } from '@axe/domain/character/import/sheet-number';
import { asArray } from '@axe/domain/character/import/system-profiles/charasheet-shared';

/** キャラクター保管所の記録。生の記録を隠し、項目名で文字か数を取り出す */
export class CharasheetRecord {
  /**
   * キャラクター保管所のデータを、記録として持つ。
   *
   * @param raw キャラクター保管所のデータ（JSON を読んだもの）
   */
  constructor(private readonly raw: Readonly<Record<string, unknown>>) {}

  /**
   * 項目に値がないかを見る。項目がないか、値が空の文字なら、値がない。
   *
   * @param key 項目名
   * @returns 値がなければ true
   */
  isMissing(key: string): boolean {
    const value = this.raw[key];
    return value == null || value === '';
  }

  /**
   * 項目の値を、書かれたままの文字として取り出す。有限の数の値も文字にする。
   *
   * @param key 項目名
   * @returns 値の文字。ないときと、文字でも有限の数でもないときは空
   */
  text(key: string): string {
    return asString(this.raw[key]);
  }

  /**
   * 項目の値を、シートの値の読み方で、10 進の数として取り出す。
   *
   * @param key 項目名
   * @returns 数。ないときと、10 進の数として読めないときと、有限の数にならないときは null
   */
  number(key: string): number | null {
    return readSheetNumber(this.raw[key]);
  }

  /**
   * 表の列の行の数を数える。
   *
   * @param key 列の項目名
   * @returns 行の数。列が配列でないときは 0
   */
  rowCount(key: string): number {
    return asArray(this.raw[key]).length;
  }

  /**
   * 表の列の何番目かの値を、書かれたままの文字として取り出す。
   *
   * @param key 列の項目名
   * @param index 何番目か（0 から）
   * @returns 値の文字。ないときと、文字でも有限の数でもないときは空
   */
  cellText(key: string, index: number): string {
    return asString(asArray(this.raw[key])[index]);
  }
}
