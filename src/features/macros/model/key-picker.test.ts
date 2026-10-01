import { Keycode, KeyModifier, MouseKeycode } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import { ACTION_CATEGORIES, kc } from '../../keycodes';
import { MACRO_KEY_CATEGORIES, macroKeyName } from './key-picker';

describe('macro key picker', () => {
  it('offers the Dynamic Keys catalog without "None" (keycode 0 ends a macro)', () => {
    expect(MACRO_KEY_CATEGORIES.map(category => category.name)).toEqual(
      ACTION_CATEGORIES.map(category => category.name)
    );
    const keycodes = MACRO_KEY_CATEGORIES.flatMap(category =>
      category.actions.map(action => action.keycode)
    );
    expect(keycodes).not.toContain(0);
    expect(keycodes).toContain(Keycode.A);
  });

  it('names keys by the picker, else by their keycap with modifiers, else in hex', () => {
    expect(macroKeyName(Keycode.A)).toBe('A');
    expect(macroKeyName(kc.modifier(KeyModifier.KeyLeftShift))).toBe('Left Shift');
    expect(macroKeyName(kc.mouse(MouseKeycode.MouseRButton))).toBe('Mouse Right');
    expect(macroKeyName(kc.withModifiers(Keycode.C, KeyModifier.KeyLeftCtrl))).toBe('Left Ctrl C');
    expect(macroKeyName(0x00b5)).toBe('0x00B5');
  });
});
