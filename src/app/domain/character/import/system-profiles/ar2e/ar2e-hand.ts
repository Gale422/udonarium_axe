/**
 * 手に持つものの見分け。
 *
 * 手に持つものの名前・種別・攻撃の値から、武器を持つ手かを決める。どのサイトの読み手も使う。
 * サイトの項目名は持たない。
 */
import { AR2E_NONE_MARKS } from '@axe/domain/character/import/system-profiles/ar2e/ar2e-catalog';
import { Ar2eHand } from '@axe/domain/character/import/system-profiles/ar2e/ar2e-character';

/** 手に持つもの。文字は、サイトの画面に表示されるとおりの文字 */
export interface Ar2eHeldItem {
  readonly name: string;
  readonly type: string;
  /** 攻撃の値。数として読めないときは null */
  readonly attack: number | null;
}

/** 盾の種別 */
const SHIELD_TYPE = '盾';

/**
 * 手に持つものの名前か種別が、何も書かれていないかを見る。
 *
 * @param text 手に持つものの名前か種別
 * @returns 空か「なし」の書き方なら true
 */
const isBlank = (text: string): boolean => text === '' || AR2E_NONE_MARKS.has(text);

/**
 * 手に持つものが武器かを見分け、手にする。
 *
 * 名前が空か「なし」の書き方のものと、種別が盾のものは、武器でない。種別が書かれていれば、武器。
 * 種別が空か「なし」の書き方なら、攻撃の値が 0 でない数のときだけ、武器。
 *
 * @param item 手に持つもの
 * @returns 手。武器を持つなら、その名前
 */
export function ar2eHandOf(item: Ar2eHeldItem): Ar2eHand {
  if (isBlank(item.name)) return { weapon: null };
  if (item.type === SHIELD_TYPE) return { weapon: null };
  if (!isBlank(item.type)) return { weapon: item.name };
  // 種別を空欄にした武器を持つ人が多いので、攻撃の値でも見分ける
  return { weapon: item.attack != null && item.attack !== 0 ? item.name : null };
}
