import {
  CalibrationMode,
  DynamicKeyMutexMode,
  KeyMode,
  RGBMode,
  ZelliaStarlightController,
} from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import type {
  AdvancedKeyConfig,
  DynamicKeyKind,
  DynamicKeySlot,
  RgbKeyConfig,
} from '../../device/model/types';
import recording from './__fixtures__/svelte-labels.json';
import { lightingLabels, performanceLabels, remapLabels, type KeyLabels } from './labels';
import { parseLayout, visibleKeys, type LayoutKey } from './layout';

const EMPTY = ['', '', '', '', '', '', '', '', '', '', '', ''];

/** The enum member equal to a recorded number. */
function member<E extends number>(
  enumObject: Readonly<Record<string, string | E>>,
  value: number
): E {
  const members = Object.values(enumObject).filter(
    (candidate): candidate is E => typeof candidate === 'number'
  );
  const numbers: readonly number[] = members;
  const found = members[numbers.indexOf(value)];
  if (found === undefined) throw new Error(`no enum member ${value}`);
  return found;
}

const KINDS: readonly DynamicKeyKind[] = ['none', 'stroke', 'modTap', 'toggle', 'mutex'];
function dynamicKeyKind(value: string): DynamicKeyKind {
  const kind = KINDS.find(candidate => candidate === value);
  if (kind === undefined) throw new Error(`no dynamic key kind ${value}`);
  return kind;
}

/** `labels` with the given slots filled. */
function withSlots(slots: Record<number, string>): string[] {
  return EMPTY.map((empty, slot) => slots[slot] ?? empty);
}

function advancedKey(overrides: Partial<AdvancedKeyConfig>): AdvancedKeyConfig {
  return {
    mode: KeyMode.KeyAnalogNormalMode,
    calibrationMode: CalibrationMode.KeyAutoCalibrationUndefined,
    activation: 0.5,
    deactivation: 0.49,
    triggerDistance: 0.08,
    releaseDistance: 0.08,
    triggerSpeed: 0.01,
    releaseSpeed: 0.01,
    upperDeadzone: 0,
    lowerDeadzone: 0.2,
    upperBound: 2600,
    lowerBound: 140,
    ...overrides,
  };
}

function slotOfKind(kind: DynamicKeyKind): DynamicKeySlot {
  switch (kind) {
    case 'none':
      return { kind };
    case 'stroke':
      return {
        kind,
        bindings: [0, 0, 0, 0],
        keyControl: [0, 0, 0, 0],
        distances: { pressBegin: 0.25, pressFully: 0.75, releaseBegin: 0.75, releaseFully: 0.25 },
        target: null,
      };
    case 'modTap':
      return { kind, tap: 0x29, hold: 0x0100, durationMs: 150, target: null };
    case 'toggle':
      return { kind, binding: 0x39, target: null };
    case 'mutex':
      return {
        kind,
        bindings: [0x04, 0x07],
        mode: DynamicKeyMutexMode.DKMutexLastPriority,
        targets: [null, null],
      };
  }
}

const key = (id: number, labels: readonly string[] = EMPTY): LayoutKey => ({
  id,
  x: id,
  y: 0,
  width: 1,
  height: 1,
  rotationAngle: 0,
  rotationX: 0,
  rotationY: 0,
  labels,
  layoutGroup: null,
});

function only(labels: ReadonlyMap<number, KeyLabels>, id = 0): KeyLabels | undefined {
  return labels.get(id);
}

