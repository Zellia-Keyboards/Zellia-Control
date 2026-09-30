import {
  DynamicKeyType,
  KeyboardConfigCode,
  ZelliaStarlightController,
} from 'emi-keyboard-controller';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EventFlag,
  PacketCode,
  PacketType,
  decodeDeviceReport,
  decodeHostReport,
  encodeAdvancedKeyReply,
  encodeConfigChangedEvent,
  encodeConfigReply,
  encodeConsoleReport,
  encodeDebugReport,
  encodeDynamicKeyReply,
  encodeFeatureReply,
  encodeHostPacket,
  encodeKeymapReply,
  encodeLargeGetPayloadReply,
  encodeLargeGetStartReply,
  encodeMacroReply,
  encodeProfileIndexReply,
  encodeReply,
  encodeRgbBaseReply,
  encodeRgbConfigReply,
  encodeVersionReply,
  toReport,
  type HostPacket,
  type WireAdvancedKey,
  type WireDynamicKey,
} from './protocol';

function report(bytes: Record<number, number>): Uint8Array {
  const result = new Uint8Array(64);
  for (const [offset, value] of Object.entries(bytes)) result[Number(offset)] = value;
  return result;
}

function setU16(target: Uint8Array, offset: number, value: number): void {
  new DataView(target.buffer, target.byteOffset).setUint16(offset, value, true);
}

function setU32(target: Uint8Array, offset: number, value: number): void {
  new DataView(target.buffer, target.byteOffset).setUint32(offset, value, true);
}

const SAMPLE_KEY: WireAdvancedKey = {
  mode: 2,
  calibrationMode: 3,
  activation: 32767,
  deactivation: 32112,
  triggerDistance: 5242,
  releaseDistance: 5243,
  triggerSpeed: 655,
  releaseSpeed: 656,
  upperDeadzone: 0,
  lowerDeadzone: 13107,
  upperBound: 2600,
  lowerBound: 140,
};

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'debug').mockImplementation(() => undefined);
});

