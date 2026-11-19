/**
 * ゆとシートのアリアンロッド2E の取り込みのテストの下準備。
 *
 * 本物の処理を呼んで確かめるための部品。取り込みから組み立てまで通してコマを作り、パレットの行を、
 * アプリが送るときと同じ順（参照を埋める → 目標値を入れる → リソース操作とバフを処理する）で通す。
 * ダイスは、本物のダイスの仕組みのアリアンロッドを、目を固定して振る。
 */
import { GameCharacter } from '@axe/domain/character/game-character';
import { parseImportedCharacterJson } from '@axe/domain/character/import/character-import-format';
import { ImportedCharacterFactory } from '@axe/domain/character/import/imported-character-factory';
import { referenceSites } from '@axe/domain/chat/chat-reference';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { paletteRowsOf } from '@axe/domain/chat/palette-rows';
import { fillTargetNumber, isTargetNumberReference } from '@axe/domain/chat/target-number';
import { DataElement, DataElementRole } from '@axe/domain/data/data-element';
import { findReferencedElement } from '@axe/domain/data/element-reference';
import { ResourceEditProcessor } from '@axe/domain/data/resource-edit-processor';
import BCDiceLoader from '@axe/domain/dice/bcdice/bcdice-loader';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { YtsheetSheet } from '@axe/testing/ytsheet-ar2e/ytsheet-ar2e-fixtures';
import GameSystemClass from 'bcdice/lib/game_system';

/**
 * ゆとシートのデータを、アプリと同じ取り込みの流れ（形式の見分け → 中間の形 → 組み立て）で、コマにする。
 *
 * @param sheet ゆとシートのデータ
 * @returns 組み立てたコマ（画像なし）
 * @throws {Error} 形式の見分けで、取り込めるデータと見分けられなかったとき
 */
export function importAr2ePiece(sheet: YtsheetSheet): GameCharacter {
  const imported = parseImportedCharacterJson(sheet);
  if (!imported) throw new Error('取り込めなかった');
  return ImportedCharacterFactory.create(imported, '');
}

/**
 * ゆとシートのデータからコマを作って渡し、渡した処理が終わったら、コマを片付ける。
 * 渡した処理が待つ処理（Promise を返す処理）なら、待ち終わってから片付ける。
 *
 * @param sheet ゆとシートのデータ
 * @param use コマを使う処理
 * @returns 渡した処理の戻り値
 * @throws {Error} 形式の見分けで、取り込めるデータと見分けられなかったとき。渡した処理が投げた例外も、そのまま投げる
 */
export function withImportedPiece<T>(sheet: YtsheetSheet, use: (piece: GameCharacter) => T): T {
  const piece = importAr2ePiece(sheet);
  let result: T;
  try {
    result = use(piece);
  } catch (error) {
    piece.destroy();
    throw error;
  }
  if (result instanceof Promise) return result.finally(() => piece.destroy()) as T;
  piece.destroy();
  return result;
}

/**
 * コマの欄の要素を、パレットとリソース操作が欄を探すのと同じ入口（`findReferencedElement`）で探す。
 *
 * @param piece コマ
 * @param reference 名前か、見出しをたどる参照（例: `スキル/メジャー/ヒール`）
 * @returns 見つかった要素。見つからないか、2 つ以上あるときは null
 * @throws {TypeError} コマに、データの一番上の要素がないとき
 */
export function findElementOf(piece: GameCharacter, reference: string): DataElement | null {
  return findReferencedElement(piece.rootDataElement!, reference);
}

/**
 * コマの欄の項目を、パレットとリソース操作が欄を探すのと同じ入口（`findReferencedElement`）で探す。
 * 見つかった要素が、見出しでなく項目のときだけ返す。
 *
 * @param piece コマ
 * @param reference 名前か、見出しをたどる参照（例: `スキル/メジャー/ヒール`）
 * @returns 見つかった項目。見つからないか、2 つ以上あるか、見つかった要素が見出しのときは null
 * @throws {TypeError} コマに、データの一番上の要素がないとき
 */
export function findFieldOf(piece: GameCharacter, reference: string): DataElement | null {
  const element = findElementOf(piece, reference);
  return element?.fieldRole === DataElementRole.FIELD ? element : null;
}

/**
 * コマの欄の要素を探す。見つからなければ、例外を投げてテストを止める。
 *
 * @param piece コマ
 * @param reference 名前か、見出しをたどる参照
 * @returns 見つかった要素
 * @throws {Error} 要素が見つからないか、2 つ以上あるとき
 * @throws {TypeError} コマに、データの一番上の要素がないとき
 */
export function elementOf(piece: GameCharacter, reference: string): DataElement {
  const element = findElementOf(piece, reference);
  if (!element) throw new Error(`見つからない: ${reference}`);
  return element;
}

/**
 * コマのパレットの、送れる行を取り出す。見出しと空行は、アプリのパレットの欄と同じ見分け方（`paletteRowsOf`）で除く。
 *
 * @param piece コマ
 * @returns パレットの送れる行
 * @throws {TypeError} コマにチャットパレットがないとき
 */
