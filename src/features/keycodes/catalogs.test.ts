import {
  ConsumerKeycode,
  JoystickKeycode,
  KeyboardConfigCode,
  KeyboardKeycode,
  KeyModifier,
  LayerControlKeycode,
  MouseKeycode,
} from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import svelteActions from './__fixtures__/svelte-key-actions.json';
import sveltePalettes from './__fixtures__/svelte-remap-palettes.json';
import { ACTION_CATEGORIES, findAction } from './actions';
import { decodeKeycode, type DecodedKeycode } from './codec';
import { describeKeycode } from './display';
import { REMAP_PALETTES, type PaletteKey } from './palettes';

type FlatPalette = 'system' | 'layer' | 'profile' | 'extension';
const FLAT_PALETTES: readonly FlatPalette[] = ['system', 'layer', 'profile', 'extension'];

/** Every Remap palette key with a readable location, in tab order. */
function allPaletteKeys(): { where: string; key: PaletteKey }[] {
  const keys = REMAP_PALETTES.basic.flatMap((row, r) =>
    row.map(key => ({ where: `basic[${r}]`, key }))
  );
  for (const palette of FLAT_PALETTES) {
    keys.push(...REMAP_PALETTES[palette].map(key => ({ where: palette, key })));
  }
  return keys;
}

function decode(key: PaletteKey | undefined): DecodedKeycode | null {
  if (key === undefined) throw new Error('palette key not found');
  return key.keycode === null ? null : decodeKeycode(key.keycode);
}

function findKey(palette: readonly PaletteKey[] | undefined, label: string): PaletteKey {
  const matches = (palette ?? []).filter(key => key.label === label);
  if (matches.length !== 1 || matches[0] === undefined) {
    throw new Error(`expected exactly one "${label}", found ${matches.length}`);
  }
  return matches[0];
}

function firstKey(palette: readonly PaletteKey[], label: string): PaletteKey {
  const match = palette.find(key => key.label === label);
  if (match === undefined) throw new Error(`no "${label}"`);
  return match;
}

const LAYER_OPS: Readonly<Record<string, LayerControlKeycode>> = {
  MO: LayerControlKeycode.LayerMomentary,
  TO: LayerControlKeycode.LayerTurnOn,
  TG: LayerControlKeycode.LayerToggle,
  // The Svelte Layer tab assigned "TT(n)" to LAYER_TURN_OFF (libamp has no tap-toggle); kept.
  TT: LayerControlKeycode.LayerTurnOff,
};

/** Layer control intended by a "MO(1)"-style label. */
function layerIntent(label: string): DecodedKeycode {
  const match = /^(MO|TO|TG|TT)\((\d)\)$/.exec(label);
  const op = match?.[1] === undefined ? undefined : LAYER_OPS[match[1]];
  if (!match?.[2] || op === undefined) throw new Error(`not a layer label: ${label}`);
  return { category: 'layer', op, layer: Number(match[2]) };
}

