// シートの値の読み方の単体テスト。
// シートの 1 つの値を、10 進の数と整数として読む処理を確かめる。
import { readSheetInteger, readSheetNumber } from '@axe/domain/character/import/sheet-number';

describe('シートの値の読み方（仕様書「シートの数の読み方」）', () => {
  it.each([
    ['8', 8],
    [8, 8],
    ['7.5', 7.5],
    ['-3', -3],
    ['+3', 3],
    [' 4 ', 4],
    ['.5', 0.5],
    ['5.', 5],
    ['0', 0],
  ])('値 %s を、数 %s として読む（文字の数、小数、符号、前後の空白も読む）', (value, expected) => {
    expect(readSheetNumber(value)).toBe(expected);
  });

  it.each([
    ['ない', undefined],
    ['null の', null],
    ['空', ''],
    ['「なし」の書き方', '-'],
    ['数でない字', '架空の冒険者'],
    ['指数の書き方', '1e+20'],
    ['16 進の書き方', '0x4'],
    ['2 進の書き方', '0b11'],
    ['無限の書き方', 'Inf'],
    ['有限の数にならない文字', '9'.repeat(400)],
    ['有限でない数', Number.POSITIVE_INFINITY],
    ['全角の数字', '３'],
    ['数でも文字でもない', ['3']],
  ])('%s値は、数として読まず null', (_, value) => {
    expect(readSheetNumber(value)).toBeNull();
  });

  it.each([
    ['4', 4],
    [4, 4],
    ['0', 0],
    ['-2', -2],
    ['5.', 5],
    ['1.5', null],
    ['-', null],
    ['', null],
    ['３', null],
  ])('値 %j を、整数 %j として読む（10 進の数として読めて、整数のときだけ）', (value, expected) => {
    expect(readSheetInteger(value)).toBe(expected);
  });
});