export function paletteLinesOf(piece: GameCharacter): string[] {
  return paletteRowsOf(piece.chatPalette!.getPalette())
    .filter((row) => row.kind === 'command')
    .map((row) => row.text);
}

/**
 * 行の中の参照の名前を取り出す。`{目標値}` は除く。
 *
 * @param line パレットの行
 * @returns 参照の名前（行の中の順）
 */
export function referenceNamesOf(line: string): string[] {
  return (
    referenceSites(line)
      // `{目標値}` は、欄でなく、送るときにチャットから入るため
      .filter((site) => !isTargetNumberReference(site.name))
      .map((site) => site.name)
  );
}

/**
 * パレットの行を、パレットから送るときと同じく埋める。
 * 行の中の「\n」の 2 文字を改行にしてから、パレットの埋め方（`ChatPalette.evaluateWithAttachments`）で参照を埋める。
 * 読めない参照は空になる。
 *
 * @param piece 発言するコマ
 * @param line パレットの行
 * @returns 参照を埋めた文
 * @throws {TypeError} コマにチャットパレットがないとき
 */
export function filledLineOf(piece: GameCharacter, line: string): string {
  // パレットの画面の `clickPalette` も、行を入力欄に入れるときに「\n」の 2 文字を改行にする
  const typed = line.replace(/\\n/g, '\n');
  return piece.chatPalette!.evaluateWithAttachments(typed, piece.rootDataElement ?? undefined).text;
}

let arianrhod: Promise<GameSystemClass> | null = null;

/**
 * 本物のダイスの仕組みのアリアンロッドを、1 度だけ読み込む。
 * 読み込みに失敗したときは覚えておかず、次に呼ばれたときに読み直す。
 *
 * @returns 読み込んだダイスの仕組み
 * @throws {Error} 読み込みに失敗したとき（返す Promise が、その失敗で終わる）
 */
export function loadArianrhod(): Promise<GameSystemClass> {
  arianrhod ??= new BCDiceLoader().dynamicLoad('Arianrhod').catch((error: unknown) => {
    // テストはファイルをまたいで同じ状態を使い回すので、1 度の失敗を覚えると、後のテストがすべて同じ失敗で落ちる
    arianrhod = null;
    throw error;
  });
  return arianrhod;
}

/**
 * 目を固定したダイスの仕組みを作る。振るたびに、渡した目を順に出し、尽きたら最後の目を出し続ける。
 * 振る前に、乱数の部品を差し替える。面の数より大きい目は、面の数にする。
 *
 * @param system 本物のダイスの仕組み
 * @param faces 出す目
 * @returns 目を固定したダイスの仕組み
 */
export function withFixedDice(system: GameSystemClass, faces: readonly number[]): GameSystemClass {
  let next = 0;
  // アックスのリソース操作は、計算のために中で `1D1` を振ることがあるので、面の数を超えない目にする
  const face = (sides: number) => Math.min(faces[Math.min(next++, faces.length - 1)], sides);
  return {
    ID: system.ID,
    NAME: system.NAME,
    eval: (command: string) => {
      const game = new system(command);
      Object.assign(game.randomizer, { $random: face });
      return game.eval();
    },
  } as unknown as GameSystemClass;
}

/**
 * パレットの行を、アプリが送るときと同じ順に通す。
 *
 * 1. パレットから送るときと同じく埋める（`filledLineOf`）
 * 2. `{目標値}` に目標値を入れる（`fillTargetNumber`）。目標値を渡さないときは入れない
 * 3. ダイスを振る（`DiceBot.diceRollAsync`）
 * 4. リソース操作とバフを処理する（`ResourceEditProcessor`）
 *
 * @param piece 発言するコマ
 * @param line パレットの行
 * @param system 振るダイスの仕組み
 * @param targetNumber `{目標値}` に入れる数
 * @returns 送った文と、ダイスの結果の文（振れなければ空）と、処理の報告の文
 * @throws {TypeError} コマにチャットパレットがないとき（返す Promise が、その失敗で終わる）
 */
export async function sendLine(
  piece: GameCharacter,
  line: string,
  system: GameSystemClass,
  targetNumber: number | null = null
): Promise<{ sent: string; roll: string; reports: string[] }> {
  const sent = fillTargetNumber(filledLineOf(piece, line), () => targetNumber);
  const roll = (await DiceBot.diceRollAsync(sent, system)).result;

  PeerCursor.createMyCursor();
  const tab = new ChatTab();
  tab.initialize();
  try {
    const message = tab.addMessage({
      identifier: '',
      tabIdentifier: tab.identifier,
      from: 'peer',
      timestamp: 1,
      imageIdentifier: '',
      tag: '',
      name: piece.name,
      text: sent,
      sendFrom: piece.identifier,
    });
    const processor = new ResourceEditProcessor(
      (message, gameSystem) => DiceBot.diceRollAsync(message, gameSystem),
      async () => system
    );
    await processor.checkResourceEditCommand(message, [{ text: sent, object: null }]);
    const reports = tab.chatMessages.filter((said) => said.tag.includes('system')).map((said) => said.text);
    return { sent, roll, reports };
  } finally {
    tab.destroy();
  }
}
