/**
 * アックスの書き方。
 *
 * アックスが読む書き方。参照や操作の行の形と、参照で読める名前を作る。
 * ゲームのルールは持たない。シートの文字は直さない。
 */
import { toHalfWidth } from '@axe/core/util/string-util';
import { TARGET_NUMBER_REFERENCE } from '@axe/domain/chat/target-number';

/**
 * 名前を、アックスの参照で読める名前にする。全角の英数字と記号を、アックス本体の半角への直し方で半角にし、ほかは直さない。
 *
 * @param name 名前
 * @returns 参照で読める名前
 */
export function referableNameOf(name: string): string {
  // アックスの参照は、参照の名前だけを半角に直してから欄の名前と比べるので、欄の名前も半角にしておかないと読めない
  return toHalfWidth(name);
}

/**
 * 名前だけの参照 `{名前}` を作る。
 *
 * @param name 参照で読める名前
 * @returns 参照の文字
 */
export function referenceTo(name: string): string {
  return `{${name}}`;
}

/**
 * 見出しをたどる参照 `{見出し/中の見出し/項目}` を作る。名前の中の `\` は `\\`、`/` は `\/` にする。
 *
 * @param names 参照で読める名前の並び（外側の見出しから順に）
 * @returns 参照の文字
 */
export function pathReferenceTo(names: readonly string[]): string {
  return referenceTo(pathOf(names));
}

/**
 * 見出しをたどる、リソースの最大値の参照 `{見出し/中の見出し/項目^}` を作る。
 *
 * @param names 参照で読める名前の並び（外側の見出しから順に）
 * @returns 参照の文字
 */
export function maxPathReferenceTo(names: readonly string[]): string {
  return referenceTo(`${pathOf(names)}^`);
}

/**
 * 見出しをたどる参照の中身を作る。名前の中の `\` と `/` を逃がして、`/` でつなぐ。
 *
 * @param names 参照で読める名前の並び（外側の見出しから順に）
 * @returns 参照の中身（`{}` の中の文字）
 */
function pathOf(names: readonly string[]): string {
  return names.map((name) => name.replace(/\\/g, '\\\\').replace(/\//g, '\\/')).join('/');
}

/** 送るときに、チャットから取った目標値に置き換わる参照 `{目標値}` */
export const TARGET_NUMBER = referenceTo(TARGET_NUMBER_REFERENCE);

/**
 * パレットの見出しの行 `//--- 見出し` を作る。
 *
 * @param title 見出し
 * @returns 見出しの行
 */
export function paletteHeadingLine(title: string): string {
  return `//--- ${title}`;
}

/**
 * リソース操作の行の先頭 `:名前変化LZ` を作る。どの操作にも `LZ` を付ける。
 *
 * @param name 操作するリソースの、参照で読める名前
 * @param change 変化の式（例: `-4`、`+2D6`、`={HP^}`）
 * @returns リソース操作の行の先頭
 */
export function resourceCommand(name: string, change: string): string {
  // `L` は 0 と最大値の範囲に収め、`Z` は演算と逆向きの変化を止める（ダメージより防御が大きいときに回復させない）。
  // 項目の設定に左右されないように、どの操作にも付ける
  return `:${name}${change}LZ`;
}

/**
 * スキルや武器の名前を `≪名前≫` で囲む。
 *
 * @param name 名前（書かれたまま）
 * @returns 囲んだ名前
 */
export function skillMark(name: string): string {
  // アリアンロッド2E の《》に見た目が近く、アックスの演出の印《》とぶつからない ≪≫ を使う
  return `≪${name}≫`;
}

/** アックスのバフの、残りが減って消えるタイミング */
export type AxeBuffTiming = 'ラウンド終了' | '手番開始' | '手番終了';

/**
 * アックスのバフの、消えるタイミングと残りの数。`lasting` は消えないこと（行には `none` と書く）。
 */
export type AxeBuffEnding = { readonly rounds: number; readonly timing: AxeBuffTiming } | 'lasting';

/**
 * 効果を空にした、デバフの区分のバフを付ける行 `&名前//残り/タイミング/デバフ` を作る。
 *
 * @param name バフの名前
 * @param ending 消えるタイミングと残りの数
 * @returns バフを付ける行
 */
export function debuffCommand(name: string, ending: AxeBuffEnding): string {
  const rest = ending === 'lasting' ? 'none' : `${ending.rounds}/${ending.timing}`;
  // デバフの区分を書くのは、`&*デバフ-` で外せるようにするため
  return `&${name}//${rest}/デバフ`;
}

/**
 * ラウンドが終わるたびにリソースを動かす、消えないデバフを付ける行
 * `&!名前/:リソース/+/0~量/none/発生:ラウンド終了/デバフ` を作る。
 *
 * @param name バフの名前
 * @param resource 動かすリソースの、参照で読める名前
 * @param amount ラウンドが終わるたびに動かす量の式（例: `-(n*5)`）
 * @returns バフを付ける行
 */
export function damageOverTimeDebuffCommand(name: string, resource: string, amount: string): string {
  // `:` を付けたリソースは、バフが外れても戻さない。`0~量` は、付けたときは動かさず、ラウンドが終わるたびに量だけ動かす
  return `&!${name}/:${resource}/+/0~${amount}/none/発生:ラウンド終了/デバフ`;
}

/**
 * バフを外す行 `&名前-` を作る。
 *
 * @param name バフの名前
 * @returns バフを外す行
 */
export function removeBuffCommand(name: string): string {
  return `&${name}-`;
}
