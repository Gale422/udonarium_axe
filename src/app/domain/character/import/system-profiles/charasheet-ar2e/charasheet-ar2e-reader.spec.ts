// キャラクター保管所の読み手の単体テスト。
// キャラクター保管所の記録を、ルールの言葉のアリアンロッド2E のキャラクターに読み替える処理を確かめる。
import {
  AR2E_ABILITIES,
  AR2E_SPECIAL_CHECKS,
  Ar2eAbilityId,
  Ar2eSpecialCheckId,
} from '@axe/domain/character/import/system-profiles/ar2e/ar2e-catalog';
import { Ar2eCharacter } from '@axe/domain/character/import/system-profiles/ar2e/ar2e-character';
import { SheetChange, withoutKeys, withValues } from '@axe/testing/ar2e/sheet-changes';
import {
  charasheetAr2eCharacterOf,
  charasheetWith,
  CONNECTION_TABLE_COLUMNS,
  ITEM_TABLE_COLUMNS,
  SkillColumn,
  withSingleSkill,
  withSkillTable,
  withTable,
} from '@axe/testing/charasheet-ar2e/charasheet-ar2e-fixtures';

/**
 * 架空のシートを変え、アリアンロッド2E のキャラクターに読む。
 *
 * @param changes 架空のシートを変える道具（かける順）
 * @returns アリアンロッド2E のキャラクター
 */
const read = (...changes: SheetChange[]) => charasheetAr2eCharacterOf(charasheetWith(...changes));

/** 能力値の識別子と、キャラクター保管所の能力値の番号 */
const ABILITY_NUMBERS: readonly (readonly [Ar2eAbilityId, number])[] = [
  ['str', 1],
  ['dex', 2],
  ['agi', 3],
  ['int', 4],
  ['sen', 5],
  ['mnd', 6],
  ['luk', 7],
];

/** 特殊な判定の識別子と、合計の項目名と、ダイス数の項目名と、元になる能力値の番号 */
const SPECIAL_CHECK_KEYS: readonly (readonly [Ar2eSpecialCheckId, string, string, number])[] = [
  ['trapDetect', 'THG1', 'dice_wanatanti', 5],
  ['trapRelease', 'THG2', 'dice_wanakaijo', 2],
  ['dangerDetect', 'THG3', 'dice_kanti', 5],
  ['enemyLore', 'THG4', 'dice_sikibetu', 4],
  ['appraisal', 'THG5', 'dice_kantei', 4],
  ['magic', 'THG6', 'dice_majutu', 4],
  ['song', 'THG7', 'dice_juka', 6],
  ['alchemy', 'THG8', 'dice_renkin', 2],
];

/** 仕様書「キャラクター保管所の値の読み替えの表」の、数で読む値の元のデータと、読んだ値の取り出し方（能力値と判定は別に確かめる） */
const NUMBER_KEYS: readonly (readonly [string, (character: Ar2eCharacter) => number | null])[] = [
  ['NP8', (character) => character.resources.hp],
  ['NP9', (character) => character.resources.mp],
  ['V_fate', (character) => character.resources.fate],
  ['dice_meichu', (character) => character.battle.accuracy.dice],
  ['BSUM1T', (character) => character.battle.accuracy.total],
  ['BSUM1R', (character) => character.battle.accuracy.right],
  ['BSUM1L', (character) => character.battle.accuracy.left],
  ['dice_attack', (character) => character.battle.attack.dice],
  ['BSUM2T', (character) => character.battle.attack.total],
  ['BSUM2R', (character) => character.battle.attack.right],
  ['BSUM2L', (character) => character.battle.attack.left],
  ['dice_kaihi', (character) => character.battle.evasion.dice],
  ['BSUM3', (character) => character.battle.evasion.modifier],
  ['BSUM4', (character) => character.battle.physicalDefense],
  ['BSUM5', (character) => character.battle.magicalDefense],
  ['BSUM6', (character) => character.battle.initiative],
  ['BSUM7', (character) => character.battle.movement],
  ['money', (character) => character.belongings.money],
  ['V_level', (character) => character.profile.level],
];

