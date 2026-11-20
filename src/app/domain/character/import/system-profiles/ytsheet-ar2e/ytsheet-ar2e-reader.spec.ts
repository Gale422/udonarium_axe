// ゆとシートの読み手の単体テスト。
// ゆとシートの記録を、ルールの言葉のアリアンロッド2E のキャラクターに読み替える処理を確かめる。
import {
  AR2E_ABILITIES,
  AR2E_CHECKS,
  Ar2eAbilityId,
  Ar2eCheckId,
} from '@axe/domain/character/import/system-profiles/ar2e/ar2e-catalog';
import { Ar2eCharacter } from '@axe/domain/character/import/system-profiles/ar2e/ar2e-character';
import { SheetChange, withoutKeys, withValues } from '@axe/testing/ar2e/sheet-changes';
import {
  ar2eCharacterOf,
  DAGGER,
  EMPTY_HAND,
  sheetWith,
  SHIELD,
  SWORD,
  UNTYPED_SHIELD,
  UNTYPED_WEAPON,
  withHandedness,
  withHands,
  withRows,
  withSkills,
} from '@axe/testing/ytsheet-ar2e/ytsheet-ar2e-fixtures';

/**
 * 架空のシートを変え、アリアンロッド2E のキャラクターに読む。
 *
 * @param changes 架空のシートを変える道具（かける順）
 * @returns アリアンロッド2E のキャラクター
 */
const read = (...changes: SheetChange[]) => ar2eCharacterOf(sheetWith(...changes));

/** 能力値の識別子と、ゆとシートの項目名に入る記号 */
const ABILITY_KEYS: readonly (readonly [Ar2eAbilityId, string])[] = [
  ['str', 'Str'],
  ['dex', 'Dex'],
  ['agi', 'Agi'],
  ['int', 'Int'],
  ['sen', 'Sen'],
  ['mnd', 'Mnd'],
  ['luk', 'Luk'],
];

/** 判定の識別子と、ゆとシートの項目名に入る記号 */
const CHECK_KEYS: readonly (readonly [Ar2eCheckId, string])[] = [
  ...ABILITY_KEYS,
  ['trapDetect', 'TrapDetect'],
  ['trapRelease', 'TrapRelease'],
  ['dangerDetect', 'DangerDetect'],
  ['enemyLore', 'EnemyLore'],
  ['appraisal', 'Appraisal'],
  ['magic', 'Magic'],
  ['song', 'Song'],
  ['alchemy', 'Alchemy'],
];

/** 仕様書「ゆとシートの戦闘とリソースの値の読み方」の表の、元のデータと、読んだ値の取り出し方 */
const BATTLE_AND_RESOURCE_KEYS: readonly (readonly [string, (character: Ar2eCharacter) => number | null])[] = [
  ['hpTotal', (character) => character.resources.hp],
  ['mpTotal', (character) => character.resources.mp],
  ['fateTotal', (character) => character.resources.fate],
  ['fateLimit', (character) => character.resources.fateLimit],
  ['battleTotalIni', (character) => character.battle.initiative],
  ['battleTotalMove', (character) => character.battle.movement],
  ['battleTotalDef', (character) => character.battle.physicalDefense],
  ['battleTotalMDef', (character) => character.battle.magicalDefense],
  ['battleDiceAcc', (character) => character.battle.accuracy.dice],
  ['battleTotalAcc', (character) => character.battle.accuracy.total],
  ['battleDiceAtk', (character) => character.battle.attack.dice],
  ['battleTotalAtk', (character) => character.battle.attack.total],
  ['battleDiceEva', (character) => character.battle.evasion.dice],
  ['battleTotalEva', (character) => character.battle.evasion.modifier],
  ['battleTotalAccR', (character) => character.battle.accuracy.right],
  ['battleTotalAtkR', (character) => character.battle.attack.right],
  ['battleTotalAccL', (character) => character.battle.accuracy.left],
  ['battleTotalAtkL', (character) => character.battle.attack.left],
];

/** 仕様書「ゆとシートの携行品とプロフィールの値の読み方」の表の、文字で読む値の元のデータと、読んだ値の取り出し方 */
const BELONGING_AND_PROFILE_TEXT_KEYS: readonly (readonly [string, (character: Ar2eCharacter) => string])[] = [
  ['items', (character) => character.belongings.items],
  ['playerName', (character) => character.profile.player],
  ['race', (character) => character.profile.race],
  ['gender', (character) => character.profile.gender],
  ['age', (character) => character.profile.age],
  ['classMain', (character) => character.profile.mainClass],
  ['classSupport', (character) => character.profile.supportClass],
  ['classTitle', (character) => character.profile.titleClass],
  ['guildName', (character) => character.profile.guild],
  ['freeNote', (character) => character.profile.note],
  ['sheetURL', (character) => character.profile.sheetUrl],
];

