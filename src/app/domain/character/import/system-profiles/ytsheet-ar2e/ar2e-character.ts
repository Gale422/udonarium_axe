/**
 * アリアンロッド2E のキャラクター。
 *
 * ルールの言葉で見たキャラクター。型だけを持つ。
 * ゆとシートの項目名と、アックスの欄の名前は持たない。文字は、ゆとシートの画面に表示されるとおりの文字で持つ。
 * 値がないときは null。
 */
import { Ar2eAbilityId, Ar2eCheckId } from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/ar2e-catalog';

export interface Ar2eCharacter {
  /** コマの名前 */
  readonly name: string;
  /** チャットの色（`#rgb` か `#rrggbb`）。ないときは空 */
  readonly color: string;
  readonly resources: Ar2eResources;
  readonly abilities: Readonly<Record<Ar2eAbilityId, Ar2eAbilityScore>>;
  readonly checks: Readonly<Record<Ar2eCheckId, Ar2eCheckScore>>;
  readonly battle: Ar2eBattle;
  readonly hands: Ar2eHands;
  readonly handedness: Ar2eHandedness;
  /** 名前のあるスキル。シートの順 */
  readonly skills: readonly Ar2eSkill[];
  /** 名前のある誓約。シートの順 */
  readonly geises: readonly Ar2eGeis[];
  /** 名前のあるコネクション。シートの順 */
  readonly connections: readonly Ar2eConnection[];
  readonly belongings: Ar2eBelongings;
  readonly profile: Ar2eProfile;
}

/** HP、MP、フェイト。どれも、取り込んだ時点の値（最大値と同じ） */
export interface Ar2eResources {
  readonly hp: number | null;
  readonly mp: number | null;
  readonly fate: number | null;
  readonly fateLimit: number | null;
}

/** 能力値 */
export interface Ar2eAbilityScore {
  /** 基本値 */
  readonly base: number | null;
  /** 能力値（ボーナス） */
  readonly bonus: number | null;
}

/** 判定の振り方 */
export interface Ar2eCheckScore {
  /** ダイス数 */
  readonly dice: number | null;
  /** 固定値 */
  readonly modifier: number | null;
}

/** 戦闘の値 */
export interface Ar2eBattle {
  readonly accuracy: Ar2eHandedScore;
  readonly attack: Ar2eHandedScore;
  readonly evasion: Ar2eCheckScore;
  readonly physicalDefense: number | null;
  readonly magicalDefense: number | null;
  readonly initiative: number | null;
  readonly movement: number | null;
}

/** 右手と左手で分かれる値（命中、攻撃力） */
export interface Ar2eHandedScore {
  readonly dice: number | null;
  /** 合計の値 */
  readonly total: number | null;
  readonly right: number | null;
  readonly left: number | null;
}

/** 右手と左手 */
export interface Ar2eHands {
  readonly right: Ar2eHand;
  readonly left: Ar2eHand;
}

/** 手。武器を持つか持たないかだけを表す（盾と空は、どの合計の仕方でも同じ扱いのため） */
export interface Ar2eHand {
  /** 持っている武器の名前。武器を持たない手は null */
  readonly weapon: string | null;
}

/**
 * 右手と左手の合計の仕方。
 *
 * - `separate`: 合計しない
 * - `both`: 両手を合計
 * - `accuracyOnly`: 命中のみ合計
 * - `all`: 全部表示
 */
export type Ar2eHandedness = 'separate' | 'both' | 'accuracyOnly' | 'all';

/** スキル */
export interface Ar2eSkill {
  readonly name: string;
  /** 取得元（ゆとシートの閲覧画面と同じ言葉） */
  readonly source: string;
  readonly category: string;
  readonly level: string;
  readonly timing: string;
  /** 判定 */
  readonly check: string;
  readonly target: string;
  readonly range: string;
  /** コストの文字 */
  readonly cost: string;
  /** コストの記録の値（HTML の書き方を戻す前）が整数のときの、その数 */
  readonly costPoints: number | null;
  /** 使用条件 */
  readonly requirement: string;
  /** 効果 */
  readonly effect: string;
}

/** 誓約 */
export interface Ar2eGeis {
  readonly name: string;
  /** 成長点 */
  readonly growth: number | null;
  /** 恩恵・束縛など */
  readonly note: string;
}

/** コネクション */
export interface Ar2eConnection {
  /** 相手の名前 */
  readonly name: string;
  readonly relation: string;
  readonly note: string;
}

/** 携行品 */
export interface Ar2eBelongings {
  readonly money: number | null;
  /** 携行品・所持品（書かれたまま） */
  readonly items: string;
}

/** プロフィール */
export interface Ar2eProfile {
  readonly player: string;
  /** CL */
  readonly level: number | null;
  readonly race: string;
  readonly gender: string;
  readonly age: string;
  readonly mainClass: string;
  readonly supportClass: string;
  readonly titleClass: string;
  readonly guild: string;
  /** 容姿・経歴・その他メモ（書かれたまま） */
  readonly note: string;
  /** シートのアドレス */
  readonly sheetUrl: string;
}
