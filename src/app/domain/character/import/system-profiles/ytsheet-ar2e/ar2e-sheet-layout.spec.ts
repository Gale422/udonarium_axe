// 欄の案の単体テスト。
// キャラクターとスキルの置き場から並べた、コマの見出し・項目・設定を確かめる。
import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  layoutAr2eSheet,
  skillDescriptionOf,
} from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/ar2e-sheet-layout';
import { placeSkills } from '@axe/domain/character/import/system-profiles/ytsheet-ar2e/reference-names';
import {
  ar2eCharacterOf,
  SheetChange,
  sheetWith,
  withoutKeys,
  withRows,
  withSkills,
} from '@axe/testing/ytsheet-ar2e/ytsheet-ar2e-fixtures';

/**
 * 架空のシートを変え、コマの欄を並べる。
 *
 * @param changes 架空のシートを変える道具（かける順）
 * @returns 取り込みの中間の形の欄の並び
 */
const layout = (...changes: SheetChange[]): ImportedSection[] => {
  const character = ar2eCharacterOf(sheetWith(...changes));
  return layoutAr2eSheet(character, placeSkills(character.skills));
};

/**
 * 欄の並びから、名前で欄を探す。
 *
 * @param sections 欄の並び
 * @param label 欄の名前
 * @returns 見つかった欄
 * @throws {Error} その名前の欄がないとき
 */
const sectionOf = (sections: ImportedSection[], label: string): ImportedSection => {
  const found = sections.find((section) => section.label === label);
  if (!found) throw new Error(`欄がない: ${label}`);
  return found;
};

/**
 * 欄の中の見出しの項目を取り出す。
 *
 * @param sections 欄の並び
 * @param label 欄の名前
 * @param group 中の見出しの名前
 * @returns 中の見出しの項目
 * @throws {Error} 欄か、中の見出しがないとき
 */
const fieldsOf = (sections: ImportedSection[], label: string, group = '基本') => {
  const found = sectionOf(sections, label).groups.find((one) => one.label === group);
  if (!found) throw new Error(`中の見出しがない: ${label}/${group}`);
  return found.fields;
};

describe('取り込んだコマの欄', () => {
  it('欄の並び。誓約とコネクションは、シートにあるときだけ作る', () => {
    expect(layout().map((section) => section.label)).toEqual([
      'リソース',
      '能力値',
      '判定',
      '戦闘',
      'スキル',
      '携行品・所持品',
      'プロフィール',
    ]);
    const withAll = layout(
      withRows('geis', 'geisNum', [{ Name: '清貧', Cost: '5' }]),
      withRows('connection', 'connectionNum', [{ Name: 'ミナ' }])
    );
    expect(withAll.map((section) => section.label)).toEqual([
      'リソース',
      '能力値',
      '判定',
      '戦闘',
      'スキル',
      '携行品・所持品',
      '誓約',
      'コネクション',
      'プロフィール',
    ]);
  });

  it('スキルが 1 つもなければ、スキルの欄を作らない', () => {
    expect(layout(withSkills()).map((section) => section.label)).not.toContain('スキル');
  });

  it('決まった項目は、値がなくても作る（値は空）', () => {
    const profile = fieldsOf(layout(withoutKeys('classTitle', 'guildName', 'level')), 'プロフィール');
    expect(profile.find((field) => field.label === '称号クラス')!.value).toBe('');
    expect(profile.find((field) => field.label === '所属ギルド')!.value).toBe('');
    expect(profile.find((field) => field.label === 'CL')!.value).toBe('');
  });
});

describe('リソースの欄と欄の項目の設定（仕様書「リソースの欄」「欄の項目の設定」）', () => {
  it('HP、MP、フェイトは、現在値（項目の値）と最大値に同じ値のリソース。ほかは数値', () => {
    expect(fieldsOf(layout(), 'リソース')).toEqual([
      { label: 'HP', kind: 'number', value: 60, resource: { max: 60 }, settings: { min: 0, changeEffect: true } },
      { label: 'MP', kind: 'number', value: 40, resource: { max: 40 }, settings: { min: 0, changeEffect: true } },
      { label: 'フェイト', kind: 'number', value: 4, resource: { max: 4 }, settings: { min: 0 } },
      { label: 'フェイト使用上限', kind: 'number', value: 3, settings: { min: 0 } },
      { label: '行動値', kind: 'number', value: 7 },
      { label: '移動力', kind: 'number', value: 9, settings: { unit: 'm', min: 0 } },
      { label: '物理防御力', kind: 'number', value: 8, settings: { min: 0 } },
      { label: '魔法防御力', kind: 'number', value: 6, settings: { min: 0 } },
    ]);
  });

  it('リソースの欄の中の見出し「基本」だけに、ポップアップ表示を付ける', () => {
    const sections = layout();
    expect(sectionOf(sections, 'リソース').groups[0].settings).toEqual({ popup: true });
    expect(sectionOf(sections, '戦闘').groups[0].settings).toBeUndefined();
  });
});

describe('能力値の欄', () => {
  it('能力値ごとに、基本値、能力値の順', () => {
    expect(fieldsOf(layout(), '能力値').slice(0, 4)).toEqual([
      { label: '筋力基本値', kind: 'number', value: 12 },
      { label: '筋力', kind: 'number', value: 4 },
      { label: '器用基本値', kind: 'number', value: 10 },
      { label: '器用', kind: 'number', value: 3 },
    ]);
  });
});

