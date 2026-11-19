/**
 * 広げた分の組み立て。
 *
 * 取り込みの中間の形を広げた分（項目のリソースの値、項目と見出しの設定）を、アックスの欄と属性に直す。
 * リソースの値のある項目からは、アックスのリソースの欄を作る。設定は、欄と見出しの属性に書く。
 * 属性の名前と書き方は、アックスの画面の設定欄と組み立てが書くものと同じにする。
 */
import { ImportedField } from '@axe/domain/character/import/imported-character';
import {
  ImportedFieldSettings,
  ImportedGroupSettings,
  ImportedResource,
} from '@axe/domain/character/import/imported-character-extension';
import {
  DataElement,
  DataElementAttribute,
  DataElementFieldType,
  DataElementRole,
  DataElementType,
} from '@axe/domain/data/data-element';

/** 最小値を書く属性。数値の欄は `min`、リソースの欄は下限のベース `min-base` */
type MinAttribute = typeof DataElementAttribute.MIN | typeof DataElementAttribute.MIN_BASE;

/**
 * 中間の形の項目と、そのリソースの値から、アックスのリソースの欄を作る。
 *
 * 最大値を値に、項目の値を現在値（`currentValue`）に置く。最大値がないときは空にする。
 * 最小値は、下限のベース（`min-base`）に書く。
 *
 * @param field 項目
 * @param resource 項目のリソースの値
 * @returns 設定を書いたリソースの欄
 */
export function createImportedResourceElement(field: ImportedField, resource: ImportedResource): DataElement {
  // 欄の形は、アックスの組み立て（`ImportedCharacterFactory`）が作るリソースの欄と同じにする
  const element = DataElement.create(field.label, resource.max ?? '', {
    [DataElementAttribute.ROLE]: DataElementRole.FIELD,
    [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.RESOURCE,
    type: DataElementType.NUMBER_RESOURCE,
    currentValue: String(field.value),
  });
  // アックスのシートの設定欄は、リソースの欄の最小値を、下限のベースに書くため
  return writeFieldSettings(element, field.settings, DataElementAttribute.MIN_BASE);
}

/**
 * リソースでない項目の設定を、アックスの欄の属性として書く。最小値は `min` に書く。
 *
 * @param element 設定を書く欄
 * @param settings 項目の設定。ないときは何も書かない
 * @returns 渡した欄
 */
export function withImportedFieldSettings(
  element: DataElement,
  settings: ImportedFieldSettings | undefined
): DataElement {
  return writeFieldSettings(element, settings, DataElementAttribute.MIN);
}

/**
 * 中の見出しの設定を、アックスの見出しの属性として書く。ポップアップ表示の設定があれば、ポップアップ表示の属性を書く。
 *
 * @param element 設定を書く見出し
 * @param settings 中の見出しの設定。ないときは何も書かない
 * @returns 渡した見出し
 */
export function withImportedGroupSettings(
  element: DataElement,
  settings: ImportedGroupSettings | undefined
): DataElement {
  if (settings?.popup) element.setAttribute(DataElementAttribute.POPUP, 'true');
  return element;
}

/**
 * 項目の設定を、欄の属性に書く。単位、最小値、増減したときのエフェクトのうち、設定にあるものだけを書く。
 *
 * @param element 設定を書く欄
 * @param settings 項目の設定。ないときは何も書かない
 * @param minAttribute 最小値を書く属性
 * @returns 渡した欄
 */
function writeFieldSettings(
  element: DataElement,
  settings: ImportedFieldSettings | undefined,
  minAttribute: MinAttribute
): DataElement {
  if (!settings) return element;
  if (settings.unit != null) element.setAttribute(DataElementAttribute.UNIT, settings.unit);
  if (settings.min != null) element.setAttribute(minAttribute, String(settings.min));
  if (settings.changeEffect) element.setAttribute(DataElementAttribute.CHANGE_EFFECT, 'true');
  return element;
}
