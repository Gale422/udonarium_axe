// ゆとシートの記録の単体テスト。
// 項目名で、文字と数を取り出す処理を確かめる。
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
    const odd = new YtsheetRecord({ exponent: '1e+20', hex: '0x4', binary: '0b11', infinite: 'Inf', signed: '+3' });
    expect(['exponent', 'hex', 'binary', 'infinite'].map((key) => odd.number(key))).toEqual([null, null, null, null]);
    expect(odd.number('signed')).toBe(3);
  });

  it('有限の数にならないものは、文字で書かれても数で書かれても null', () => {
    const huge = new YtsheetRecord({ text: '9'.repeat(400), number: Number.POSITIVE_INFINITY });
    expect(huge.number('text')).toBeNull();
    expect(huge.number('number')).toBeNull();
  });
});
