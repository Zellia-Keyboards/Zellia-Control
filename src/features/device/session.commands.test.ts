/**
 * DeviceSession commands (spec §5.3, D4–D6, D10): store patches, controller cache, and the packets
 * the virtual keyboard receives, decoded from the wire.
 */
import {
  CalibrationMode,
  DynamicKeyMutexMode,
  Keycode,
  KeyMode,
  KeyModifier,
  RGBBaseMode,
  RGBMode,
} from 'emi-keyboard-controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dynamicKeyKeycode,
  fractionToRaw,
  unreachableDynamicKeySlots,
  type HostPacket,
} from '../../testing/virtual-keyboard';
import { createDeviceStore } from './device-store';
import { readDeviceConfig } from './mapping';
import { mutexMode } from './model/mutex-mode';
import type { AdvancedKeyConfig, DeviceConfig, RgbBaseConfig, RgbKeyConfig } from './model/types';
import { COMMAND_ERRORS, createDeviceSession, keymapRuns } from './session';
import {
  controllerCacheObjects,
  createConnectedHarness,
  describePacket,
  reachableObjects,
  settle,
  waitForState,
  type SessionHarness,
} from './testing/session-harness';

let harness: SessionHarness | null = null;

async function connected(
  options: Parameters<typeof createConnectedHarness>[0] = {}
): Promise<SessionHarness> {
  harness = await createConnectedHarness(options);
  return harness;
}

beforeEach(() => {
  for (const method of ['log', 'debug', 'info', 'warn', 'error'] as const) {
    vi.spyOn(console, method).mockImplementation(() => undefined);
  }
});

afterEach(() => {
  harness?.dispose();
  harness = null;
  vi.restoreAllMocks();
});

type SetPacket = Extract<HostPacket, { op: 'set' }>;

function sets(h: SessionHarness): SetPacket[] {
  return h.packets().filter((packet): packet is SetPacket => packet.op === 'set');
}

function wire(h: SessionHarness): string[] {
  return h.packets().map(describePacket);
}

/** libamp stops at the first empty slot: every dynamic key on the keyboard must be reachable. */
function expectAllDynamicKeysRun(h: SessionHarness): void {
  expect(unreachableDynamicKeySlots(h.vk.state.active)).toEqual([]);
}

function configOf(h: SessionHarness): DeviceConfig {
  const { config } = h.state();
  if (!config) throw new Error('No configuration loaded');
  return config;
}

function keyConfig(h: SessionHarness, id: number): AdvancedKeyConfig {
  const key = configOf(h).advancedKeys[id];
  if (!key) throw new Error(`No advanced key ${id}`);
  return key;
}

const range = (start: number, end: number) =>
  Array.from({ length: end - start }, (_, index) => start + index);
const dk = dynamicKeyKeycode;

describe('keymapRuns', () => {
  it('groups consecutive keys of a layer into runs of at most 27 codes', () => {
    const entries = [...range(0, 30), 40, 41, 43].map(id => ({ layer: 1, id, keycode: id }));
    expect(keymapRuns([{ layer: 0, id: 5, keycode: 9 }, ...entries.reverse()])).toEqual([
      { layer: 0, start: 5, keycodes: [9] },
      { layer: 1, start: 0, keycodes: range(0, 27) },
      { layer: 1, start: 27, keycodes: [27, 28, 29] },
      { layer: 1, start: 40, keycodes: [40, 41] },
      { layer: 1, start: 43, keycodes: [43] },
    ]);
  });

  it('keeps the last code of a repeated key', () => {
    expect(
      keymapRuns([
        { layer: 0, id: 1, keycode: 4 },
        { layer: 0, id: 1, keycode: 5 },
        { layer: 0, id: 2, keycode: 6 },
      ])
    ).toEqual([{ layer: 0, start: 1, keycodes: [5, 6] }]);
  });
});

