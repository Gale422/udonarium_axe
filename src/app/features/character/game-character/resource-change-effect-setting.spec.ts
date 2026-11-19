/*
 * リソースの増減でコマの上に浮かぶ増減量の数字が、項目の「増減でエフェクト」に従うことの確かめ。
 */
import { DestroyRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { resourceChange$ } from '@axe/core/event/domain-events';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ResourceChange } from '@axe/domain/character/resource-change';
import { DataElement, DataElementAttribute, DataElementType } from '@axe/domain/data/data-element';
import { collectDataElements } from '@axe/domain/data/data-element-tree';
import { SoundEffect } from '@axe/domain/media/sound-effect';
import {
  PieceResourceChanges,
  PieceResourceChangesHost,
} from '@axe/features/character/game-character/piece-resource-changes';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('コマの上に浮かぶリソースの増減量の数字', () => {
  const made: GameCharacter[] = [];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    vi.spyOn(SoundEffect, 'playLocal').mockImplementation(() => undefined);
  });

  afterEach(() => {
    for (const character of made.splice(0)) character.destroy();
    vi.restoreAllMocks();
  });

  /**
   * 新しく作るときと同じ HP と MP を持つ、架空のコマを作る
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
   * 「増減でエフェクト」の設定を一度も書いていないリソースの項目を、コマに足す
   * @param character 項目を足すコマ
   * @returns 足した項目
   */
  function addResourceWithoutSetting(character: GameCharacter): DataElement {
    const resource = DataElement.create('架空の資源', 10, { type: DataElementType.NUMBER_RESOURCE, currentValue: 10 });
    character.detailDataElement!.appendChild(resource);
    return resource;
  }

  /**
   * 詳細設定で「増減でエフェクト」のチェックを入れたり外したりしたときと同じ値を、項目に書く
   * @param resource 設定を書くリソースの項目
   * @param checked チェックを入れるか
   */
  function setChangeEffect(resource: DataElement, checked: boolean): void {
    resource.setAttribute(DataElementAttribute.CHANGE_EFFECT, checked ? 'true' : 'false');
  }

  /**
   * コマの上の演出を、テスト用の卓につないで作る
   * @param character 演出を出すコマ
   * @param parts コマの部位
   * @returns 演出と、項目を動かす道具
   */
  function setup(character: GameCharacter, parts: GameCharacter[] = []) {
    const version = signal(0);
    const localChanges = new Map<string, number>();
    const host: PieceResourceChangesHost = {
      character: signal<GameCharacter | null>(character),
      partsOf: () => parts,
      followedTree: (root) => {
        version();
        return root ? collectDataElements(root) : null;
      },
      localChangeCountOf: (identifier) => localChanges.get(identifier) ?? 0,
      partNameOf: (identifier) => parts.find((part) => part.identifier === identifier)?.name ?? '',
      playEffects: () => undefined,
      destroyRef: TestBed.inject(DestroyRef),
    };
    const changes = TestBed.runInInjectionContext(() => new PieceResourceChanges(host));
    TestBed.tick();

    /**
     * この端末で、いくつかの項目の現在値を 1 回の操作で変え、演出が追いつくのを待つ
     * @param moves 変える項目と、変えた後の現在値の組
     */
    const move = (...moves: [DataElement, number][]) => {
      for (const [resource, to] of moves) {
        resource.currentValue = to;
        localChanges.set(resource.identifier, (localChanges.get(resource.identifier) ?? 0) + 1);
      }
      version.update((now) => now + 1);
      TestBed.tick();
    };
    return { changes, move };
  }

  it.each<[string, (character: GameCharacter, hp: DataElement) => DataElement]>([
    [
      'チェックを外した項目',
      (_, hp) => {
        setChangeEffect(hp, false);
        return hp;
      },
    ],
    ['一度もチェックを入れていない項目', (character) => addResourceWithoutSetting(character)],
  ])('%sの増減では、ダメージでも回復でも数字を出さず、コマの閃光と光の輪は出す', (_, quietResourceOf) => {
    const { character, hp } = newPiece('架空の敵');
    const quiet = quietResourceOf(character, hp);
    const full = Number(quiet.currentValue);
    const { changes, move } = setup(character);

    move([quiet, full - 5]);
    expect(changes.floating()).toEqual([]);
    expect(changes.hitFlash()).toBe('damage');

    move([quiet, full]);
    expect(changes.floating()).toEqual([]);
    expect(changes.hitFlash()).toBe('heal');
  });

  it('チェックの入った項目と外した項目が同時に動いたら、入った項目の数字だけを出し、閃光は両方の増減から決める', () => {
    const { character, hp, mp } = newPiece('架空の敵');
    hp.currentValue = 150;
    setChangeEffect(hp, true);
    setChangeEffect(mp, false);
    const { changes, move } = setup(character);

    move([hp, 160], [mp, 90]);

    expect(changes.floating().map((change) => [change.name, change.label])).toEqual([['HP', '+10']]);
    expect(changes.hitFlash()).toBe('damage');
  });

  it('部位の項目にも、同じ条件を当てる', () => {
    const { character } = newPiece('架空の敵');
    const { character: part, hp: partHp, mp: partMp } = newPiece('架空の部位');
    setChangeEffect(partHp, false);
    setChangeEffect(partMp, true);
    const { changes, move } = setup(character, [part]);

    move([partHp, 195], [partMp, 95]);

    expect(changes.floating().map((change) => [change.name, change.label])).toEqual([['MP', '架空の部位 -5']]);
  });

  it('ほかの人から届いた増減でも、「増減でエフェクト」の入っていない変化の数字は出さない', () => {
    const { character, hp, mp } = newPiece('架空の敵');
    const { changes } = setup(character);
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

    expect(changes.floating().map((change) => change.name)).toEqual(['HP']);
  });
});
