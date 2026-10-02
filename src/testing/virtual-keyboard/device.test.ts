import { Keycode, KeyboardKeycode } from 'emi-keyboard-controller';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVirtualKeyboard, type VirtualKeyboard, type VirtualKeyboardOptions } from './device';
import {
  KeyEvent,
  decodeDeviceReport,
  encodeHostPacket,
  type DeviceReport,
  type HostPacket,
  type WireAdvancedKey,
} from './protocol';
import { createFactoryProfile, dynamicKeyKeycode } from './state';

const OPERATION: number = Keycode.KeyboardOperation;
const operation = (sub: number) => OPERATION | (sub << 8);
const keyboardConfig = (action: 0 | 1 | 2, index: number) =>
  operation((action << 6) | (0x20 + index));

const keyboards: VirtualKeyboard[] = [];

function keyboard(options: VirtualKeyboardOptions = {}): VirtualKeyboard {
  const created = createVirtualKeyboard(options);
  keyboards.push(created);
  return created;
}

afterEach(() => {
  for (const created of keyboards.splice(0)) created.dispose();
  vi.useRealTimers();
});

const settle = () => new Promise<void>(resolve => setTimeout(resolve, 0));

async function opened(options: VirtualKeyboardOptions = {}): Promise<VirtualKeyboard> {
  const created = keyboard(options);
  await created.device.open();
  return created;
}

/** Sends one report as the host and returns what the device sent back. */
async function exchange(vk: VirtualKeyboard, packet: HostPacket): Promise<DeviceReport[]> {
  const before = vk.inputReports.length;
  await vk.device.sendReport(0, encodeHostPacket(packet));
  await settle();
  return vk.inputReports.slice(before).map(decodeDeviceReport);
}

async function reply(vk: VirtualKeyboard, packet: HostPacket): Promise<DeviceReport> {
  const replies = await exchange(vk, packet);
  expect(replies).toHaveLength(1);
  const [first] = replies;
  if (!first) throw new Error('no reply');
  return first;
}

function keyDown(keycode: number): Extract<HostPacket, { op: 'event' }> {
  return {
    op: 'event',
    event: KeyEvent.KeyDown,
    keycode,
    keyId: 0,
    isVirtual: true,
    useKeymap: false,
  };
}

describe('HID identity and manager', () => {
  it('presents the model identity of a Zellia Starlight', () => {
    const { device } = keyboard();
    expect(device).toMatchObject({ vendorId: 0xfeed, productId: 22319, productName: 'ZelliaKB' });
    expect(device.collections).toEqual([
      expect.objectContaining({ usagePage: 0xff60, usage: 0x61 }),
    ]);
    expect(keyboard({ productName: 'Zellia Starlight' }).device.productName).toBe(
      'Zellia Starlight'
    );
    expect(keyboard({ model: 'trinity-pad' }).device).toMatchObject({
      productId: 0xffff,
      productName: 'Trinity Pad',
    });
  });

  it('authorizes the device picked in requestDevice', async () => {
    const { hid, device } = keyboard();
    await expect(hid.getDevices()).resolves.toEqual([]);
    await expect(
      hid.requestDevice({ filters: [{ vendorId: 0xfeed, productId: 0xffff, usagePage: 0xff60 }] })
    ).resolves.toEqual([]);
    await expect(
      hid.requestDevice({ filters: [{ vendorId: 0xfeed, productId: 22319, usagePage: 0xff60 }] })
    ).resolves.toEqual([device]);
    await expect(hid.getDevices()).resolves.toEqual([device]);
  });

  it('supports pre-authorized devices and a cancelled picker', async () => {
    const vk = keyboard({ authorized: true, picker: 'cancel' });
    await expect(vk.hid.getDevices()).resolves.toEqual([vk.device]);
    await expect(vk.hid.requestDevice({ filters: [{ vendorId: 0xfeed }] })).resolves.toEqual([]);
    vk.hid.picker = 'first';
    await expect(vk.hid.requestDevice({ filters: [{ vendorId: 0xfeed }] })).resolves.toEqual([
      vk.device,
    ]);
  });

  it('rejects reports while closed and after an unplug', async () => {
    const vk = keyboard();
    await expect(vk.device.sendReport(0, new Uint8Array(64))).rejects.toThrow(/opened/);
    await vk.device.open();
    expect(vk.device.opened).toBe(true);

    const disconnected = vi.fn();
    vk.hid.addEventListener('disconnect', disconnected);
    vk.disconnect();
    expect(vk.connected).toBe(false);
    expect(vk.device.opened).toBe(false);
    expect(disconnected).toHaveBeenCalledOnce();
    expect(disconnected.mock.calls[0]?.[0]).toMatchObject({ device: vk.device });
    await expect(vk.device.open()).rejects.toThrow();
    await expect(vk.hid.requestDevice({ filters: [{ vendorId: 0xfeed }] })).resolves.toEqual([]);

    const connected = vi.fn();
    vk.hid.addEventListener('connect', connected);
    vk.reconnect();
    expect(connected).toHaveBeenCalledOnce();
    await expect(vk.device.open()).resolves.toBeUndefined();
  });
});