/** 仕様書「キャラクター保管所の値の読み替えの表」の、文字で読む値の元のデータと、読んだ値の取り出し方 */
const TEXT_KEYS: readonly (readonly [string, (character: Ar2eCharacter) => string])[] = [
  ['shuzoku', (character) => character.profile.race],
  ['sex', (character) => character.profile.gender],
  ['age', (character) => character.profile.age],
  ['main_class', (character) => character.profile.mainClass],
  ['support_class', (character) => character.profile.supportClass],
  ['pc_making_memo', (character) => character.profile.note],
];

/** 仕様書「キャラクター保管所の値の読み替えの表」の、項目がないので、いつも空かなしの値の取り出し方 */
const ALWAYS_EMPTY: readonly (readonly [string, (character: Ar2eCharacter) => unknown, unknown])[] = [
  ['誓約', (character) => character.geises, []],
  ['PL', (character) => character.profile.player, ''],
  ['称号クラス', (character) => character.profile.titleClass, ''],
  ['所属ギルド', (character) => character.profile.guild, ''],
];

describe('キャラクター保管所の値の読み替えの表', () => {
  it('表の全部の値を読む', () => {
    expect(NUMBER_KEYS).toHaveLength(19);
    expect(TEXT_KEYS).toHaveLength(6);
    expect(ALWAYS_EMPTY).toHaveLength(4);
  });

  it.each(NUMBER_KEYS)('%s を数として読む', (key, valueOf) => {
    expect(valueOf(read(withValues({ [key]: '123' })))).toBe(123);
  });

  it.each(NUMBER_KEYS)('%s が数として読めない字なら「なし」', (key, valueOf) => {
    expect(valueOf(read(withValues({ [key]: '３' })))).toBeNull();
  });

  it.each(NUMBER_KEYS)('%s がなければ「なし」', (key, valueOf) => {
    expect(valueOf(read(withoutKeys(key)))).toBeNull();
  });

  it.each(TEXT_KEYS)('%s を文字として読む', (key, valueOf) => {
    expect(valueOf(read(withValues({ [key]: '試しの値' })))).toBe('試しの値');
  });

  it.each(TEXT_KEYS)('%s がなければ空', (key, valueOf) => {
    expect(valueOf(read(withoutKeys(key), withValues({ manual_shuzoku: '' })))).toBe('');
  });

  it.each(ALWAYS_EMPTY)('%s は、項目がないので、いつも空', (_, valueOf, expected) => {
    expect(valueOf(read())).toEqual(expected);
  });

  it('能力値の表の全部の能力値を読む', () => {
    expect(ABILITY_NUMBERS.map(([id]) => id)).toEqual(AR2E_ABILITIES.map((ability) => ability.id));
  });

  it.each(ABILITY_NUMBERS)('%s の基本値は NK%s、能力値は NP の同じ番号', (id, number) => {
    const character = read(withValues({ [`NK${number}`]: '21', [`NP${number}`]: '7' }));
    expect(character.abilities[id]).toEqual({ base: 21, bonus: 7 });
  });

  it.each(ABILITY_NUMBERS)('%s の基本値と能力値は、なければ「なし」、数として読めない字なら「なし」', (id, number) => {
    const missing = read(withoutKeys(`NK${number}`, `NP${number}`)).abilities[id];
    const unreadable = read(withValues({ [`NK${number}`]: '３', [`NP${number}`]: '-' })).abilities[id];
    expect([missing, unreadable]).toEqual([
      { base: null, bonus: null },
      { base: null, bonus: null },
    ]);
  });

  it('特殊な判定の表の全部の判定を読む', () => {
    expect(SPECIAL_CHECK_KEYS.map(([id]) => id)).toEqual(AR2E_SPECIAL_CHECKS.map((check) => check.id));
  });

  it.each(SPECIAL_CHECK_KEYS)('%s の固定値は %s、ダイス数は %s', (id, totalKey, diceKey) => {
    const character = read(withValues({ [totalKey]: '-2', [diceKey]: '3' }));
    expect(character.checks[id]).toEqual({ dice: 3, modifier: -2 });
  });

  it.each([
    ['右手', 'IR', 'BIR2', (character: Ar2eCharacter) => character.hands.right.weapon],
    ['左手', 'IL', 'BIL2', (character: Ar2eCharacter) => character.hands.left.weapon],
  ] as const)('%s の名前、種別、攻撃の値を、手に持つものの見分けに渡す', (_, part, attackKey, weaponOf) => {
    const typed = read(withValues({ [`${part}_name`]: '試しの斧', [`${part}_type`]: '斧', [attackKey]: '' }));
    const untyped = read(withValues({ [`${part}_name`]: '試しの拳', [`${part}_type`]: '', [attackKey]: '3' }));
    const shield = read(withValues({ [`${part}_name`]: '試しの盾', [`${part}_type`]: '盾', [attackKey]: '1' }));
    const nameless = read(withoutKeys(`${part}_name`, `${part}_type`, attackKey));
    expect([weaponOf(typed), weaponOf(untyped), weaponOf(shield), weaponOf(nameless)]).toEqual([
      '試しの斧',
      '試しの拳',
      null,
      null,
    ]);
  });

  it.each([
    ['データの番号', 1234567, 'https://charasheet.vampire-blood.net/1234567'],
    ['文字の番号', '7654321', 'https://charasheet.vampire-blood.net/7654321'],
    ['空', '', ''],
  ])('参照元: %s %j は %j', (_, id, expected) => {
    expect(read(withValues({ data_id: id })).profile.sheetUrl).toBe(expected);
  });

  it('参照元: 番号がなければ空', () => {
    expect(read(withoutKeys('data_id')).profile.sheetUrl).toBe('');
  });

  it.each([
    ['ある', [withValues({ shuzoku: 'ヒューリン', manual_shuzoku: 'エルフ' })], 'ヒューリン'],
    ['空', [withValues({ shuzoku: '', manual_shuzoku: 'エルフ' })], 'エルフ'],
    ['ない', [withoutKeys('shuzoku'), withValues({ manual_shuzoku: 'エルフ' })], 'エルフ'],
  ] as const)('種族: パーソナルデータの種族が%sとき「%s」', (_, changes, expected) => {
    expect(read(...changes).profile.race).toBe(expected);
  });
});