describe('REMAP_PALETTES', () => {
  it('keeps every tab’s labels, order and rows exactly as the Svelte tabs', () => {
    const labels = (keys: readonly { label: string }[]) => keys.map(key => key.label);
    expect(REMAP_PALETTES.basic.map(labels)).toEqual(sveltePalettes.basic.map(labels));
    for (const palette of FLAT_PALETTES) {
      expect(labels(REMAP_PALETTES[palette])).toEqual(labels(sveltePalettes[palette]));
    }
    expect(REMAP_PALETTES.basic[0]?.[14]?.label).toBe('Print\nScreen');
  });

  it('assigns the keycodes the Svelte page assigned, except the wrong encodings (D8, joystick axes)', () => {
    const recorded = [
      ...sveltePalettes.basic.flat(),
      ...FLAT_PALETTES.flatMap(palette => sveltePalettes[palette]),
    ];
    const changed = allPaletteKeys()
      .map(({ where, key }, i) => ({
        where,
        label: key.label,
        svelte: recorded[i]?.keycode,
        ours: key.keycode,
      }))
      .filter(({ svelte, ours }) => svelte !== ours);
    expect(changed).toEqual([
      // D8: PF(n) used the removed KeyboardConfig0-3 and assigned Reboot (0x00FE).
      { where: 'profile', label: 'PF(0)', svelte: 0x00fe, ours: 0x10fe },
      { where: 'profile', label: 'PF(1)', svelte: 0x00fe, ours: 0x11fe },
      { where: 'profile', label: 'PF(2)', svelte: 0x00fe, ours: 0x12fe },
      { where: 'profile', label: 'PF(3)', svelte: 0x00fe, ours: 0x13fe },
      // D8: placeholders without a firmware equivalent are inert (were debug-off / Reboot).
      { where: 'profile', label: '↔ PF', svelte: 0x20fe, ours: null },
      { where: 'profile', label: '↔ PF1', svelte: 0x00fe, ours: null },
      { where: 'profile', label: '→ PF', svelte: 0x20fe, ours: null },
      { where: 'profile', label: '← PF', svelte: 0x20fe, ours: null },
      // JoystickKeycode kinds live in sub bits 5..7; the Svelte values meant buttons 1 and 2.
      { where: 'extension', label: 'Joy\nPositive', svelte: 0x01aa, ours: 0x20aa },
      { where: 'extension', label: 'Joy\nNegative', svelte: 0x02aa, ours: 0x40aa },
      // D8: used the removed KeyboardConfig enum and assigned Reboot.
      { where: 'extension', label: 'NKRO\nToggle', svelte: 0x00fe, ours: 0xa1fe },
    ]);
  });

  it('decodes every Basic key to a HID key, modifier, layer key or none', () => {
    for (const row of REMAP_PALETTES.basic) {
      for (const key of row) {
        expect(['key', 'modifier', 'layer', 'none']).toContain(decode(key)?.category);
      }
    }
    const bottomRow = REMAP_PALETTES.basic[5];
    expect(decode(findKey(REMAP_PALETTES.basic[4], 'L Shift'))).toEqual({
      category: 'modifier',
      modifiers: KeyModifier.KeyLeftShift,
    });
    expect(decode(findKey(bottomRow, 'R Ctrl'))).toEqual({
      category: 'modifier',
      modifiers: KeyModifier.KeyRightCtrl,
    });
    expect(decode(findKey(bottomRow, 'Fn'))).toEqual(layerIntent('MO(1)'));
    expect(decode(findKey(REMAP_PALETTES.basic[0], 'None'))).toEqual({ category: 'none' });
  });

  it('decodes every System key to a named consumer usage', () => {
    for (const key of REMAP_PALETTES.system) {
      const decoded = decode(key);
      expect(decoded?.category).toBe('consumer');
      expect(Object.values(ConsumerKeycode)).toContain(
        decoded?.category === 'consumer' ? decoded.sub : -1
      );
    }
    expect(decode(findKey(REMAP_PALETTES.system, 'Vol-'))).toEqual({
      category: 'consumer',
      sub: ConsumerKeycode.ConsumerAudioVolDown,
    });
  });

  it('decodes every Layer key to the operation and layer its label names', () => {
    for (const key of REMAP_PALETTES.layer) {
      expect(decode(key)).toEqual(layerIntent(key.label));
    }
  });

  it('decodes PF(n) to profile selection n and keeps the four placeholders inert (D8)', () => {
    expect(REMAP_PALETTES.profile.slice(0, 4).map(decode)).toEqual(
      [
        KeyboardKeycode.KeyboardProfile0,
        KeyboardKeycode.KeyboardProfile1,
        KeyboardKeycode.KeyboardProfile2,
        KeyboardKeycode.KeyboardProfile3,
      ].map(op => ({ category: 'keyboardOperation', op }))
    );
    expect(REMAP_PALETTES.profile.slice(4)).toEqual([
      { label: '↔ PF', keycode: null },
      { label: '↔ PF1', keycode: null },
      { label: '→ PF', keycode: null },
      { label: '← PF', keycode: null },
    ]);
  });

  it('decodes every Extension key to its intended action', () => {
    const extension = (label: string) => decode(findKey(REMAP_PALETTES.extension, label));
    const mouse: Record<string, MouseKeycode> = {
      'Mouse\nLeft': MouseKeycode.MouseLButton,
      'Mouse\nRight': MouseKeycode.MouseRButton,
      'Mouse\nMiddle': MouseKeycode.MouseMButton,
      'Mouse\nForward': MouseKeycode.MouseForward,
      'Mouse\nBack': MouseKeycode.MouseBack,
      'Wheel\nUp': MouseKeycode.MouseWheelUp,
      'Wheel\nDown': MouseKeycode.MouseWheelDown,
      'Wheel\nLeft': MouseKeycode.MouseWheelLeft,
      'Wheel\nRight': MouseKeycode.MouseWheelRight,
      'Move\nUp': MouseKeycode.MouseMoveUp,
      'Move\nDown': MouseKeycode.MouseMoveDown,
      'Move\nLeft': MouseKeycode.MouseMoveLeft,
      'Move\nRight': MouseKeycode.MouseMoveRight,
    };
    for (const [label, sub] of Object.entries(mouse)) {
      expect(extension(label)).toEqual({ category: 'mouse', sub });
    }
    const joystick = (kind: JoystickKeycode) => ({ category: 'joystick', kind, index: 0 });
    expect(extension('Joy\nButton')).toEqual(joystick(JoystickKeycode.JoystickButton));
    expect(extension('Joy\nPositive')).toEqual(joystick(JoystickKeycode.JoystickPositive));
    expect(extension('Joy\nNegative')).toEqual(joystick(JoystickKeycode.JoystickNegative));
    const operation = (op: KeyboardKeycode) => ({ category: 'keyboardOperation', op });
    expect(extension('Reboot')).toEqual(operation(KeyboardKeycode.KeyboardReboot));
    // D8: "Recovery" keeps its Svelte meaning (jump to bootloader).
    expect(extension('Recovery')).toEqual(operation(KeyboardKeycode.KeyboardBootloader));
    expect(extension('Reset')).toEqual(operation(KeyboardKeycode.KeyboardFactoryReset));
    expect(extension('NKRO\nToggle')).toEqual({
      category: 'keyboardConfig',
      action: 'toggle',
      config: KeyboardConfigCode.KeyboardConfigNkro,
    });
    expect(extension('Transparent')).toEqual({ category: 'transparent' });
    expect(extension('Dynamic\nKey')).toEqual({ category: 'dynamicKey', slot: 0 });
  });
});

