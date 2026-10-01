/** The keys a macro action can play, and their names in the action table. */
import type { Keycode } from '../../device/model/types';
import {
  ACTION_CATEGORIES,
  describeKeycode,
  findAction,
  type ActionCategory,
} from '../../keycodes';

/** The Dynamic Keys picker's catalog without "None": keycode 0 ends a macro (`macro_process`). */
export const MACRO_KEY_CATEGORIES: readonly ActionCategory[] = ACTION_CATEGORIES.map(category => ({
  ...category,
  actions: category.actions.filter(action => action.keycode !== 0),
}));

/** The picker's name of a key, else its keycap name with modifiers, else its keycode in hex. */
export function macroKeyName(keycode: Keycode): string {
  const action = findAction(keycode);
  if (action) return action.name;
  const { main, sub } = describeKeycode(keycode);
  const name = [sub.trim(), main.trim()].filter(part => part !== '').join(' ');
  return name || `0x${keycode.toString(16).toUpperCase().padStart(4, '0')}`;
}
