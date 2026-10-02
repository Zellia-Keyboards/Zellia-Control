import type { Keycode } from '../../device';
import { findAction } from '../../keycodes';

/**
 * Key names in the dynamic-key editors, exactly as the Svelte app showed them. Its lookups
 * indexed the raw KLE JSON (`JSON.parse(get_layout_json())[id]`), i.e. layout rows, which have no
 * `labels`, so every lookup fell back to these names.
 */

/** Tap-hold and toggle (selected key and configured lists). */
export function keyIndexName(id: number): string {
  return `Key ${id}`;
}

/** Dashboard table, DKS editor and null bind. */
export const UNKNOWN_KEY_NAME = 'Unknown';

/** An action's picker name, else its keycode (Svelte `keyActions.find(…)?.name || keycode`). */
export function actionName(keycode: Keycode): string {
  return findAction(keycode)?.name ?? String(keycode);
}

/** An action's picker name, else its keycode in hex (the configured lists' `0x…` fallback). */
export function actionNameOrHex(keycode: Keycode): string {
  return findAction(keycode)?.name ?? `0x${keycode.toString(16).toUpperCase()}`;
}