describe('setKeycodes', () => {
  it('writes contiguous runs of at most 27 codes to the working configuration (D10)', async () => {
    const h = await connected();
    h.session.setKeycodes(1, [5, 6, 7, 20], Keycode.A);
    expect(configOf(h).keymap[1]?.slice(5, 8)).toEqual([Keycode.A, Keycode.A, Keycode.A]);
    await settle();
    expect(wire(h)).toEqual(['set keymap 1:5 [0x0004 0x0004 0x0004]', 'set keymap 1:20 [0x0004]']);
    expect(h.vk.state.active.keymap[1]?.slice(5, 8)).toEqual([Keycode.A, Keycode.A, Keycode.A]);
    expect(h.vk.state.active.keymap[1]?.[20]).toBe(Keycode.A);

    h.vk.clearHistory();
    h.session.setKeycodes(2, range(0, 30), Keycode.B);
    await settle();
    expect(sets(h)).toEqual([
      expect.objectContaining({
        kind: 'keymap',
        layer: 2,
        start: 0,
        keycodes: range(0, 27).map(() => Keycode.B),
      }),
      expect.objectContaining({
        kind: 'keymap',
        layer: 2,
        start: 27,
        keycodes: [Keycode.B, Keycode.B, Keycode.B],
      }),
    ]);
    expect(h.vk.state.active.keymap[2]?.slice(0, 30)).toEqual(range(0, 30).map(() => Keycode.B));
    // Live edits change the working configuration only; save() persists them (D9).
    expect(h.vk.state.profiles[0]?.keymap[2]?.[0]).not.toBe(Keycode.B);
  });

  it('sends nothing for keys that already have the keycode', async () => {
    const h = await connected();
    const before = h.state().config;
    h.session.setKeycodes(0, [0, 1], configOf(h).keymap[0]?.[0] ?? -1);
    h.session.setKeycodes(0, [0], Keycode.Escape);
    h.session.setKeycodes(0, [], Keycode.A);
    await settle();
    expect(wire(h)).toEqual(['set keymap 0:1 [0x0029]']);
    expect(h.state().config?.keymap[0]?.[0]).toBe(before?.keymap[0]?.[0]);
    expect(h.state().lastError).toBeNull();
  });

  it('rejects keys outside the keymap and invalid keycodes', async () => {
    const h = await connected();
    const before = h.state().config;
    h.session.setKeycodes(9, [0], Keycode.A);
    expect(h.state().lastError).toEqual({
      operation: 'setKeycodes',
      message: 'Key 0 on layer 9 is outside the keymap',
    });
    h.session.setKeycodes(0, [64], Keycode.A);
    expect(h.state().lastError?.message).toBe('Key 64 on layer 0 is outside the keymap');
    h.session.setKeycodes(0, [1], 0x10000);
    expect(h.state().lastError?.message).toBe('Keycode 65536 is out of range 0..65535');
    await settle();
    expect(h.state().config).toBe(before);
    expect(wire(h)).toEqual([]);
  });

  it('releases the dynamic key of an overwritten key and moves the last one into its slot (D4)', async () => {
    const h = await connected();
    const mutex = configOf(h).dynamicKeys[3];
    h.session.setKeycodes(0, [32], Keycode.A);
    expect(configOf(h).dynamicKeys.slice(0, 4)).toEqual([
      mutex,
      configOf(h).dynamicKeys[1],
      configOf(h).dynamicKeys[2],
      { kind: 'none' },
    ]);
    expect(configOf(h).keymap[0]?.slice(31, 34)).toEqual([dk(0), Keycode.A, dk(0)]);
    await settle();
    // The mutex is written to its new slot first, its keys follow, then the old slot is freed.
    expect(wire(h)).toEqual([
      'set dynamicKey 0 mutex',
      'set keymap 0:31 [0x00a7 0x0004 0x00a7]',
      'set dynamicKey 3 none',
    ]);
    expect(h.vk.state.active.dynamicKeys.slice(0, 4)).toEqual([
      { type: 'mutex', bindings: [Keycode.D, Keycode.G], keyIds: [31, 33], mode: 1 },
      expect.objectContaining({ type: 'modTap' }),
      expect.objectContaining({ type: 'toggle' }),
      { type: 'none' },
    ]);
    expect(h.vk.state.active.keymap[0]?.slice(31, 34)).toEqual([dk(0), Keycode.A, dk(0)]);
    expectAllDynamicKeysRun(h);
  });

  it('releases a mutex that loses one key and gives the other key its binding back', async () => {
    const h = await connected();
    h.session.setKeycodes(0, [33], Keycode.A);
    await settle();
    expect(wire(h)).toEqual([
      'set keymap 0:31 [0x0007]',
      'set keymap 0:33 [0x0004]',
      'set dynamicKey 3 none',
    ]);
    expect(h.vk.state.active.keymap[0]?.slice(31, 34)).toEqual([Keycode.D, dk(0), Keycode.A]);
    expect(configOf(h).dynamicKeys[3]).toEqual({ kind: 'none' });
    expectAllDynamicKeysRun(h);
  });
});

