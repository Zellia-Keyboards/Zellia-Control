import { Keycode as EmiKeycode, KeyModifier } from 'emi-keyboard-controller';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Keycode } from '../../device/model/types';
import { decodeKeycode, findAction, kc } from '../../keycodes';
import { DksAction, getIntervals } from './dks-bitmap';
import { decodeKeyControl, encodeKeyControl } from './dks-codec';
import {
  DKS_ACTUATION_MM,
  DKS_EMPTY_EDITOR,
  DKS_RESET_PRESET,
  TAP_HOLD_DEFAULTS,
  TOGGLE_DEFAULT_BINDING,
  bottomOutMmOf,
  dksBindingLabel,
  strokeBindings,
  strokeDistances,
} from './defaults';

const { Hold: H, Press: P, Release: R, Tap: T } = DksAction;

describe('DKS stroke distances (D14)', () => {
  it('presses and releases at the 1.5 mm actuation point and at the bottom-out point', () => {
    expect(DKS_ACTUATION_MM).toBe(1.5);
    // Svelte dksApplyConfiguration: begin/fully at actuation/bottom-out, mirrored on release.
    expect(strokeDistances(DKS_ACTUATION_MM, 4)).toEqual({
      pressBegin: 0.375,
      pressFully: 1,
      releaseBegin: 1,
      releaseFully: 0.375,
    });
    expect(strokeDistances(1, 3)).toEqual({
      pressBegin: 0.25,
      pressFully: 0.75,
      releaseBegin: 0.75,
      releaseFully: 0.25,
    });
  });

  it('reads the bottom-out point back from device distances', () => {
    expect(bottomOutMmOf(strokeDistances(DKS_ACTUATION_MM, 3.2))).toBeCloseTo(3.2, 12);
    expect(
      bottomOutMmOf({ pressBegin: 0.25, pressFully: 0.75, releaseBegin: 0.75, releaseFully: 0.25 })
    ).toBe(3);
  });
});

describe('DKS editor presets', () => {
  it('starts an unconfigured key with unset bindings, released nodes and a 3.0 mm bottom-out', () => {
    expect(DKS_EMPTY_EDITOR).toEqual({
      bindings: [null, null, null, null],
      bitmaps: [
        [R, R, R, R],
        [R, R, R, R],
        [R, R, R, R],
        [R, R, R, R],
      ],
      bottomOutMm: 3,
    });
    expect(DKS_EMPTY_EDITOR.bitmaps.map(encodeKeyControl)).toEqual([0, 0, 0, 0]);
  });

  it('labels binding buttons like Svelte (`name || keycode`): unset blank, a picked None "None"', () => {
    // Svelte: unset bindings were '' and their buttons blank; a picked None was '0' and read "None".
    expect(DKS_EMPTY_EDITOR.bindings.map(dksBindingLabel)).toEqual(['', '', '', '']);
    expect(dksBindingLabel(kc.none)).toBe('None');
    expect(dksBindingLabel(kc.key(EmiKeycode.Escape))).toBe('Esc');
    // A keycode the picker does not offer (e.g. set by another tool) shows its number.
    expect(findAction(0x1234)).toBeUndefined();
    expect(dksBindingLabel(0x1234)).toBe('4660');
  });

  it('sends unset bindings as no key (like the Svelte editor)', () => {
    expect(strokeBindings(DKS_EMPTY_EDITOR.bindings)).toEqual([0, 0, 0, 0]);
    expect(strokeBindings([null, EmiKeycode.Escape, null, kc.none])).toEqual([
      0,
      EmiKeycode.Escape,
      0,
      0,
    ]);
    expect(strokeBindings(DKS_RESET_PRESET.bindings)).toEqual(DKS_RESET_PRESET.bindings);
  });

  it('resets to Esc/Enter/Space/Backspace with the Svelte preset bitmaps and a 4.0 mm bottom-out', () => {
    expect(DKS_RESET_PRESET).toEqual({
      bindings: [EmiKeycode.Escape, EmiKeycode.Enter, EmiKeycode.Spacebar, EmiKeycode.Backspace],
      bitmaps: [
        [P, H, H, R],
        [T, H, H, H],
        [P, P, H, R],
        [H, H, H, H],
      ],
      bottomOutMm: 4,
    });
    // The Svelte preset stored the strings 'esc', 'enter', … and showed them verbatim.
    expect(DKS_RESET_PRESET.bindings.map(dksBindingLabel)).toEqual([
      'Esc',
      'Enter',
      'Space',
      'Backspace',
    ]);
  });
});

describe('DKS Reset preset on the device', () => {
  it('reloads with the Space binding’s touching intervals merged into one press', () => {
    const reloaded = DKS_RESET_PRESET.bitmaps.map(bitmap =>
      decodeKeyControl(encodeKeyControl(bitmap))
    );
    // What the editor draws (Esc, Enter, Space, Backspace): only Space changes, because the
    // firmware cannot release and re-press at stage 1.
    expect(DKS_RESET_PRESET.bitmaps.map(getIntervals)).toEqual([
      [[0, 3]],
      [[0, 0]],
      [
        [0, 1],
        [1, 3],
      ],
      [],
    ]);
    expect(reloaded.map(getIntervals)).toEqual([[[0, 3]], [[0, 0]], [[0, 3]], []]);
    // Idle nodes read back as released; they are drawn the same.
    expect(reloaded).toEqual([
      [P, H, H, R],
      [T, R, R, R],
      [P, H, H, R],
      [R, R, R, R],
    ]);
  });
});

describe('tap-hold and toggle defaults', () => {
  it('holds Left Ctrl as a full keycode (D15) and taps Esc after 150 ms', () => {
    expect(TAP_HOLD_DEFAULTS).toEqual({
      tap: EmiKeycode.Escape,
      hold: KeyModifier.KeyLeftCtrl << 8,
      holdDelayMs: 200,
      tapTimeoutMs: 150,
    });
    // The Svelte default hold action 0xE0 is not an EMI keycode (reserved low byte).
    expect(decodeKeycode(0xe0).category).toBe('reserved');
    expect(decodeKeycode(TAP_HOLD_DEFAULTS.hold)).toEqual({
      category: 'modifier',
      modifiers: KeyModifier.KeyLeftCtrl,
    });
    expect(findAction(TAP_HOLD_DEFAULTS.hold)?.name).toBe('Left Ctrl');
  });

  it('types the tap-hold defaults as editable values, not literals', () => {
    // `useState(TAP_HOLD_DEFAULTS.holdDelayMs)` must accept any other delay.
    expectTypeOf(TAP_HOLD_DEFAULTS.tap).toEqualTypeOf<Keycode>();
    expectTypeOf(TAP_HOLD_DEFAULTS.hold).toEqualTypeOf<Keycode>();
    expectTypeOf(TAP_HOLD_DEFAULTS.holdDelayMs).toEqualTypeOf<number>();
    expectTypeOf(TAP_HOLD_DEFAULTS.tapTimeoutMs).toEqualTypeOf<number>();
  });

  it('toggles Caps Lock by default', () => {
    expect(TOGGLE_DEFAULT_BINDING).toBe(EmiKeycode.CapsLock);
    expect(findAction(TOGGLE_DEFAULT_BINDING)?.name).toBe('Caps Lock');
  });
});