describe('transactions', () => {
  it('answers GET requests from the active profile and echoes code, id and type', async () => {
    const vk = await opened();
    const { active } = vk.state;

    expect(await reply(vk, { op: 'get', id: 7, kind: 'version' })).toEqual({
      kind: 'reply',
      op: 'get',
      id: 7,
      data: { kind: 'version', version: vk.state.firmware },
    });
    expect(await reply(vk, { op: 'get', id: 8, kind: 'advancedKey', index: 5 })).toMatchObject({
      id: 8,
      data: { kind: 'advancedKey', index: 5, key: active.advancedKeys[5] },
    });
    expect(
      await reply(vk, { op: 'get', id: 9, kind: 'keymap', layer: 0, start: 16, length: 16 })
    ).toMatchObject({
      data: { kind: 'keymap', layer: 0, start: 16, keycodes: active.keymap[0]?.slice(16, 32) },
    });
    expect(await reply(vk, { op: 'get', id: 10, kind: 'rgbBase' })).toMatchObject({
      data: { kind: 'rgbBase', config: active.rgbBase },
    });
    expect(
      await reply(vk, { op: 'get', id: 11, kind: 'rgbConfig', indices: [0, 69] })
    ).toMatchObject({
      data: {
        kind: 'rgbConfig',
        entries: [
          { index: 0, config: active.rgbKeys[0] },
          { index: 69, config: active.rgbKeys[69] },
        ],
      },
    });
    expect(await reply(vk, { op: 'get', id: 12, kind: 'dynamicKey', index: 3 })).toMatchObject({
      data: { kind: 'dynamicKey', index: 3, key: active.dynamicKeys[3] },
    });
    expect(await reply(vk, { op: 'get', id: 13, kind: 'profileIndex' })).toMatchObject({
      data: { kind: 'profileIndex', index: 0 },
    });
    expect(
      await reply(vk, { op: 'get', id: 14, kind: 'config', indices: [0, 1, 2, 3, 4, 5] })
    ).toMatchObject({
      data: {
        kind: 'config',
        entries: [0, 1, 2, 3, 4, 5].map(index => ({ index, value: index === 4 })),
      },
    });
    expect(await reply(vk, { op: 'get', id: 15, kind: 'feature' })).toMatchObject({
      data: { kind: 'feature', feature: vk.state.feature },
    });
  });

  it('writes SET requests into the active profile only and echoes them unchanged', async () => {
    const vk = await opened();
    const request: HostPacket = {
      op: 'set',
      id: 21,
      kind: 'keymap',
      layer: 1,
      start: 2,
      keycodes: [0x1111, 0x2222],
    };
    const [echo] = await exchange(vk, request);
    expect(echo).toEqual({
      kind: 'reply',
      op: 'set',
      id: 21,
      data: { kind: 'keymap', layer: 1, start: 2, keycodes: [0x1111, 0x2222] },
    });
    expect(vk.state.active.keymap[1]?.slice(2, 4)).toEqual([0x1111, 0x2222]);
    expect(vk.state.profiles[0]?.keymap[1]?.slice(2, 4)).not.toEqual([0x1111, 0x2222]);

    await exchange(vk, {
      op: 'set',
      id: 22,
      kind: 'rgbConfig',
      entries: [{ index: 3, config: { mode: 4, color: { red: 1, green: 2, blue: 3 }, speed: 9 } }],
    });
    expect(vk.state.active.rgbKeys[3]).toEqual({
      mode: 4,
      color: { red: 1, green: 2, blue: 3 },
      speed: 9,
    });

    await exchange(vk, {
      op: 'set',
      id: 23,
      kind: 'dynamicKey',
      index: 9,
      key: { type: 'toggle', binding: 0x04, keyId: 12 },
    });
    expect(vk.state.active.dynamicKeys[9]).toEqual({ type: 'toggle', binding: 0x04, keyId: 12 });

    await exchange(vk, {
      op: 'set',
      id: 24,
      kind: 'config',
      entries: [{ index: 1, value: true }],
    });
    expect(vk.state.config[1]).toBe(true);
  });

  it('ignores calibration mode and sensor bounds in advanced-key writes, like the firmware', async () => {
    const vk = await opened();
    const before = vk.state.active.advancedKeys[2];
    const written: WireAdvancedKey = {
      mode: 3,
      calibrationMode: 0,
      activation: 1000,
      deactivation: 900,
      triggerDistance: 10,
      releaseDistance: 11,
      triggerSpeed: 12,
      releaseSpeed: 13,
      upperDeadzone: 14,
      lowerDeadzone: 15,
      upperBound: 1,
      lowerBound: 2,
    };
    await exchange(vk, { op: 'set', id: 1, kind: 'advancedKey', index: 2, key: written });
    expect(vk.state.active.advancedKeys[2]).toEqual({
      ...written,
      calibrationMode: before?.calibrationMode,
      upperBound: before?.upperBound,
      lowerBound: before?.lowerBound,
    });
  });

  it('switches profiles through SET profile index without a notification', async () => {
    const vk = await opened();
    const replies = await exchange(vk, { op: 'set', id: 3, kind: 'profileIndex', index: 2 });
    expect(replies.map(report => report.kind)).toEqual(['reply']);
    expect(vk.state.profileIndex).toBe(2);
    expect(vk.state.active).toEqual(vk.state.profiles[2]);
  });

  it('echoes unknown data types and ignores unknown packet codes', async () => {
    const vk = await opened();
    expect(await reply(vk, { op: 'get', id: 4, kind: 'other', type: 0x0e })).toEqual({
      kind: 'reply',
      op: 'get',
      id: 4,
      data: { kind: 'other', type: 0x0e },
    });
    expect(await exchange(vk, { op: 'unknown', code: 0x42 })).toEqual([]);
  });

  it('pages macros and keeps none recorded', async () => {
    const vk = await opened({ model: 'oholeo' });
    expect(vk.state.macros).toHaveLength(4);
    const answer = await reply(vk, {
      op: 'get',
      id: 5,
      kind: 'macro',
      macroIndex: 1,
      actionIndices: [0, 1, 2, 3],
    });
    expect(answer).toMatchObject({
      data: {
        kind: 'macro',
        macroIndex: 1,
        actions: [0, 1, 2, 3].map(index => ({ index, delay: 0, keycode: 0 })),
      },
    });

    await exchange(vk, {
      op: 'set',
      id: 6,
      kind: 'macro',
      macroIndex: 1,
      actions: [{ index: 2, delay: 30, keyId: 4, isVirtual: false, event: 3, keycode: 0x04 }],
    });
    expect(vk.state.macros[1]?.[2]).toEqual({
      index: 2,
      delay: 30,
      keyId: 4,
      isVirtual: false,
      event: 3,
      keycode: 0x04,
    });
  });

  it('stores and serves large script data', async () => {
    const vk = await opened({ model: 'trinity-pad' });
    // jsdom's TextEncoder returns arrays from another realm; copy into this one.
    const source = Uint8Array.from(new TextEncoder().encode('print(1)\0'));
    await exchange(vk, {
      op: 'largeSet',
      id: 1,
      dataType: 0x0c,
      command: 'start',
      totalSize: source.length,
      checksum: 0,
    });
    await exchange(vk, {
      op: 'largeSet',
      id: 2,
      dataType: 0x0c,
      command: 'payload',
      offset: 0,
      length: source.length,
      data: source,
    });
    await exchange(vk, { op: 'largeSet', id: 3, dataType: 0x0c, command: 'end' });
    expect(vk.state.scripts.source).toEqual(source);

    expect(
      await reply(vk, {
        op: 'largeGet',
        id: 4,
        dataType: 0x0c,
        command: 'start',
        totalSize: 0,
        checksum: 0,
      })
    ).toMatchObject({ kind: 'largeReply', command: 'start', totalSize: source.length });
    expect(
      await reply(vk, {
        op: 'largeGet',
        id: 5,
        dataType: 0x0c,
        command: 'payload',
        offset: 2,
        length: 54,
        data: new Uint8Array(),
      })
    ).toMatchObject({
      command: 'payload',
      offset: 2,
      length: source.length - 2,
      data: source.slice(2),
    });
  });
});