describe('setAdvancedKeys', () => {
  it("sends one packet per changed key and keeps each key's own calibration", async () => {
    const h = await connected({
      prepare: vk => {
        const key = vk.state.active.advancedKeys[9];
        if (!key) throw new Error('No advanced key 9');
        vk.state.active.advancedKeys[9] = {
          ...key,
          calibrationMode: CalibrationMode.KeyAutoCalibrationPositive,
          upperBound: 3000,
          lowerBound: 100,
        };
      },
    });
    const before = configOf(h);
    const key3 = keyConfig(h, 3);
    const edited: AdvancedKeyConfig = {
      ...key3,
      mode: KeyMode.KeyAnalogSpeedMode,
      calibrationMode: CalibrationMode.KeyNoCalibration,
      activation: 0.3,
      deactivation: 0.25,
      triggerDistance: 0.1,
      upperBound: 1234,
      lowerBound: 5,
    };
    h.session.setAdvancedKeys([3, 9, 3], edited);

    const own = (key: AdvancedKeyConfig) => ({
      calibrationMode: key.calibrationMode,
      upperBound: key.upperBound,
      lowerBound: key.lowerBound,
    });
    expect(keyConfig(h, 3)).toEqual({ ...edited, ...own(key3) });
    expect(keyConfig(h, 9)).toEqual({
      ...edited,
      calibrationMode: CalibrationMode.KeyAutoCalibrationPositive,
      upperBound: 3000,
      lowerBound: 100,
    });
    expect(configOf(h).advancedKeys[4]).toBe(before.advancedKeys[4]);

    await settle();
    expect(wire(h)).toEqual(['set advancedKey 3', 'set advancedKey 9']);
    expect(sets(h)[0]).toMatchObject({
      kind: 'advancedKey',
      index: 3,
      key: {
        mode: KeyMode.KeyAnalogSpeedMode,
        calibrationMode: key3.calibrationMode,
        activation: fractionToRaw(0.3),
        deactivation: fractionToRaw(0.25),
        triggerDistance: fractionToRaw(0.1),
        releaseDistance: fractionToRaw(key3.releaseDistance),
        lowerDeadzone: fractionToRaw(key3.lowerDeadzone),
        upperBound: key3.upperBound,
        lowerBound: key3.lowerBound,
      },
    });
    expect(h.vk.state.active.advancedKeys[9]).toMatchObject({
      mode: KeyMode.KeyAnalogSpeedMode,
      activation: fractionToRaw(0.3),
      upperBound: 3000,
      lowerBound: 100,
    });

    h.vk.clearHistory();
    h.session.setAdvancedKeys([3, 9], edited);
    await settle();
    expect(wire(h)).toEqual([]);
  });

  it('rejects invalid values and unknown keys without touching anything', async () => {
    const h = await connected();
    const before = h.state().config;
    h.session.setAdvancedKeys([1], { ...keyConfig(h, 1), activation: 1.5 });
    expect(h.state().lastError).toEqual({
      operation: 'setAdvancedKeys',
      message: 'Activation 1.5 is not a fraction of travel (0..1)',
    });
    h.session.setAdvancedKeys([70], keyConfig(h, 1));
    expect(h.state().lastError?.message).toBe(COMMAND_ERRORS.noSuchKey(70));
    await settle();
    expect(h.state().config).toBe(before);
    expect(wire(h)).toEqual([]);
  });
});