describe('キャラクター保管所の値の読み方', () => {
  it.each([
    ['前後の半角の空白', ' 試しの剣 '],
    ['前後の全角の空白', '　試しの剣　'],
    ['HTML の書き方に見える字', 'A&amp;B<br>'],
    ['作者が書いた参照', '{筋力}'],
  ])('文字は書かれたまま読む: %s', (_, value) => {
    expect(read(withValues({ main_class: value })).profile.mainClass).toBe(value);
  });

  it('複数行の欄の改行（CRLF）も、そのまま読む', () => {
    expect(read().profile.note).toBe('容姿\r\n経歴');
  });
});

describe('キャラクター保管所のコマの名前と色の読み方', () => {
  it.each([
    ['キャラクター名がある', [], '架空の冒険者'],
    ['キャラクター名が空', [withValues({ pc_name: '' })], '架空の題名'],
    ['キャラクター名がない', [withoutKeys('pc_name')], '架空の題名'],
    ['キャラクター名が空白', [withValues({ pc_name: ' ' })], ' '],
  ] as const)('名前: %s とき「%s」', (_, changes, expected) => {
    expect(read(...changes).name).toBe(expected);
  });

  it('色は、項目がないので、いつも空', () => {
    expect(read(withValues({ color: '#336699' })).color).toBe('');
  });
});

