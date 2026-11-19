// 参照の名前の単体テスト。
// 決まった項目の名前と、スキルの置き場（タイミングの見出しと項目の名前）を確かめる。
import { AR2E_TIMINGS, ar2eCheckOf } from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/ar2e-catalog';
import { Ar2eSkill } from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/ar2e-character';
import {
  checkFieldNames,
  handFieldNames,
  placeSkills,
  sheetGroupNameOf,
} from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/reference-names';
/**
 * 名前とタイミングだけのスキルを作る。ほかの項目は空。
 *
 * @param name スキルの名前
 * @param timing タイミング
 * @returns スキル
 */
const skill = (name: string, timing = ''): Ar2eSkill => ({
  name,
  source: '',
  category: '',
  level: '',
  timing,
  check: '',
  target: '',
  range: '',
  cost: '',
  costPoints: null,
  requirement: '',
  effect: '',
});

/**
 * スキルの置き場を決め、見出しの名前と、その中の項目の名前の並びに直す。
 *
 * @param skills スキル（シートの順）
 * @returns 見出しごとの、見出しの名前と項目の名前の並び
 */
const placed = (...skills: Ar2eSkill[]) =>
  placeSkills(skills).map((heading) => [heading.name, heading.skills.map((one) => one.itemName)]);

describe('決まった項目の名前（仕様書「判定の欄」「戦闘の欄」「能動判定の見出しのかたまり」）', () => {
  it('判定の欄の項目の名前は、ゆとシートの自動パレットの変数名', () => {
    expect(checkFieldNames(ar2eCheckOf('str'))).toEqual({ dice: '筋力判定ダイス', modifier: '筋力判定' });
    expect(checkFieldNames(ar2eCheckOf('trapDetect'))).toEqual({
      dice: 'トラップ探知ダイス',
      modifier: 'トラップ探知',
    });
    expect(checkFieldNames(ar2eCheckOf('magic'))).toEqual({ dice: '魔術判定ダイス', modifier: '魔術判定' });
  });

  it('命中と攻撃力の項目の名前は、行の手ごと', () => {
    expect(handFieldNames('right')).toEqual({ accuracy: '右手命中', attack: '右手攻撃力' });
    expect(handFieldNames('left')).toEqual({ accuracy: '左手命中', attack: '左手攻撃力' });
    expect(handFieldNames('total')).toEqual({ accuracy: '命中', attack: '攻撃力' });
  });
});

describe('スキルのタイミングの見出し', () => {
  it('見出しの並びは、決まったタイミング（その順）→「―」などの書き方 → それ以外（出てきた順）', () => {
    const headings = placed(
      skill('A', '自由1'),
      skill('B', 'メジャー'),
      skill('C', '―'),
      skill('D', 'パッシブ／メイキング'),
      skill('E', '自由2'),
      skill('F', '')
    ).map(([heading]) => heading);
    expect(headings).toEqual(['パッシブ', 'メジャー', '効果参照', '―', '自由1', '自由2']);
  });

  it('決まったタイミングの見出しは、シートの順に関わらず、決まったタイミングの並び（19 個すべて）', () => {
    const reversed = [...AR2E_TIMINGS].reverse().map((timing, index) => skill(`S${index}`, timing));
    expect(placed(...reversed).map(([heading]) => heading)).toEqual([...AR2E_TIMINGS]);
  });

  it('見出しの中のスキルは、シートの順', () => {
    expect(placed(skill('B', 'メジャー'), skill('A', 'メジャー'))).toEqual([['メジャー', ['B', 'A']]]);
  });

  it('書かれたままのタイミングは、参照で読める名前に直し、直した名前が同じなら 1 つにまとめる', () => {
    expect(placed(skill('A', 'Ｘタイミング'), skill('B', 'Xタイミング'))).toEqual([['Xタイミング', ['A', 'B']]]);
  });
});

describe('シートのデータから作る名前', () => {
  it('全角の英数字と記号だけを半角にする', () => {
    expect(placed(skill('トレーニング：精神', 'パッシブ'))).toEqual([['パッシブ', ['トレーニング:精神']]]);
  });

  it('ほかは直さない。変な名前も書かれたまま', () => {
    expect(placed(skill('《カバーリング》', 'リアクション'))).toEqual([['リアクション', ['《カバーリング》']]]);
    expect(placed(skill('{秘技}^', 'メジャー'), skill('^', 'メジャー'), skill('toString', 'メジャー'))).toEqual([
      ['メジャー', ['{秘技}^', '^', 'toString']],
    ]);
  });
});

describe('重なった名前', () => {
  it('同じ見出しの中の同じ名前のスキルも、名前を変えない', () => {
    expect(placed(skill('ヒール', 'メジャー'), skill('ヒール', 'メジャー'))).toEqual([
      ['メジャー', ['ヒール', 'ヒール']],
    ]);
  });

  it('決まった項目の名前と同じ名前も、変えない（スキル、タイミングの見出し、誓約、コネクション）', () => {
    expect(placed(skill('命中', 'パッシブ'), skill('X', 'HP'))).toEqual([
      ['パッシブ', ['命中']],
      ['HP', ['X']],
    ]);
    expect(['MP', 'ミナ', '目標値'].map(sheetGroupNameOf)).toEqual(['MP', 'ミナ', '目標値']);
  });
});