describe('decodeHostReport', () => {
  it('decodes transaction headers and GET requests at the controller offsets', () => {
    expect(decodeHostReport(report({ 0: 0x02, 1: 7, 2: 0x00 }))).toEqual({
      op: 'get',
      id: 7,
      kind: 'version',
    });

    const advanced = report({ 0: 0x02, 1: 9, 2: 0x01 });
    setU16(advanced, 3, 69);
    expect(decodeHostReport(advanced)).toEqual({
      op: 'get',
      id: 9,
      kind: 'advancedKey',
      index: 69,
    });

    const keymap = report({ 0: 0x02, 1: 3, 2: 0x02, 3: 4, 6: 16 });
    setU16(keymap, 4, 48);
    expect(decodeHostReport(keymap)).toEqual({
      op: 'get',
      id: 3,
      kind: 'keymap',
      layer: 4,
      start: 48,
      length: 16,
    });

    const rgb = report({ 0: 0x02, 1: 1, 2: 0x04, 3: 3 });
    setU16(rgb, 4, 63);
    setU16(rgb, 12, 64);
    setU16(rgb, 20, 65);
    expect(decodeHostReport(rgb)).toEqual({
      op: 'get',
      id: 1,
      kind: 'rgbConfig',
      indices: [63, 64, 65],
    });

    const config = report({ 0: 0x02, 1: 2, 2: 0x07, 3: 6 });
    for (let index = 0; index < 6; index++) config[5 + index * 2] = index;
    expect(decodeHostReport(config)).toEqual({
      op: 'get',
      id: 2,
      kind: 'config',
      indices: [0, 1, 2, 3, 4, 5],
    });

    expect(decodeHostReport(report({ 0: 0x02, 1: 4, 2: 0x05, 3: 31 }))).toEqual({
      op: 'get',
      id: 4,
      kind: 'dynamicKey',
      index: 31,
    });
    expect(decodeHostReport(report({ 0: 0x02, 1: 5, 2: 0x06 }))).toEqual({
      op: 'get',
      id: 5,
      kind: 'profileIndex',
    });
    expect(decodeHostReport(report({ 0: 0x02, 1: 6, 2: 0x03 }))).toEqual({
      op: 'get',
      id: 6,
      kind: 'rgbBase',
    });
    expect(decodeHostReport(report({ 0: 0x02, 1: 8, 2: 0x0b }))).toEqual({
      op: 'get',
      id: 8,
      kind: 'feature',
    });
  });

  it('decodes SET payloads at the controller offsets', () => {
    const advanced = report({ 0: 0x01, 1: 1, 2: 0x01, 5: 2, 6: 3 });
    setU16(advanced, 3, 12);
    [32767, 32112, 5242, 5243, 655, 656, 0, 13107, 2600, 140].forEach((value, index) => {
      setU16(advanced, 7 + index * 2, value);
    });
    expect(decodeHostReport(advanced)).toEqual({
      op: 'set',
      id: 1,
      kind: 'advancedKey',
      index: 12,
      key: SAMPLE_KEY,
    });

    const keymap = report({ 0: 0x01, 1: 2, 2: 0x02, 3: 1, 6: 3 });
    setU16(keymap, 4, 10);
    setU16(keymap, 7, 0x1001);
    setU16(keymap, 9, 0x1002);
    setU16(keymap, 11, 0x1003);
    expect(decodeHostReport(keymap)).toEqual({
      op: 'set',
      id: 2,
      kind: 'keymap',
      layer: 1,
      start: 10,
      keycodes: [0x1001, 0x1002, 0x1003],
    });

    const base = report({ 0: 0x01, 1: 3, 2: 0x03, 3: 3, 4: 1, 5: 2, 6: 3, 7: 4, 8: 5, 9: 6 });
    setU16(base, 10, 500);
    setU16(base, 12, 270);
    base[14] = 44;
    base[15] = 200;
    expect(decodeHostReport(base)).toEqual({
      op: 'set',
      id: 3,
      kind: 'rgbBase',
      config: {
        mode: 3,
        color: { red: 1, green: 2, blue: 3 },
        secondaryColor: { red: 4, green: 5, blue: 6 },
        speed: 500,
        direction: 270,
        density: 44,
        brightness: 200,
      },
    });

    const rgb = report({ 0: 0x01, 1: 4, 2: 0x04, 3: 1, 6: 4, 7: 9, 8: 8, 9: 7 });
    setU16(rgb, 4, 5);
    setU16(rgb, 10, 1234);
    expect(decodeHostReport(rgb)).toEqual({
      op: 'set',
      id: 4,
      kind: 'rgbConfig',
      entries: [
        { index: 5, config: { mode: 4, color: { red: 9, green: 8, blue: 7 }, speed: 1234 } },
      ],
    });

    const config = report({ 0: 0x01, 1: 5, 2: 0x07, 3: 2, 5: 1, 6: 1, 7: 4, 8: 0 });
    expect(decodeHostReport(config)).toEqual({
      op: 'set',
      id: 5,
      kind: 'config',
      entries: [
        { index: 1, value: true },
        { index: 4, value: false },
      ],
    });

    expect(decodeHostReport(report({ 0: 0x01, 1: 6, 2: 0x06, 3: 2 }))).toEqual({
      op: 'set',
      id: 6,
      kind: 'profileIndex',
      index: 2,
    });
  });

  it('decodes all four dynamic-key layouts', () => {
    const stroke = report({ 0: 0x01, 1: 1, 2: 0x05, 3: 4, 17: 0x3f, 18: 0x04, 19: 0, 20: 0x01 });
    setU32(stroke, 5, 1);
    [0x16, 0x0200, 0x04, 0].forEach((code, index) => {
      setU16(stroke, 9 + index * 2, code);
    });
    [16383, 49151, 49150, 16384].forEach((raw, index) => {
      setU16(stroke, 21 + index * 2, raw);
    });
    setU16(stroke, 29, 32);
    expect(decodeHostReport(stroke)).toMatchObject({
      op: 'set',
      kind: 'dynamicKey',
      index: 4,
      key: {
        type: 'stroke',
        bindings: [0x16, 0x0200, 0x04, 0],
        keyControl: [0x3f, 0x04, 0, 0x01],
        pressBegin: 16383,
        pressFully: 49151,
        releaseBegin: 49150,
        releaseFully: 16384,
        keyId: 32,
      },
    });

    const modTap = report({ 0: 0x01, 1: 1, 2: 0x05, 3: 1 });
    setU32(modTap, 5, 2);
    setU16(modTap, 9, 0x29);
    setU16(modTap, 11, 0x0100);
    setU32(modTap, 13, 200);
    setU16(modTap, 17, 30);
    expect(decodeHostReport(modTap)).toMatchObject({
      key: { type: 'modTap', bindings: [0x29, 0x0100], duration: 200, keyId: 30 },
    });

    const toggle = report({ 0: 0x01, 1: 1, 2: 0x05, 3: 2 });
    setU32(toggle, 5, 3);
    setU16(toggle, 9, 0x09);
    setU16(toggle, 11, 34);
    expect(decodeHostReport(toggle)).toMatchObject({
      key: { type: 'toggle', binding: 0x09, keyId: 34 },
    });

    const mutex = report({ 0: 0x01, 1: 1, 2: 0x05, 3: 3, 17: 1 });
    setU32(mutex, 5, 4);
    setU16(mutex, 9, 0x04);
    setU16(mutex, 11, 0x07);
    setU16(mutex, 13, 31);
    setU16(mutex, 15, 33);
    expect(decodeHostReport(mutex)).toMatchObject({
      key: { type: 'mutex', bindings: [0x04, 0x07], keyIds: [31, 33], mode: 1 },
    });

    const none = report({ 0: 0x01, 1: 1, 2: 0x05, 3: 9 });
    expect(decodeHostReport(none)).toMatchObject({ key: { type: 'none' } });
  });

  it('decodes events, debug subscriptions, macros, large data and unknown packets', () => {
    const event = report({ 0: 0x00, 2: 0x03, 3: 0xfe, 4: 0x12, 7: 1 });
    expect(decodeHostReport(event)).toEqual({
      op: 'event',
      event: 3,
      keycode: 0x12fe,
      keyId: 0,
      isVirtual: true,
      useKeymap: false,
    });

    const debug = report({ 0: 0x06, 1: 2 });
    setU16(debug, 6, 7);
    setU16(debug, 16, 9);
    expect(decodeHostReport(debug)).toEqual({ op: 'debug', keyIds: [7, 9] });
    expect(decodeHostReport(report({ 0: 0x06, 1: 0 }))).toEqual({ op: 'debug', keyIds: [] });

    const macro = report({ 0: 0x02, 1: 1, 2: 0x0a, 3: 2 });
    setU16(macro, 4, 2);
    setU16(macro, 10, 4);
    setU16(macro, 22, 5);
    expect(decodeHostReport(macro)).toEqual({
      op: 'get',
      id: 1,
      kind: 'macro',
      macroIndex: 2,
      actionIndices: [4, 5],
    });

    const macroSet = report({ 0: 0x01, 1: 1, 2: 0x0a, 3: 0, 14: 1, 15: 3 });
    setU16(macroSet, 4, 1);
    setU32(macroSet, 6, 250);
    setU16(macroSet, 10, 2);
    setU16(macroSet, 12, 9);
    setU16(macroSet, 16, 0x1234);
    expect(decodeHostReport(macroSet)).toEqual({
      op: 'set',
      id: 1,
      kind: 'macro',
      macroIndex: 0,
      actions: [{ index: 2, delay: 250, keyId: 9, isVirtual: true, event: 3, keycode: 0x1234 }],
    });

    const largeStart = report({ 0: 0x04, 1: 3, 2: 0x0c, 3: 0 });
    setU32(largeStart, 4, 101);
    expect(decodeHostReport(largeStart)).toEqual({
      op: 'largeSet',
      id: 3,
      dataType: 0x0c,
      command: 'start',
      totalSize: 101,
      checksum: 0,
    });

    const largePayload = report({ 0: 0x05, 1: 4, 2: 0x0d, 3: 1 });
    setU32(largePayload, 4, 54);
    setU16(largePayload, 8, 5);
    expect(decodeHostReport(largePayload)).toMatchObject({
      op: 'largeGet',
      command: 'payload',
      offset: 54,
      length: 5,
    });

    expect(decodeHostReport(report({ 0: 0x02, 1: 2, 2: 0x0f }))).toEqual({
      op: 'get',
      id: 2,
      kind: 'other',
      type: 0x0f,
    });
    expect(decodeHostReport(report({ 0: 0x42, 1: 1, 2: 2 }))).toEqual({
      op: 'unknown',
      code: 0x42,
    });
  });

  it('clamps counts to what fits into one 64-byte report', () => {
    const keymap = report({ 0: 0x01, 1: 1, 2: 0x02, 6: 200 });
    const decoded = decodeHostReport(keymap);
    expect(decoded.op === 'set' && decoded.kind === 'keymap' && decoded.keycodes.length).toBe(28);

    const debug = report({ 0: 0x06, 1: 9 });
    const subscription = decodeHostReport(debug);
    expect(subscription.op === 'debug' && subscription.keyIds.length).toBe(5);
  });

  it('pads short reports to the full report size', () => {
    expect(toReport(new Uint8Array([0x02, 0x05, 0x07]))).toHaveLength(64);
    expect(decodeHostReport(new Uint8Array([0x02, 0x05, 0x07]))).toEqual({
      op: 'get',
      id: 5,
      kind: 'config',
      indices: [],
    });
  });
});

