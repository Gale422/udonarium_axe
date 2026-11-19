// ゆとシートの文字の単体テスト。
// データの文字を、ゆとシートの画面に表示されるとおりの文字に読む処理を確かめる。
import { readYtsheetText } from '@axe/domain/character/import/ytsheet-text';

describe('ゆとシートの文字の読み方', () => {
  it('HTML の書き方を戻し、改行の書き方を改行にする', () => {
    expect(readYtsheetText('A &amp; B&lt;br&gt;&quot;引用&quot; &lt;強&gt;', 'line')).toBe('A & B\n"引用" <強>');
  });

  it('ゆとシートと同じ順に戻すので、手で書いた「&lt;br&gt;」は改行に、「&lt;」は「<」になる', () => {
    expect(readYtsheetText('A&amp;lt;br&amp;gt;B', 'line')).toBe('A\nB');
    expect(readYtsheetText('&amp;lt;強&amp;gt;', 'line')).toBe('<強>');
  });

  it('番号の書き方は戻し、HTML だけの名前の書き方は書かれたまま残す', () => {
    expect(readYtsheetText('&amp;#9733;&amp;apos;&amp;hearts;', 'line')).toBe("★'&hearts;");
  });

  it('ゆとシートの書き方（リンク、ルビ、表、《》）は、書かれたまま残す', () => {
    expect(readYtsheetText('[[架空のギルド&gt;https://example.com/guild]]', 'line')).toBe(
      '[[架空のギルド>https://example.com/guild]]'
    );
    expect(readYtsheetText('[仲間#abc123]の仲間', 'line')).toBe('[仲間#abc123]の仲間');
    expect(readYtsheetText('我が|魔剣《まけん》と《ヒール》', 'line')).toBe('我が|魔剣《まけん》と《ヒール》');
    expect(readYtsheetText('|@[1]|試しの道具|道具|《テストスキル》|&lt;br&gt;続き', 'multiline')).toBe(
      '|@[1]|試しの道具|道具|《テストスキル》|\n続き'
    );
  });

  it('1 行の欄は、前後の半角の空白・タブ・改行の文字を除く。複数行の欄は除かない', () => {
    expect(readYtsheetText(' \t名前\r\n ', 'line')).toBe('名前');
    expect(readYtsheetText('  名前  ', 'multiline')).toBe('  名前  ');
  });

  it('アドレスの欄は、1 行の欄と同じく前後を除き、HTML の書き方は戻さない', () => {
    expect(readYtsheetText(' https://example.com/?a=1&amp;b=2\r\n', 'url')).toBe('https://example.com/?a=1&amp;b=2');
    expect(readYtsheetText('　https://example.com/', 'url')).toBe('　https://example.com/');
  });

  it('1 行の欄でも、全角の空白、改ページの文字、改行の書き方による前後の改行は、画面に表示されるので残す', () => {
    expect(readYtsheetText('　', 'line')).toBe('　');
    expect(readYtsheetText('　名前　', 'line')).toBe('　名前　');
    expect(readYtsheetText('\f名前\f', 'line')).toBe('\f名前\f');
    expect(readYtsheetText('&lt;br&gt;名前 ', 'line')).toBe('\n名前');
  });
});
