// キャラクター保管所の記録の単体テスト。
// 項目名で、文字と数を取り出す処理と、表の列の何番目かの値を取り出す処理を確かめる。
import { CharasheetRecord } from '@axe/domain/character/import/charasheet-record';

describe('キャラクター保管所の記録（仕様書「キャラクター保管所の値の読み方」）', () => {
  it.each([
    ['架空の冒険者', '架空の冒険者'],
    [' 前後に空白 ', ' 前後に空白 '],
    ['容姿\r\n経歴', '容姿\r\n経歴'],
    [1234567, '1234567'],
    ['', ''],
    [undefined, ''],
    [['配列'], ''],
  ])('値 %j を、書かれたままの文字 %j として取り出す', (value, expected) => {
    expect(new CharasheetRecord({ key: value }).text('key')).toBe(expected);
  });

  it.each([
    ['7.5', 7.5],
    [8, 8],
    ['-1', -1],
    ['', null],
    ['３', null],
    [undefined, null],
  ])('値 %j を、シートの値の読み方で数 %j として取り出す', (value, expected) => {
    expect(new CharasheetRecord({ key: value }).number('key')).toBe(expected);
  });

  it.each([
    ['項目がない', undefined, true],
    ['null', null, true],
    ['空の文字', '', true],
    ['空白', ' ', false],
    ['数として読めない字', '３', false],
    ['0', '0', false],
    ['数の 0', 0, false],
  ])('値がないか: %s は %s', (_, value, expected) => {
    expect(new CharasheetRecord({ key: value }).isMissing('key')).toBe(expected);
  });

  it.each([
    ['配列', ['a', 'b', ''], 3],
    ['空の配列', [], 0],
    ['配列でない値', 'a', 0],
    ['ない', undefined, 0],
  ])('表の列の行の数: %s は %s 行', (_, column, expected) => {
    expect(new CharasheetRecord({ column }).rowCount('column')).toBe(expected);
  });

  it.each([
    [0, '剣'],
    [1, '3'],
    [2, ''],
    [3, ''],
  ])('表の列の %s 番目の値を、書かれたままの文字 %j として取り出す（その番目がなければ空）', (index, expected) => {
    expect(new CharasheetRecord({ column: ['剣', 3, ''] }).cellText('column', index)).toBe(expected);
  });

  it('表の列が配列でなければ、どの番目も空', () => {
    expect(new CharasheetRecord({ column: '剣' }).cellText('column', 0)).toBe('');
  });
});