describe('lighting', () => {
  const BASE: RgbBaseConfig = {
    mode: RGBBaseMode.RgbBaseModeWave,
    color: { red: 1, green: 2, blue: 3 },
    secondaryColor: { red: 4, green: 5, blue: 6 },
    speed: 42,
    direction: 270,
    density: 12,
    brightness: 200,
  };

  it('sends the base configuration', async () => {
    const h = await connected();
    h.session.setRgbBase(BASE);
    expect(configOf(h).rgbBase).toEqual(BASE);
    await settle();
    expect(sets(h)).toEqual([expect.objectContaining({ kind: 'rgbBase', config: BASE })]);
    expect(h.vk.state.active.rgbBase).toEqual(BASE);

    h.vk.clearHistory();
    h.session.setRgbBase({ ...BASE });
    await settle();
    expect(wire(h)).toEqual([]);
  });

  it('sends one packet per changed key; the last entry for a key wins', async () => {
    const h = await connected();
    const trigger: RgbKeyConfig = {
      mode: RGBMode.RgbModeTrigger,
      color: { red: 9, green: 8, blue: 7 },
      speed: 3,
    };
    const jelly: RgbKeyConfig = {
      mode: RGBMode.RgbModeJelly,
      color: { red: 1, green: 1, blue: 1 },
      speed: 5,
    };
    const unchanged = configOf(h).rgbKeys[12];
    h.session.setRgbKeys([
      { keyId: 4, config: trigger },
      { keyId: 8, config: trigger },
      { keyId: 4, config: jelly },
      ...(unchanged ? [{ keyId: 12, config: unchanged }] : []),
    ]);
    expect(configOf(h).rgbKeys[4]).toEqual(jelly);
    expect(configOf(h).rgbKeys[8]).toEqual(trigger);
    await settle();
    expect(sets(h)).toEqual([
      expect.objectContaining({ kind: 'rgbConfig', entries: [{ index: 4, config: jelly }] }),
      expect.objectContaining({ kind: 'rgbConfig', entries: [{ index: 8, config: trigger }] }),
    ]);
    expect(h.vk.state.active.rgbKeys[4]).toEqual(jelly);
    expect(h.vk.state.active.rgbKeys[8]).toEqual(trigger);
  });

  it('rejects invalid colours and unknown keys', async () => {
    const h = await connected();
    h.session.setRgbBase({ ...BASE, brightness: 300 });
    expect(h.state().lastError).toEqual({
      operation: 'setRgbBase',
      message: 'Brightness 300 is out of range 0..255',
    });
    h.session.setRgbKeys([
      {
        keyId: 1,
        config: { mode: RGBMode.RgbModeFixed, color: { red: 0, green: 0, blue: 0 }, speed: 1 },
      },
      {
        keyId: 70,
        config: { mode: RGBMode.RgbModeFixed, color: { red: 0, green: 0, blue: 0 }, speed: 1 },
      },
    ]);
    expect(h.state().lastError).toEqual({
      operation: 'setRgbKeys',
      message: COMMAND_ERRORS.noSuchKey(70),
    });
    await settle();
    expect(wire(h)).toEqual([]);
  });
});

