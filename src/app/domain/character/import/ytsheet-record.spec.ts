// ゆとシートの記録の単体テスト。
// 項目名で、文字、数、番号の付いた項目の番号を取り出す処理を確かめる。
import { YtsheetRecord } from '@axe/domain/character/import/ytsheet-record';

describe('ゆとシートの記録（仕様書「ゆとシートの値の読み方」）', () => {
  const record = new YtsheetRecord({
    name: '架空の冒険者',
    level: '8',
    move: 8,
    initiative: '7.5',
    cost: '-',
    blank: '',
    skillsNum: '3',
  });

  it('値を文字として取り出す。数も文字にする。ないときは空', () => {
    expect(record.text('name')).toBe('架空の冒険者');
    expect(record.text('move')).toBe('8');
    expect(record.text('missing')).toBe('');
  });

  it('値を数として取り出す。文字の数と小数も読む', () => {
    expect(record.number('level')).toBe(8);
    expect(record.number('move')).toBe(8);
    expect(record.number('initiative')).toBe(7.5);
  });

  it('ないときと、数として読めないときは null', () => {
    expect(record.number('missing')).toBeNull();
    expect(record.number('blank')).toBeNull();
    expect(record.number('cost')).toBeNull();
    expect(record.number('name')).toBeNull();
  });

  it('10 進の数でない書き方は、数として読まない', () => {
    const odd = new YtsheetRecord({ exponent: '1e1', hex: '0x4', binary: '0b11', infinite: 'Infinity', signed: '+3' });
    expect(['exponent', 'hex', 'binary', 'infinite'].map((key) => odd.number(key))).toEqual([null, null, null, null]);
    expect(odd.number('signed')).toBe(3);
  });

  it('番号の付いた項目のうち、記録にある番号を小さい順に取り出す', () => {
    const rows = new YtsheetRecord({
      skill10Name: 'a',
      skill2Name: 'b',
      skill2Note: 'c',
      skillNum: '3',
      skill0Name: 'd',
    });
    expect(rows.indexesOf('skill', 'Name')).toEqual([2n, 10n]);
  });

  it('桁の多い番号も、項目名に書かれた番号のまま、ずれずに取り出す', () => {
    const rows = new YtsheetRecord({ skill9007199254740993Name: 'a', skill9007199254740992Name: 'b' });
    expect(rows.indexesOf('skill', 'Name')).toEqual([9007199254740992n, 9007199254740993n]);
  });

  it('桁が多すぎて有限の数にならないものは、文字で書かれても数で書かれても null', () => {
    const huge = new YtsheetRecord({ text: '9'.repeat(400), number: Number.POSITIVE_INFINITY });
    expect(huge.number('text')).toBeNull();
    expect(huge.number('number')).toBeNull();
    expect(huge.firstWholeNumber('text', 'number')).toBeNull();
  });

  it('項目名を順に見て、最初に数として読めた値の整数の部分を取り出す', () => {
    expect(record.firstWholeNumber('skillNum', 'skillsNum')).toBe(3n);
    expect(record.firstWholeNumber('missing', 'blank', 'initiative')).toBe(7n);
    expect(record.firstWholeNumber('missing', 'blank')).toBeNull();
  });

  it('整数の部分は、桁の多い数も小数も負の数も、書かれた数字のとおりに作る', () => {
    const counts = new YtsheetRecord({
      huge: '9007199254740993',
      fraction: '+2.9',
      negative: '-1.5',
      small: '-.5',
      number: 4.7,
    });
    expect(counts.firstWholeNumber('huge')).toBe(9007199254740993n);
    expect(counts.firstWholeNumber('fraction')).toBe(2n);
    expect(counts.firstWholeNumber('negative')).toBe(-1n);
    expect(counts.firstWholeNumber('small')).toBe(0n);
    expect(counts.firstWholeNumber('number')).toBe(4n);
  });
});