describe('キャラクター保管所にない値の補い', () => {
  it.each(ABILITY_NUMBERS)('%s の判定は、ダイス数が 2、固定値が能力値（NP%s）', (id, number) => {
    expect(read(withValues({ [`NP${number}`]: '7' })).checks[id]).toEqual({ dice: 2, modifier: 7 });
  });

  it.each(SPECIAL_CHECK_KEYS)(
    '%s は、合計（%s）とダイス数（%s）がなければ、ダイス数が 2、固定値が元の能力値（NP%s）',
    (id, totalKey, diceKey, abilityNumber) => {
      const missing = read(withoutKeys(totalKey, diceKey), withValues({ [`NP${abilityNumber}`]: '7' }));
      const empty = read(withValues({ [totalKey]: '', [diceKey]: '', [`NP${abilityNumber}`]: '7' }));
      expect([missing.checks[id], empty.checks[id]]).toEqual([
        { dice: 2, modifier: 7 },
        { dice: 2, modifier: 7 },
      ]);
    }
  );

  it.each([
    ['合計だけない', ['THG6'], { dice: 3, modifier: 2 }],
    ['ダイス数だけない', ['dice_majutu'], { dice: 2, modifier: 5 }],
  ] as const)('特殊な判定の合計とダイス数は、別々に補う: %s', (_, missingKeys, expected) => {
    const character = read(withValues({ THG6: '5', dice_majutu: '3', NP4: '2' }), withoutKeys(...missingKeys));
    expect(character.checks.magic).toEqual(expected);
  });

  it('数として読めない字は、ない値として補わず、「なし」にする', () => {
    const character = read(withValues({ THG6: '３', dice_majutu: '３' }));
    expect(character.checks.magic).toEqual({ dice: null, modifier: null });
  });

  it.each([
    ['7', 7],
    ['0', 0],
    ['', null],
  ])('フェイト使用上限は、幸運の能力値（NP7 が %j なら %j）', (luck, expected) => {
    expect(read(withValues({ NP7: luck })).resources.fateLimit).toBe(expected);
  });
});

describe('キャラクター保管所の右手と左手の合計の仕方', () => {
  it.each([
    ['5', 'all'],
    ['0', 'all'],
    ['-1', 'all'],
    ['', 'separate'],
    ['３', 'separate'],
  ])('命中の合計が %j なら %s', (total, expected) => {
    expect(read(withValues({ BSUM1T: total })).handedness).toBe(expected);
  });

  it('命中の合計がなければ「合計しない」', () => {
    expect(read(withoutKeys('BSUM1T')).handedness).toBe('separate');
  });
});

