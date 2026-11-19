// 攻撃の組み合わせの単体テスト。
// 手と合計の仕方から決めた、命中判定とダメージの行の組を確かめる。
import { Ar2eHandedness, Ar2eHands } from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/ar2e-character';
import { AttackPlan, planAttacks } from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/attack-plan';

/**
 * 右手と左手を作る。
 *
 * @param right 右手の武器の名前。武器を持たないなら null
 * @param left 左手の武器の名前。武器を持たないなら null
 * @returns 右手と左手
 */
const hands = (right: string | null, left: string | null): Ar2eHands => ({
  right: { weapon: right },
  left: { weapon: left },
});

/**
 * 行の組の各行を、`手:武器,武器` の形の文字に直す。
 *
 * @param plan 命中判定とダメージの行の組
 * @returns 命中判定とダメージの、行の文字
 */
const shown = (plan: AttackPlan) => ({
  accuracy: plan.accuracy.map((line) => `${line.hand}:${line.weapons.join(',')}`),
  damage: plan.damage.map((line) => `${line.hand}:${line.weapons.join(',')}`),
});

/**
 * 右手と左手の武器と合計の仕方から、命中判定とダメージの行の組を決め、行の文字に直す。
 *
 * @param handedness 右手と左手の合計の仕方
 * @param right 右手の武器の名前。武器を持たないなら null
 * @param left 左手の武器の名前。武器を持たないなら null
 * @returns 命中判定とダメージの、行の文字
 */
const plan = (handedness: Ar2eHandedness, right: string | null, left: string | null) =>
  shown(planAttacks(hands(right, left), handedness));

describe('合計しないときの手の組み合わせ', () => {
  it('武器を持つ手ごとに、命中判定とダメージの行を作る', () => {
    expect(plan('separate', '剣', null)).toEqual({ accuracy: ['right:剣'], damage: ['right:剣'] });
    expect(plan('separate', null, '短剣')).toEqual({ accuracy: ['left:短剣'], damage: ['left:短剣'] });
    expect(plan('separate', '剣', '短剣')).toEqual({
      accuracy: ['right:剣', 'left:短剣'],
      damage: ['right:剣', 'left:短剣'],
    });
  });

  it('どちらの手も武器を持たない（素手や盾だけ）ときは、合計の 1 組（武器なし）', () => {
    expect(plan('separate', null, null)).toEqual({ accuracy: ['total:'], damage: ['total:'] });
  });
});

describe('両手を合計するときの手の組み合わせ', () => {
  it('合計の 1 組。武器は、武器を持つ手の武器を右手、左手の順に', () => {
    expect(plan('both', '剣', '短剣')).toEqual({ accuracy: ['total:剣,短剣'], damage: ['total:剣,短剣'] });
    expect(plan('both', null, '短剣')).toEqual({ accuracy: ['total:短剣'], damage: ['total:短剣'] });
  });
});

describe('命中のみ合計するときの手の組み合わせ', () => {
  it('命中判定は合計の 1 行、ダメージは右手と左手（武器を持たない手の分も）', () => {
    expect(plan('accuracyOnly', '剣', null)).toEqual({ accuracy: ['total:剣'], damage: ['right:剣', 'left:'] });
  });
});

describe('全部表示するときの手の組み合わせ', () => {
  it('右手、左手、合計の 3 行（武器を持たない手の分も）', () => {
    expect(plan('all', null, '短剣')).toEqual({
      accuracy: ['right:', 'left:短剣', 'total:短剣'],
      damage: ['right:', 'left:短剣', 'total:短剣'],
    });
  });
});

describe('能動判定の手の組み合わせ', () => {
  /** 手の持ち方（右手、左手）。武器を持たない手は null */
  const HANDS: readonly (readonly [string | null, string | null])[] = [
    ['剣', '短剣'],
    ['剣', null],
    [null, '短剣'],
    [null, null],
  ];

  /** 仕様書の合計の仕方ごとの見出しから書いた、手の持ち方ごとの行（HANDS と同じ順） */
  const SPEC_PLANS: Readonly<Record<Ar2eHandedness, readonly { accuracy: string[]; damage: string[] }[]>> = {
    separate: [
      { accuracy: ['right:剣', 'left:短剣'], damage: ['right:剣', 'left:短剣'] },
      { accuracy: ['right:剣'], damage: ['right:剣'] },
      { accuracy: ['left:短剣'], damage: ['left:短剣'] },
      { accuracy: ['total:'], damage: ['total:'] },
    ],
    both: [
      { accuracy: ['total:剣,短剣'], damage: ['total:剣,短剣'] },
      { accuracy: ['total:剣'], damage: ['total:剣'] },
      { accuracy: ['total:短剣'], damage: ['total:短剣'] },
      { accuracy: ['total:'], damage: ['total:'] },
    ],
    accuracyOnly: [
      { accuracy: ['total:剣,短剣'], damage: ['right:剣', 'left:短剣'] },
      { accuracy: ['total:剣'], damage: ['right:剣', 'left:'] },
      { accuracy: ['total:短剣'], damage: ['right:', 'left:短剣'] },
      { accuracy: ['total:'], damage: ['right:', 'left:'] },
    ],
    all: [
      {
        accuracy: ['right:剣', 'left:短剣', 'total:剣,短剣'],
        damage: ['right:剣', 'left:短剣', 'total:剣,短剣'],
      },
      { accuracy: ['right:剣', 'left:', 'total:剣'], damage: ['right:剣', 'left:', 'total:剣'] },
      { accuracy: ['right:', 'left:短剣', 'total:短剣'], damage: ['right:', 'left:短剣', 'total:短剣'] },
      { accuracy: ['right:', 'left:', 'total:'], damage: ['right:', 'left:', 'total:'] },
    ],
  };

  it('合計の仕方 4 つ × 手の持ち方 4 つの 16 通りすべてが、仕様書のとおり', () => {
    for (const [handedness, plans] of Object.entries(SPEC_PLANS) as [Ar2eHandedness, (typeof SPEC_PLANS)['all']][]) {
      HANDS.forEach(([right, left], index) =>
        expect(plan(handedness, right, left), `${handedness} ${right}/${left}`).toEqual(plans[index])
      );
    }
  });
});