describe('判定の欄', () => {
  it('判定ごとに、ダイス数（単位 D）、固定値の順', () => {
    const sections = layout();
    expect(fieldsOf(sections, '判定', '能力値判定').slice(0, 2)).toEqual([
      { label: '筋力判定ダイス', kind: 'number', value: 2, settings: { unit: 'D' } },
      { label: '筋力判定', kind: 'number', value: 4 },
    ]);
    expect(fieldsOf(sections, '判定', '特殊な判定').map((field) => field.label)).toEqual([
      'トラップ探知ダイス',
      'トラップ探知',
      'トラップ解除ダイス',
      'トラップ解除',
      '危険感知ダイス',
      '危険感知',
      'エネミー識別ダイス',
      'エネミー識別',
      'アイテム鑑定ダイス',
      'アイテム鑑定',
      '魔術判定ダイス',
      '魔術判定',
      '呪歌判定ダイス',
      '呪歌判定',
      '錬金術判定ダイス',
      '錬金術判定',
    ]);
  });
});

describe('戦闘の欄', () => {
  it('命中、攻撃力、回避のダイス数と値、右手と左手の値', () => {
    expect(fieldsOf(layout(), '戦闘').map((field) => [field.label, field.value])).toEqual([
      ['命中ダイス', 2],
      ['命中', 5],
      ['攻撃ダイス', 2],
      ['攻撃力', 9],
      ['回避ダイス', 2],
      ['回避', 4],
      ['右手命中', 5],
      ['右手攻撃力', 9],
      ['左手命中', 3],
      ['左手攻撃力', 4],
    ]);
  });
});

describe('スキルの欄', () => {
  it('中の見出しはタイミングの見出し、項目はスキルごとの長文', () => {
    const skills = sectionOf(layout(), 'スキル');
    expect(skills.groups.map((group) => group.label)).toEqual([
      'パッシブ',
      'セットアップ',
      'メジャー',
      'DRの直後',
      'アイテム',
    ]);
    expect(skills.groups[0].fields[0]).toEqual({
      label: 'トレーニング:筋力',
      kind: 'note',
      value:
        '≪トレーニング：筋力≫[取得元:一般]\n[Lv:1][タイミング:パッシブ][判定:―]\n[対象:自身][射程:―]\n[コスト:―][使用条件:―]\n[効果]:【筋力基本値】に+1する（架空の効果）。',
    });
  });
});

describe('スキルの説明', () => {
  /**
   * スキルを 1 つだけにした架空のシートを読み、そのスキルの説明の文を作る。
   *
   * @param row スキルの行（`Name` などの項目名と値）
   * @returns スキルの説明の文
   */
  const descriptionOf = (row: Record<string, string>) => {
    const character = ar2eCharacterOf(sheetWith(withSkills(row)));
    return skillDescriptionOf(character.skills[0]);
  };

  it('ゆとシートのスキルの表と同じ並びと言葉', () => {
    expect(
      descriptionOf({
        Name: 'ヒール',
        Type: 'アコライト',
        Category: '魔術',
        Lv: '1',
        Timing: 'メジャー',
        Roll: '魔術判定',
        Target: '単体',
        Range: '20m',
        Cost: '4',
        Reqd: '―',
        Note: '《ヒール》を使う',
      })
    ).toBe(
      '≪ヒール≫[取得元:アコライト][分類:魔術]\n[Lv:1][タイミング:メジャー][判定:魔術判定]\n[対象:単体][射程:20m]\n[コスト:4][使用条件:―]\n[効果]:《ヒール》を使う'
    );
  });

  it('空の項目と、中身が全部空の行は省く。コストが 0 か空なら「―」', () => {
    expect(descriptionOf({ Name: 'ガード', Cost: '0' })).toBe('≪ガード≫\n[コスト:―]');
    expect(descriptionOf({ Name: 'ガード' })).toBe('≪ガード≫\n[コスト:―]');
    expect(descriptionOf({ Name: 'ガード', Cost: '-' })).toBe('≪ガード≫\n[コスト:-]');
  });
});

describe('携行品・所持品、誓約、コネクション、プロフィールの欄（仕様書「携行品・所持品の欄」「誓約の欄」「コネクションの欄」「プロフィールの欄」）', () => {
  it('所持金（単位 G、最小値 0）と、携行品・所持品の内容（長文）', () => {
    const fields = fieldsOf(layout(), '携行品・所持品');
    expect(fields[0]).toEqual({ label: '所持金', kind: 'number', value: 1000, settings: { unit: 'G', min: 0 } });
    expect(fields[1].kind).toBe('note');
  });

  it('誓約は成長点と恩恵・束縛など、コネクションは関係と備考', () => {
    const sections = layout(
      withRows('geis', 'geisNum', [{ Name: '清貧', Cost: '5', Note: '所持金を持たない' }]),
      withRows('connection', 'connectionNum', [{ Name: 'ミナ', Relation: '友人' }])
    );
    expect(fieldsOf(sections, '誓約', '清貧')).toEqual([
      { label: '成長点', kind: 'number', value: 5 },
      { label: '恩恵・束縛など', kind: 'note', value: '所持金を持たない' },
    ]);
    expect(fieldsOf(sections, 'コネクション', 'ミナ')).toEqual([
      { label: '関係', kind: 'text', value: '友人' },
      { label: '備考', kind: 'text', value: '' },
    ]);
  });

  it('プロフィールの並びと種類', () => {
    expect(fieldsOf(layout(), 'プロフィール').map((field) => [field.label, field.kind])).toEqual([
      ['PL', 'text'],
      ['CL', 'number'],
      ['種族', 'text'],
      ['性別', 'text'],
      ['年齢', 'text'],
      ['メインクラス', 'text'],
      ['サポートクラス', 'text'],
      ['称号クラス', 'text'],
      ['所属ギルド', 'text'],
      ['容姿・経歴・その他メモ', 'note'],
      ['参照元', 'note'],
    ]);
  });
});
