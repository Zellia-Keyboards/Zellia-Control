import { KeyboardConfigCode, KeyboardKeycode, KeyModifier } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import recording from './__fixtures__/svelte-keycode-display.json';
import { kc } from './codec';
import { DYNAMIC_KEY_KIND_NAMES, describeKeycode, type KeycodeDescription } from './display';

/** Same hash as record-svelte-baseline.mjs. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Operations the Svelte table could not name: it was keyed by the removed
 * `KeyboardKeycode.KeyboardConfig0-3` (all `undefined` at runtime), so these fell back to
 * 'Keyboard'. Lookup is by the full sub-code, exactly like the Svelte code.
 */
const OPERATIONS_NAMED_SINCE_SVELTE: ReadonlySet<number> = new Set<number>([
  KeyboardKeycode.KeyboardCalibrate,
  KeyboardKeycode.KeyboardRecovery,
  KeyboardKeycode.KeyboardProfile0,
  KeyboardKeycode.KeyboardProfile1,
  KeyboardKeycode.KeyboardProfile2,
  KeyboardKeycode.KeyboardProfile3,
]);

/** What the Svelte app rendered for `keycode`, given our (corrected) description. */
function asSvelteRendered(keycode: number, ours: KeycodeDescription): KeycodeDescription {
  // Script keycodes: the Svelte table had no ScriptCollection names (named since the macros and
  // scripts spec, like upstream's keyCodeToString).
  if ((keycode & 0xff) === 0xae) return { main: '', sub: '' };
  // Modifier-only: the Svelte port dropped upstream's rule and named the missing key "No Event".
  if ((keycode & 0xff) === 0 && keycode !== 0) return { main: 'No Event', sub: ours.main };
  if ((keycode & 0xff) !== 0xfe) return ours;
  const sub = (keycode >> 8) & 0xff;
  if ((sub & 0x3f) < 0x20) {
    return OPERATIONS_NAMED_SINCE_SVELTE.has(sub) ? { main: 'Keyboard', sub: '' } : ours;
  }
  // Config names came from the removed `KeyboardConfig` enum: every lookup missed.
  return { main: '', sub: ours.sub };
}

