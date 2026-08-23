/**
 * DeviceSession save/flash (D9), profiles (D7), keyboard operations, bootloader detection (D3) and
 * the debug loop (D16), against the virtual keyboard.
 */
import { Keycode, RGBMode } from 'emi-keyboard-controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  KeyEvent,
  createFactoryProfile,
  decodeDeviceReport,
  dynamicKeyKeycode,
  fractionToRaw,
  rawToFraction,
  unreachableDynamicKeySlots,
  type HostPacket,
} from '../../testing/virtual-keyboard';
import type { DebugSample } from './debug-stream';
import { createDeviceStore } from './device-store';
import type { DeviceConfig } from './model/types';
import { COMMAND_ERRORS, createDeviceSession } from './session';
import {
  OPERATION_KEYCODES,
  createConnectedHarness,
  describePacket,
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

type EventPacket = Extract<HostPacket, { op: 'event' }>;

function events(h: SessionHarness): EventPacket[] {
  return h.packets().filter((packet): packet is EventPacket => packet.op === 'event');
}

function operations(h: SessionHarness): number[] {
  return events(h).map(packet => packet.keycode);
}

function debugRequests(h: SessionHarness): (readonly number[])[] {
  return h.packets().flatMap(packet => (packet.op === 'debug' ? [packet.keyIds] : []));
}

function configOf(h: SessionHarness): DeviceConfig {
  const { config } = h.state();
  if (!config) throw new Error('No configuration loaded');
  return config;
}

/** `["a", "a", "b"]` → `["a ×2", "b"]`. */
function runLengths(values: readonly string[]): string[] {
  const runs: { value: string; count: number }[] = [];
  for (const value of values) {
    const last = runs[runs.length - 1];
    if (last?.value === value) last.count += 1;
    else runs.push({ value, count: 1 });
  }
  return runs.map(({ value, count }) => (count === 1 ? value : `${value} ×${count}`));
}

/** Index of the keyboard-operation event `keycode` on the wire, and the SET packets after it. */
function setsAfterEvent(h: SessionHarness, keycode: number) {
  const packets = h.packets();
  const at = packets.findIndex(packet => packet.op === 'event' && packet.keycode === keycode);
  return { at, sets: packets.slice(at + 1).filter(packet => packet.op === 'set') };
}

function packetKinds(h: SessionHarness): string[] {
  return runLengths(
    h.packets().map(packet => (packet.op === 'set' ? `set ${packet.kind}` : describePacket(packet)))
  );
}

describe('save (D9)', () => {
  it('writes the whole configuration, then flashes it into the active profile', async () => {
    const h = await connected();
    const dynamicKeys = [...h.vk.state.active.dynamicKeys];
    h.session.setKeycodes(2, [10], Keycode.Tab);
    await settle();
    h.vk.clearHistory();

    const saving = h.session.save();
    expect(h.state().saving).toBe(true);
    await saving;
    await settle();

    expect(h.state()).toMatchObject({ saving: false, lastError: null });
    expect(packetKinds(h)).toEqual([
      'set config',
      'set advancedKey ×70',
      'set rgbBase',
      'set rgbConfig ×10',
      'set keymap ×20',
      'set dynamicKey ×32',
      'event 0x02fe',
    ]);
    expect(events(h)[0]).toMatchObject({
      event: KeyEvent.KeyDown,
      keycode: OPERATION_KEYCODES.save,
    });
    expect(h.vk.state.profiles[0]).toEqual(h.vk.state.active);
    expect(h.vk.state.profiles[0]?.keymap[2]?.[10]).toBe(Keycode.Tab);
    // Dynamic keys keep their keys: targets were rebuilt from the keymap after the load (D4).
    expect(h.vk.state.active.dynamicKeys).toEqual(dynamicKeys);
  });

  it('shares one save between concurrent calls', async () => {
    const h = await connected();
    const first = h.session.save();
    const second = h.session.save();
    expect(second).toBe(first);
    await first;
    await settle();
    expect(operations(h)).toEqual([OPERATION_KEYCODES.save]);

    await h.session.save();
    await settle();
    expect(operations(h)).toEqual([OPERATION_KEYCODES.save, OPERATION_KEYCODES.save]);
  });

  it('records a failed save and does not flash', async () => {
    const h = await connected();
    h.session.setKeycodes(2, [10], Keycode.Tab);
    await settle();
    h.vk.clearHistory();
    h.vk.dropReplies(
      packet => packet.op === 'set' && packet.kind === 'advancedKey' && packet.index === 5
    );
    await h.session.save();
    await settle();
    expect(h.state().saving).toBe(false);
    expect(h.state().lastError).toEqual({
      operation: 'save',
      message: expect.stringMatching(
        /^Timeout waiting for packet id \d+, code 1, type 1$/
      ) as string,
    });
    expect(operations(h)).toEqual([]);
    expect(h.vk.state.active.keymap[2]?.[10]).toBe(Keycode.Tab);
    expect(h.vk.state.profiles[0]?.keymap[2]?.[10]).not.toBe(Keycode.Tab);
  });

  it('frees dynamic keys whose keys were remapped on the keyboard, so the save succeeds', async () => {
    const h = await connected({
      prepare: vk => {
        vk.state.active.keymap[0]?.splice(34, 1, Keycode.F);
        vk.state.active.keymap[0]?.splice(33, 1, Keycode.D);
      },
    });
    expect(configOf(h).dynamicKeys[2]).toEqual({
      kind: 'toggle',
      binding: Keycode.F,
      target: null,
    });
    expect(configOf(h).dynamicKeys[3]).toMatchObject({
      kind: 'mutex',
      targets: [{ layer: 0, id: 31 }, null],
    });

    await h.session.save();
    expect(h.state().lastError).toBeNull();
    expect(configOf(h).dynamicKeys[2]).toEqual({ kind: 'none' });
    expect(configOf(h).dynamicKeys[3]).toEqual({ kind: 'none' });
    expect(configOf(h).keymap[0]?.[31]).toBe(Keycode.A);
    await settle();
    expect(h.vk.state.active.dynamicKeys[2]).toEqual({ type: 'none' });
    expect(h.vk.state.active.dynamicKeys[3]).toEqual({ type: 'none' });
    expect(h.vk.state.active.keymap[0]?.[31]).toBe(Keycode.A);
    expect(h.vk.state.profiles[0]).toEqual(h.vk.state.active);
  });

  it('moves dynamic keys stranded behind an empty slot so the keyboard runs them again', async () => {
    const h = await connected({
      prepare: vk => {
        // Slot 1 was freed by another tool: libamp stops at it and never runs slots 2 and 3.
        vk.state.active.dynamicKeys[1] = { type: 'none' };
        vk.state.active.keymap[0]?.splice(30, 1, Keycode.CapsLock);
      },
    });
    expect(unreachableDynamicKeySlots(h.vk.state.active)).toEqual([2, 3]);

    await h.session.save();
    await settle();
    expect(h.state().lastError).toBeNull();
    expect(
      configOf(h)
        .dynamicKeys.slice(0, 4)
        .map(slot => slot.kind)
    ).toEqual(['stroke', 'mutex', 'toggle', 'none']);
    expect(unreachableDynamicKeySlots(h.vk.state.active)).toEqual([]);
    expect(h.vk.state.active.dynamicKeys[1]).toMatchObject({ type: 'mutex', keyIds: [31, 33] });
    expect(h.vk.state.active.keymap[0]?.slice(31, 34)).toEqual([
      dynamicKeyKeycode(1),
      dynamicKeyKeycode(0),
      dynamicKeyKeycode(1),
    ]);
    expect(h.vk.state.profiles[0]).toEqual(h.vk.state.active);
  });

  it('waits for a reload in progress before writing', async () => {
    const h = await connected();
    h.vk.notifyConfigChanged();
    await waitForState(h.store, state => state.reloading);
    h.vk.clearHistory();

    await h.session.save();
    const packets = h.packets();
    const lastRead = packets.findLastIndex(packet => packet.op === 'get');
    const firstWrite = packets.findIndex(packet => packet.op === 'set');
    expect(lastRead).toBeGreaterThan(0);
    expect(firstWrite).toBeGreaterThan(lastRead);
    expect(h.state().lastError).toBeNull();
  });

  it('keeps debugging after a save rewrote the keyboard config bits', async () => {
    const h = await connected();
    h.session.startDebug(5);
    await vi.waitFor(() => {
      expect(h.vk.state.config[0]).toBe(true);
    });
    await h.session.save();
    await settle();
    const keycodes = operations(h);
    expect(keycodes.indexOf(OPERATION_KEYCODES.debugOn, 1)).toBeGreaterThan(
      keycodes.indexOf(OPERATION_KEYCODES.save)
    );
    expect(h.vk.state.config[0]).toBe(true);
  });
});

describe('profiles (D7)', () => {
  it('switches the profile and resolves once the keyboard has loaded it', async () => {
    const h = await connected();
    const switching = h.session.switchProfile(2);
    expect(h.state().reloading).toBe(true);
    h.session.setKeycodes(0, [1], Keycode.A);
    expect(h.state().lastError).toEqual({
      operation: 'setKeycodes',
      message: COMMAND_ERRORS.reloading,
    });

    await switching;
    expect(h.state()).toMatchObject({ reloading: false, config: { profileIndex: 2 } });
    expect(configOf(h).keymap[0]?.[0]).toBe(Keycode.F13 + 1);
    expect(configOf(h).keymap[0]?.[1]).toBe(Keycode.Key1);
    expect(events(h)).toEqual([
      expect.objectContaining({ event: KeyEvent.KeyDown, keycode: OPERATION_KEYCODES.profile(2) }),
    ]);
    expect(h.vk.state.profileIndex).toBe(2);
  });

  it('lets an in-flight save finish before switching, so no save packet reaches the new profile', async () => {
    const h = await connected({ keyboard: { latencyMs: 1 } });
    const profile1 = structuredClone(h.vk.state.profiles[1]);
    const key = configOf(h).advancedKeys[14];
    if (!key || !profile1) throw new Error('Missing fixture data');
    h.session.setAdvancedKeys([14], { ...key, activation: 0.9 });
    await vi.waitFor(() => {
      expect(h.vk.state.active.advancedKeys[14]?.activation).toBe(fractionToRaw(0.9));
    });
    h.vk.clearHistory();

    const saving = h.session.save();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(h.state().saving).toBe(true);
    const switching = h.session.switchProfile(1);
    expect(h.state().reloading).toBe(true);
    h.session.setKeycodes(0, [1], Keycode.A);
    expect(h.state().lastError).toEqual({
      operation: 'setKeycodes',
      message: COMMAND_ERRORS.reloading,
    });

    await Promise.all([saving, switching]);
    const flashAt = setsAfterEvent(h, OPERATION_KEYCODES.save).at;
    const { at, sets } = setsAfterEvent(h, OPERATION_KEYCODES.profile(1));
    expect(flashAt).toBeGreaterThanOrEqual(0);
    expect(at).toBeGreaterThan(flashAt);
    expect(sets).toEqual([]);
    // The save completed (not cancelled) into profile 0; profile 1 loaded exactly as stored.
    expect(h.state()).toMatchObject({
      saving: false,
      reloading: false,
      lastError: { operation: 'setKeycodes' },
      config: { profileIndex: 1 },
    });
    expect(h.vk.state.profiles[0]?.advancedKeys[14]?.activation).toBe(fractionToRaw(0.9));
    expect(h.vk.state.profiles[1]).toEqual(profile1);
    expect(h.vk.state.active).toEqual(profile1);
    expect(configOf(h).advancedKeys[14]?.activation).toBe(
      rawToFraction(profile1.advancedKeys[14]?.activation ?? -1)
    );
  });

  it('saves, then switches, when a switch is requested while a save waits for a reload', async () => {
    const h = await connected();
    h.vk.notifyConfigChanged();
    await waitForState(h.store, state => state.reloading);
    const saving = h.session.save();
    const switching = h.session.switchProfile(1);

    await Promise.all([saving, switching]);
    expect(h.state()).toMatchObject({
      saving: false,
      reloading: false,
      lastError: null,
      config: { profileIndex: 1 },
    });
    const flashAt = setsAfterEvent(h, OPERATION_KEYCODES.save).at;
    expect(flashAt).toBeGreaterThanOrEqual(0);
    expect(setsAfterEvent(h, OPERATION_KEYCODES.profile(1)).at).toBeGreaterThan(flashAt);
  });

  it('rejects profiles the keyboard does not have', async () => {
    const h = await connected();
    for (const index of [4, -1, 1.5]) {
      await h.session.switchProfile(index);
      expect(h.state().lastError).toEqual({
        operation: 'switchProfile',
        message: COMMAND_ERRORS.noSuchProfile(index),
      });
    }
    await settle();
    expect(events(h)).toEqual([]);
    expect(h.state().reloading).toBe(false);
  });

  it('gives up waiting when the keyboard never reloads after the switch', async () => {
    const h = await connected({ timeouts: { loadStartMs: 50 } });
    vi.spyOn(h.vk.device, 'sendReport').mockRejectedValueOnce(
      new DOMException('Failed to write the report.', 'NetworkError')
    );
    await h.session.switchProfile(1);
    expect(h.state()).toMatchObject({
      reloading: false,
      lastError: { operation: 'switchProfile', message: 'Keyboard did not respond' },
      config: { profileIndex: 0 },
    });
  });

  it('ends the connection when the reload after a switch fails, so nothing stale is saved', async () => {
    const h = await connected();
    const profile1 = structuredClone(h.vk.state.profiles[1]);
    h.vk.dropReplies(packet => packet.op === 'get' && packet.kind === 'rgbBase');
    await h.session.switchProfile(1);
    expect(h.state().connection).toEqual({
      status: 'error',
      message: expect.stringMatching(/^Failed to load keyboard configuration: /) as string,
    });

    // The keyboard is on profile 1 now; the old snapshot must not be written into it.
    await h.session.save();
    expect(h.state().lastError).toEqual({
      operation: 'save',
      message: COMMAND_ERRORS.notConnected,
    });
    await settle();
    expect(h.packets().filter(packet => packet.op === 'set')).toEqual([]);
    expect(h.vk.state.profiles[1]).toEqual(profile1);
  });

  it('settles a save queued behind a switch whose reload fails', async () => {
    const h = await connected();
    const profile1 = structuredClone(h.vk.state.profiles[1]);
    h.vk.dropReplies(packet => packet.op === 'get' && packet.kind === 'rgbBase');
    const switching = h.session.switchProfile(1);
    const saving = h.session.save();
    expect(h.state().saving).toBe(true);

    await Promise.all([switching, saving]);
    expect(h.state()).toMatchObject({ saving: false, connection: { status: 'error' } });
    await settle();
    expect(h.packets().filter(packet => packet.op === 'set')).toEqual([]);
    expect(h.vk.state.profiles[1]).toEqual(profile1);
  });

  it('runs a save queued behind a switch that never reached the keyboard', async () => {
    const h = await connected({ timeouts: { loadStartMs: 50 } });
    h.session.setKeycodes(2, [10], Keycode.Tab);
    await settle();
    h.vk.clearHistory();
    vi.spyOn(h.vk.device, 'sendReport').mockRejectedValueOnce(
      new DOMException('Failed to write the report.', 'NetworkError')
    );
    const switching = h.session.switchProfile(1);
    const saving = h.session.save();

    await Promise.all([switching, saving]);
    expect(h.state()).toMatchObject({
      saving: false,
      reloading: false,
      lastError: { operation: 'switchProfile', message: 'Keyboard did not respond' },
      config: { profileIndex: 0 },
    });
    await settle();
    // The keyboard stayed on profile 0, and that is where the save went.
    expect(operations(h)).toEqual([OPERATION_KEYCODES.save]);
    expect(h.vk.state.profileIndex).toBe(0);
    expect(h.vk.state.profiles[0]?.keymap[2]?.[10]).toBe(Keycode.Tab);
  });
});

describe('keyboard operations', () => {
  it('restarts the keyboard: it leaves and the session disconnects', async () => {
    const h = await connected({ keyboard: { reconnectDelayMs: null } });
    h.session.systemReset();
    await waitForState(h.store, state => state.connection.status === 'disconnected');
    expect(operations(h)).toEqual([OPERATION_KEYCODES.reboot]);
    expect(h.vk.connected).toBe(false);
    expect(h.state().config).toBeNull();
  });

  it('factory-resets the keyboard and loads its defaults', async () => {
    const h = await connected();
    h.session.factoryReset();
    expect(h.state().reloading).toBe(true);
    const state = await waitForState(h.store, current => !current.reloading);
    const factory = createFactoryProfile(h.vk.state.model);
    expect(operations(h)).toEqual([OPERATION_KEYCODES.factoryReset]);
    expect(state.config?.keymap).toEqual(factory.keymap);
    expect(state.config?.dynamicKeys.every(slot => slot.kind === 'none')).toBe(true);
    expect(state.config?.rgbKeys.map(key => key.color)).toEqual(
      factory.rgbKeys.map(key => key.color)
    );
    expect(state.lastError).toBeNull();
  });

  it('lets an in-flight save finish before a factory reset', async () => {
    const h = await connected({ keyboard: { latencyMs: 1 } });
    const saving = h.session.save();
    await new Promise(resolve => setTimeout(resolve, 20));
    h.session.factoryReset();
    expect(h.state().reloading).toBe(true);
    await saving;
    const state = await waitForState(h.store, current => !current.reloading);

    expect(operations(h)).toEqual([OPERATION_KEYCODES.save, OPERATION_KEYCODES.factoryReset]);
    expect(setsAfterEvent(h, OPERATION_KEYCODES.factoryReset).sets).toEqual([]);
    expect(state.lastError).toBeNull();
    const factory = createFactoryProfile(h.vk.state.model);
    expect(h.vk.state.active).toEqual(factory);
    expect(state.config?.keymap).toEqual(factory.keymap);
  });

  it('enters the bootloader; its DFU device is found after the HID device left (D3)', async () => {
    const h = await connected();
    h.session.enterBootloader();
    await waitForState(h.store, state => state.connection.status === 'disconnected');
    expect(operations(h)).toEqual([OPERATION_KEYCODES.bootloader]);
    expect(h.vk.dfu?.connected).toBe(true);

    await expect(h.session.detectBootloader(true)).resolves.toEqual([]);
    await expect(h.session.detectBootloader(false)).resolves.toEqual([h.vk.dfu]);
    await expect(h.session.detectBootloader(true)).resolves.toEqual([h.vk.dfu]);
  });

  it('finds no bootloader for a model without a DFU filter or without any model', async () => {
    const store = createDeviceStore();
    const session = createDeviceSession({ hid: () => undefined, store });
    await expect(session.detectBootloader(false)).resolves.toEqual([]);

    const h = await connected({ keyboard: { model: 'zellia-80' } });
    await expect(h.session.detectBootloader(false)).resolves.toEqual([]);
  });
});

describe('debug tracking (D16)', () => {
  it('turns debugging on, subscribes the key and publishes its samples', async () => {
    const h = await connected({ keyboard: { debugIntervalMs: 5 } });
    const samples: DebugSample[] = [];
    h.debug.subscribe(sample => {
      samples.push(sample);
    });
    h.session.startDebug(5);
    await vi.waitFor(() => {
      expect(samples.length).toBeGreaterThanOrEqual(3);
    });

    // The key is subscribed before streaming is switched on (libamp keeps the window meanwhile).
    const debugOn = h.packets().findIndex(packet => packet.op === 'event');
    expect(h.packets()[0]).toMatchObject({ op: 'debug', keyIds: [5] });
    expect(h.packets()[debugOn]).toMatchObject({ keycode: OPERATION_KEYCODES.debugOn });
    expect(debugOn).toBeGreaterThan(0);
    expect(samples.every(sample => sample.keyId === 5)).toBe(true);
    const reports = h.vk.inputReports.map(decodeDeviceReport);
    const last = reports.findLast(report => report.kind === 'debug');
    const item = last?.kind === 'debug' ? last.items.find(entry => entry.index === 5) : undefined;
    expect(item).toBeDefined();
    expect(samples[samples.length - 1]).toEqual({
      tick: last?.kind === 'debug' ? last.tick : -1,
      keyId: 5,
      value: (item?.value ?? -1) / 65535,
      raw: item?.raw,
      filteredRaw: item?.filteredRaw,
      state: item?.state,
      reportState: item?.reportState,
    });
  });

  it('keeps re-subscribing, follows a new key and stops on stopDebug', async () => {
    const h = await connected({ keyboard: { debugIntervalMs: 5 }, timeouts: { debugPollMs: 10 } });
    const samples: DebugSample[] = [];
    h.debug.subscribe(sample => {
      samples.push(sample);
    });
    h.session.startDebug(5);
    await vi.waitFor(() => {
      expect(debugRequests(h).length).toBeGreaterThanOrEqual(3);
    });
    const switchedAt = samples.length;
    h.session.startDebug(7);
    await vi.waitFor(() => {
      expect(samples.some(sample => sample.keyId === 7)).toBe(true);
    });
    // Samples of the previous key still in flight are not published as the new key's.
    expect(samples.slice(switchedAt).every(sample => sample.keyId === 7)).toBe(true);
    expect(debugRequests(h)[debugRequests(h).length - 1]).toEqual([7]);
    expect(operations(h).filter(keycode => keycode === OPERATION_KEYCODES.debugOn)).toHaveLength(1);

    h.session.stopDebug();
    await vi.waitFor(() => {
      expect(h.vk.state.config[0]).toBe(false);
    });
    expect(operations(h)).toContain(OPERATION_KEYCODES.debugOff);
    const sampleCount = samples.length;
    const requestCount = debugRequests(h).length;
    await new Promise(resolve => setTimeout(resolve, 60));
    expect(samples).toHaveLength(sampleCount);
    expect(debugRequests(h)).toHaveLength(requestCount);
  });

  it('publishes the tracked key only, also while the keyboard streams every key', async () => {
    const h = await connected({
      keyboard: { debugIntervalMs: 2 },
      // Left streaming (e.g. by another tool): with an empty window libamp rotates through the keys.
      prepare: vk => {
        vk.state.config[0] = true;
      },
    });
    const samples: DebugSample[] = [];
    h.debug.subscribe(sample => {
      samples.push(sample);
    });
    await vi.waitFor(() => {
      const reports = h.vk.inputReports.map(decodeDeviceReport);
      expect(reports.filter(report => report.kind === 'debug').length).toBeGreaterThan(5);
    });
    expect(samples).toEqual([]);

    h.session.startDebug(5);
    await vi.waitFor(() => {
      expect(samples.length).toBeGreaterThanOrEqual(3);
    });
    expect(samples.every(sample => sample.keyId === 5)).toBe(true);
  });

  it('asks the keyboard to stop streaming on disconnect()', async () => {
    const h = await connected({
      keyboard: { debugIntervalMs: 5 },
      timeouts: { debugPollMs: 1000 },
    });
    const samples: DebugSample[] = [];
    h.debug.subscribe(sample => {
      samples.push(sample);
    });
    h.session.startDebug(3);
    await vi.waitFor(() => {
      expect(samples.length).toBeGreaterThan(0);
    });
    h.session.disconnect();
    await settle();
    expect(operations(h)).toContain(OPERATION_KEYCODES.debugOff);
    expect(h.vk.state.config[0]).toBe(false);
  });

  it('stops polling when the keyboard is unplugged', async () => {
    const h = await connected({ timeouts: { debugPollMs: 5 } });
    h.session.startDebug(1);
    await vi.waitFor(() => {
      expect(debugRequests(h).length).toBeGreaterThanOrEqual(2);
    });
    h.vk.disconnect();
    await waitForState(h.store, state => state.connection.status === 'disconnected');
    const count = debugRequests(h).length;
    await new Promise(resolve => setTimeout(resolve, 40));
    expect(debugRequests(h)).toHaveLength(count);
  });

  it('rejects keys the keyboard does not have', async () => {
    const h = await connected();
    h.session.startDebug(70);
    expect(h.state().lastError).toEqual({
      operation: 'startDebug',
      message: COMMAND_ERRORS.noSuchKey(70),
    });
    h.session.stopDebug();
    await settle();
    expect(events(h)).toEqual([]);
  });

  it('streams while the keyboard stays usable for edits', async () => {
    const h = await connected({ keyboard: { debugIntervalMs: 5 } });
    h.session.startDebug(2);
    h.session.setRgbKeys([
      {
        keyId: 2,
        config: { mode: RGBMode.RgbModeFixed, color: { red: 3, green: 2, blue: 1 }, speed: 4 },
      },
    ]);
    await vi.waitFor(() => {
      expect(h.vk.state.active.rgbKeys[2]).toEqual({
        mode: RGBMode.RgbModeFixed,
        color: { red: 3, green: 2, blue: 1 },
        speed: 4,
      });
    });
    expect(h.state().lastError).toBeNull();
  });
});