describe('encodeHostPacket', () => {
  const packets: HostPacket[] = [
    { op: 'get', id: 1, kind: 'version' },
    { op: 'get', id: 2, kind: 'advancedKey', index: 5 },
    { op: 'set', id: 3, kind: 'advancedKey', index: 5, key: SAMPLE_KEY },
    { op: 'get', id: 4, kind: 'keymap', layer: 2, start: 16, length: 16 },
    { op: 'set', id: 5, kind: 'keymap', layer: 2, start: 3, keycodes: [1, 2, 0xffff] },
    { op: 'get', id: 6, kind: 'rgbBase' },
    {
      op: 'set',
      id: 7,
      kind: 'rgbBase',
      config: {
        mode: 2,
        color: { red: 10, green: 20, blue: 30 },
        secondaryColor: { red: 1, green: 2, blue: 3 },
        speed: 100,
        direction: 359,
        density: 12,
        brightness: 255,
      },
    },
    { op: 'get', id: 8, kind: 'rgbConfig', indices: [0, 1, 2, 3, 4, 5, 6] },
    {
      op: 'set',
      id: 9,
      kind: 'rgbConfig',
      entries: [
        { index: 69, config: { mode: 3, color: { red: 1, green: 2, blue: 3 }, speed: 20 } },
      ],
    },
    { op: 'get', id: 10, kind: 'dynamicKey', index: 3 },
    {
      op: 'set',
      id: 11,
      kind: 'dynamicKey',
      index: 3,
      key: { type: 'mutex', bindings: [4, 7], keyIds: [31, 33], mode: 1 },
    },
    { op: 'get', id: 12, kind: 'profileIndex' },
    { op: 'set', id: 13, kind: 'profileIndex', index: 3 },
    { op: 'get', id: 14, kind: 'config', indices: [0, 1, 2, 3, 4, 5] },
    {
      op: 'set',
      id: 15,
      kind: 'config',
      entries: [
        { index: 0, value: true },
        { index: 5, value: false },
      ],
    },
    { op: 'get', id: 16, kind: 'macro', macroIndex: 1, actionIndices: [0, 1, 2, 3] },
    {
      op: 'set',
      id: 17,
      kind: 'macro',
      macroIndex: 1,
      actions: [{ index: 7, delay: 5, keyId: 2, isVirtual: false, event: 1, keycode: 4 }],
    },
    { op: 'get', id: 18, kind: 'feature' },
    { op: 'get', id: 19, kind: 'other', type: 0x0e },
    { op: 'event', event: 3, keycode: 0x02fe, keyId: 0, isVirtual: true, useKeymap: false },
    { op: 'debug', keyIds: [1, 2, 3] },
    {
      op: 'largeGet',
      id: 20,
      dataType: 0x0c,
      command: 'start',
      totalSize: 0,
      checksum: 0,
    },
    {
      op: 'largeSet',
      id: 21,
      dataType: 0x0d,
      command: 'payload',
      offset: 54,
      length: 3,
      data: new Uint8Array([7, 8, 9]),
    },
    { op: 'largeSet', id: 22, dataType: 0x0d, command: 'end' },
  ];

  it.each(
    packets.map(packet => [`${packet.op} ${'kind' in packet ? packet.kind : ''}`, packet] as const)
  )('round-trips %s', (_, packet) => {
    const encoded = encodeHostPacket(packet);
    expect(encoded).toHaveLength(64);
    expect(decodeHostReport(encoded)).toEqual(packet);
  });

  const dynamicKeys: WireDynamicKey[] = [
    { type: 'none' },
    {
      type: 'stroke',
      bindings: [1, 2, 3, 4],
      keyControl: [5, 6, 7, 8],
      pressBegin: 100,
      pressFully: 200,
      releaseBegin: 300,
      releaseFully: 400,
      keyId: 12,
    },
    { type: 'modTap', bindings: [0x29, 0x0100], duration: 70000, keyId: 30 },
    { type: 'toggle', binding: 0x39, keyId: 28 },
    { type: 'mutex', bindings: [4, 7], keyIds: [31, 33], mode: 4 },
  ];

  it.each(dynamicKeys.map(key => [key.type, key] as const))(
    'round-trips a %s dynamic key',
    (_, key) => {
      const packet: HostPacket = { op: 'set', id: 1, kind: 'dynamicKey', index: 7, key };
      expect(decodeHostReport(encodeHostPacket(packet))).toEqual(packet);
    }
  );
});