describe('dynamic keys', () => {
  it('binds a new dynamic key to the first free slot: the slot first, then its key (D6)', async () => {
    const h = await connected();
    const slot = h.session.applyDynamicKey({
      kind: 'toggle',
      target: { layer: 1, id: 10 },
      binding: Keycode.Spacebar,
    });
    expect(slot).toBe(4);
    expect(configOf(h).dynamicKeys[4]).toEqual({
      kind: 'toggle',
      binding: Keycode.Spacebar,
      target: { layer: 1, id: 10 },
    });
    expect(configOf(h).keymap[1]?.[10]).toBe(dk(4));
    await settle();
    expect(wire(h)).toEqual(['set dynamicKey 4 toggle', 'set keymap 1:10 [0x04a7]']);
    expect(h.vk.state.active.dynamicKeys[4]).toEqual({
      type: 'toggle',
      binding: Keycode.Spacebar,
      keyId: 10,
    });
    expect(h.vk.state.active.keymap[1]?.[10]).toBe(dk(4));
    expectAllDynamicKeysRun(h);
  });

  it('writes every dynamic-key kind at the firmware offsets', async () => {
    const h = await connected();
    const stroke = h.session.applyDynamicKey({
      kind: 'stroke',
      target: { layer: 0, id: 36 },
      bindings: [Keycode.K, KeyModifier.KeyLeftShift << 8, 0, Keycode.L],
      keyControl: [0x3f, 0x04, 0, 0x01],
      distances: { pressBegin: 0.2, pressFully: 0.8, releaseBegin: 0.7, releaseFully: 0.3 },
    });
    const mutex = h.session.applyDynamicKey({
      kind: 'mutex',
      targets: [
        { layer: 0, id: 42 },
        { layer: 0, id: 43 },
      ],
      bindings: [Keycode.Z, Keycode.X],
      mode: DynamicKeyMutexMode.DKMutexKey1Priority,
    });
    const modTap = h.session.applyDynamicKey({
      kind: 'modTap',
      target: { layer: 0, id: 30 },
      tap: Keycode.S,
      hold: KeyModifier.KeyLeftAlt << 8,
      durationMs: 300,
    });
    expect([stroke, mutex, modTap]).toEqual([4, 5, 1]);
    await settle();
    expect(wire(h)).toEqual([
      'set dynamicKey 4 stroke',
      'set keymap 0:36 [0x04a7]',
      'set dynamicKey 5 mutex',
      'set keymap 0:42 [0x05a7 0x05a7]',
      'set dynamicKey 1 modTap',
    ]);
    const { dynamicKeys } = h.vk.state.active;
    expect(dynamicKeys[4]).toEqual({
      type: 'stroke',
      bindings: [Keycode.K, KeyModifier.KeyLeftShift << 8, 0, Keycode.L],
      keyControl: [0x3f, 0x04, 0, 0x01],
      pressBegin: fractionToRaw(0.2),
      pressFully: fractionToRaw(0.8),
      releaseBegin: fractionToRaw(0.7),
      releaseFully: fractionToRaw(0.3),
      keyId: 36,
    });
    expect(dynamicKeys[5]).toEqual({
      type: 'mutex',
      bindings: [Keycode.Z, Keycode.X],
      keyIds: [42, 43],
      mode: DynamicKeyMutexMode.DKMutexKey1Priority,
    });
    expect(dynamicKeys[1]).toEqual({
      type: 'modTap',
      bindings: [Keycode.S, KeyModifier.KeyLeftAlt << 8],
      duration: 300,
      keyId: 30,
    });
    expectAllDynamicKeysRun(h);
  });

  it('keeps the mutex bottom-out flag (libamp mode bits 0xF0) through load, edits and save', async () => {
    const h = await connected({
      prepare: vk => {
        const mutex = vk.state.active.dynamicKeys[3];
        if (mutex?.type !== 'mutex') throw new Error('No seeded mutex');
        vk.state.active.dynamicKeys[3] = { ...mutex, mode: 0xf1 };
      },
    });
    expect(configOf(h).dynamicKeys[3]).toMatchObject({ kind: 'mutex', mode: 0xf1 });
    h.session.setKeycodes(2, [10], Keycode.Tab);
    await h.session.save();
    await settle();
    expect(h.state().lastError).toBeNull();
    expect(h.vk.state.active.dynamicKeys[3]).toMatchObject({ type: 'mutex', mode: 0xf1 });
    expect(h.vk.state.profiles[0]?.dynamicKeys[3]).toMatchObject({ type: 'mutex', mode: 0xf1 });

    const slot = h.session.applyDynamicKey({
      kind: 'mutex',
      targets: [
        { layer: 0, id: 42 },
        { layer: 0, id: 43 },
      ],
      bindings: [Keycode.Z, Keycode.X],
      mode: mutexMode(DynamicKeyMutexMode.DKMutexNeutral, true),
    });
    expect(slot).toBe(4);
    await settle();
    expect(h.vk.state.active.dynamicKeys[4]).toMatchObject({ type: 'mutex', mode: 0xf4 });
  });

  it('rejects a dynamic key when every slot is taken', async () => {
    const h = await connected();
    for (const id of range(0, 28)) {
      h.session.applyDynamicKey({ kind: 'toggle', target: { layer: 1, id }, binding: Keycode.A });
    }
    expect(configOf(h).dynamicKeys.every(slot => slot.kind !== 'none')).toBe(true);
    await settle();
    h.vk.clearHistory();
    const before = h.state().config;

    const slot = h.session.applyDynamicKey({
      kind: 'toggle',
      target: { layer: 1, id: 40 },
      binding: Keycode.A,
    });
    expect(slot).toBeNull();
    expect(h.state().lastError).toEqual({
      operation: 'applyDynamicKey',
      message: COMMAND_ERRORS.noFreeSlot,
    });
    expect(h.state().config).toBe(before);
    await settle();
    expect(wire(h)).toEqual([]);
  });

  it('rejects drafts for keys outside the keymap', async () => {
    const h = await connected();
    expect(
      h.session.applyDynamicKey({ kind: 'toggle', target: { layer: 0, id: 99 }, binding: 4 })
    ).toBeNull();
    expect(h.state().lastError).toEqual({
      operation: 'applyDynamicKey',
      message: 'Key 99 on layer 0 is outside the keymap',
    });
  });

  it("removes a dynamic key and restores its key's own binding (D5)", async () => {
    const h = await connected();
    const mutex = configOf(h).dynamicKeys[3];
    h.session.removeDynamicKey(1);
    expect(configOf(h).keymap[0]?.[30]).toBe(Keycode.S);
    // The mutex moves from slot 3 into the freed slot 1, so the keyboard keeps running it.
    expect(configOf(h).dynamicKeys[1]).toEqual(mutex);
    expect(configOf(h).dynamicKeys[3]).toEqual({ kind: 'none' });
    await settle();
    expect(wire(h)).toEqual([
      'set dynamicKey 1 mutex',
      'set keymap 0:30 [0x0016 0x01a7]',
      'set keymap 0:33 [0x01a7]',
      'set dynamicKey 3 none',
    ]);
    expect(h.vk.state.active.keymap[0]?.slice(30, 34)).toEqual([Keycode.S, dk(1), dk(0), dk(1)]);
    expect(h.vk.state.active.dynamicKeys[1]).toMatchObject({ type: 'mutex', keyIds: [31, 33] });
    expect(h.vk.state.active.dynamicKeys[3]).toEqual({ type: 'none' });
    expectAllDynamicKeysRun(h);

    h.vk.clearHistory();
    h.session.removeDynamicKey(3);
    await settle();
    expect(wire(h)).toEqual([]);
    expect(h.state().lastError).toBeNull();
  });

  it('removes every dynamic key of a kind', async () => {
    const h = await connected();
    h.session.applyDynamicKey({
      kind: 'mutex',
      targets: [
        { layer: 0, id: 42 },
        { layer: 0, id: 43 },
      ],
      bindings: [Keycode.Z, Keycode.X],
      mode: DynamicKeyMutexMode.DKMutexNeutral,
    });
    await settle();
    h.vk.clearHistory();

    h.session.removeDynamicKeysOfKind('mutex');
    const slots = configOf(h).dynamicKeys;
    expect(slots.slice(0, 5).map(slot => slot.kind)).toEqual([
      'stroke',
      'modTap',
      'toggle',
      'none',
      'none',
    ]);
    await settle();
    // Freed from the top down, so the slots in use stay contiguous after every packet.
    expect(wire(h)).toEqual([
      'set keymap 0:31 [0x0007]',
      'set keymap 0:33 [0x000a]',
      'set keymap 0:42 [0x001d 0x001b]',
      'set dynamicKey 4 none',
      'set dynamicKey 3 none',
    ]);
    expect(h.vk.state.active.keymap[0]?.slice(42, 44)).toEqual([Keycode.Z, Keycode.X]);
    expectAllDynamicKeysRun(h);
  });

  it('keeps every dynamic key running when kinds in lower slots are removed', async () => {
    const h = await connected();
    h.session.removeDynamicKeysOfKind('stroke');
    h.session.removeDynamicKeysOfKind('toggle');
    expect(
      configOf(h)
        .dynamicKeys.slice(0, 3)
        .map(slot => slot.kind)
    ).toEqual(['mutex', 'modTap', 'none']);
    await settle();
    expect(h.vk.state.active.dynamicKeys.slice(0, 3).map(key => key.type)).toEqual([
      'mutex',
      'modTap',
      'none',
    ]);
    expect(h.vk.state.active.keymap[0]?.slice(30, 35)).toEqual([
      dk(1),
      dk(0),
      Keycode.F,
      dk(0),
      Keycode.H,
    ]);
    expectAllDynamicKeysRun(h);
  });
});

