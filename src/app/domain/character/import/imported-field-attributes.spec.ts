// 広げた分の組み立ての単体テスト。
// 中間の形を広げた分（項目のリソースの値、項目と見出しの設定）を、アックスの欄と属性に直す処理を確かめる。
import { createEmptyImportedCharacter, ImportedField } from '@axe/domain/character/import/imported-character';
import { ImportedCharacterFactory } from '@axe/domain/character/import/imported-character-factory';
import {
  createImportedResourceElement,
  withImportedFieldSettings,
  withImportedGroupSettings,
} from '@axe/domain/character/import/imported-field-attributes';
import { DataElement, DataElementAttribute, DataElementFieldType } from '@axe/domain/data/data-element';

/**
 * 「HP」の項目に、リソースの値を足して、アックスのリソースの欄を作る。
 *
 * @param value 項目の値（現在値）
 * @param max 最大値
 * @param settings 項目の設定
 * @returns リソースの欄
 */
const hpElement = (value: number | '', max: number | null, settings?: ImportedField['settings']) =>
  createImportedResourceElement({ label: 'HP', value, kind: 'number', settings }, { max });

describe('欄の設定の書き方', () => {
  it('リソースの値のある項目は、最大値を値に、項目の値を現在値（currentValue）に置くリソースの欄になる', () => {
    const element = hpElement(30, 78);
    expect(element.name).toBe('HP');
    expect(element.isNumberResource).toBe(true);
    expect(element.fieldType).toBe(DataElementFieldType.RESOURCE);
    expect(element.value).toBe(78);
    expect(element.currentValue).toBe('30');
  });

  it('リソースの欄は、アックスの組み立てが中間の形のリソースから作る欄と同じ形になる（写し元が変わったら気付くため）', () => {
    const imported = createEmptyImportedCharacter('ccfolia');
    imported.statuses = [{ label: 'HP', value: 30, max: 78 }];
    const piece = ImportedCharacterFactory.create(imported, '');
    try {
      const byFactory = DataElement.findElementByReference(piece.detailDataElement!, 'HP')!;
      const ours = hpElement(30, 78);
      // 属性はすべて比べる。フォーク元が組み立てに属性を足したときにも、写しのずれに気付けるようにするため
      expect(ours.toAttributes()).toEqual(byFactory.toAttributes());
      expect(ours.value).toEqual(byFactory.value);
    } finally {
      piece.destroy();
    }
  });

  it('組み立ては、中の見出しの項目のうち、リソースの値のある項目をリソースの欄に、ない項目を種類どおりの欄にする', () => {
    const imported = createEmptyImportedCharacter('ytsheet');
    imported.sections = [
      {
        label: 'リソース',
        groups: [
          {
            label: '基本',
            fields: [
              { label: 'HP', value: 30, kind: 'number', resource: { max: 78 } },
              { label: '行動値', value: 5, kind: 'number' },
            ],
          },
        ],
      },
    ];
    const piece = ImportedCharacterFactory.create(imported, '');
    try {
      const hp = DataElement.findElementByReference(piece.detailDataElement!, 'リソース/基本/HP')!;
      expect(hp.isNumberResource).toBe(true);
      expect([hp.value, hp.currentValue]).toEqual([78, '30']);
      const initiative = DataElement.findElementByReference(piece.detailDataElement!, 'リソース/基本/行動値')!;
      expect(initiative.fieldType).toBe(DataElementFieldType.NUMBER);
    } finally {
      piece.destroy();
    }
  });

  it('値がないリソースの項目は、空のリソースの欄になる', () => {
    const element = hpElement('', null);
    expect(element.value).toBe('');
    expect(element.currentValue).toBe('');
  });

  it('リソースの最小値は、下限のベース（min-base）に書く', () => {
    const element = hpElement(78, 78, { min: 0, changeEffect: true });
    expect(element.getAttribute(DataElementAttribute.MIN_BASE)).toBe('0');
    expect(element.getAttribute(DataElementAttribute.MIN)).toBe('');
    expect(element.getAttribute(DataElementAttribute.CHANGE_EFFECT)).toBe('true');
  });

  it('数値の最小値は min に、単位は unit に書く', () => {
    const element = withImportedFieldSettings(DataElement.create('移動力', 8), { unit: 'm', min: 0 });
    expect(element.getAttribute(DataElementAttribute.UNIT)).toBe('m');
    expect(element.getAttribute(DataElementAttribute.MIN)).toBe('0');
    expect(element.getAttribute(DataElementAttribute.MIN_BASE)).toBe('');
  });

  it('設定がないときは、何も書かない', () => {
    const element = withImportedFieldSettings(DataElement.create('行動値', 5), undefined);
    expect(element.getAttribute(DataElementAttribute.UNIT)).toBe('');
    expect(element.getAttribute(DataElementAttribute.MIN)).toBe('');
    expect(element.getAttribute(DataElementAttribute.CHANGE_EFFECT)).toBe('');
  });

  it('中の見出しのポップアップ表示は、cs-popup に書く', () => {
    const popup = withImportedGroupSettings(DataElement.create('基本'), { popup: true });
    const plain = withImportedGroupSettings(DataElement.create('基本'), undefined);
    expect(popup.getAttribute(DataElementAttribute.POPUP)).toBe('true');
    expect(plain.getAttribute(DataElementAttribute.POPUP)).toBe('');
  });
});