describe('label builders replay the recorded Svelte transformKeyboardKeys', () => {
  const keys = visibleKeys(
    parseLayout(new ZelliaStarlightController().get_layout_json()),
    recording.variant
  );
  const labelsInKeyOrder = (labels: ReadonlyMap<number, KeyLabels>) =>
    keys.map(k => labels.get(k.id));

  it('uses the same visible keys', () => {
    expect(keys.map(k => k.id)).toEqual(recording.keyIds);
  });

  it('performance', () => {
    const fields = recording.performance.advancedKeyFields;
    const advancedKeys = recording.performance.advancedKeys.map(values => {
      const value = (field: string): number => {
        const recorded = values[fields.indexOf(field)];
        if (recorded === undefined) throw new Error(`missing ${field}`);
        return recorded;
      };
      return advancedKey({
        mode: member(KeyMode, value('mode')),
        activation: value('activation'),
        deactivation: value('deactivation'),
        triggerDistance: value('triggerDistance'),
        releaseDistance: value('releaseDistance'),
        triggerSpeed: value('triggerSpeed'),
        releaseSpeed: value('releaseSpeed'),
        upperDeadzone: value('upperDeadzone'),
        lowerDeadzone: value('lowerDeadzone'),
      });
    });
    expect(labelsInKeyOrder(performanceLabels(keys, advancedKeys))).toEqual(
      recording.performance.labels
    );
  });

  it('remap, including dynamic keys, a short keymap row and a missing layer', () => {
    const dynamicKeys = recording.remap.dynamicKeyKinds.map(kind =>
      slotOfKind(dynamicKeyKind(kind))
    );
    for (const [layer, recorded] of Object.entries(recording.remap.layers)) {
      const row = recording.remap.keymap[Number(layer)];
      // Deliberate deviation: Svelte labelled modifier-only keycodes (the default Shift, Ctrl, Alt
      // and GUI keys) "No Event" with the modifiers top-left; like upstream, the modifiers are
      // now the key name.
      const expected = recorded.map((labels, index) => {
        const keycode = row?.[keys[index]?.id ?? -1];
        const modifierOnly = keycode !== undefined && keycode !== 0 && (keycode & 0xff) === 0;
        return modifierOnly ? withSlots({ 6: labels[0] ?? '' }) : labels;
      });
      expect(
        labelsInKeyOrder(remapLabels(keys, recording.remap.keymap, Number(layer), dynamicKeys))
      ).toEqual(expected);
    }
  });

  it('lighting', () => {
    const rgbKeys = recording.lighting.rgbModes.map((mode): RgbKeyConfig => ({
      mode: member(RGBMode, mode),
      color: { red: 1, green: 2, blue: 3 },
      speed: 20,
    }));
    expect(labelsInKeyOrder(lightingLabels(keys, rgbKeys))).toEqual(recording.lighting.labels);
  });
});

describe('performanceLabels', () => {
  const labelsFor = (config: Partial<AdvancedKeyConfig>) =>
    only(performanceLabels([key(0)], [advancedKey(config)]));

  it('shows actuation ↓ and release ↑ in mm for normal mode, or one ⇅ value when equal', () => {
    expect(labelsFor({ activation: 0.5, deactivation: 0.49 })).toEqual(
      withSlots({ 1: '↓2.000', 7: '↑1.960' })
    );
    expect(labelsFor({ activation: 0.375, deactivation: 0.375 })).toEqual(
      withSlots({ 4: '⇅1.500' })
    );
  });

  it('shows rapid-trigger distances with the upper ↧ and lower ↥ deadzones', () => {
    expect(
      labelsFor({
        mode: KeyMode.KeyAnalogRapidMode,
        triggerDistance: 0.05,
        releaseDistance: 0.1,
        upperDeadzone: 0.025,
        lowerDeadzone: 0.2,
      })
    ).toEqual(withSlots({ 0: '↧0.100', 1: '↓0.200', 7: '↑0.400', 8: '↥0.800' }));
  });

  it('compares the displayed (3-decimal) values, like the Svelte labels', () => {
    expect(
      labelsFor({
        mode: KeyMode.KeyAnalogRapidMode,
        triggerDistance: 0.1,
        releaseDistance: 0.10001,
      })
    ).toEqual(withSlots({ 0: '↧0.000', 4: '⇅0.400', 8: '↥0.800' }));
  });

  it('shows speeds in speed mode', () => {
    expect(
      labelsFor({ mode: KeyMode.KeyAnalogSpeedMode, triggerSpeed: 0.01, releaseSpeed: 0.02 })
    ).toEqual(withSlots({ 0: '↧0.000', 1: '↓0.040', 7: '↑0.080', 8: '↥0.800' }));
  });

  it('leaves digital keys and keys without a configuration blank', () => {
    expect(labelsFor({ mode: KeyMode.KeyDigitalMode })).toEqual(EMPTY);
    expect(only(performanceLabels([key(3)], [advancedKey({})]), 3)).toEqual(EMPTY);
  });
});

