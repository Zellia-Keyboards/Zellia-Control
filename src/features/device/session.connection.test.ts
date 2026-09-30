/**
 * DeviceSession connection state machine (spec §5.1, D1–D3) against the virtual keyboard.
 */
import {
  DynamicKeyMutexMode,
  Keycode,
  KeyModifier,
  ScriptLevel,
  ZelliaStarlightController,
} from 'emi-keyboard-controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createVirtualKeyboard,
  fractionToRaw,
  rawToFraction,
  selectProfile,
  type VirtualKeyboard,
} from '../../testing/virtual-keyboard';
import { createDeviceStore, INITIAL_DEVICE_STATE } from './device-store';
import type { DeviceConfig } from './model/types';
import { CONNECTION_ERRORS, createDeviceSession } from './session';
import {
  createHarness,
  settle,
  waitForState,
  type HarnessOptions,
  type SessionHarness,
} from './testing/session-harness';

let harness: SessionHarness | null = null;
let extraKeyboard: VirtualKeyboard | null = null;

function setup(options: HarnessOptions = {}): SessionHarness {
  harness = createHarness(options);
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
  extraKeyboard?.dispose();
  extraKeyboard = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const distance = (fraction: number) => rawToFraction(fractionToRaw(fraction));

describe('connect', () => {
  it('opens the picked keyboard and is ready after its first complete load', async () => {
    const h = setup();
    const requestDevice = vi.spyOn(h.vk.hid, 'requestDevice');
    await h.session.connect();

    expect(requestDevice).toHaveBeenCalledExactlyOnceWith({
      filters: [
        { vendorId: 0xfeed, productId: 22319, usagePage: 0xff60 },
        { vendorId: 0xfeed, productId: 0xffff, usagePage: 0xff60 },
      ],
    });
    expect(h.statuses).toEqual(['disconnected', 'selecting', 'connecting', 'loading', 'ready']);
    const reference = new ZelliaStarlightController();
    expect(h.state().connection).toEqual({
      status: 'ready',
      deviceName: 'ZelliaKB',
      model: {
        id: 'zellia-starlight',
        displayName: 'Zellia Starlight',
        layoutJson: reference.get_layout_json(),
        layoutLabels: reference.get_layout_labels(),
      },
    });
    expect(h.state()).toMatchObject({
      firmware: { major: 0, minor: 1, patch: 0, info: 'libamp-virtual' },
      feature: { advancedKeys: true, rgb: true, scriptLevel: ScriptLevel.Disable },
      reloading: false,
      saving: false,
      lastError: null,
    });
    expect(h.vk.device.opened).toBe(true);
  });

  it("shows the keyboard's own configuration and never controller defaults", async () => {
    const h = setup();
    const beforeReady: (DeviceConfig | null)[] = [];
    h.store.subscribe(state => {
      if (state.connection.status !== 'ready') beforeReady.push(state.config);
    });
    await h.session.connect();

    expect(beforeReady.length).toBeGreaterThan(0);
    expect(beforeReady.every(config => config === null)).toBe(true);
    const config = h.state().config;
    const { active } = h.vk.state;
    expect(config?.keymap).toEqual(active.keymap);
    expect(config?.advancedKeys.map(key => key.activation)).toEqual(
      active.advancedKeys.map(key => rawToFraction(key.activation))
    );
    expect(config?.rgbKeys.map(key => key.color)).toEqual(active.rgbKeys.map(key => key.color));
    expect(config?.rgbBase).toMatchObject({
      mode: active.rgbBase.mode,
      color: active.rgbBase.color,
      speed: active.rgbBase.speed,
    });
    expect(config).toMatchObject({ profileIndex: 0, profileCount: 4 });
    expect(config?.dynamicKeys).toHaveLength(32);
    expect(config?.dynamicKeys.slice(0, 4)).toEqual([
      {
        kind: 'stroke',
        bindings: [Keycode.F, KeyModifier.KeyLeftShift << 8, 0, 0],
        keyControl: [0x3f, 0x04, 0, 0],
        distances: {
          pressBegin: distance(0.25),
          pressFully: distance(0.75),
          releaseBegin: distance(0.75),
          releaseFully: distance(0.25),
        },
        target: { layer: 0, id: 32 },
      },
      {
        kind: 'modTap',
        tap: Keycode.S,
        hold: KeyModifier.KeyLeftCtrl << 8,
        durationMs: 200,
        target: { layer: 0, id: 30 },
      },
      { kind: 'toggle', binding: Keycode.H, target: { layer: 0, id: 34 } },
      {
        kind: 'mutex',
        bindings: [Keycode.D, Keycode.G],
        mode: DynamicKeyMutexMode.DKMutexLastPriority,
        targets: [
          { layer: 0, id: 31 },
          { layer: 0, id: 33 },
        ],
      },
    ]);
    expect(config?.dynamicKeys.slice(4).every(slot => slot.kind === 'none')).toBe(true);
  });

  it('listens before connect(), so a load that completes while connecting is not missed', async () => {
    const h = setup({
      onController: controller => {
        const connect = controller.connect.bind(controller);
        controller.connect = async device => {
          const loaded = new Promise<void>(resolve => {
            const listener = () => {
              controller.removeEventListener('updateData', listener);
              resolve();
            };
            controller.addEventListener('updateData', listener);
          });
          const opened = await connect(device);
          await loaded;
          return opened;
        };
      },
    });
    await h.session.connect();
    expect(h.statuses).toEqual(['disconnected', 'selecting', 'connecting', 'ready']);
    expect(h.state().config?.keymap).toEqual(h.vk.state.active.keymap);
  });

  it('identifies a Zellia 80 by its product name (D1)', async () => {
    const h = setup({ keyboard: { model: 'zellia-80' } });
    await h.session.connect();
    expect(h.state().connection).toMatchObject({
      status: 'ready',
      deviceName: 'Zellia 80 HE',
      model: { id: 'zellia-80', displayName: 'Zellia 80HE' },
    });
    expect(h.state().config?.advancedKeys).toHaveLength(87);
    expect(h.state().config?.keymap).toEqual(h.vk.state.active.keymap);
  });

  it('accepts keyboards that report "Zellia Starlight"', async () => {
    const h = setup({ keyboard: { productName: 'Zellia Starlight' } });
    await h.session.connect();
    expect(h.state().connection).toMatchObject({
      status: 'ready',
      deviceName: 'Zellia Starlight',
      model: { id: 'zellia-starlight' },
    });
  });

  it('names the keyboard after its model when it reports no product name', async () => {
    const h = setup({ keyboard: { model: 'trinity-pad', productName: '' } });
    await h.session.connect();
    expect(h.state().connection).toMatchObject({
      status: 'ready',
      deviceName: 'Trinity Pad',
      model: { id: 'trinity-pad' },
    });
  });

  it('connects the first picked device that matches a model', async () => {
    const h = setup({ keyboard: { productName: 'Some Other Keyboard', authorized: true } });
    extraKeyboard = createVirtualKeyboard({ hid: h.vk.hid, model: 'zellia-80', authorized: true });
    vi.spyOn(h.vk.hid, 'requestDevice').mockResolvedValue([h.vk.device, extraKeyboard.device]);
    await h.session.connect();
    expect(h.state().connection).toMatchObject({ status: 'ready', model: { id: 'zellia-80' } });
    expect(extraKeyboard.device.opened).toBe(true);
    expect(h.vk.device.opened).toBe(false);
  });

  it('joins a connection attempt that is already running', async () => {
    const h = setup();
    const requestDevice = vi.spyOn(h.vk.hid, 'requestDevice');
    const first = h.session.connect();
    const second = h.session.connect();
    expect(second).toBe(first);
    await first;
    await h.session.connect();
    expect(requestDevice).toHaveBeenCalledOnce();
    expect(h.state().connection.status).toBe('ready');
  });

  it('can be retried after an error', async () => {
    const h = setup({ keyboard: { picker: 'cancel' } });
    await h.session.connect();
    expect(h.state().connection.status).toBe('error');
    h.vk.hid.picker = 'first';
    await h.session.connect();
    expect(h.state().connection.status).toBe('ready');
    expect(h.state().lastError).toBeNull();
  });
});

describe('connection errors', () => {
  it('reports a cancelled picker with the existing text', async () => {
    const h = setup({ keyboard: { picker: 'cancel' } });
    await h.session.connect();
    expect(h.state().connection).toEqual({
      status: 'error',
      message: 'No compatible keyboards found',
    });
    expect(h.statuses).toEqual(['disconnected', 'selecting', 'error']);
  });

  it('reports a browser without WebHID like an empty picker', async () => {
    const store = createDeviceStore();
    const session = createDeviceSession({ hid: () => undefined, store });
    await session.connect();
    expect(store.getState().connection).toEqual({
      status: 'error',
      message: CONNECTION_ERRORS.noDevice,
    });
  });

  it('reports picker failures with their message', async () => {
    const h = setup();
    vi.spyOn(h.vk.hid, 'requestDevice').mockRejectedValue(
      new DOMException('Must be handling a user gesture.', 'SecurityError')
    );
    await h.session.connect();
    expect(h.state().connection).toEqual({
      status: 'error',
      message: 'Must be handling a user gesture.',
    });
  });

  it('reports a device no model accepts', async () => {
    const h = setup({ keyboard: { productName: 'Some Other Keyboard' } });
    await h.session.connect();
    expect(h.state().connection).toEqual({
      status: 'error',
      message: 'No compatible controller found for detected device',
    });
    expect(h.vk.device.opened).toBe(false);
  });

  it('reports a device that cannot be opened', async () => {
    const h = setup();
    vi.spyOn(h.vk.device, 'open').mockRejectedValue(
      new DOMException('Failed to open the device.', 'NotAllowedError')
    );
    await h.session.connect();
    expect(h.state().connection).toEqual({
      status: 'error',
      message: 'Failed to open the device.',
    });
  });

  it('reports a controller that could not connect with the existing text', async () => {
    const h = setup({
      onController: controller => {
        controller.connect = () => Promise.resolve(false);
      },
    });
    await h.session.connect();
    expect(h.state().connection).toEqual({
      status: 'error',
      message: 'Failed to connect to keyboard',
    });
  });

  it('gives up on unsupported firmware when no load starts within 3 s (D2)', async () => {
    vi.useFakeTimers();
    const h = setup({ keyboard: { firmware: { minor: 2, patch: 7 } } });
    const connected = h.session.connect();
    await vi.advanceTimersByTimeAsync(2999);
    expect(h.state().connection.status).toBe('loading');
    await vi.advanceTimersByTimeAsync(1);
    await connected;
    expect(h.state()).toEqual({
      ...INITIAL_DEVICE_STATE,
      connection: { status: 'error', message: 'Unsupported firmware version 0.2.7' },
    });
    expect(h.vk.device.opened).toBe(false);
  });

  it('gives up on a keyboard that does not answer within 3 s (D2)', async () => {
    vi.useFakeTimers();
    const h = setup();
    h.vk.setUnresponsive(true);
    const connected = h.session.connect();
    await vi.advanceTimersByTimeAsync(3000);
    await connected;
    expect(h.state().connection).toEqual({
      status: 'error',
      message: 'Keyboard did not respond',
    });
    expect(h.vk.device.opened).toBe(false);
  });

  it('never times out a load that has started, however long it takes (D2)', async () => {
    vi.useFakeTimers();
    const h = setup({ keyboard: { latencyMs: 40 } });
    const connected = h.session.connect();
    await vi.advanceTimersByTimeAsync(4000);
    expect(h.state().connection.status).toBe('loading');
    await vi.advanceTimersByTimeAsync(10_000);
    await connected;
    expect(h.state().connection.status).toBe('ready');
  });

  it('reports a failed first load and closes the device', async () => {
    const h = setup();
    h.vk.dropReplies(packet => packet.op === 'get' && packet.kind === 'keymap');
    await h.session.connect();
    const { connection } = h.state();
    expect(connection.status).toBe('error');
    expect(connection.status === 'error' ? connection.message : '').toMatch(
      /^Failed to load keyboard configuration: Timeout waiting for packet id \d+, code 2, type 2$/
    );
    expect(h.state().config).toBeNull();
    expect(h.vk.device.opened).toBe(false);
  });
});

describe('disconnecting', () => {
  it('returns to disconnected when the keyboard is unplugged (D3)', async () => {
    const h = setup();
    await h.session.connect();
    h.vk.disconnect();
    await waitForState(h.store, state => state.connection.status === 'disconnected');
    expect(h.state()).toEqual(INITIAL_DEVICE_STATE);
  });

  it('closes the device and forgets the configuration on disconnect()', async () => {
    const h = setup();
    await h.session.connect();
    h.session.disconnect();
    expect(h.state()).toEqual(INITIAL_DEVICE_STATE);
    await settle();
    expect(h.vk.device.opened).toBe(false);
    h.vk.notifyConfigChanged();
    await settle();
    expect(h.state()).toEqual(INITIAL_DEVICE_STATE);
  });

  it('abandons an attempt whose picker is still open', async () => {
    const h = setup();
    const connecting = h.session.connect();
    expect(h.state().connection.status).toBe('selecting');
    h.session.disconnect();
    await connecting;
    await settle();
    expect(h.state().connection.status).toBe('disconnected');
    expect(h.vk.device.opened).toBe(false);
  });

  it('abandons a load in progress', async () => {
    const h = setup({ keyboard: { latencyMs: 2 } });
    const connecting = h.session.connect();
    await waitForState(h.store, state => state.connection.status === 'loading');
    h.session.disconnect();
    await connecting;
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(h.state()).toEqual(INITIAL_DEVICE_STATE);
    expect(h.statuses[h.statuses.length - 1]).toBe('disconnected');
    expect(h.vk.device.opened).toBe(false);
  });

  it('can connect again after a disconnect', async () => {
    const h = setup();
    await h.session.connect();
    h.session.disconnect();
    await h.session.connect();
    expect(h.state().connection.status).toBe('ready');
    expect(h.state().config?.keymap).toEqual(h.vk.state.active.keymap);
  });
});

describe('device-initiated reloads', () => {
  it('flags the reload and replaces the snapshot', async () => {
    const h = setup();
    await h.session.connect();
    const before = h.state();
    h.vk.state.active.keymap[1]?.splice(0, 1, Keycode.Spacebar);
    h.vk.notifyConfigChanged();
    await waitForState(h.store, state => state.reloading);
    const after = await waitForState(h.store, state => !state.reloading);

    expect(after.config?.keymap[1]?.[0]).toBe(Keycode.Spacebar);
    expect(before.config?.keymap[1]?.[0]).not.toBe(Keycode.Spacebar);
    expect(after.connection).toBe(before.connection);
    expect(after.lastError).toBeNull();
  });

  it('follows a profile switched on the keyboard itself (D7)', async () => {
    const h = setup();
    await h.session.connect();
    selectProfile(h.vk.state, 3);
    h.vk.notifyConfigChanged();
    const after = await waitForState(h.store, state => state.config?.profileIndex === 3);
    await waitForState(h.store, state => !state.reloading);
    expect(after.config?.keymap[0]?.[0]).toBe(Keycode.F13 + 2);
  });

  it('ends the connection when a reload fails, so no stale snapshot can be saved (D2)', async () => {
    const h = setup();
    await h.session.connect();
    const restore = h.vk.dropReplies(packet => packet.op === 'get' && packet.kind === 'rgbBase');
    h.vk.notifyConfigChanged();
    const failed = await waitForState(h.store, state => state.connection.status === 'error');

    expect(failed).toEqual({
      ...INITIAL_DEVICE_STATE,
      connection: {
        status: 'error',
        message: expect.stringMatching(
          /^Failed to load keyboard configuration: Timeout waiting for packet id \d+, code 2, type 3$/
        ) as string,
      },
    });
    await settle();
    expect(h.vk.device.opened).toBe(false);

    restore();
    await h.session.connect();
    expect(h.state().connection.status).toBe('ready');
  });
});
