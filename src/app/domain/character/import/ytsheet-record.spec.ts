// ゆとシートの記録の単体テスト。
// 項目名で、文字と数を取り出す処理を確かめる。
import { YtsheetRecord } from '@axe/domain/character/import/ytsheet-record';

describe('ゆとシートの記録（仕様書「ゆとシートの値の読み方」）', () => {
  it.each([
    ['架空の冒険者', '架空の冒険者'],
    [8, '8'],
    ['', ''],
    [undefined, ''],
  ])('値 %s を、文字「%s」として取り出す（数も文字にし、ないときは空）', (value, expected) => {
    expect(new YtsheetRecord({ key: value }).text('key')).toBe(expected);
  });

  it.each([
    ['7.5', 7.5],
    [8, 8],
    ['', null],
    ['1e+20', null],
    [undefined, null],
  ])('値 %s を、シートの値の読み方で数 %s として取り出す', (value, expected) => {
    expect(new YtsheetRecord({ key: value }).number('key')).toBe(expected);
  });

  it.each([
    ['4', 4],
    [4, 4],
    ['1.5', null],
    ['-', null],
    [undefined, null],
  ])('値 %s を、シートの値の読み方で整数 %s として取り出す', (value, expected) => {
    expect(new YtsheetRecord({ key: value }).integer('key')).toBe(expected);
  });
});
