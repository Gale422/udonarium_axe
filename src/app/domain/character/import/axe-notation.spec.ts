// アックスの書き方の単体テスト。
// 参照で読める名前と、参照や操作の行の形を確かめる。
import {
  damageOverTimeDebuffCommand,
  debuffCommand,
  maxPathReferenceTo,
  paletteHeadingLine,
  pathReferenceTo,
  referableNameOf,
  referenceTo,
  removeBuffCommand,
  resourceCommand,
  skillMark,
  TARGET_NUMBER,
} from '@axe/domain/character/import/axe-notation';
import { readReferenceName } from '@axe/domain/chat/chat-reference';
import { DataElement } from '@axe/domain/data/data-element';

describe('アックスの参照で読める名前（仕様書「シートのデータから作る名前」）', () => {
  it('全角の英数字と記号を半角にする', () => {
    expect(referableNameOf('トレーニング：精神')).toBe('トレーニング:精神');
    expect(referableNameOf('ＤＲの直後')).toBe('DRの直後');
  });

  it('全角の名前を半角にすると、アックスの参照の名前の読み方で読んだ名前と同じになる', () => {
    const name = referableNameOf('トレーニング：精神');
    expect(readReferenceName('トレーニング：精神')).toEqual({ name, useMax: false });
  });

  it('ほかは直さない。変な名前も書かれたまま', () => {
    for (const name of ['{秘技}', ' 全力^ ', '^', '目標値', 'toString', '|魔剣《まけん》', 'A\nB']) {
      expect(referableNameOf(name), name).toBe(name);
    }
  });
});

describe('アックスの参照の形（仕様書「取り込んだコマのチャットパレット」「スキルの説明の行」）', () => {
  it('名前だけの参照、目標値の参照', () => {
    expect(referenceTo('HP')).toBe('{HP}');
    expect(TARGET_NUMBER).toBe('{目標値}');
  });

  it('見出しをたどる最大値の参照は、終わりに ^ を付け、アックスの読み方で最大値の印と道に戻る', () => {
    const reference = maxPathReferenceTo(['リソース', '基本', 'HP']);
    expect(reference).toBe('{リソース/基本/HP^}');
    expect(readReferenceName(reference.slice(1, -1))).toEqual({ name: 'リソース/基本/HP', useMax: true });
  });

  it('見出しをたどる参照は、名前の中の / と \\ を逃がし、アックスの読み方で元の名前に戻る', () => {
    const reference = pathReferenceTo(['スキル', 'メジャー', 'アタック/ブレイク\\改']);
    expect(reference).toBe('{スキル/メジャー/アタック\\/ブレイク\\\\改}');

    const root = DataElement.create('detail');
    const section = DataElement.create('スキル');
    const group = DataElement.create('メジャー');
    const field = DataElement.create('アタック/ブレイク\\改', 'x');
    root.appendChild(section);
    section.appendChild(group);
    group.appendChild(field);
    expect(DataElement.findElementByReference(root, reference.slice(1, -1))).toBe(field);
  });
});

describe('アックスのパレットの書き方（仕様書「取り込んだコマのチャットパレット」「アックスに載せる文字」「バッドステータスの行」）', () => {
  it('見出しの行', () => {
    expect(paletteHeadingLine('判定')).toBe('//--- 判定');
  });

  it('リソース操作には、いつも LZ を付ける', () => {
    expect(resourceCommand('MP', '-4')).toBe(':MP-4LZ');
  });

  it('名前の囲みは ≪≫', () => {
    expect(skillMark('ヒール')).toBe('≪ヒール≫');
  });

  it('バッドステータスのバフは、効果を空にし、デバフの区分を付ける', () => {
    expect(debuffCommand('放心', { rounds: 1, timing: 'ラウンド終了' })).toBe('&放心//1/ラウンド終了/デバフ');
    expect(debuffCommand('縛鎖', 'lasting')).toBe('&縛鎖//none/デバフ');
    expect(damageOverTimeDebuffCommand('毒', 'HP', '-(n*5)')).toBe('&!毒/:HP/+/0~-(n*5)/none/発生:ラウンド終了/デバフ');
    expect(removeBuffCommand('毒')).toBe('&毒-');
  });
});
