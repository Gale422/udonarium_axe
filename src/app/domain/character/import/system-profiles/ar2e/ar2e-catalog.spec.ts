// アリアンロッド2E の一覧の単体テスト。
// スキルのタイミングと判定の分け方と、判定の一覧を確かめる。
import {
  AR2E_CHECKS,
  AR2E_SPECIAL_CHECKS,
  AR2E_TIMINGS,
  ar2eCheckOf,
  Ar2eSkillCheck,
  skillCheckOf,
  timingOf,
} from '@axe/domain/character/import/system-profiles/ar2e/ar2e-catalog';

/** 仕様書「スキルのタイミングの分け方」の、決まったタイミング（その並び） */
const SPEC_TIMINGS = [
  'パッシブ',
  'メイキング',
  '戦闘前',
  'セットアップ',
  'イニシアチブ',
  'フリー',
  'ムーブ',
  'レガシー',
  'マイナー',
  'メジャー',
  '判定の直前',
  '判定の直後',
  'DRの直前',
  'DRの直後',
  'リアクション',
  'クリンナップ',
  '戦闘不能',
  '効果参照',
  'アイテム',
];

/** 仕様書「判定が判定の選択肢のスキルの使う行」「判定が命中判定のスキルの使う行」の、判定の選択肢と、そのダイスを振る判定 */
const SPEC_SKILL_CHECKS: readonly (readonly [string, Ar2eSkillCheck])[] = [
  ['筋力', { kind: 'check', check: 'str' }],
  ['器用', { kind: 'check', check: 'dex' }],
  ['敏捷', { kind: 'check', check: 'agi' }],
  ['知力', { kind: 'check', check: 'int' }],
  ['感知', { kind: 'check', check: 'sen' }],
  ['精神', { kind: 'check', check: 'mnd' }],
  ['幸運', { kind: 'check', check: 'luk' }],
  ['魔術判定', { kind: 'check', check: 'magic' }],
  ['錬金術判定', { kind: 'check', check: 'alchemy' }],
  ['呪歌判定', { kind: 'check', check: 'song' }],
  ['回避判定', { kind: 'evasion' }],
  ['命中判定', { kind: 'accuracy' }],
];

describe('スキルのタイミングの分け方', () => {
  it('タイミングが空なら、効果参照', () => {
    expect(timingOf('')).toBe('効果参照');
  });

  it('決まったタイミングの一覧は、仕様書の 19 個と、その並び', () => {
    expect(AR2E_TIMINGS).toEqual(SPEC_TIMINGS);
  });

  it('決まったタイミングは、どれも、そのタイミング。「／」か「/」の後ろに何が続いても同じ', () => {
    for (const timing of SPEC_TIMINGS) {
      expect(timingOf(timing), timing).toBe(timing);
      expect(timingOf(`${timing}／メイキング`), `${timing}／メイキング`).toBe(timing);
      expect(timingOf(`${timing}/自由`), `${timing}/自由`).toBe(timing);
    }
  });

  it('「〇〇／メイキング」と「〇〇/〇〇」は、最初の部分の決まったタイミング', () => {
    expect(timingOf('パッシブ／メイキング')).toBe('パッシブ');
    expect(timingOf('セットアップ/クリンナップ')).toBe('セットアップ');
  });

  it('それ以外は、決まったタイミングでない（書かれたままのタイミングになる）', () => {
    expect(timingOf('ﾊﾟｯｼﾌﾞ')).toBeNull();
    expect(timingOf('バッシブ')).toBeNull();
    expect(timingOf('《カバーリング》')).toBeNull();
    expect(timingOf('―')).toBeNull();
    expect(timingOf('パッシブ ／メイキング')).toBeNull();
  });
});

describe('スキルの判定の分け方（仕様書「スキルの使う行」）', () => {
  it('判定の選択肢は、どれも、そのダイスを振る判定（仕様書の 12 個すべて）', () => {
    for (const [text, check] of SPEC_SKILL_CHECKS) expect(skillCheckOf(text), text).toEqual(check);
  });

  it('自動成功、空欄、効果参照、「―」、自由に書いたものは、ダイスを振らない', () => {
    for (const text of ['自動成功', '', '効果参照', '―', '【筋力】', '対決'])
      expect(skillCheckOf(text), text).toBeNull();
  });
});

describe('アリアンロッド2E の判定の一覧（仕様書「判定の見出しのかたまり」）', () => {
  it('能力値の判定 7 つの後に、特殊な判定 8 つ', () => {
    expect(AR2E_CHECKS.map((check) => check.name)).toEqual([
      '筋力',
      '器用',
      '敏捷',
      '知力',
      '感知',
      '精神',
      '幸運',
      'トラップ探知',
      'トラップ解除',
      '危険感知',
      'エネミー識別',
      'アイテム鑑定',
      '魔術判定',
      '呪歌判定',
      '錬金術判定',
    ]);
  });

  it('特殊な判定のダイス数の元になる能力値は、8 つすべて資料のとおり（資料「キャラクターの特殊な判定の項目」）', () => {
    expect(AR2E_SPECIAL_CHECKS.map((check) => [check.name, ar2eCheckOf(check.ability).name])).toEqual([
      ['トラップ探知', '感知'],
      ['トラップ解除', '器用'],
      ['危険感知', '感知'],
      ['エネミー識別', '知力'],
      ['アイテム鑑定', '知力'],
      ['魔術判定', '知力'],
      ['呪歌判定', '精神'],
      ['錬金術判定', '器用'],
    ]);
  });

  it('判定の並びは、能力値の判定の後に、特殊な判定の並びをそのまま続けたもの', () => {
    expect(AR2E_CHECKS.slice(7)).toEqual(AR2E_SPECIAL_CHECKS);
    expect(ar2eCheckOf('str')).toEqual({ id: 'str', kind: 'ability', name: '筋力' });
  });
});