describe('command guards', () => {
  it('rejects commands without a ready keyboard', async () => {
    const store = createDeviceStore();
    const session = createDeviceSession({ hid: () => undefined, store });
    session.setKeycodes(0, [0], Keycode.A);
    expect(store.getState().lastError).toEqual({
      operation: 'setKeycodes',
      message: COMMAND_ERRORS.notConnected,
    });
    expect(
      session.applyDynamicKey({ kind: 'toggle', target: { layer: 0, id: 0 }, binding: 4 })
    ).toBeNull();
    session.systemReset();
    session.enterBootloader();
    session.factoryReset();
    session.startDebug(0);
    expect(store.getState().lastError?.operation).toBe('startDebug');
    session.stopDebug();
    await expect(session.save()).resolves.toBeUndefined();
    await expect(session.switchProfile(1)).resolves.toBeUndefined();
    expect(store.getState().connection).toEqual({ status: 'disconnected' });
  });

  it('rejects edits while the keyboard reloads its configuration', async () => {
    const h = await connected();
    const before = configOf(h);
    h.vk.notifyConfigChanged();
    await waitForState(h.store, state => state.reloading);
    h.vk.clearHistory();

    h.session.setKeycodes(1, [0], Keycode.A);
    h.session.setAdvancedKeys([0], { ...keyConfig(h, 0), activation: 0.4 });
    h.session.setRgbKeys([
      {
        keyId: 0,
        config: { mode: RGBMode.RgbModeFixed, color: { red: 1, green: 1, blue: 1 }, speed: 1 },
      },
    ]);
    expect(
      h.session.applyDynamicKey({ kind: 'toggle', target: { layer: 1, id: 1 }, binding: 4 })
    ).toBeNull();
    h.session.removeDynamicKeysOfKind('toggle');
    expect(h.state().lastError).toEqual({
      operation: 'removeDynamicKeysOfKind',
      message: COMMAND_ERRORS.reloading,
    });

    await waitForState(h.store, state => !state.reloading);
    expect(sets(h)).toEqual([]);
    expect(configOf(h).keymap).toEqual(before.keymap);
    expect(configOf(h).dynamicKeys).toEqual(before.dynamicKeys);
  });

  it('records packets the keyboard does not acknowledge, keeping the edit (D10)', async () => {
    const h = await connected();
    h.vk.dropReplies(packet => packet.op === 'set' && packet.kind === 'keymap');
    h.session.setKeycodes(3, [0], Keycode.C);
    await vi.waitFor(() => {
      expect(h.state().lastError?.operation).toBe('setKeycodes');
    });
    expect(h.state().lastError?.message).toMatch(
      /^Timeout waiting for packet id \d+, code 1, type 2$/
    );
    expect(configOf(h).keymap[3]?.[0]).toBe(Keycode.C);
  });
});