describe('describeKeycode', () => {
  it('matches the recorded Svelte keyCodeToString for all 65536 keycodes (removed-enum names excepted)', () => {
    const hashes: string[] = [];
    for (let code = 0; code <= 0xff; code++) {
      let text = '';
      for (let sub = 0; sub <= 0xff; sub++) {
        const keycode = code | (sub << 8);
        const rendered = asSvelteRendered(keycode, describeKeycode(keycode));
        text += `${rendered.main}\u001f${rendered.sub}\u001e`;
      }
      hashes.push(fnv1a(text));
    }
    const differing = hashes
      .map((hash, code) => (hash === recording.hashes[code] ? null : `0x${code.toString(16)}`))
      .filter(code => code !== null);
    expect(differing).toEqual([]);
  });

  it('names Calibrate, Recovery and Profile 0-3 from the current KeyboardKeycode (Svelte used the removed KeyboardConfig0-3 and showed "Keyboard")', () => {
    expect(describeKeycode(kc.keyboardOperation(KeyboardKeycode.KeyboardCalibrate))).toEqual({
      main: 'Calibrate',
      sub: '',
    });
    expect(describeKeycode(kc.keyboardOperation(KeyboardKeycode.KeyboardRecovery))).toEqual({
      main: 'Recovery',
      sub: '',
    });
    expect([0, 1, 2, 3].map(n => describeKeycode(kc.profile(n as 0 | 1 | 2 | 3)).main)).toEqual([
      'Profile 0',
      'Profile 1',
      'Profile 2',
      'Profile 3',
    ]);
  });

  it('names a modifier-only keycode by its modifiers, like upstream keyCodeToString (Svelte showed "No Event")', () => {
    // The default Starlight keymap stores Shift/Ctrl/Alt/GUI keys this way (modifier << 8).
    expect(describeKeycode(kc.modifier(KeyModifier.KeyLeftShift))).toEqual({
      main: 'Left Shift ',
      sub: '',
    });
    expect(describeKeycode(0x0f00)).toEqual({
      main: 'Left Ctrl Left Shift Left Alt Left GUI ',
      sub: '',
    });
    expect(describeKeycode(kc.none)).toEqual({ main: 'No Event', sub: '' });
  });

  it('names keyboard configs from KeyboardConfigCode (Svelte used the removed KeyboardConfig enum and showed no name)', () => {
    const toggle = (config: KeyboardConfigCode) =>
      describeKeycode(kc.keyboardConfig('toggle', config));
    expect(toggle(KeyboardConfigCode.KeyboardConfigDebug)).toEqual({
      main: 'Debug',
      sub: 'Toggle',
    });
    expect(toggle(KeyboardConfigCode.KeyboardConfigNkro)).toEqual({ main: 'NKRO', sub: 'Toggle' });
    expect(toggle(KeyboardConfigCode.KeyboardConfigContinousPoll).main).toBe('Continous poll');
    expect(toggle(KeyboardConfigCode.KeyboardConfigEnableReport).main).toBe('Enable Report');
    expect(toggle(KeyboardConfigCode.KeyboardConfigConsole).main).toBe('Console');
    expect(toggle(KeyboardConfigCode.KeyboardConfigNum).main).toBe('Num');
    expect(
      describeKeycode(kc.keyboardConfig('on', KeyboardConfigCode.KeyboardConfigWinlock))
    ).toEqual({ main: 'Winlock', sub: 'Turn on' });
    expect(
      describeKeycode(kc.keyboardConfig('off', KeyboardConfigCode.KeyboardConfigNkro))
    ).toEqual({ main: 'NKRO', sub: 'Turn off' });
    expect(describeKeycode(0xe0fe)).toEqual({ main: 'Debug', sub: '' }); // action bits 3
    expect(describeKeycode(0xa7fe)).toEqual({ main: '', sub: 'Toggle' }); // no config 7
  });

  it('describes each category like the Svelte keycap labels', () => {
    const cases: [number, string, string][] = [
      [0x0004, 'A', ''],
      [0x0204, 'A', 'Left Shift '],
      [0x0000, 'No Event', ''],
      [0x0200, 'Left Shift ', ''],
      [0x0f00, 'Left Ctrl Left Shift Left Alt Left GUI ', ''],
      [0x8028, 'Enter', 'Right GUI '],
      [0x00a3, 'CrSel Props', ''],
      [0x01a6, 'Layer1', 'Temporarily switch to'],
      [0x12a6, 'Layer2', 'Turn on'],
      [0x33a6, 'Layer3', 'Toggle'],
      [0x40a6, 'Layer0', ''],
      [0x00a5, 'Mouse Left Button', ''],
      [0x13a5, 'Mouse Move Right', ''],
      [0x14a5, 'Mouse', ''],
      [0x0da8, 'Play/Pause', ''],
      [0x31a8, 'Soft Key Left', ''],
      [0xffa8, 'Consumer', ''],
      [0x82a9, 'Sleep', ''],
      [0xb5a9, 'Display Toggle Int Ext', ''],
      [0x00a9, 'System', ''],
      [0x05aa, 'Joystick Button5', 'Joystick'],
      [0x20aa, 'Positive0', 'Joystick'],
      [0x41aa, 'Negative1', 'Joystick'],
      [0xe2aa, 'Whole Invert2', 'Joystick'],
      [0x80aa, '0', 'Joystick'],
      [0x03a7, '3', 'Dynamic Key'],
      [0x05fd, 'User 5', ''],
      [0x00ab, 'On', 'MIDI'],
      [0x03ab, 'NoteC0', 'MIDI'],
      [0x8fab, 'PitchBendUp', 'MIDI'],
      [0xffab, '255', 'MIDI'],
      [0x3cac, 'C5', 'MIDI Note'],
      [0x0dac, 'C♯1', 'MIDI Note'],
      [0x12ad, 'Start Recording2', 'Macro'],
      [0xf3ad, '3', 'Macro'],
      [0x00fe, 'Reboot', ''],
      [0x02fe, 'Save to flash', ''],
      [0x03fe, 'Jump to Bootloader', ''],
      [0x06fe, 'Brightness Down', ''],
      [0x09fe, 'Keyboard', ''],
      [0x45fe, 'Keyboard', ''],
      [0x00ff, '∇', ''],
      [0x01ff, '∇', 'Left Ctrl '],
      // Like upstream, the HID range check is `code < ExSel`, so ExSel itself is not named.
      [0x00a4, '', ''],
      [0x00ae, 'Watch', 'Script'],
      [0x05ae, 'Toggle', 'Script'],
      [0x06ae, '', 'Script'],
      [0x00af, '', ''],
      [0x00b0, '', ''],
    ];
    for (const [keycode, main, sub] of cases) {
      expect({ keycode, ...describeKeycode(keycode) }).toEqual({ keycode, main, sub });
    }
  });
});

describe('DYNAMIC_KEY_KIND_NAMES', () => {
  it('ports the Svelte DynamicKeyToKeyName labels per dynamic-key kind', () => {
    expect(DYNAMIC_KEY_KIND_NAMES).toEqual({
      none: 'None',
      stroke: 'Dynamic Key Stroke',
      modTap: 'Mod Tap',
      toggle: 'Toggle Key',
      mutex: 'Mutex',
    });
  });
});
