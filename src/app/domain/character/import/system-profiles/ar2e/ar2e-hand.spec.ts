// 手に持つものの見分けの単体テスト。
// 手に持つものの名前・種別・攻撃の値から、武器を持つ手かを決める処理を確かめる。
import { ar2eHandOf, Ar2eHeldItem } from '@axe/domain/character/import/system-profiles/ar2e/ar2e-hand';

/**
 * 手に持つものを作る。書かない値は、空か「なし」にする。
 *
 * @param item 名前・種別・攻撃の値の一部
 * @returns 手に持つもの
 */
const held = (item: Partial<Ar2eHeldItem>): Ar2eHeldItem => ({ name: '', type: '', attack: null, ...item });

describe('手に持つものの読み方（仕様書「手に持つものの読み方」「「なし」の書き方」）', () => {
  it.each([
    ['種別が盾でない字', held({ name: 'ロングソード', type: '片手剣', attack: 6 })],
    ['種別が盾でない字で、攻撃の値がない', held({ name: '試しの杖', type: '杖' })],
    ['種別が盾でない字で、攻撃の値が 0', held({ name: '試しの杖', type: '杖', attack: 0 })],
    ['種別が空で、攻撃の値が正の数', held({ name: '試しの拳', attack: 7 })],
    ['種別が空で、攻撃の値が負の数', held({ name: '試しの枝', attack: -1 })],
    ['種別が空で、攻撃の値が小数', held({ name: '試しの枝', attack: 0.5 })],
    ['種別が「―」で、攻撃の値が 0 でない数', held({ name: 'ナックル', type: '―', attack: 2 })],
    ['種別が「ー」で、攻撃の値が 0 でない数', held({ name: 'ナックル', type: 'ー', attack: 2 })],
    ['種別が「-」で、攻撃の値が 0 でない数', held({ name: 'ナックル', type: '-', attack: 2 })],
    ['名前が「盾」でも、種別が盾でない字', held({ name: '盾', type: '片手剣', attack: 3 })],
    ['種別が盾の前後に空白のある字', held({ name: 'バックラー', type: '盾 ', attack: 1 })],
  ])('武器を持つ手: %s', (_, item) => {
    expect(ar2eHandOf(item)).toEqual({ weapon: item.name });
  });

  it.each([
    ['何もない手', held({})],
    ['名前が空', held({ type: '片手剣', attack: 6 })],
    ['名前が「―」', held({ name: '―', type: '片手剣', attack: 6 })],
    ['名前が「ー」', held({ name: 'ー', type: '片手剣', attack: 6 })],
    ['名前が「-」', held({ name: '-', type: '片手剣', attack: 6 })],
    ['種別が盾', held({ name: 'バックラー', type: '盾', attack: 1 })],
    ['種別も攻撃の値もない', held({ name: '試しの盾' })],
    ['種別が空で、攻撃の値が 0', held({ name: 'お守り', attack: 0 })],
    ['種別が「―」で、攻撃の値がない', held({ name: 'お守り', type: '―' })],
  ])('武器を持たない手: %s', (_, item) => {
    expect(ar2eHandOf(item)).toEqual({ weapon: null });
  });
});
