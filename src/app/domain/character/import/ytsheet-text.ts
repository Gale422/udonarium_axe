/**
 * ゆとシートの文字。
 *
 * ゆとシートのデータの文字を、HTML の書き方を戻して、ゆとシートの画面に表示されるとおりの文字に読む。
 * ゆとシートの書き方（リンク、ルビ、太字、表など）は読み替えず、書かれたまま残す。
 */
import { decodeEntityReference } from '@axe/core/util/xml-util';

/**
 * 欄の形。
 *
 * - `line`: 1 行の欄。データの前後の半角の空白・タブ・改行の文字を除く（ゆとシートの画面でも表示されないため）
 * - `multiline`: 複数行の欄
 * - `url`: アドレスの欄（項目名が `URL` で終わる欄）。1 行の欄と同じく前後を除き、HTML の書き方は戻さない
 */
export type YtsheetTextShape = 'line' | 'multiline' | 'url';

/** ゆとシートの改行の書き方 */
const LINE_BREAK = /&lt;br&gt;/gi;

/** ブラウザが表示しない、前後の空白（半角の空白、タブ、改行の文字）。全角の空白と、改ページの文字（U+000C）などは含まない */
const UNSHOWN_SPACE_AT_ENDS = /^[ \t\n\r]+|[ \t\n\r]+$/g;

/**
 * ゆとシートのデータの文字を、ゆとシートの画面に表示されるとおりの文字に読む。
 * 1 行の欄とアドレスの欄は、データの前後の半角の空白・タブ・改行の文字を除く。
 * 1 行の欄と複数行の欄は、HTML の書き方を戻す。1 行の欄は、除いてから戻すので、
 * 改行の書き方（`&lt;br&gt;`）による前後の改行は、画面と同じく残る。
 *
 * @param raw ゆとシートのデータの文字（HTML の書き方のまま）
 * @param shape 欄の形
 * @returns 読んだ文字
 */
export function readYtsheetText(raw: string, shape: YtsheetTextShape): string {
  if (shape === 'multiline') return decodeYtsheetHtml(raw);
  const trimmed = raw.replace(UNSHOWN_SPACE_AT_ENDS, '');
  // ゆとシートも、項目名が `URL` で終わる欄は、HTML の書き方を変換しない
  return shape === 'url' ? trimmed : decodeYtsheetHtml(trimmed);
}

/**
 * HTML の書き方を戻す。
 *
 * `&amp;` を戻してから改行の書き方を改行にし（手で「&lt;br&gt;」と書いた所も改行になる）、
 * 最後に、`&quot;` と、残りの `&lt;` などの XML の書き方と番号の書き方を、まとめて戻す。
 * `&hearts;` のような HTML だけの名前の書き方は戻さない。
 *
 * @param raw ゆとシートのデータの文字（HTML の書き方のまま）
 * @returns HTML の書き方を戻した文字
 */
function decodeYtsheetHtml(raw: string): string {
  // `&amp;` と改行の書き方の順は、ゆとシートと同じ。ゆとシートは `&quot;` を改行の前に戻すが、
  // `"` は改行の書き方にかからないので、最後にまとめて戻しても結果は同じ。
  // HTML だけの名前の書き方を戻さないのは、戻すための表が、アックスの起動時に読む量を増やすため
  return decodeEntityReference(raw.replace(/&amp;/g, '&').replace(LINE_BREAK, '\n'));
}