describe('keyboard operations', () => {
  it('persists the active profile on KeyboardSave', async () => {
    const vk = await opened();
    await exchange(vk, { op: 'set', id: 1, kind: 'keymap', layer: 0, start: 0, keycodes: [0x04] });
    expect(await exchange(vk, keyDown(operation(KeyboardKeycode.KeyboardSave)))).toEqual([]);
    expect(vk.state.profiles[0]?.keymap[0]?.[0]).toBe(0x04);
  });

  it('only runs operations on key-down events', async () => {
    const vk = await opened();
    await exchange(vk, { op: 'set', id: 1, kind: 'keymap', layer: 0, start: 0, keycodes: [0x04] });
    await exchange(vk, {
      ...keyDown(operation(KeyboardKeycode.KeyboardSave)),
      event: KeyEvent.KeyTrue,
    });
    expect(vk.state.profiles[0]?.keymap[0]?.[0]).toBe(Keycode.Escape);
  });

  it('switches profiles and asks the host to reload', async () => {
    const vk = await opened();
    await exchange(vk, { op: 'set', id: 1, kind: 'keymap', layer: 0, start: 0, keycodes: [0x04] });
    const reports = await exchange(vk, keyDown(operation(KeyboardKeycode.KeyboardProfile2)));
    expect(reports).toEqual([{ kind: 'configChanged' }]);
    expect(vk.state.profileIndex).toBe(2);
    expect(vk.state.active).toEqual(vk.state.profiles[2]);

    await exchange(vk, keyDown(operation(KeyboardKeycode.KeyboardProfile0)));
    expect(vk.state.active.keymap[0]?.[0]).toBe(Keycode.Escape);
  });

  it('factory-resets every profile and notifies the host', async () => {
    const vk = await opened();
    await exchange(vk, keyDown(operation(KeyboardKeycode.KeyboardProfile1)));
    const reports = await exchange(vk, keyDown(operation(KeyboardKeycode.KeyboardFactoryReset)));
    expect(reports).toEqual([{ kind: 'configChanged' }]);
    const factory = createFactoryProfile(vk.state.model);
    expect(vk.state.profileIndex).toBe(0);
    expect(vk.state.active).toEqual(factory);
    expect(
      vk.state.profiles.every(profile => JSON.stringify(profile) === JSON.stringify(factory))
    ).toBe(true);
  });

  it('resets the active profile to defaults and restores it from storage on recovery', async () => {
    const vk = await opened();
    expect(await exchange(vk, keyDown(operation(KeyboardKeycode.KeyboardResetToDefault)))).toEqual([
      { kind: 'configChanged' },
    ]);
    expect(vk.state.active.keymap[0]?.[32]).not.toBe(dynamicKeyKeycode(0));
    await exchange(vk, keyDown(operation(KeyboardKeycode.KeyboardRecovery)));
    expect(vk.state.active.keymap[0]?.[32]).toBe(dynamicKeyKeycode(0));
  });

  it('switches keyboard config bits off, on and toggles them', async () => {
    const vk = await opened();
    await exchange(vk, keyDown(keyboardConfig(1, 1)));
    expect(vk.state.config[1]).toBe(true);
    await exchange(vk, keyDown(keyboardConfig(2, 1)));
    expect(vk.state.config[1]).toBe(false);
    await exchange(vk, keyDown(keyboardConfig(2, 2)));
    expect(vk.state.config[2]).toBe(true);
    await exchange(vk, keyDown(keyboardConfig(0, 4)));
    expect(vk.state.config[4]).toBe(false);
  });

  it('steps the RGB brightness by 16 within 0..255', async () => {
    const vk = await opened();
    await exchange(vk, keyDown(operation(KeyboardKeycode.KeyboardRgbBrightnessUp)));
    expect(vk.state.active.rgbBase.brightness).toBe(255);
    await exchange(vk, keyDown(operation(KeyboardKeycode.KeyboardRgbBrightnessDown)));
    expect(vk.state.active.rgbBase.brightness).toBe(239);
  });

  it('notifies the host after a calibration requested on key-up', async () => {
    vi.useFakeTimers();
    const vk = await opened({ calibrationDelayMs: 1000 });
    await vk.device.sendReport(
      0,
      encodeHostPacket({
        ...keyDown(operation(KeyboardKeycode.KeyboardCalibrate)),
        event: KeyEvent.KeyUp,
      })
    );
    await vi.advanceTimersByTimeAsync(999);
    expect(vk.inputReports).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(vk.inputReports.map(decodeDeviceReport)).toEqual([{ kind: 'configChanged' }]);
  });

  it('reboots: unplugs, restores storage, resets volatile config and re-enumerates', async () => {
    vi.useFakeTimers();
    const vk = await opened({ reconnectDelayMs: 500 });
    const events: string[] = [];
    vk.hid.addEventListener('disconnect', () => events.push('disconnect'));
    vk.hid.addEventListener('connect', () => events.push('connect'));
    await vk.device.sendReport(0, encodeHostPacket(keyDown(keyboardConfig(1, 1))));
    await vk.device.sendReport(
      0,
      encodeHostPacket({ op: 'set', id: 1, kind: 'keymap', layer: 0, start: 0, keycodes: [0x04] })
    );
    await vk.device.sendReport(
      0,
      encodeHostPacket(keyDown(operation(KeyboardKeycode.KeyboardReboot)))
    );
    await vi.advanceTimersByTimeAsync(0);

    expect(events).toEqual(['disconnect']);
    expect(vk.device.opened).toBe(false);
    expect(vk.state.active.keymap[0]?.[0]).toBe(Keycode.Escape);
    expect(vk.state.config[1]).toBe(false);

    await vi.advanceTimersByTimeAsync(500);
    expect(events).toEqual(['disconnect', 'connect']);
    expect(vk.connected).toBe(true);
  });

  it('enters the bootloader: the HID device leaves and the DFU device appears', async () => {
    const vk = await opened();
    const usbConnect = vi.fn();
    vk.usb.addEventListener('connect', usbConnect);
    await exchange(vk, keyDown(operation(KeyboardKeycode.KeyboardBootloader)));
    expect(vk.connected).toBe(false);
    expect(vk.dfu?.connected).toBe(true);
    expect(usbConnect).toHaveBeenCalledOnce();
    await expect(
      vk.usb.requestDevice({ filters: [{ vendorId: 0x2e3c, productId: 0xdf11 }] })
    ).resolves.toBe(vk.dfu);
  });

  it('only disconnects models without a DFU filter', async () => {
    const vk = await opened({ model: 'zellia-80' });
    expect(vk.dfu).toBeNull();
    await exchange(vk, keyDown(operation(KeyboardKeycode.KeyboardBootloader)));
    expect(vk.connected).toBe(false);
  });
});

