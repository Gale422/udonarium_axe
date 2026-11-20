import { isAppspotCharacter } from '@axe/domain/character/import/appspot-character-parser';
import { isCcfoliaCharacter, parseCcfoliaCharacter } from '@axe/domain/character/import/ccfolia-character-parser';
import { isCharasheetCharacter } from '@axe/domain/character/import/charasheet-character-parser';
import { ImportedCharacter } from '@axe/domain/character/import/imported-character';
import { parseAppspotCharacterForSystem } from '@axe/domain/character/import/system-profiles/appspot-profiles';
import {
  buildCharasheetAr2eCharacter,
  isCharasheetAr2eCharacter,
} from '@axe/domain/character/import/system-profiles/charasheet-ar2e-profile';
import { parseCharasheetCharacterForSystem } from '@axe/domain/character/import/system-profiles/charasheet-profiles';
import {
  buildYtsheetAr2eCharacter,
  isYtsheetAr2eCharacter,
} from '@axe/domain/character/import/system-profiles/ytsheet-ar2e-profile';
import {
  buildYtsheetSw25Character,
  isYtsheetSw25Character,
} from '@axe/domain/character/import/system-profiles/ytsheet-sw25-profile';
import { isYtsheetCharacter, parseYtsheetCharacter } from '@axe/domain/character/import/ytsheet-character-parser';

/**
 * Recognises the format of pasted json and turns it into the model used here.
 * It reads a piece from the other tool, the sheet archive and the sheet warehouse.
 * Null for anything else.
 *
 * The sheet-building services put out the format of the other tool, so this one dispatcher
 * covers a great many of them.
 */
export function parseImportedCharacterJson(json: unknown, systemHint?: string): ImportedCharacter | null {
  if (isCcfoliaCharacter(json)) return parseCcfoliaCharacter(json);
  if (isCharasheetAr2eCharacter(json)) return buildCharasheetAr2eCharacter(json);
  if (isCharasheetCharacter(json)) return parseCharasheetCharacterForSystem(json);
  if (isAppspotCharacter(json)) return parseAppspotCharacterForSystem(json, systemHint);
  if (isYtsheetAr2eCharacter(json)) return buildYtsheetAr2eCharacter(json);
  if (isYtsheetSw25Character(json)) return buildYtsheetSw25Character(json);
  if (isYtsheetCharacter(json)) return parseYtsheetCharacter(json);
  return null;
}

/**
 * Parses pasted text as json and hands it to `parseImportedCharacterJson`. Null for blank text,
 * text that is not json, or json in no known format.
 *
 * No system hint goes with it, so a warehouse character is read by the general parser rather than a
 * system profile.
 */
export function parseImportedCharacterText(text: string): ImportedCharacter | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  return parseImportedCharacterJson(parsed);
}
