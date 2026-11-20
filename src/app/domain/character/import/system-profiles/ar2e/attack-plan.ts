/**
 * 攻撃の組み合わせ。
 *
 * 手と、右手と左手の合計の仕方から、命中判定とダメージの行の組（右手・左手・合計と、その武器）を決める。
 * 行の文字と欄の名前は持たない。
 */
import { Ar2eHandedness, Ar2eHands } from '@axe/domain/character/import/system-profiles/ar2e/ar2e-character';

/** 行の手。右手、左手、合計 */
export type AttackHand = 'right' | 'left' | 'total';

/** 命中判定かダメージの 1 行 */
export interface AttackLine {
  readonly hand: AttackHand;
  /** 行の武器（右手、左手の順）。武器がなければ空 */
  readonly weapons: readonly string[];
}

/** 命中判定とダメージの行の組 */
export interface AttackPlan {
  readonly accuracy: readonly AttackLine[];
  readonly damage: readonly AttackLine[];
}

/** 片手 */
type OneHand = Exclude<AttackHand, 'total'>;

/** 右手、左手の順 */
const ONE_HANDS: readonly OneHand[] = ['right', 'left'];

/** 命中判定とダメージの、行の手の並び */
interface AttackHands {
  readonly accuracy: readonly AttackHand[];
  readonly damage: readonly AttackHand[];
}

/** 合計の仕方ごとの、行の手の並びを決める関数 */
const ATTACK_HANDS: Readonly<Record<Ar2eHandedness, (hands: Ar2eHands) => AttackHands>> = {
  /**
   * 合計しないときの行の手の並びを決める。武器を持つ手ごとに 1 行にし、どちらの手も武器を持たなければ、合計の 1 行にする。
   *
   * @param hands 右手と左手
   * @returns 命中判定とダメージの、行の手の並び
   */
  separate: (hands) => {
    const armed = ONE_HANDS.filter((hand) => hands[hand].weapon != null);
    const lines: readonly AttackHand[] = armed.length > 0 ? armed : ['total'];
    return { accuracy: lines, damage: lines };
  },
  /**
   * 両手を合計するときの行の手の並びを決める。命中判定もダメージも、合計の 1 行にする。
   *
   * @returns 命中判定とダメージの、行の手の並び
   */
  both: () => ({ accuracy: ['total'], damage: ['total'] }),
  /**
   * 命中のみ合計するときの行の手の並びを決める。命中判定は合計の 1 行、ダメージは右手と左手の 2 行にする。
   *
   * @returns 命中判定とダメージの、行の手の並び
   */
  accuracyOnly: () => ({ accuracy: ['total'], damage: ONE_HANDS }),
  /**
   * 全部表示するときの行の手の並びを決める。命中判定もダメージも、右手、左手、合計の 3 行にする。
   *
   * @returns 命中判定とダメージの、行の手の並び
   */
  all: () => ({ accuracy: [...ONE_HANDS, 'total'], damage: [...ONE_HANDS, 'total'] }),
};

/**
 * 命中判定とダメージの行の組を決める。右手と左手の合計の仕方で行の手を並べ、行ごとに、その行の武器を添える。
 *
 * @param hands 右手と左手
 * @param handedness 右手と左手の合計の仕方
 * @returns 命中判定とダメージの行の組
 */
export function planAttacks(hands: Ar2eHands, handedness: Ar2eHandedness): AttackPlan {
  const attackHands = ATTACK_HANDS[handedness](hands);
  const lineOf = (hand: AttackHand): AttackLine => ({ hand, weapons: weaponsOf(hand, hands) });
  return { accuracy: attackHands.accuracy.map(lineOf), damage: attackHands.damage.map(lineOf) };
}

/**
 * 行の武器を並べる。合計の行は、武器を持つ手の武器を右手、左手の順に並べ、片手の行は、その手の武器だけにする。
 *
 * @param hand 行の手
 * @param hands 右手と左手
 * @returns 行の武器の名前。武器を持たない手の分は入れない
 */
function weaponsOf(hand: AttackHand, hands: Ar2eHands): string[] {
  const fromHands = hand === 'total' ? ONE_HANDS : [hand];
  return fromHands.map((one) => hands[one].weapon).filter((weapon): weapon is string => weapon != null);
}
