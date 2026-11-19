/*
 * リソースの増減でコマの上に浮かぶ増減量の数字が、項目の「増減でエフェクト」に従うことの確かめ。
 * 本物のコマの部品を動かし、コマの部品が浮かべる数字を見る。
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { resourceChange$ } from '@axe/core/event/domain-events';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ResourceChange } from '@axe/domain/character/resource-change';
import { DataElement, DataElementAttribute, DataElementType } from '@axe/domain/data/data-element';
import { SoundEffect } from '@axe/domain/media/sound-effect';
import { GameCharacterComponent } from '@axe/features/character/game-character/game-character.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('コマの上に浮かぶリソースの増減量の数字', () => {
  let fixture: ComponentFixture<GameCharacterComponent>;
  const made: GameCharacter[] = [];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameCharacterComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    fixture = TestBed.createComponent(GameCharacterComponent);
    vi.spyOn(SoundEffect, 'playLocal').mockImplementation(() => undefined);
  });

  afterEach(() => {
    fixture.destroy();
    for (const character of made.splice(0)) character.destroy();
    vi.restoreAllMocks();
  });

  /**
   * 新しいコマの雛形で架空のコマを作り、後で片付けるコマに入れる
   * @param name コマの名前
   * @returns 作ったコマと、その HP と MP の項目
   */
  function newPiece(name: string): { character: GameCharacter; hp: DataElement; mp: DataElement } {
    const character = GameCharacter.create(name, 1, '');
    made.push(character);
    return {
      character,
      hp: DataElement.findElementByReference(character.rootDataElement!, 'HP')!,
      mp: DataElement.findElementByReference(character.rootDataElement!, 'MP')!,
    };
  }

  /**
   * 項目の「増減でエフェクト」を入れるか外す
   * @param resource 設定を書くリソースの項目
   * @param checked チェックを入れるか
   */
  function setChangeEffect(resource: DataElement, checked: boolean): void {
    resource.setAttribute(DataElementAttribute.CHANGE_EFFECT, checked ? 'true' : 'false');
  }

  /**
   * コマをコマの部品に載せて、項目の今の値を、増減を数える元にさせる
   * @param character 載せるコマ
   */
  async function show(character: GameCharacter): Promise<void> {
    fixture.componentRef.setInput('gameCharacter', character);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  /**
   * この端末で、いくつかの項目の現在値を 1 回の操作で変え、コマの部品が追いつくのを待つ
   * @param moves 変える項目と、変えた後の現在値の組
   */
  async function move(...moves: [DataElement, number][]): Promise<void> {
    const objectChange = TestBed.inject(ObjectChangeService);
    for (const [resource, to] of moves) resource.currentValue = to;
    for (const [resource] of moves) objectChange.notifyChanged(resource.identifier);
    await fixture.whenStable();
  }

  /**
   * コマの部品が浮かべている数字の、項目の名前と文字の組
   * @returns 浮かべている数字の、項目の名前と文字の組（浮かべた順）
   */
  const floating = () => fixture.componentInstance.floatingChanges().map((change) => [change.name, change.label]);

  it('「増減でエフェクト」の入った項目の増減では、数字を出す', async () => {
    const { character, hp } = newPiece('架空の敵');
    setChangeEffect(hp, true);
    await show(character);

    await move([hp, 170]);

    expect(floating()).toEqual([['HP', '-30']]);
  });

  it.each<[string, (character: GameCharacter, hp: DataElement) => DataElement]>([
    [
      'チェックを外した項目',
      (_, hp) => {
        setChangeEffect(hp, false);
        return hp;
      },
    ],
    [
      '一度もチェックを入れていない項目',
      (character) => {
        const resource = DataElement.create('架空の資源', 10, {
          type: DataElementType.NUMBER_RESOURCE,
          currentValue: 10,
        });
        character.detailDataElement!.appendChild(resource);
        return resource;
      },
    ],
  ])('%sの増減では、ダメージでも回復でも数字を出さず、コマの閃光は出す', async (_, quietResourceOf) => {
    const { character, hp } = newPiece('架空の敵');
    const quiet = quietResourceOf(character, hp);
    const full = Number(quiet.currentValue);
    await show(character);

    await move([quiet, full - 5]);
    expect(floating()).toEqual([]);
    expect(fixture.componentInstance.hitFlash()).toBe('damage');

    await move([quiet, full]);
    expect(floating()).toEqual([]);
    expect(fixture.componentInstance.hitFlash()).toBe('heal');
  });

  it('1 回の操作で、チェックの入った項目と外した項目が動いたら、入った項目の数字だけを出す', async () => {
    const { character, hp, mp } = newPiece('架空の敵');
    setChangeEffect(hp, true);
    setChangeEffect(mp, false);
    await show(character);

    await move([hp, 170], [mp, 90]);

    expect(floating()).toEqual([['HP', '-30']]);
  });

  it('部位の項目にも、同じ条件を当てる', async () => {
    const { character } = newPiece('架空の敵');
    character.setLocation('table');
    const { character: part, hp: partHp, mp: partMp } = newPiece('架空の部位');
    part.setLocation('table');
    part.ridingOn = character.identifier;
    part.rideSeat = 'part';
    setChangeEffect(partHp, false);
    setChangeEffect(partMp, true);
    await show(character);

    await move([partHp, Number(partHp.currentValue) - 5], [partMp, Number(partMp.currentValue) - 5]);

    expect(floating()).toEqual([['MP', '架空の部位 -5']]);
  });

  it('ほかの人から届いた増減でも、「増減でエフェクト」の入っていない変化の数字は出さない', async () => {
    const { character, hp, mp } = newPiece('架空の敵');
    await show(character);
    /**
     * ほかの端末が見つけて送った、項目の 5 減ったダメージの変化を作る
     * @param resource 減った項目
     * @param playsEffect 送った端末で、その項目の「増減でエフェクト」が入っていたか
     * @returns 届く変化
     */
    const damageTo = (resource: DataElement, playsEffect: boolean): ResourceChange => ({
      identifier: resource.identifier,
      name: resource.name,
      kind: 'damage',
      delta: -5,
      label: '-5',
      ratio: 0.05,
      playsEffect,
      playsSound: false,
      soundSet: 'flesh',
    });

    resourceChange$.emit({
      characterIdentifier: character.identifier,
      changes: [damageTo(hp, true), damageTo(mp, false)],
      emittedBy: 'another-peer',
    });
    await fixture.whenStable();

    expect(floating()).toEqual([['HP', '-5']]);
  });
});