/** 仕様書「ゆとシートの携行品とプロフィールの値の読み方」の表の、数で読む値の元のデータと、読んだ値の取り出し方 */
const BELONGING_AND_PROFILE_NUMBER_KEYS: readonly (readonly [string, (character: Ar2eCharacter) => number | null])[] = [
  ['moneyTotal', (character) => character.belongings.money],
  ['level', (character) => character.profile.level],
];

describe('ゆとシートの値の読み方（仕様書「ゆとシートの値の読み方」「ゆとシートの戦闘とリソースの値の読み方」「ゆとシートの携行品とプロフィールの値の読み方」）', () => {
  it('戦闘とリソースの表の全部の値を読む', () => {
    expect(BATTLE_AND_RESOURCE_KEYS).toHaveLength(18);
  });

  it.each(BATTLE_AND_RESOURCE_KEYS)('%s を数として読む', (key, valueOf) => {
    expect(valueOf(read(withValues({ [key]: '123' })))).toBe(123);
  });

  it.each([
    ['7.5', 7.5],
    ['-3', -3],
    ['0', 0],
    ['', null],
    ['-', null],
  ] as const)('数の書き方「%s」は %s に読む', (value, expected) => {
    expect(read(withValues({ battleTotalIni: value })).battle.initiative).toBe(expected);
  });

  it('項目がない値は「なし」', () => {
    expect(read(withoutKeys('battleTotalIni')).battle.initiative).toBeNull();
  });

  it('携行品とプロフィールの表の全部の値を読む', () => {
    expect(BELONGING_AND_PROFILE_TEXT_KEYS.length + BELONGING_AND_PROFILE_NUMBER_KEYS.length).toBe(13);
  });

  it.each(BELONGING_AND_PROFILE_TEXT_KEYS)('%s を文字として読む', (key, valueOf) => {
    expect(valueOf(read(withValues({ [key]: '試しの値' })))).toBe('試しの値');
  });

  it.each(BELONGING_AND_PROFILE_NUMBER_KEYS)('%s を数として読む', (key, valueOf) => {
    expect(valueOf(read(withValues({ [key]: '123' })))).toBe(123);
  });
});

describe('ゆとシートの能力値と判定の値の読み方', () => {
  it('全部の能力値と判定を読む', () => {
    expect(ABILITY_KEYS.map(([id]) => id)).toEqual(AR2E_ABILITIES.map((ability) => ability.id));
    expect(CHECK_KEYS.map(([id]) => id)).toEqual(AR2E_CHECKS.map((check) => check.id));
  });

  it.each(ABILITY_KEYS)('%s の基本値は stt%sBase、能力値は stt%sTotal', (id, key) => {
    const character = read(withValues({ [`stt${key}Base`]: '21', [`stt${key}Total`]: '7' }));
    expect(character.abilities[id]).toEqual({ base: 21, bonus: 7 });
  });

  it.each(CHECK_KEYS)('%s のダイス数は roll%sDice、固定値は roll%s', (id, key) => {
    const character = read(withValues({ [`roll${key}Dice`]: '3', [`roll${key}`]: '-2' }));
    expect(character.checks[id]).toEqual({ dice: 3, modifier: -2 });
  });
});

describe('ゆとシートのコマの名前と色の読み方', () => {
  it.each([
    ['namePlate があれば namePlate', [], '架空の冒険者(テスト)'],
    ['namePlate がなければ name', [withoutKeys('namePlate')], '架空の冒険者'],
    ['namePlate が空なら name', [withValues({ namePlate: ' ' })], '架空の冒険者'],
  ] as const)('%s', (_, changes, expected) => {
    expect(read(...changes).name).toBe(expected);
  });

  it.each([
    ['&amp;#35;123456,#abcdef', '#123456'],
    ['#123456,#abcdef', '#123456'],
    ['#abc', '#abc'],
    ['red', ''],
    ['', ''],
  ])('色の書き方「%s」は「%s」に読む', (value, expected) => {
    expect(read(withValues({ nameColor: value })).color).toBe(expected);
  });

  it('色の項目がなければ空', () => {
    expect(read(withoutKeys('nameColor')).color).toBe('');
  });
});

describe('ゆとシートでダイス数がない特殊な判定のダイス数', () => {
  it('元の能力値の判定のダイス数に、足すダイス数を足す', () => {
    const character = read(withoutKeys('rollSongDice'), withValues({ rollMndDice: '2', rollSongDiceAdd: '1' }));
    expect(character.checks.song.dice).toBe(3);
  });

  it('足すダイス数がなければ、元の能力値の判定のダイス数', () => {
    const character = read(withoutKeys('rollAlchemyDice', 'rollAlchemyDiceAdd'), withValues({ rollDexDice: '2' }));
    expect(character.checks.alchemy.dice).toBe(2);
  });

  it('能力値の判定は補わない。ダイス数がなければ「なし」', () => {
    const character = read(withoutKeys('rollStrDice'), withValues({ rollStrDiceAdd: '1' }));
    expect(character.checks.str.dice).toBeNull();
  });
});