describe('ACTION_CATEGORIES', () => {
  it('keeps the Svelte picker’s categories, names and order', () => {
    expect(ACTION_CATEGORIES.map(category => category.name)).toEqual([
      'Basic',
      'Layer',
      'System',
      'Mouse',
    ]);
    for (const category of ACTION_CATEGORIES) {
      expect(category.actions.map(action => action.name)).toEqual(
        svelteActions.actions
          .filter(action => action.category === category.name)
          .map(action => action.name)
      );
    }
  });

  it('emits full keycodes: Svelte’s for plain keys, sub-coded encodings for the rest (D15)', () => {
    const emitted = new Map(svelteActions.actions.map(action => [action.name, action.keycode]));
    const corrected = ACTION_CATEGORIES.flatMap(category => category.actions).filter(
      action => emitted.get(action.name) !== action.keycode
    );
    const modifiers = corrected.filter(
      action => decodeKeycode(action.keycode).category === 'modifier'
    );
    expect(modifiers.map(action => [action.name, action.keycode])).toEqual([
      ['Left Ctrl', KeyModifier.KeyLeftCtrl << 8],
      ['Right Ctrl', KeyModifier.KeyRightCtrl << 8],
      ['Left Shift', KeyModifier.KeyLeftShift << 8],
      ['Right Shift', KeyModifier.KeyRightShift << 8],
      ['Left Alt', KeyModifier.KeyLeftAlt << 8],
      ['Right Alt', KeyModifier.KeyRightAlt << 8],
      ['Left Win', KeyModifier.KeyLeftGui << 8],
      ['Right Win', KeyModifier.KeyRightGui << 8],
    ]);
    const layer = ACTION_CATEGORIES.find(category => category.name === 'Layer');
    const system = ACTION_CATEGORIES.find(category => category.name === 'System');
    const mouse = ACTION_CATEGORIES.find(category => category.name === 'Mouse');
    expect(corrected.map(action => action.name)).toEqual([
      ...modifiers.map(action => action.name),
      ...(layer?.actions ?? []).map(action => action.name),
      ...(system?.actions ?? []).filter(a => a.name !== 'Transparent').map(a => a.name),
      // MouseLButton is 0, so the bare 0xA5 Svelte emitted for "Mouse Left" was already right.
      ...(mouse?.actions ?? []).filter(a => a.name !== 'Mouse Left').map(a => a.name),
    ]);
    for (const action of layer?.actions ?? []) {
      expect(decodeKeycode(action.keycode)).toEqual(layerIntent(action.name));
    }
    for (const action of system?.actions ?? []) {
      expect(['consumer', 'transparent']).toContain(decodeKeycode(action.keycode).category);
    }
    for (const action of mouse?.actions ?? []) {
      expect(decodeKeycode(action.keycode).category).toBe('mouse');
      expect(describeKeycode(action.keycode).main).not.toBe('Mouse');
    }
  });

  it('never assigns one keycode to two actions, so findAction is unambiguous', () => {
    const actions = ACTION_CATEGORIES.flatMap(category => category.actions);
    expect(new Set(actions.map(action => action.keycode)).size).toBe(actions.length);
    for (const action of actions) expect(findAction(action.keycode)).toBe(action);
    expect(findAction(0x1234)).toBeUndefined();
  });
});

