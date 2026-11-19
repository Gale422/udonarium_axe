/**
 * ゆとシートのアリアンロッド2E の取り込みのテストの下準備。
 *
 * 本物の処理を呼んで確かめるための部品。取り込みから組み立てまで通してコマを作り、パレットの行を、
 * パレットの画面が送るのと同じ入口で送って、ダイスボットに処理させる。
 * ダイスは、本物のダイスの仕組みのアリアンロッドを、目を固定して振る。
 */
import { TestBed } from '@angular/core/testing';
import { CharacterMacroService } from '@axe/application/chat/character-macro.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { parseImportedCharacterJson } from '@axe/domain/character/import/character-import-format';
import { ImportedCharacterFactory } from '@axe/domain/character/import/imported-character-factory';
import { referenceSites } from '@axe/domain/chat/chat-reference';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { paletteRowsOf } from '@axe/domain/chat/palette-rows';
import { isTargetNumberReference } from '@axe/domain/chat/target-number';
import { DataElement, DataElementRole } from '@axe/domain/data/data-element';
import { findReferencedElement } from '@axe/domain/data/element-reference';
import BCDiceLoader from '@axe/domain/dice/bcdice/bcdice-loader';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { YtsheetSheet } from '@axe/testing/ytsheet-ar2e/ytsheet-ar2e-fixtures';
import GameSystemClass from 'bcdice/lib/game_system';
import { vi } from 'vitest';

/** アプリが置くダイスボットの名前 */
const DICE_BOT_IDENTIFIER = 'DiceBot';
/** 送った後、ダイスボットの処理が片付くのを待つ、タイマーの番の数の上限 */
const SETTLE_TURNS = 20;

/**
 * ゆとシートのデータを、形式の見分けと組み立てを通して、コマにする。
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
 * コマの欄の要素を、参照で探す。
 *
 * @param piece コマ
 * @param reference 名前か、見出しをたどる参照（例: `スキル/メジャー/ヒール`）
 * @returns 見つかった要素。見つからないか、2 つ以上あるときは null
 * @throws {TypeError} コマに、データの一番上の要素がないとき
 */
export function findElementOf(piece: GameCharacter, reference: string): DataElement | null {
  // パレットとリソース操作も、この探し方で欄を探す
  return findReferencedElement(piece.rootDataElement!, reference);
}

/**
 * コマの欄の項目を、参照で探す。見つかった要素が、見出しでなく項目のときだけ返す。
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
 * コマの欄の要素を、参照で探す。見つからなければ、例外を投げる。
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
 * コマのパレットから、見出しと空行を除いた、送れる行を取り出す。
 *
 * @param piece コマ
 * @returns パレットの送れる行
 * @throws {TypeError} コマにチャットパレットがないとき
 */
export function paletteLinesOf(piece: GameCharacter): string[] {
  // パレットの画面も、この見分け方で見出しと空行を分ける
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
 * パレットの行の参照を、コマのパレットの埋め方で埋める。行の中の「\n」の 2 文字は、改行にしてから埋める。
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
    // ダイスボットは、この見分け方に合う行だけを振る
    COMMAND_PATTERN: system.COMMAND_PATTERN,
    eval: (command: string) => {
      const game = new system(command);
      Object.assign(game.randomizer, { $random: face });
      return game.eval();
    },
  } as unknown as GameSystemClass;
}

/**
 * パレットの行を、コマとしてテスト用のチャットのタブに送り、ダイスボットがダイスとリソース操作とバフを処理し終えるのを待つ。
 * 行の中の「\n」の 2 文字は、改行にしてから送る。ダイスボットが使うダイスの仕組みは、渡したものに差し替える。
 *
 * @param piece 発言するコマ
 * @param line パレットの行
 * @param system ダイスボットが使うダイスの仕組み
 * @param targetNumber `{目標値}` に入れる数。null なら、数を渡さずに送る
 * @returns チャットに出た、送った文と、ダイスの結果の文（振られなければ空）
 */
export async function sendLine(
  piece: GameCharacter,
  line: string,
  system: GameSystemClass,
  targetNumber: number | null = null
): Promise<{ sent: string; roll: string }> {
  // パレットの画面も、行を入力欄に入れるときに「\n」の 2 文字を改行にする
  const typed = line.replace(/\\n/g, '\n');
  // ダイスの道具の読み込みは外からの読み込みを待つので、送る前に済ませる
  await DiceBot.ensureLoaded();
  const loading = vi.spyOn(DiceBot, 'loadGameSystemAsync').mockResolvedValue(system);
  PeerCursor.createMyCursor();
  const tab = new ChatTab();
  tab.initialize();
  // チャットのサービスは、ダイスボットをアプリと同じ名前で探す。ほかのテストが置いたものがあれば、それを使う
  const placed = ObjectStore.instance.get<DiceBot>(DICE_BOT_IDENTIFIER);
  const diceBot = placed ?? new DiceBot(DICE_BOT_IDENTIFIER);
  if (!placed) diceBot.initialize();
  try {
    const message = TestBed.inject(CharacterMacroService).send(piece, typed, {
      tab,
      gameSystem: system,
      ...(targetNumber === null ? {} : { targetNumber }),
    });
    // ダイスの結果とリソース操作の報告は、送った行の後の発言としてタブに足されるので、発言が増えなくなるまで待つ
    let said = -1;
    for (let turn = 0; turn < SETTLE_TURNS && said !== tab.chatMessages.length; turn++) {
      said = tab.chatMessages.length;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const roll = tab.chatMessages.find((answer) => answer.from === 'System-BCDice')?.text ?? '';
    return { sent: message?.text ?? '', roll };
  } finally {
    if (!placed) diceBot.destroy();
    tab.destroy();
    loading.mockRestore();
  }
}