describe('ゆとシートの手に持つものの読み方', () => {
  it.each([
    ['種別が書かれた右手', [withHands(SWORD, EMPTY_HAND)], 'ロングソード', null],
    ['種別が書かれた左手', [withHands(EMPTY_HAND, DAGGER)], null, 'ダガー'],
    [
      '種別が空で、攻撃の値のある両手',
      [withHands(UNTYPED_WEAPON, { Name: '試しの爪', Atk: '2' })],
      '試しの拳',
      '試しの爪',
    ],
    ['盾の右手と、武器の左手', [withHands(SHIELD, DAGGER)], null, 'ダガー'],
    ['種別も攻撃の値も空の手', [withHands(UNTYPED_SHIELD, EMPTY_HAND)], null, null],
    ['攻撃の値が数でない字', [withHands({ Name: 'お守り', Atk: 'CL+8' }, EMPTY_HAND)], null, null],
    [
      '名前と種別を 1 行の欄の文字として読む',
      [withHands({ Name: ' 試しの剣\n', Type: ' 盾 ' }, { Name: ' 試しの杖', Type: '杖\t' })],
      null,
      '試しの杖',
    ],
  ] as const)('%s', (_, changes, right, left) => {
    const hands = read(...changes).hands;
    expect([hands.right.weapon, hands.left.weapon]).toEqual([right, left]);
  });
});

describe('ゆとシートの右手と左手の合計の仕方の読み方（仕様書「ゆとシートの右手と左手の合計の仕方の読み方」「右手と左手の値がないキャラクターの合計の仕方」）', () => {
  it.each([
    ['1', 'separate'],
    ['2', 'both'],
    ['3', 'accuracyOnly'],
    ['4', 'all'],
    [null, 'separate'],
    ['5', 'separate'],
    ['', 'separate'],
  ] as const)('記号「%s」は %s', (code, expected) => {
    expect(read(withHandedness(code)).handedness).toBe(expected);
  });

  it('右手と左手の値がない古いシートは「両手を合計」', () => {
    expect(read(withHandedness('1'), withoutKeys('battleTotalAccR')).handedness).toBe('both');
  });
});

describe('ゆとシートの番号の付いた行の読み方', () => {
  it('名前のない行は読まない', () => {
    const character = read(
      withSkills({ Name: 'ヒール' }, { Timing: 'メジャー', Note: '名前なし' }, { Name: 'プロテクション' })
    );
    expect(character.skills.map((skill) => skill.name)).toEqual(['ヒール', 'プロテクション']);
  });

  it('行の数までの行を読み、行の数より後の行は読まない', () => {
    const character = read(
      withSkills({ Name: 'ヒール' }),
      withValues({ skillNum: '2', skill2Name: 'ガード', skill3Name: 'プロテクション' })
    );
    expect(character.skills.map((skill) => skill.name)).toEqual(['ヒール', 'ガード']);
  });
});

describe('ゆとシートのスキルの値の読み方', () => {
  /** スキルの文字の値の項目名と、読んだ値の名前 */
  const SKILL_TEXT_FIELDS = [
    ['Name', 'name'],
    ['Category', 'category'],
    ['Lv', 'level'],
    ['Timing', 'timing'],
    ['Roll', 'check'],
    ['Target', 'target'],
    ['Range', 'range'],
    ['Cost', 'cost'],
    ['Reqd', 'requirement'],
    ['Note', 'effect'],
  ] as const;

  it('名称、Lv、タイミング、判定、対象、射程、コスト、使用条件、分類、効果を読む', () => {
    expect(SKILL_TEXT_FIELDS).toHaveLength(10);
  });

  it.each(SKILL_TEXT_FIELDS)('%s を文字として %s に読む', (field, name) => {
    const skill = read(withSkills({ Name: '試しのスキル', [field]: '試しの値' })).skills[0];
    expect(skill[name]).toBe('試しの値');
  });

  it('行の数は skillNum、なければ古い版の skillsNum', () => {
    const character = read(withRows('skill', 'skillsNum', [{ Name: 'ヒール' }]), withoutKeys('skillNum'));
    expect(character.skills).toHaveLength(1);
  });

  it.each([
    ['4', 4],
    ['0', 0],
    ['-', null],
    ['', null],
    ['1.5', null],
    ['&#52;', null],
  ] as const)(
    'コストの記録の値「%s」のコストの数は %s（HTML の書き方を戻す前の値が整数のときだけ）',
    (cost, expected) => {
      expect(read(withSkills({ Name: 'A', Cost: cost })).skills[0].costPoints).toBe(expected);
    }
  );
});