describe('the Remap palettes and the advanced-key picker', () => {
  it('encode every shared key identically', () => {
    const normalize = (label: string) => label.replace(/\n/g, ' ');
    const remapKeys = allPaletteKeys().map(({ key }) => key);
    const actions = ACTION_CATEGORIES.flatMap(category => category.actions);
    const pairs = new Map<string, PaletteKey>();
    // Same label (newlines aside), when the label is unique in both catalogs.
    for (const action of actions) {
      const matches = remapKeys.filter(key => normalize(key.label) === action.name);
      if (matches.length === 1 && matches[0] !== undefined) pairs.set(action.name, matches[0]);
    }
    // Differently labelled or ambiguous labels, located by tab row.
    const basic = REMAP_PALETTES.basic;
    const aliases: [string, PaletteKey][] = [
      ['Enter', findKey(basic[3], 'Enter')],
      ['5', findKey(basic[1], '5')],
      ['-', findKey(basic[1], '-')],
      ['=', findKey(basic[1], '=')],
      ['\\', findKey(basic[2], '\\')],
      ['.', findKey(basic[4], '.')],
      ['/', findKey(basic[4], '/')],
      ['Home', findKey(basic[1], 'Home')],
      ['Pause', findKey(basic[0], 'Pause\nBreak')],
      ['Space', findKey(basic[5], 'Space')],
      ['Left Ctrl', findKey(basic[5], 'L Ctrl')],
      ['Right Ctrl', findKey(basic[5], 'R Ctrl')],
      ['Left Shift', findKey(basic[4], 'L Shift')],
      ['Right Shift', findKey(basic[4], 'R Shift')],
      ['Left Alt', findKey(basic[5], 'L Alt')],
      ['Right Alt', findKey(basic[5], 'R Alt')],
      ['Left Win', findKey(basic[5], 'L Win')],
      ['KP /', findKey(basic[6], '/')],
      ['KP *', findKey(basic[6], '*')],
      ['KP -', findKey(basic[6], '-')],
      ['KP +', findKey(basic[6], '+')],
      ['KP Enter', findKey(basic[6], 'Enter')],
      ['KP 7', findKey(basic[6], '7\nHome')],
      ['KP 8', findKey(basic[6], '↑\n8')],
      ['KP 9', findKey(basic[6], '9\nPgUp')],
      ['KP 4', findKey(basic[6], '4 ←')],
      ['KP 5', findKey(basic[6], '5')],
      ['KP 6', findKey(basic[6], '→ 6')],
      ['KP 1', findKey(basic[6], '1\nEnd')],
      ['KP 2', findKey(basic[6], '2\n↓')],
      ['KP 3', findKey(basic[6], '3\nPgDn')],
      ['KP 0', findKey(basic[6], '0\nIns')],
      ['KP .', findKey(basic[6], '.\nDel')],
      ['Non-US #', findKey(basic[7], 'Non-US \\:')],
      ['Non-US \\', findKey(basic[7], '\\')],
      ['IME On', findKey(basic[7], 'ImeOn')],
      ['IME Off', findKey(basic[7], 'ImeOff')],
      ['Play/Pause', findKey(REMAP_PALETTES.system, 'Play\nPause')],
      // Both System "Stop" keys are the transport stop.
      ['Stop', firstKey(REMAP_PALETTES.system, 'Stop')],
    ];
    for (const [name, key] of aliases) pairs.set(name, key);

    for (const action of actions) {
      const key = pairs.get(action.name);
      if (key)
        expect({ name: action.name, keycode: key.keycode }).toEqual({
          name: action.name,
          keycode: action.keycode,
        });
    }
    // The only picker action without a Remap counterpart.
    expect(actions.filter(action => !pairs.has(action.name)).map(action => action.name)).toEqual([
      'Right Win',
    ]);
  });
});