describe('debug stream', () => {
  function debugReports(vk: VirtualKeyboard) {
    return vk.inputReports.map(decodeDeviceReport).filter(report => report.kind === 'debug');
  }

  it('streams subscribed keys only while the debug config bit is on', async () => {
    vi.useFakeTimers();
    const vk = await opened({ debugIntervalMs: 10 });
    await vk.device.sendReport(0, encodeHostPacket({ op: 'debug', keyIds: [12] }));
    await vi.advanceTimersByTimeAsync(50);
    expect(debugReports(vk)).toEqual([]);

    await vk.device.sendReport(0, encodeHostPacket(keyDown(keyboardConfig(1, 0))));
    await vi.advanceTimersByTimeAsync(30);
    const reports = debugReports(vk);
    expect(reports).toHaveLength(3);
    expect(reports.map(report => report.items.map(item => item.index))).toEqual([[12], [12], [12]]);
    const ticks = reports.map(report => report.tick);
    expect(ticks).toEqual([10, 20, 30]);

    await vk.device.sendReport(0, encodeHostPacket(keyDown(keyboardConfig(0, 0))));
    await vi.advanceTimersByTimeAsync(50);
    expect(debugReports(vk)).toHaveLength(3);
  });

  it('rotates through all keys five at a time without a subscription', async () => {
    vi.useFakeTimers();
    const vk = await opened({ debugIntervalMs: 10 });
    await vk.device.sendReport(0, encodeHostPacket(keyDown(keyboardConfig(1, 0))));
    await vi.advanceTimersByTimeAsync(20);
    const indices = debugReports(vk).map(report => report.items.map(item => item.index));
    // libamp continues after debug_buffer[4], which starts zeroed.
    expect(indices).toEqual([
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
    ]);
  });

  it('follows a deterministic synthetic travel curve', async () => {
    vi.useFakeTimers();
    const first = await opened({ debugIntervalMs: 10 });
    const second = await opened({ debugIntervalMs: 10 });
    for (const vk of [first, second]) {
      await vk.device.sendReport(0, encodeHostPacket({ op: 'debug', keyIds: [3] }));
      await vk.device.sendReport(0, encodeHostPacket(keyDown(keyboardConfig(1, 0))));
    }
    await vi.advanceTimersByTimeAsync(500);
    const values = (vk: VirtualKeyboard) => debugReports(vk).flatMap(report => report.items);
    expect(values(first)).toEqual(values(second));
    const raw = values(first).map(item => item.value);
    expect(Math.min(...raw)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...raw)).toBeLessThanOrEqual(65535);
    expect(new Set(raw).size).toBeGreaterThan(10);
    expect(values(first).some(item => item.state)).toBe(true);
    expect(values(first).some(item => !item.state)).toBe(true);
  });
});

