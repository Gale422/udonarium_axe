// 読み手の単体テスト。
// ゆとシートの記録を、ルールの言葉のアリアンロッド2E のキャラクターに読み替える処理を確かめる。
import {
  ar2eCharacterOf,
  baseSheet,
  DAGGER,
  EMPTY_HAND,
  HandItem,
  SheetChange,
  sheetWith,
  SHIELD,
  SWORD,
  UNTYPED_SHIELD,
  UNTYPED_WEAPON,
  withHandedness,
  withHands,
  withoutKeys,
  withRows,
  withSkills,
  withValues,
} from '@axe/testing/ytsheet-ar2e/ytsheet-ar2e-fixtures';

/**
 * 架空のシートを変え、アリアンロッド2E のキャラクターに読む。
 *
 * @param changes 架空のシートを変える道具（かける順）
 * @returns アリアンロッド2E のキャラクター
 */
const read = (...changes: SheetChange[]) => ar2eCharacterOf(sheetWith(...changes));

describe('ゆとシートの値の読み方（仕様書「ゆとシートの値の読み方」「能力値と判定の値の読み方」「戦闘とリソースの値の読み方」）', () => {
  it('架空のキャラクターの値を、ルールの言葉の値に読む', () => {
    const character = ar2eCharacterOf(baseSheet());
    expect(character.resources).toEqual({ hp: 60, mp: 40, fate: 4, fateLimit: 3 });
    expect(character.abilities.str).toEqual({ base: 12, bonus: 4 });
    expect(character.checks.song).toEqual({ dice: 2, modifier: 3 });
    expect(character.battle.accuracy).toEqual({ dice: 2, total: 5, right: 5, left: 3 });
    expect(character.battle.movement).toBe(9);
    expect(character.belongings.money).toBe(1000);
    expect(character.profile.level).toBe(5);
    expect(character.profile.mainClass).toBe('ウォーリア');
    expect(character.profile.sheetUrl).toBe('https://yutorize.work/ytsheet/ar2e/?id=testsheet');
  });

  it('数として読めない値は「なし」、小数は小数のまま読む', () => {
    const character = read(withValues({ battleTotalIni: '7.5', hpTotal: '' }), withoutKeys('mpTotal'));
    expect(character.battle.initiative).toBe(7.5);
    expect(character.resources.hp).toBeNull();
    expect(character.resources.mp).toBeNull();
  });
});

describe('コマの名前と色の読み方', () => {
  it('名前は namePlate、なければ name', () => {
    expect(read().name).toBe('架空の冒険者(テスト)');
    expect(read(withoutKeys('namePlate')).name).toBe('架空の冒険者');
  });

  it('色は nameColor を 1 行の欄の文字として読んだ、最初の色。色の形でなければ空', () => {
    expect(read(withValues({ nameColor: '&amp;#35;123456,#abcdef' })).color).toBe('#123456');
    expect(read(withValues({ nameColor: '#123456,#abcdef' })).color).toBe('#123456');
    expect(read(withValues({ nameColor: 'red' })).color).toBe('');
    expect(read(withoutKeys('nameColor')).color).toBe('');
  });
});