describe('isolation of the store from the controller (no aliasing)', () => {
  function expectIsolated(h: SessionHarness): void {
    const controller = h.controller();
    const storeObjects = reachableObjects(h.state());
    const cacheObjects = controllerCacheObjects(controller);
    expect([...storeObjects].filter(object => cacheObjects.has(object))).toEqual([]);
    expect([...storeObjects].filter(object => !Object.isFrozen(object))).toEqual([]);
    // The cache holds exactly what the store shows, dynamic-key targets included.
    const config = configOf(h);
    expect(readDeviceConfig(controller)).toEqual(config);
    expect(controller.get_dynamic_keys().map(key => key.target_keys_location)).toEqual(
      config.dynamicKeys.map(slot => {
        switch (slot.kind) {
          case 'none':
            return [];
          case 'mutex':
            return slot.targets.flatMap(target => (target ? [target] : []));
          default:
            return slot.target ? [slot.target] : [];
        }
      })
    );
  }

  it('holds after the load and after every command', async () => {
    const h = await connected();
    expectIsolated(h);
    h.session.setKeycodes(1, [3, 4], Keycode.Q);
    expectIsolated(h);
    h.session.setAdvancedKeys([2, 5], { ...keyConfig(h, 2), activation: 0.35 });
    expectIsolated(h);
    h.session.setRgbBase({ ...configOf(h).rgbBase, brightness: 99 });
    expectIsolated(h);
    h.session.setRgbKeys([
      {
        keyId: 6,
        config: { mode: RGBMode.RgbModeFixed, color: { red: 5, green: 6, blue: 7 }, speed: 8 },
      },
    ]);
    expectIsolated(h);
    h.session.applyDynamicKey({
      kind: 'toggle',
      target: { layer: 2, id: 7 },
      binding: Keycode.Tab,
    });
    expectIsolated(h);
    h.session.removeDynamicKey(0);
    expectIsolated(h);
    await h.session.save();
    expectIsolated(h);
    h.vk.notifyConfigChanged();
    await waitForState(h.store, state => state.reloading);
    await waitForState(h.store, state => !state.reloading);
    expectIsolated(h);
  });

  it('keeps the store unchanged when the controller cache is mutated', async () => {
    const h = await connected();
    const before: unknown = JSON.parse(JSON.stringify(h.state()));
    const controller = h.controller();
    for (const layer of controller.get_keymap()) layer.fill(0x1234);
    for (const key of controller.get_advanced_keys()) key.config.activation_value = 0.99;
    controller.get_rgb_base_config().rgb.red = 1;
    for (const config of controller.get_rgb_configs()) config.rgb.green = 2;
    for (const key of controller.get_dynamic_keys()) {
      key.bindings.fill(0x55);
      key.target_keys_location.splice(0);
    }
    controller.get_feature().rgb_flag = false;
    controller.get_firmware_version().info = 'changed';
    expect(JSON.parse(JSON.stringify(h.state()))).toEqual(before);
  });

  it('never hands store objects to the controller', async () => {
    const h = await connected();
    const draft: AdvancedKeyConfig = { ...keyConfig(h, 0), activation: 0.45 };
    h.session.setAdvancedKeys([0], draft);
    h.session.setRgbBase({ ...configOf(h).rgbBase, speed: 7 });
    const storeObjects = reachableObjects(h.state());
    const cacheObjects = controllerCacheObjects(h.controller());
    expect(cacheObjects.has(draft)).toBe(false);
    expect([...cacheObjects].filter(object => storeObjects.has(object))).toEqual([]);
    // The controller may mutate its own objects; the store must not see it.
    const key = h.controller().get_advanced_keys()[0];
    if (key) key.config.activation_value = 0.9;
    expect(keyConfig(h, 0).activation).toBe(0.45);
  });
});
