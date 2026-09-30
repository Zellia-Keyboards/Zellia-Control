/**
 * Real vendored controllers against the virtual libamp keyboard: proves the simulator speaks the
 * controller's protocol and documents the controller behaviour DeviceSession relies on.
 */
import {
  AdvancedKey,
  DynamicKeyToggleKey,
  KeyLocation,
  KeyMode,
  RGBBaseConfig,
  RGBMode,
  Zellia80Controller,
  ZelliaStarlightController,
} from 'emi-keyboard-controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createFactoryProfile,
  dynamicKeyKeycode,
  expectedControllerCache,
  fractionToRaw,
  installVirtualHid,
  type InstalledVirtualKeyboard,
  type VirtualKeyboardOptions,
  type VirtualProfile,
} from '../../testing/virtual-keyboard';
import {
  onControllerEvent,
  withUpstreamFixes,
  type ControllerEventMap,
  type ControllerEventType,
  type DeviceController,
} from './controller';

let keyboard: InstalledVirtualKeyboard | null = null;

function install(options: VirtualKeyboardOptions = {}): InstalledVirtualKeyboard {
  keyboard = installVirtualHid(navigator, options);
  return keyboard;
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'debug').mockImplementation(() => undefined);
});

afterEach(() => {
  keyboard?.uninstall();
  keyboard = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function next<K extends ControllerEventType>(
  controller: DeviceController,
  type: K
): Promise<ControllerEventMap[K]> {
  return new Promise(resolve => {
    const off = onControllerEvent(controller, type, detail => {
      off();
      resolve(detail);
    });
  });
}

/** Connects and waits for the first complete load (rejects on updateDataError). */
async function load(controller: DeviceController, vk: InstalledVirtualKeyboard): Promise<void> {
  const loaded = new Promise<void>((resolve, reject) => {
    const offs = [
      onControllerEvent(controller, 'updateData', () => {
        offs.forEach(off => {
          off();
        });
        resolve();
      }),
      onControllerEvent(controller, 'updateDataError', ({ error }) => {
        offs.forEach(off => {
          off();
        });
        reject(error instanceof Error ? error : new Error(String(error)));
      }),
    ];
  });
  await expect(controller.connect(vk.device)).resolves.toBe(true);
  await loaded;
}

function expectCacheToMatch(controller: DeviceController, profile: VirtualProfile): void {
  const expected = expectedControllerCache(profile);
  expect(controller.get_advanced_keys().map(key => key.config)).toEqual(expected.advancedKeys);
  expect(controller.get_keymap()).toEqual(expected.keymap);
  expect(controller.get_rgb_base_config()).toEqual(expected.rgbBase);
  expect(controller.get_rgb_configs()).toEqual(expected.rgbConfigs);
  expect(controller.get_dynamic_keys()).toMatchObject(expected.dynamicKeys);
}

/** Targets are not read back from the device; restore them from the device's own key ids. */
function restoreTargets(controller: DeviceController, profile: VirtualProfile): void {
  const location = (id: number) => Object.assign(new KeyLocation(), { layer: 0, id });
  controller.get_dynamic_keys().forEach((key, slot) => {
    const wire = profile.dynamicKeys[slot];
    if (!wire || wire.type === 'none') return;
    key.target_keys_location =
      wire.type === 'mutex' ? wire.keyIds.map(location) : [location(wire.keyId)];
  });
}

describe('loading', () => {
  it('fills a Zellia Starlight controller with exactly the seeded device state', async () => {
    const vk = install();
    const controller = withUpstreamFixes(new ZelliaStarlightController());
    await load(controller, vk);

    expectCacheToMatch(controller, vk.state.active);
    expect(controller.get_firmware_version()).toEqual(vk.state.firmware);
    expect(controller.get_profile_index()).toBe(0);
    expect(controller.get_dynamic_keys().filter(key => key.type !== 0)).toHaveLength(4);
  });

  it('fills a Zellia 80 controller with exactly the seeded device state', async () => {
    const vk = install({ model: 'zellia-80' });
    const controller = withUpstreamFixes(new Zellia80Controller());
    await load(controller, vk);

    expectCacheToMatch(controller, vk.state.active);
    expect(controller.get_advanced_keys()).toHaveLength(87);
  });

  it('cannot load seeded dynamic keys without the upstream workaround', async () => {
    const vk = install();
    const controller = new ZelliaStarlightController();
    const failure = next(controller, 'updateDataError');
    await controller.connect(vk.device);
    const { error } = await failure;
    expect(error).toBeInstanceOf(TypeError);
  });

  it('loads a keyboard without dynamic keys even without the workaround', async () => {
    const vk = install({ seedDynamicKeys: false });
    const controller = new ZelliaStarlightController();
    await load(controller, vk);
    expectCacheToMatch(controller, vk.state.active);
  });

  it('never starts a load for unsupported firmware or a silent device', async () => {
    vi.useFakeTimers();
    for (const setup of [
      (vk: InstalledVirtualKeyboard) => {
        vk.setFirmwareVersion({ minor: 2 });
      },
      (vk: InstalledVirtualKeyboard) => {
        vk.setUnresponsive(true);
      },
    ]) {
      const vk = install();
      setup(vk);
      const controller = withUpstreamFixes(new ZelliaStarlightController());
      const started = vi.fn();
      onControllerEvent(controller, 'updateDataStart', started);
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await controller.connect(vk.device);
      await vi.advanceTimersByTimeAsync(3000);
      expect(started).not.toHaveBeenCalled();
      controller.disconnect();
      vk.uninstall();
    }
  });
});

describe('commands', () => {
  async function connected(options: VirtualKeyboardOptions = {}) {
    const vk = install(options);
    const controller = withUpstreamFixes(new ZelliaStarlightController());
    await load(controller, vk);
    vk.clearHistory();
    return { vk, controller };
  }

  it('applies single-item packets to the working configuration', async () => {
    const { vk, controller } = await connected();
    await controller.send_keymap_packet(1, 5, 3, [0x04, 0x05, 0x06]);
    expect(vk.state.active.keymap[1]?.slice(5, 8)).toEqual([0x04, 0x05, 0x06]);

    const before = vk.state.active.advancedKeys[3];
    await controller.send_advanced_key_packet(
      3,
      new AdvancedKey({
        mode: KeyMode.KeyAnalogSpeedMode,
        activation_value: 0.25,
        trigger_distance: 0.1,
        upper_bound: 1,
      })
    );
    expect(vk.state.active.advancedKeys[3]).toMatchObject({
      mode: KeyMode.KeyAnalogSpeedMode,
      activation: fractionToRaw(0.25),
      triggerDistance: fractionToRaw(0.1),
      upperBound: before?.upperBound,
      calibrationMode: before?.calibrationMode,
    });

    const base = Object.assign(new RGBBaseConfig(), {
      mode: 2,
      rgb: { red: 1, green: 2, blue: 3 },
      speed: 50,
      direction: 90,
    });
    await controller.send_rgb_base_packet(base);
    expect(vk.state.active.rgbBase).toMatchObject({
      mode: 2,
      color: { red: 1, green: 2, blue: 3 },
      speed: 50,
      direction: 90,
    });

    await controller.send_rgb_packet(7, {
      mode: RGBMode.RgbModeTrigger,
      rgb: { red: 9, green: 8, blue: 7 },
      speed: 3,
    });
    expect(vk.state.active.rgbKeys[7]).toEqual({
      mode: 4,
      color: { red: 9, green: 8, blue: 7 },
      speed: 3,
    });

    const toggle = new DynamicKeyToggleKey();
    toggle.bindings = [0x39];
    toggle.target_keys_location = [Object.assign(new KeyLocation(), { layer: 0, id: 12 })];
    await controller.send_dynamic_key_packet(9, toggle);
    expect(vk.state.active.dynamicKeys[9]).toEqual({ type: 'toggle', binding: 0x39, keyId: 12 });

    expect(vk.sentPackets.map(packet => ('kind' in packet ? packet.kind : packet.op))).toEqual([
      'keymap',
      'advancedKey',
      'rgbBase',
      'rgbConfig',
      'dynamicKey',
    ]);
    expect(vk.state.profiles[0]?.keymap[1]?.slice(5, 8)).not.toEqual([0x04, 0x05, 0x06]);
  });

  it('rejects a save of dynamic keys without targets (why targets are rebuilt after loads)', async () => {
    const { controller } = await connected();
    await expect(controller.save()).rejects.toThrow(/missing target key/);
  });

  it('saves the whole cache and persists it on flash', async () => {
    const { vk, controller } = await connected();
    restoreTargets(controller, vk.state.active);
    const keymap = controller.get_keymap().map(layer => [...layer]);
    keymap[2]?.splice(10, 1, 0x1234);
    controller.set_keymap(keymap);
    const rgb = controller.get_rgb_configs().map(config => ({ ...config, speed: 77 }));
    controller.set_rgb_configs(rgb);

    await controller.save();
    expectCacheToMatch(controller, vk.state.active);
    expect(vk.state.active.keymap[2]?.[10]).toBe(0x1234);
    expect(vk.state.active.dynamicKeys[3]).toMatchObject({ type: 'mutex', keyIds: [31, 33] });
    expect(vk.state.profiles[0]?.keymap[2]?.[10]).not.toBe(0x1234);

    controller.flash();
    await vi.waitFor(() => {
      expect(vk.state.profiles[0]?.keymap[2]?.[10]).toBe(0x1234);
    });
    expect(vk.state.profiles[0]).toEqual(vk.state.active);
  });

  it('switches profiles: the device notifies and the controller reloads that profile', async () => {
    const { vk, controller } = await connected();
    const reloaded = next(controller, 'updateData');
    await controller.set_profile_index(2);
    await reloaded;
    expect(vk.state.profileIndex).toBe(2);
    expect(controller.get_profile_index()).toBe(2);
    expectCacheToMatch(controller, vk.state.active);
    expect(controller.get_keymap()[0]?.[0]).toBe(0x69);
  });

  it('reloads after a change made on the keyboard itself', async () => {
    const { vk, controller } = await connected();
    vk.state.active.keymap[1]?.splice(0, 1, 0x2c);
    const reloaded = next(controller, 'updateData');
    vk.notifyConfigChanged();
    await reloaded;
    expect(controller.get_keymap()[1]?.[0]).toBe(0x2c);
  });

  it('streams debug data for the subscribed key while debugging', async () => {
    const { vk, controller } = await connected({ debugIntervalMs: 5 });
    controller.start_debug();
    await controller.request_debug_at([5]);
    const sample = await next(controller, 'updateDebugData');
    expect(sample.updatedKeys).toEqual([5]);
    const value = controller.get_advanced_keys()[5]?.value ?? -1;
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
    expect(vk.state.config[0]).toBe(true);

    controller.stop_debug();
    await vi.waitFor(() => {
      expect(vk.state.config[0]).toBe(false);
    });
    const count = vk.inputReports.length;
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(vk.inputReports).toHaveLength(count);
  });

  it('factory reset: the device notifies and the controller reloads the defaults', async () => {
    const { vk, controller } = await connected();
    const reloaded = next(controller, 'updateData');
    controller.factory_reset();
    await reloaded;
    expectCacheToMatch(controller, createFactoryProfile(vk.state.model));
    expect(controller.get_keymap()[0]?.[32]).not.toBe(dynamicKeyKeycode(0));
  });

  it('reboot and bootloader drop the HID connection; the bootloader appears on WebUSB', async () => {
    const first = await connected({ reconnectDelayMs: null });
    const rebooted = next(first.controller, 'deviceDisconnected');
    first.controller.system_reset();
    await rebooted;
    expect(first.vk.connected).toBe(false);
    first.vk.uninstall();

    const second = await connected();
    const left = next(second.controller, 'deviceDisconnected');
    second.controller.enter_bootloader();
    await left;
    await expect(second.controller.detect_bootloader(false)).resolves.toEqual([second.vk.dfu]);
  });
});