describe('ダイス数がない特殊な判定のダイス数', () => {
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

describe('手に持つものの読み方', () => {
  /**
   * 右手に持たせたものを、手として読み、武器の名前を取り出す。左手は空にする。
   *
   * @param item 右手に持たせるもの
   * @returns 右手の武器の名前。武器を持たない手なら null
   */
  const weaponOf = (item: HandItem) => read(withHands(item, EMPTY_HAND)).hands.right.weapon;

  it('種別が盾以外で書かれていれば、武器を持つ手', () => {
    expect(weaponOf(SWORD)).toBe('ロングソード');
  });

  it('種別が盾の手、空の手は、武器を持たない手', () => {
    expect(weaponOf(SHIELD)).toBeNull();
    expect(weaponOf(EMPTY_HAND)).toBeNull();
    expect(weaponOf({ Name: '―', Type: '片手剣', Atk: '6' })).toBeNull();
  });

  it('種別が空欄でも、攻撃の値が 0 でなければ武器を持つ手', () => {
    expect(weaponOf(UNTYPED_WEAPON)).toBe('試しの拳');
    expect(weaponOf({ Name: 'ナックル', Type: '―', Atk: '2' })).toBe('ナックル');
  });

  it('種別も攻撃の値も空の手、攻撃の値が 0 の手は、武器を持たない手', () => {
    expect(weaponOf(UNTYPED_SHIELD)).toBeNull();
    expect(weaponOf({ Name: 'お守り', Atk: '0' })).toBeNull();
  });

  it('右手と左手を別々に読む', () => {
    const hands = read(withHands(SHIELD, DAGGER)).hands;
    expect(hands.right.weapon).toBeNull();
    expect(hands.left.weapon).toBe('ダガー');
  });
});

describe('右手と左手の合計の仕方の読み方（仕様書「右手と左手の合計の仕方の読み方」「右手と左手の値がないキャラクターの合計の仕方」）', () => {
  it('記号を読む。ないときは「合計しない」', () => {
    expect(read(withHandedness('1')).handedness).toBe('separate');
    expect(read(withHandedness('2')).handedness).toBe('both');
    expect(read(withHandedness('3')).handedness).toBe('accuracyOnly');
    expect(read(withHandedness('4')).handedness).toBe('all');
    expect(read(withHandedness(null)).handedness).toBe('separate');
  });

  it('右手と左手の値がない古いシートは「両手を合計」', () => {
    expect(read(withHandedness('1'), withoutKeys('battleTotalAccR')).handedness).toBe('both');
  });
});

describe('番号の付いた行の読み方', () => {
  it('名前のない行は読まない', () => {
    const character = read(
      withSkills({ Name: 'ヒール' }, { Timing: 'メジャー', Note: '名前なし' }, { Name: 'プロテクション' })
    );
    expect(character.skills.map((skill) => skill.name)).toEqual(['ヒール', 'プロテクション']);
  });

  it('行の数までの番号のうち、記録に名前の項目がある行だけを読むので、行の数が大きくても止まらない', () => {
    const character = read(withSkills({ Name: 'ヒール' }), withValues({ skillNum: '100000000', skill5Name: 'ガード' }));
    expect(character.skills.map((skill) => skill.name)).toEqual(['ヒール', 'ガード']);
    expect(read(withValues({ skillNum: '1', skill2Name: 'ガード' })).skills.map((skill) => skill.name)).not.toContain(
      'ガード'
    );
  });

  it('桁の多い番号の行も、その番号の項目を読み、行の数に書かれた数までの番号だけを読む', () => {
    const character = read(
      withSkills(),
      withValues({
        skillNum: '9007199254740993',
        skill9007199254740994Name: 'プロテクション',
        skill9007199254740992Name: 'ヒール',
        skill9007199254740992Timing: 'メジャー',
        skill9007199254740993Name: 'ガード',
        skill9007199254740993Timing: 'DRの直後',
      })
    );
    expect(character.skills.map((skill) => [skill.name, skill.timing])).toEqual([
      ['ヒール', 'メジャー'],
      ['ガード', 'DRの直後'],
    ]);
  });
});

describe('スキルの値の読み方', () => {
  it('行の数は skillNum、なければ古い版の skillsNum', () => {
    const character = read(withRows('skill', 'skillsNum', [{ Name: 'ヒール' }]), withoutKeys('skillNum'));
    expect(character.skills).toHaveLength(1);
  });

  it('コストの数は、コストの記録の値（HTML の書き方を戻す前）が整数のときだけ', () => {
    const costs = read(
      withSkills(
        { Name: 'A', Cost: '4' },
        { Name: 'B', Cost: '-' },
        { Name: 'C', Cost: '' },
        { Name: 'D', Cost: '1.5' },
        { Name: 'E', Cost: '&#52;' }
      )
    ).skills.map((skill) => [skill.cost, skill.costPoints]);
    expect(costs).toEqual([
      ['4', 4],
      ['-', null],
      ['', null],
      ['1.5', null],
      ['4', null],
    ]);
  });
});

describe('スキルの取得元の言葉', () => {
  /**
   * 取得元の記号を書いたスキル 1 つだけの架空のシートを読み、そのスキルの取得元を取り出す。
   *
   * @param type 取得元の記号（`skill1Type` の値）
   * @param changes 架空のシートをさらに変える道具（かける順）
   * @returns スキルの取得元
   */
  const sourceOf = (type: string, ...changes: SheetChange[]) =>
    read(withSkills({ Name: 'X', Type: type }), ...changes).skills[0].source;

  it('記号は、ゆとシートの閲覧画面と同じ言葉', () => {
    expect(sourceOf('general')).toBe('一般');
    expect(sourceOf('race')).toBe('種族');
    expect(sourceOf('style')).toBe('流派');
    expect(sourceOf('faith')).toBe('天恵');
    expect(sourceOf('geis')).toBe('誓約');
    expect(sourceOf('add')).toBe('他スキル');
    expect(sourceOf('another')).toBe('異才');
  });

  it('パワーは、CL1 のメインクラスがあれば添える', () => {
    expect(sourceOf('power', withValues({ classMainLv1: 'ウォーリア' }))).toBe('パワー（ウォーリア）');
    expect(sourceOf('power', withoutKeys('classMainLv1'))).toBe('パワー');
    expect(sourceOf('power', withValues({ classMainLv1: 'A&amp;B' }))).toBe('パワー（A&B）');
  });

  it('クラス名は、そのまま', () => {
    expect(sourceOf('アコライト')).toBe('アコライト');
  });
});

describe('誓約とコネクションの値の読み方', () => {
  it('名前のある行だけを読み、古い版の行の数も読む', () => {
    const character = read(
      withRows('geis', 'geisesNum', [{ Name: '清貧', Cost: '5', Note: '所持金を持たない' }, { Cost: '3' }]),
      withoutKeys('geisNum'),
      withRows('connection', 'connectionNum', [{ Name: 'ミナ', Relation: '友人', Note: '幼なじみ' }])
    );
    expect(character.geises.map((geis) => [geis.name, geis.growth, geis.note])).toEqual([
      ['清貧', 5, '所持金を持たない'],
    ]);
    expect(character.connections.map((connection) => [connection.name, connection.relation, connection.note])).toEqual([
      ['ミナ', '友人', '幼なじみ'],
    ]);
  });
});

describe('携行品とプロフィールの値の読み方', () => {
  it('種族が自由記入（free）のときは raceFree を読む。free かは、1 行の欄の文字として見る', () => {
    expect(read(withValues({ race: ' free\n', raceFree: '機械人形' })).profile.race).toBe('機械人形');
    expect(read(withValues({ race: 'free　', raceFree: '機械人形' })).profile.race).toBe('free　');
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

describe('参照元のアドレスの読み方', () => {
  it('HTML の書き方を戻さず、1 行の欄と同じく、前後の半角の空白・タブ・改行の文字だけを除く', () => {
    const url = 'https://yutorize.work/ytsheet/ar2e/?id=a&amp;mode=x';
    expect(read(withValues({ sheetURL: ` ${url}\n` })).profile.sheetUrl).toBe(url);
    expect(read(withValues({ sheetURL: `${url}　` })).profile.sheetUrl).toBe(`${url}　`);
  });
});