describe('remapLabels', () => {
  const keymap = [[0x0229, 0x01a6, 0x02a7, 0x09a7, 0x0200]];
  const dynamicKeys: DynamicKeySlot[] = [
    slotOfKind('none'),
    slotOfKind('stroke'),
    slotOfKind('mutex'),
  ];
  const original = withSlots({ 0: '7', 8: '0,1' });
  const labels = remapLabels(
    [key(0), key(1), key(2), key(3), key(4), key(7, original)],
    keymap,
    0,
    dynamicKeys
  );

  it('puts the modifier/category top-left and the key name bottom-left', () => {
    expect(labels.get(0)).toEqual(withSlots({ 0: 'Left Shift ', 6: 'Escape' }));
    expect(labels.get(1)).toEqual(withSlots({ 0: 'Temporarily switch to', 6: 'Layer1' }));
    // A modifier-only keycode is named by its modifiers (Svelte showed "No Event").
    expect(labels.get(4)).toEqual(withSlots({ 6: 'Left Shift ' }));
  });

  it('names a bound dynamic key by its kind and keeps the slot number in slot 9', () => {
    expect(labels.get(2)).toEqual(withSlots({ 6: 'Mutex', 9: '2' }));
    // Slot 9 has no dynamic key: the slot number is shown instead of a kind.
    expect(labels.get(3)).toEqual(withSlots({ 6: '9', 9: '9' }));
  });

  it('keeps the layout labels of keys the layer does not cover, and of every key on a missing layer', () => {
    expect(labels.get(7)).toBe(original);
    const missingLayer = remapLabels([key(0, original)], keymap, 1, dynamicKeys);
    expect(missingLayer.get(0)).toBe(original);
    expect(remapLabels([key(0, original)], [], 0, []).get(0)).toBe(original);
    // Hand-built keys with fewer label slots are padded to 12.
    expect(remapLabels([key(0, ['x'])], [], 0, []).get(0)).toEqual(withSlots({ 0: 'x' }));
  });
});

describe('lightingLabels', () => {
  it('labels the static, reactive and ripple modes in slot 3', () => {
    const modes = [
      RGBMode.RgbModeStatic,
      RGBMode.RgbModeLinear,
      RGBMode.RgbModeFadingDiamondRipple,
    ];
    const rgbKeys = [...modes, RGBMode.RgbModeCycle].map((mode): RgbKeyConfig => ({
      mode,
      color: { red: 0, green: 0, blue: 0 },
      speed: 1,
    }));
    const labels = lightingLabels([key(0), key(1), key(2), key(3), key(4)], rgbKeys);
    expect([0, 1, 2, 3, 4].map(id => labels.get(id))).toEqual([
      withSlots({ 3: 'Static' }),
      withSlots({ 3: 'reactive' }),
      withSlots({ 3: 'ripple' }),
      EMPTY,
      EMPTY, // no RGB config for key 4
    ]);
  });
});

describe('every builder', () => {
  it('returns one 12-slot label array per key id, the first key winning for duplicate ids', () => {
    const keys = [key(0, withSlots({ 0: 'first' })), key(0, withSlots({ 0: 'second' })), key(1)];
    const results = [
      performanceLabels(keys, [advancedKey({}), advancedKey({})]),
      remapLabels(keys, [], 0, []),
      lightingLabels(keys, []),
    ];
    for (const labels of results) {
      expect([...labels.keys()]).toEqual([0, 1]);
      for (const slots of labels.values()) expect(slots).toHaveLength(12);
    }
    expect(results[1]?.get(0)?.[0]).toBe('first');
  });
});