describe('device replies', () => {
  function request(packet: HostPacket): Uint8Array {
    return encodeHostPacket(packet);
  }

  it('echoes code, id, type and the request bytes', () => {
    const original = request({
      op: 'set',
      id: 42,
      kind: 'keymap',
      layer: 0,
      start: 1,
      keycodes: [5],
    });
    const reply = encodeReply(original);
    expect(reply).toEqual(original);
    expect(reply).not.toBe(original);
    expect(decodeDeviceReport(reply)).toEqual({
      kind: 'reply',
      op: 'set',
      id: 42,
      data: { kind: 'keymap', layer: 0, start: 1, keycodes: [5] },
    });
  });

  it('encodes replies that the real controller parses into its cache', () => {
    const controller = new ZelliaStarlightController();

    const version = encodeVersionReply(request({ op: 'get', id: 1, kind: 'version' }), {
      major: 0,
      minor: 1,
      patch: 7,
      info: 'virtual',
    });
    expect(controller.packet_process_version(version)).toBe(true);
    expect(controller.get_firmware_version()).toEqual({
      major: 0,
      minor: 1,
      patch: 7,
      info: 'virtual',
    });

    controller.packet_process(
      encodeAdvancedKeyReply(
        request({ op: 'get', id: 2, kind: 'advancedKey', index: 12 }),
        SAMPLE_KEY
      )
    );
    expect(controller.get_advanced_keys()[12]?.config).toEqual({
      mode: 2,
      calibration_mode: 3,
      activation_value: 32767 / 65535,
      deactivation_value: 32112 / 65535,
      trigger_distance: 5242 / 65535,
      release_distance: 5243 / 65535,
      trigger_speed: 655 / 65535,
      release_speed: 656 / 65535,
      upper_deadzone: 0,
      lower_deadzone: 13107 / 65535,
      upper_bound: 2600,
      lower_bound: 140,
    });

    controller.packet_process(
      encodeKeymapReply(
        request({ op: 'get', id: 3, kind: 'keymap', layer: 1, start: 2, length: 3 }),
        [0x1111, 0x2222, 0x3333]
      )
    );
    expect(controller.get_keymap()[1]?.slice(0, 6)).toEqual([
      0x35, 0x3a, 0x1111, 0x2222, 0x3333, 0x3e,
    ]);

    controller.packet_process(
      encodeRgbBaseReply(request({ op: 'get', id: 4, kind: 'rgbBase' }), {
        mode: 3,
        color: { red: 1, green: 2, blue: 3 },
        secondaryColor: { red: 4, green: 5, blue: 6 },
        speed: 77,
        direction: 90,
        density: 9,
        brightness: 128,
      })
    );
    expect(controller.get_rgb_base_config()).toEqual({
      mode: 3,
      rgb: { red: 1, green: 2, blue: 3 },
      secondary_rgb: { red: 4, green: 5, blue: 6 },
      speed: 77,
      direction: 90,
      density: 9,
      brightness: 128,
    });

    controller.packet_process(
      encodeRgbConfigReply(request({ op: 'get', id: 5, kind: 'rgbConfig', indices: [7, 8] }), [
        { mode: 1, color: { red: 9, green: 8, blue: 7 }, speed: 300 },
        { mode: 4, color: { red: 6, green: 5, blue: 4 }, speed: 3 },
      ])
    );
    expect(controller.get_rgb_configs().slice(7, 9)).toEqual([
      { mode: 1, rgb: { red: 9, green: 8, blue: 7 }, speed: 300 },
      { mode: 4, rgb: { red: 6, green: 5, blue: 4 }, speed: 3 },
    ]);

    controller.packet_process(
      encodeProfileIndexReply(request({ op: 'get', id: 6, kind: 'profileIndex' }), 2)
    );
    expect(controller.get_profile_index()).toBe(2);

    const configRequest = request({
      op: 'get',
      id: 7,
      kind: 'config',
      indices: Array.from({ length: KeyboardConfigCode.KeyboardConfigNum }, (_, index) => index),
    });
    controller.packet_process(
      encodeConfigReply(configRequest, [true, true, false, true, false, true])
    );
    expect(controller.get_config()).toEqual({
      debug: true,
      nkro: true,
      winlock: false,
      continuous_poll: true,
      enable_report: false,
      console: true,
    });

    controller.packet_process(
      encodeDynamicKeyReply(request({ op: 'get', id: 8, kind: 'dynamicKey', index: 5 }), {
        type: 'none',
      })
    );
    expect(controller.get_dynamic_keys()[5]?.type).toBe(DynamicKeyType.DynamicKeyNone);
  });

  it('encodes non-empty dynamic keys at the offsets the controller parses', () => {
    const controller = new ZelliaStarlightController();
    const parse = (key: WireDynamicKey, index: number) => {
      // The vendored parser throws after decoding non-empty keys (see controller.ts); the parsed
      // key is already stored when it does.
      try {
        controller.packet_process(
          encodeDynamicKeyReply(
            encodeHostPacket({ op: 'get', id: 1, kind: 'dynamicKey', index }),
            key
          )
        );
      } catch {
        // expected for non-empty keys
      }
      return controller.get_dynamic_keys()[index];
    };

    const stroke = parse(
      {
        type: 'stroke',
        bindings: [0x16, 0x0200, 0, 0],
        keyControl: [0x3f, 0x04, 0, 0],
        pressBegin: 16383,
        pressFully: 49151,
        releaseBegin: 49151,
        releaseFully: 16383,
        keyId: 32,
      },
      0
    );
    expect(stroke).toMatchObject({
      type: DynamicKeyType.DynamicKeyStroke,
      bindings: [0x16, 0x0200, 0, 0],
      key_control: [0x3f, 0x04, 0, 0],
      press_begin_distance: 16383 / 65535,
      press_fully_distance: 49151 / 65535,
      release_begin_distance: 49151 / 65535,
      release_fully_distance: 16383 / 65535,
    });

    const modTap = parse({ type: 'modTap', bindings: [0x29, 0x0100], duration: 200, keyId: 30 }, 1);
    expect(modTap).toMatchObject({ type: 2, bindings: [0x29, 0x0100], duration: 200 });

    expect(parse({ type: 'toggle', binding: 0x09, keyId: 34 }, 2)).toMatchObject({
      type: 3,
      bindings: [0x09],
    });

    const mutex = parse({ type: 'mutex', bindings: [0x04, 0x07], keyIds: [31, 33], mode: 1 }, 3);
    expect(mutex).toMatchObject({ type: 4, bindings: [0x04, 0x07], mode: 1 });
  });

  it('encodes macro, feature and large-data replies', () => {
    const macroRequest = encodeHostPacket({
      op: 'get',
      id: 1,
      kind: 'macro',
      macroIndex: 0,
      actionIndices: [0, 1],
    });
    const macroReply = encodeMacroReply(macroRequest, [
      { index: 0, delay: 10, keyId: 1, isVirtual: false, event: 3, keycode: 4 },
      undefined,
    ]);
    expect(decodeDeviceReport(macroReply)).toEqual({
      kind: 'reply',
      op: 'get',
      id: 1,
      data: {
        kind: 'macro',
        macroIndex: 0,
        actions: [
          { index: 0, delay: 10, keyId: 1, isVirtual: false, event: 3, keycode: 4 },
          { index: 1, delay: 0, keyId: 0, isVirtual: false, event: 0, keycode: 0 },
        ],
      },
    });

    const feature = encodeFeatureReply(encodeHostPacket({ op: 'get', id: 2, kind: 'feature' }), {
      features: 0b1011,
      rgbFeatures: 0,
      scriptSupport: 1,
    });
    expect(decodeDeviceReport(feature)).toEqual({
      kind: 'reply',
      op: 'get',
      id: 2,
      data: { kind: 'feature', feature: { features: 0b1011, rgbFeatures: 0, scriptSupport: 1 } },
    });

    const start = encodeLargeGetStartReply(
      encodeHostPacket({
        op: 'largeGet',
        id: 3,
        dataType: 0x0c,
        command: 'start',
        totalSize: 0,
        checksum: 0,
      }),
      9,
      0
    );
    expect(new DataView(start.buffer).getUint32(4, true)).toBe(9);

    const payload = encodeLargeGetPayloadReply(
      encodeHostPacket({
        op: 'largeGet',
        id: 4,
        dataType: 0x0c,
        command: 'payload',
        offset: 0,
        length: 54,
        data: new Uint8Array(),
      }),
      0,
      new Uint8Array([1, 2, 3])
    );
    expect(decodeDeviceReport(payload)).toMatchObject({
      kind: 'largeReply',
      op: 'largeGet',
      command: 'payload',
      offset: 0,
      length: 3,
      data: new Uint8Array([1, 2, 3]),
    });
  });

  it('encodes unsolicited device reports', () => {
    const changed = encodeConfigChangedEvent();
    expect([changed[0], changed[1]]).toEqual([PacketCode.Event, EventFlag.ConfigChanged]);
    expect(decodeDeviceReport(changed)).toEqual({ kind: 'configChanged' });

    const consoleReport = encodeConsoleReport('hello');
    expect(decodeDeviceReport(consoleReport)).toEqual({
      kind: 'console',
      text: 'hello',
    });

    const controller = new ZelliaStarlightController();
    const listener = vi.fn();
    controller.addEventListener('updateDebugData', listener);
    const debug = encodeDebugReport(1234, [
      { index: 3, state: true, reportState: false, raw: 2000, filteredRaw: 1999, value: 40000 },
    ]);
    controller.packet_process(debug);
    expect(listener).toHaveBeenCalledOnce();
    expect(controller.get_advanced_keys()[3]).toMatchObject({
      state: true,
      report_state: false,
      raw: 2000,
      filtered_raw: 1999,
      value: 40000 / 65535,
    });
    expect(decodeDeviceReport(debug)).toEqual({
      kind: 'debug',
      tick: 1234,
      items: [
        { index: 3, state: true, reportState: false, raw: 2000, filteredRaw: 1999, value: 40000 },
      ],
    });
  });

  it('exposes the packet constants used on the wire', () => {
    expect(PacketType).toMatchObject({ Keymap: 0x02, DynamicKey: 0x05, Feature: 0x0b });
    expect(PacketCode).toMatchObject({ Get: 0x02, Set: 0x01, Debug: 0x06 });
  });
});