describe('キャラクター保管所のスキルの読み方', () => {
  /** スキルの表の列と、読んだスキルの値の名前 */
  const COLUMNS: readonly (readonly [SkillColumn, string])[] = [
    ['name', 'name'],
    ['lv', 'level'],
    ['timing', 'timing'],
    ['hantei', 'check'],
    ['taisho', 'target'],
    ['range', 'range'],
    ['cost', 'cost'],
    ['page', 'requirement'],
    ['memo', 'effect'],
    ['shozoku', 'source'],
  ];

  it('表の全部の列を読む', () => {
    expect(COLUMNS).toHaveLength(10);
  });

  it.each(COLUMNS)('スキルの表の %s を、書かれたまま %s に読む', (column, name) => {
    const skill = read(withSkillTable('skill', { name: '試しのスキル', [column]: ' パッシヴ ' })).skills[0];
    expect(skill[name as keyof typeof skill]).toBe(' パッシヴ ');
  });

  it.each(COLUMNS.filter(([column]) => column !== 'lv'))(
    '種族スキルの %s を、書かれたまま %s に読む',
    (column, name) => {
      const skill = read(withSingleSkill('shuzoku_skill', { name: '試しのスキル', [column]: 'DR直前' })).skills[0];
      expect(skill[name as keyof typeof skill]).toBe('DR直前');
    }
  );

  it.each([
    ['種族スキルの Lv は、列がないので空', withSingleSkill('shuzoku_skill', { name: 'A', lv: '3' }), ''],
    ['最初のメインクラスのスキルの Lv は V_mcls_skill_lv', withSingleSkill('m_cls_skill', { name: 'A', lv: '★' }), '★'],
    ['一般スキルの Lv は ippanskill_lv', withSkillTable('ippanskill', { name: 'A', lv: '★' }), '★'],
  ])('%s', (_, change, expected) => {
    const skills = read(withSkillTable('skill'), change).skills;
    expect(skills.map((skill) => skill.level)).toEqual([expected]);
  });

  it('分類は、列がないので空', () => {
    expect(read().skills.map((skill) => skill.category)).toEqual(['', '', '', '', '', '']);
  });

  it('4 つの表を、作成画面の順（種族スキル、最初のメインクラスのスキル、スキル、一般スキル）に読み、名前のない行は読まない', () => {
    const character = read(
      withSkillTable('ippanskill', { name: '一般1' }, { memo: '名前なし' }, { name: '一般2' }),
      withSkillTable('skill', { name: 'スキル1' }, { name: '' }, { name: 'スキル2' }),
      withSingleSkill('m_cls_skill', { name: '最初のスキル' }),
      withSingleSkill('shuzoku_skill', { name: '種族スキル' })
    );
    expect(character.skills.map((skill) => skill.name)).toEqual([
      '種族スキル',
      '最初のスキル',
      'スキル1',
      'スキル2',
      '一般1',
      '一般2',
    ]);
  });

  it('名前のない 1 行だけの表は読まない', () => {
    const character = read(withSingleSkill('shuzoku_skill', { timing: 'パッシヴ' }), withoutKeys('m_cls_skill_name'));
    expect(character.skills).toHaveLength(6);
  });

  it.each([
    ['4', 4],
    ['0', 0],
    ['-', null],
    ['', null],
    ['1.5', null],
    ['３', null],
    ['2(3)', null],
  ] as const)('コストの文字「%s」のコストの数は %s（整数のときだけ）', (cost, expected) => {
    expect(read(withSkillTable('skill', { name: 'A', cost })).skills[0].costPoints).toBe(expected);
  });
});

describe('キャラクター保管所の所持品の読み方', () => {
  it.each([
    ['全部の項目がある', [['薬', '1', '30', 'HPを回復']], '薬[重量:1][価格:30][効果・備考など:HPを回復]'],
    ['空の項目は省く', [['薬', '', '30', '']], '薬[価格:30]'],
    ['名前だけ', [['薬', '', '', '']], '薬'],
    [
      '名前のない行は読まない',
      [
        ['', '1', '30', 'メモ'],
        ['ロープ', '', '', ''],
      ],
      'ロープ',
    ],
    [
      '行ごとに改行でつなぐ',
      [
        ['薬', '1', '', ''],
        ['└中身', '', '', ''],
      ],
      '薬[重量:1]\n└中身',
    ],
    ['書かれたまま', [['　ランタン', ' 2 ', '', '']], '　ランタン[重量: 2 ]'],
    ['行がない', [], ''],
  ] as const)('%s', (_, rows, expected) => {
    expect(read(withTable(ITEM_TABLE_COLUMNS, rows)).belongings.items).toBe(expected);
  });

  it('所持品の表がなければ空', () => {
    expect(read(withoutKeys(...ITEM_TABLE_COLUMNS)).belongings.items).toBe('');
  });
});

describe('キャラクター保管所のコネクションの読み方（仕様書「キャラクター保管所の値の読み替えの表」）', () => {
  it('名前のある行だけを、名前と関係として読み、備考は空', () => {
    const character = read(
      withTable(CONNECTION_TABLE_COLUMNS, [
        ['ミナ', '友人'],
        ['', '名前なし'],
        ['ロウ', ''],
      ])
    );
    expect(character.connections).toEqual([
      { name: 'ミナ', relation: '友人', note: '' },
      { name: 'ロウ', relation: '', note: '' },
    ]);
  });
});