describe('ゆとシートのスキルの取得元の言葉', () => {
  /**
   * 取得元の記号を書いたスキル 1 つだけの架空のシートを読み、そのスキルの取得元を取り出す。
   *
   * @param type 取得元の記号（`skill1Type` の値）
   * @param changes 架空のシートをさらに変える道具（かける順）
   * @returns スキルの取得元
   */
  const sourceOf = (type: string, ...changes: SheetChange[]) =>
    read(withSkills({ Name: 'X', Type: type }), ...changes).skills[0].source;

  it.each([
    ['general', '一般'],
    ['race', '種族'],
    ['style', '流派'],
    ['faith', '天恵'],
    ['geis', '誓約'],
    ['add', '他スキル'],
    ['another', '異才'],
  ])('記号 %s は、ゆとシートの閲覧画面と同じ「%s」', (type, expected) => {
    expect(sourceOf(type)).toBe(expected);
  });

  it.each([
    ['CL1 のメインクラスがある', [withValues({ classMainLv1: 'ウォーリア' })], 'パワー（ウォーリア）'],
    ['CL1 のメインクラスがない', [withoutKeys('classMainLv1')], 'パワー'],
    ['CL1 のメインクラスに HTML の書き方がある', [withValues({ classMainLv1: 'A&amp;B' })], 'パワー（A&B）'],
  ] as const)('パワーは、CL1 のメインクラスがあれば添える: %s', (_, changes, expected) => {
    expect(sourceOf('power', ...changes)).toBe(expected);
  });

  it('記号でないもの（クラス名）は、そのまま', () => {
    expect(sourceOf('アコライト')).toBe('アコライト');
  });
});

describe('ゆとシートの誓約とコネクションの値の読み方', () => {
  it('名前のある行だけを読み、古い版の行の数も読む', () => {
    const character = read(
      withRows('geis', 'geisesNum', [{ Name: '清貧', Cost: '5', Note: '所持金を持たない' }, { Cost: '3' }]),
      withoutKeys('geisNum'),
      withRows('connection', 'connectionsNum', [{ Name: 'ミナ', Relation: '友人', Note: '幼なじみ' }])
    );
    expect(character.geises.map((geis) => [geis.name, geis.growth, geis.note])).toEqual([
      ['清貧', 5, '所持金を持たない'],
    ]);
    expect(character.connections.map((connection) => [connection.name, connection.relation, connection.note])).toEqual([
      ['ミナ', '友人', '幼なじみ'],
    ]);
  });

  it('行の数は geisNum と connectionNum を先に読む', () => {
    const character = read(
      withRows('geis', 'geisNum', [{ Name: '清貧' }]),
      withValues({ geisesNum: '0' }),
      withRows('connection', 'connectionNum', [{ Name: 'ミナ' }]),
      withValues({ connectionsNum: '0' })
    );
    expect([character.geises.length, character.connections.length]).toEqual([1, 1]);
  });
});

describe('ゆとシートの携行品とプロフィールの値の読み方', () => {
  it.each([
    ['free', '機械人形'],
    [' free\n', '機械人形'],
    ['free　', 'free　'],
    ['ヒューリン', 'ヒューリン'],
  ])('種族「%s」は「%s」に読む（free かは、1 行の欄の文字として見る）', (race, expected) => {
    expect(read(withValues({ race, raceFree: '機械人形' })).profile.race).toBe(expected);
  });

  it('所持品とメモは複数行の欄として読み（前後の空白と改行も残す）、ゆとシートの書き方は書かれたまま残す', () => {
    const character = read(
      withValues({
        items: '  |@[1]|試しの道具|《テストスキル》に+1D|&lt;br&gt;2行目\n',
        freeNote: ' 容姿&lt;br&gt;経歴 ',
      })
    );
    expect(character.belongings.items).toBe('  |@[1]|試しの道具|《テストスキル》に+1D|\n2行目\n');
    expect(character.profile.note).toBe(' 容姿\n経歴 ');
  });
});

describe('ゆとシートの参照元のアドレスの読み方', () => {
  it('HTML の書き方を戻さず、1 行の欄と同じく、前後の半角の空白・タブ・改行の文字だけを除く', () => {
    const url = 'https://yutorize.work/ytsheet/ar2e/?id=a&amp;mode=x';
    expect(read(withValues({ sheetURL: ` ${url}\n` })).profile.sheetUrl).toBe(url);
    expect(read(withValues({ sheetURL: `${url}　` })).profile.sheetUrl).toBe(`${url}　`);
  });
});