describe('test controls', () => {
  it('records host reports and decoded packets', async () => {
    const vk = await opened();
    await exchange(vk, { op: 'get', id: 1, kind: 'version' });
    expect(vk.sentReports).toHaveLength(1);
    expect(vk.sentPackets).toEqual([{ op: 'get', id: 1, kind: 'version' }]);
    vk.clearHistory();
    expect(vk.sentReports).toHaveLength(0);
    expect(vk.inputReports).toHaveLength(0);
  });

  it('stops replying while unresponsive', async () => {
    const vk = await opened();
    vk.setUnresponsive(true);
    expect(await exchange(vk, { op: 'get', id: 1, kind: 'version' })).toEqual([]);
    vk.setUnresponsive(false);
    expect(await exchange(vk, { op: 'get', id: 2, kind: 'version' })).toHaveLength(1);
  });

  it('drops replies to matching requests until restored', async () => {
    const vk = await opened();
    const restore = vk.dropReplies(packet => packet.op === 'set' && packet.kind === 'advancedKey');
    const key = vk.state.active.advancedKeys[0];
    if (!key) throw new Error('missing key');
    expect(await exchange(vk, { op: 'set', id: 1, kind: 'advancedKey', index: 0, key })).toEqual(
      []
    );
    expect(await exchange(vk, { op: 'get', id: 2, kind: 'version' })).toHaveLength(1);
    restore();
    expect(
      await exchange(vk, { op: 'set', id: 3, kind: 'advancedKey', index: 0, key })
    ).toHaveLength(1);
  });

  it('reports a configurable firmware version', async () => {
    const vk = await opened();
    vk.setFirmwareVersion({ minor: 2, patch: 3 });
    expect(await reply(vk, { op: 'get', id: 1, kind: 'version' })).toMatchObject({
      data: { version: { major: 0, minor: 2, patch: 3 } },
    });
  });

  it('sends config-changed notifications and console messages on request', async () => {
    const vk = await opened();
    vk.notifyConfigChanged();
    vk.log('hello');
    await settle();
    expect(vk.inputReports.map(decodeDeviceReport)).toEqual([
      { kind: 'configChanged' },
      { kind: 'console', text: 'hello' },
    ]);
  });

  it('replies after the configured latency', async () => {
    vi.useFakeTimers();
    const vk = await opened({ latencyMs: 5 });
    await vk.device.sendReport(0, encodeHostPacket({ op: 'get', id: 1, kind: 'version' }));
    await vi.advanceTimersByTimeAsync(4);
    expect(vk.inputReports).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(vk.inputReports).toHaveLength(1);
  });

  it('dispatches input reports with the device and a fresh 64-byte buffer', async () => {
    const vk = await opened();
    const listener = vi.fn<(event: HIDInputReportEvent) => void>();
    vk.device.addEventListener('inputreport', listener);
    const handler = vi.fn();
    vk.device.oninputreport = handler;
    await exchange(vk, { op: 'get', id: 1, kind: 'version' });
    const event = listener.mock.calls[0]?.[0];
    expect(event?.device).toBe(vk.device);
    expect(event?.reportId).toBe(0);
    expect(event?.data.byteOffset).toBe(0);
    expect(event?.data.buffer.byteLength).toBe(64);
    expect(handler).toHaveBeenCalledOnce();
  });
});
