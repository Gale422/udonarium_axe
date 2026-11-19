/**
 * 取り込みの中間の形を広げる型。
 *
 * 項目をリソースの欄にするための最大値と、項目と見出しに付けるアックスの欄の設定を、中間の形の項目と見出しに足す。
 */

/** 項目に付ける、アックスの欄の設定。書いたものだけが属性になり、書かないものはアックスの既定のまま */
export interface ImportedFieldSettings {
  /** 単位（例: `m`、`D`、`G`） */
  unit?: string;
  /** 最小値。リソースの項目では、下限のベースとして書く */
  min?: number;
  /** 増減したときに、エフェクトを出すか */
  changeEffect?: boolean;
}

/** 項目をリソースの欄にするときの、リソースの値。項目の値が現在値になる */
export interface ImportedResource {
  /** 最大値。ないときは null */
  max: number | null;
}

/** 中の見出しに付ける、アックスの見出しの設定。書いたものだけが属性になる */
export interface ImportedGroupSettings {
  /** コマにマウスを乗せたときのカードに、見出しごと出すか */
  popup?: boolean;
}

// 項目と中の見出しに、リソースの値と設定を足す。フォーク元のファイルを書き換えずに済むように、ここで型を広げる
declare module '@axe/domain/character/import/imported-character' {
  interface ImportedField {
    /** 項目をリソースの欄にするときの、リソースの値。ないときは、種類どおりの欄になる */
    resource?: ImportedResource;
    /** 項目に付ける、アックスの欄の設定 */
    settings?: ImportedFieldSettings;
  }

  interface ImportedGroup {
    /** 中の見出しに付ける、アックスの見出しの設定 */
    settings?: ImportedGroupSettings;
  }
}
