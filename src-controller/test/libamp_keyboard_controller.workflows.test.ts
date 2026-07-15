import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibampKeyboardController, TransactionSession } from '../src/controllers/libamp_keyboard_controller/controller';
import {
  AdvancedKey,
  DynamicKeyStroke4x4,
  KeyLocation,
  KeyboardKeyEvent,
  KeyMode,
  RGBBaseConfig,
  RGBBaseMode,
  RGBConfig,
  RGBMode,
} from '../src/interface';
import {
  decodeFrame,
  flushPromises,
  installMockNavigator,
  MockHidDevice,
  responseFor,
} from './support/hid';

type ControllerInternals = {
  handleInputReport: (event: HIDInputReportEvent) => void;
};

const internals = (controller: LibampKeyboardController) => controller as unknown as ControllerInternals;

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'debug').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function wireAutoResponder(
  controller: LibampKeyboardController,
  responder: (request: ReturnType<typeof decodeFrame>) => Uint8Array | undefined,
): MockHidDevice {
  const device = new MockHidDevice();
  controller.device = device as unknown as HIDDevice;
  device.opened = true;
  device.addEventListener('inputreport', internals(controller).handleInputReport as EventListener);
  device.onSend = report => {
    const response = responder(decodeFrame(report));
    if (response) {
      device.emitInput(response);
    }
  };
  return device;
}

function echoResponse(request: ReturnType<typeof decodeFrame>): Uint8Array {
  return responseFor(request);
}

describe('LibampKeyboardController public workflows', () => {
  it('sends standalone configuration packets from the supplied values without mutating cached state', async () => {
    const controller = new LibampKeyboardController();
    controller.advanced_keys = [new AdvancedKey()];
    controller.keymap = [[0xdead]];
    controller.dynamic_keys = [new DynamicKeyStroke4x4()];
    controller.rgb_base_config = new RGBBaseConfig();
    controller.rgb_configs = [new RGBConfig()];
    const sent = [] as ReturnType<typeof decodeFrame>[];
    wireAutoResponder(controller, request => {
      sent.push(request);
      return echoResponse(request);
    });

    const advancedKey = new AdvancedKey({
      mode: KeyMode.KeyAnalogSpeedMode,
      activation_value: 0.25,
      upper_bound: 3210,
      lower_bound: 123,
    });
    const dynamicKey = new DynamicKeyStroke4x4();
    dynamicKey.bindings = [0x101, 0x202, 0x303, 0x404];
    dynamicKey.key_control = [1, 2, 3, 4];
    dynamicKey.target_keys_location = [Object.assign(new KeyLocation(), { id: 9 })];
    const rgbBase = new RGBBaseConfig();
    Object.assign(rgbBase, {
      mode: RGBBaseMode.RgbBaseModeWave,
      rgb: { red: 1, green: 2, blue: 3 },
      secondary_rgb: { red: 4, green: 5, blue: 6 },
      speed: 500,
      direction: 0x12345,
      density: 300,
      brightness: 511,
    });
    const rgb = new RGBConfig();
    Object.assign(rgb, { mode: RGBMode.RgbModeTrigger, rgb: { red: 7, green: 8, blue: 9 }, speed: 1234 });

    await controller.send_advanced_key_packet(2, advancedKey);
    await controller.send_keymap_packet(3, 10, 3, [0x1001, 0x1002, 0x1003]);
    await controller.send_dynamic_key_packet(4, dynamicKey);
    await controller.send_rgb_base_packet(rgbBase);
    await controller.send_rgb_packet(5, rgb);

    expect(sent.map(frame => frame.type)).toEqual([0x01, 0x02, 0x05, 0x03, 0x04]);

    const advanced = new DataView(sent[0].body.buffer, sent[0].body.byteOffset);
    expect(advanced.getUint16(0, true)).toBe(2);
    expect(sent[0].body[2]).toBe(KeyMode.KeyAnalogSpeedMode);
    expect(advanced.getUint16(4, true)).toBe(Math.trunc(0.25 * 65535));
    expect(advanced.getUint16(20, true)).toBe(3210);
    expect(advanced.getUint16(22, true)).toBe(123);

    const keymap = new DataView(sent[1].body.buffer, sent[1].body.byteOffset);
    expect([sent[1].body[0], keymap.getUint16(1, true), sent[1].body[3]]).toEqual([3, 10, 3]);
    expect([0, 1, 2].map(offset => keymap.getUint16(4 + offset * 2, true))).toEqual([0x1001, 0x1002, 0x1003]);

    const dynamic = new DataView(sent[2].body.buffer, sent[2].body.byteOffset);
    expect([sent[2].body[0], dynamic.getUint32(2, true)]).toEqual([4, 1]);
    expect([0, 1, 2, 3].map(offset => dynamic.getUint16(6 + offset * 2, true))).toEqual(dynamicKey.bindings);
    expect(dynamic.getUint16(26, true)).toBe(9);

    const base = new DataView(sent[3].body.buffer, sent[3].body.byteOffset);
    expect(Array.from(sent[3].body.slice(0, 7))).toEqual([RGBBaseMode.RgbBaseModeWave, 1, 2, 3, 4, 5, 6]);
    expect([base.getUint16(7, true), base.getUint16(9, true), sent[3].body[11], sent[3].body[12]]).toEqual([500, 0x2345, 44, 255]);

    const rgbFrame = new DataView(sent[4].body.buffer, sent[4].body.byteOffset);
    expect([sent[4].body[0], rgbFrame.getUint16(1, true), sent[4].body[3]]).toEqual([1, 5, RGBMode.RgbModeTrigger]);
    expect(Array.from(sent[4].body.slice(4, 7))).toEqual([7, 8, 9]);
    expect(rgbFrame.getUint16(7, true)).toBe(1234);

    expect(controller.advanced_keys[0].config.mode).not.toBe(KeyMode.KeyAnalogSpeedMode);
    expect(controller.keymap).toEqual([[0xdead]]);
    expect(controller.dynamic_keys[0].bindings).toEqual([0, 0, 0, 0]);
    expect(controller.rgb_base_config.mode).toBe(RGBBaseMode.RgbBaseModeBlank);
    expect(controller.rgb_configs[0].mode).toBe(RGBMode.RgbModeLinear);
  });

  it('rejects malformed keymap pages and exposes timeouts from standalone sends', async () => {
    const controller = new LibampKeyboardController();
    await expect(controller.send_keymap_packet(0, 0, 2, [0x1001])).rejects.toThrow('does not match');
    await expect(controller.send_keymap_packet(0, 0, 29, Array(29).fill(0))).rejects.toThrow('between 0 and 28');

    vi.useFakeTimers();
    installMockNavigator();
    wireAutoResponder(controller, () => undefined);
    const timedOut = controller.send_rgb_packet(0, new RGBConfig());
    const timeoutExpectation = expect(timedOut).rejects.toThrow('Timeout waiting for packet');
    await flushPromises();
    await vi.advanceTimersByTimeAsync(200);
    await timeoutExpectation;
  });

  it('propagates timeout and disconnect failures from standalone sends', async () => {
    vi.useFakeTimers();
    installMockNavigator();
    const controller = new LibampKeyboardController();
    wireAutoResponder(controller, () => undefined);

    const timedOut = controller.send_rgb_packet(0, new RGBConfig());
    const timeoutExpectation = expect(timedOut).rejects.toThrow('Timeout waiting for packet');
    await flushPromises();
    await vi.advanceTimersByTimeAsync(200);
    await timeoutExpectation;

    const disconnected = controller.send_rgb_packet(0, new RGBConfig());
    await flushPromises();
    controller.disconnect();
    await expect(disconnected).rejects.toThrow('Device disconnected abruptly');
  });

  it('delegates keymap pages to the packet API while keeping RGB config pages batched', async () => {
    const controller = new LibampKeyboardController();
    controller.advanced_keys = [new AdvancedKey()];
    controller.keymap = [Array.from({ length: 17 }, (_, index) => 0x1000 + index)];
    const dynamicKey = new DynamicKeyStroke4x4();
    dynamicKey.target_keys_location = [Object.assign(new KeyLocation(), { id: 0 })];
    controller.dynamic_keys = [dynamicKey];
    controller.rgb_configs = Array.from({ length: 8 }, (_, index) => ({
      mode: RGBMode.RgbModeFixed,
      rgb: { red: index, green: index + 1, blue: index + 2 },
      speed: 20 + index,
    }));
    const sent = [] as ReturnType<typeof decodeFrame>[];
    wireAutoResponder(controller, request => {
      sent.push(request);
      return echoResponse(request);
    });
    const advancedKeyPackets = vi.spyOn(controller, 'send_advanced_key_packet');
    const keymapPackets = vi.spyOn(controller, 'send_keymap_packet');
    const dynamicKeyPackets = vi.spyOn(controller, 'send_dynamic_key_packet');
    const rgbBasePacket = vi.spyOn(controller, 'send_rgb_base_packet');
    const rgbPackets = vi.spyOn(controller, 'send_rgb_packet');

    const session = new TransactionSession('test-session');
    await controller.write_advanced_keys(session);
    await controller.write_keymap(session);
    await controller.write_dynamic_keys(session);
    await controller.write_rgb_configs(session);

    expect(advancedKeyPackets).toHaveBeenCalledWith(0, controller.advanced_keys[0], session);
    expect(keymapPackets).toHaveBeenNthCalledWith(1, 0, 0, 16, Array.from({ length: 16 }, (_, index) => 0x1000 + index), session);
    expect(keymapPackets).toHaveBeenNthCalledWith(2, 0, 16, 1, [0x1010], session);
    expect(dynamicKeyPackets).toHaveBeenCalledWith(0, dynamicKey, session);
    expect(rgbBasePacket).toHaveBeenCalledOnce();
    expect(rgbPackets).not.toHaveBeenCalled();
    const rgbFrames = sent.filter(frame => frame.type === 0x04);
    expect(rgbFrames.map(frame => frame.body[0])).toEqual([7, 1]);
  });

  it('subscribes debug keys with a single code-0x06 packet and applies streamed updates', async () => {
    const controller = new LibampKeyboardController();
    controller.advanced_keys = Array.from({ length: 6 }, () => new AdvancedKey());
    const sent = [] as ReturnType<typeof decodeFrame>[];
    const device = wireAutoResponder(controller, request => {
      sent.push(request);
      return undefined; // Debug 订阅无回显
    });

    // 6 个键超出固件 5 槽订阅窗口，只取前 5 个（覆盖式订阅，一包即可）
    await controller.request_debug_at([0, 1, 2, 3, 4, 5]);

    expect(device.sentReports).toHaveLength(1);
    const subscriptions = sent.filter(frame => frame.code === 0x06);
    // Debug 订阅包：code(0x06) length(1) tick(2-5) items(6+)，length 位于 report[1]
    expect(subscriptions.map(frame => frame.id)).toEqual([5]);
    expect(subscriptions[0].body[0]).toBe(0); // tick 为 0
    const firstView = new DataView(subscriptions[0].body.buffer, subscriptions[0].body.byteOffset);
    expect(firstView.getUint16(3, true)).toBe(0); // 第一个订阅 key
    expect(firstView.getUint16(43, true)).toBe(4); // 第 5 个订阅 key

    // 固件异步推送 Debug 数据包：code(0x06) length(1) tick(2-5) item(6+)
    const streamPacket = (ids: number[], tick: number): Uint8Array => {
      const report = new Uint8Array(64);
      report[0] = 0x06;
      report[1] = ids.length;
      const view = new DataView(report.buffer);
      view.setUint32(2, tick, true);
      ids.forEach((id, index) => {
        const base = 6 + index * 10;
        view.setUint16(base, id, true);
        report[base + 2] = 1;
        report[base + 3] = 1;
        view.setUint16(base + 4, id + 100, true);
      });
      return report;
    };

    const updates = vi.fn();
    controller.addEventListener('updateDebugData', updates);
    device.emitInput(streamPacket([0, 1, 2, 3, 4], 99));

    expect(updates).toHaveBeenCalledTimes(1);
    expect(updates.mock.calls[0][0].detail).toEqual({ tick: 99, updated_keys: [0, 1, 2, 3, 4] });
    expect(controller.advanced_keys[0]).toMatchObject({ state: true, report_state: true, raw: 100 });
    expect(controller.advanced_keys[4]).toMatchObject({ raw: 104 });
  });

  it('requests firmware round-robin with an empty debug packet and stops on request_debug_at', async () => {
    const controller = new LibampKeyboardController();
    controller.advanced_keys = Array.from({ length: 6 }, () => new AdvancedKey());
    const device = wireAutoResponder(controller, () => undefined);

    // length=0 → 清空订阅，固件自主轮换推流整个键盘
    await controller.request_debug();
    expect(device.sentReports).toHaveLength(1);
    expect(device.sentReports[0][0]).toBe(0x06);
    expect(device.sentReports[0][1]).toBe(0);

    // 定点订阅替换轮换
    await controller.request_debug_at([2, 3]);
    expect(device.sentReports).toHaveLength(2);
    expect(device.sentReports[1][0]).toBe(0x06);
    expect(device.sentReports[1][1]).toBe(2);
    const view = new DataView(device.sentReports[1].buffer);
    expect(view.getUint16(6, true)).toBe(2);
    expect(view.getUint16(16, true)).toBe(3);
  });

  it('paginates keymap and macro writes while preserving command contents', async () => {
    const controller = new LibampKeyboardController();
    controller.keymap = [Array.from({ length: 17 }, (_, index) => 0x1000 + index)];
    controller.macros = [[
      ...Array.from({ length: 5 }, (_, index) => ({
        delay: index + 10,
        event: { key_id: index, is_virtual: index % 2 === 0, event: index + 1, keycode: 0x2000 + index },
      })),
    ]];
    const sent = [] as ReturnType<typeof decodeFrame>[];
    wireAutoResponder(controller, request => {
      sent.push(request);
      return echoResponse(request);
    });

    const session = new TransactionSession('test-session');
    await controller.write_keymap(session);
    await controller.write_macros(session);

    const keymapFrames = sent.filter(frame => frame.code === 0x01 && frame.type === 0x02);
    expect(keymapFrames).toHaveLength(2);
    expect(keymapFrames.map(frame => frame.body[3])).toEqual([16, 1]);
    expect(new DataView(keymapFrames[0].body.buffer, keymapFrames[0].body.byteOffset).getUint16(4, true)).toBe(0x1000);
    expect(new DataView(keymapFrames[1].body.buffer, keymapFrames[1].body.byteOffset).getUint16(4, true)).toBe(0x1010);

    const macroFrames = sent.filter(frame => frame.code === 0x01 && frame.type === 0x0a);
    expect(macroFrames).toHaveLength(2);
    expect(macroFrames.map(frame => new DataView(frame.body.buffer, frame.body.byteOffset).getUint16(1, true))).toEqual([4, 1]);
    expect(new DataView(macroFrames[1].body.buffer, macroFrames[1].body.byteOffset).getUint32(3, true)).toBe(14);
  });

  it('uses start, payload, and end packets for script uploads', async () => {
    const controller = new LibampKeyboardController();
    const sent = [] as ReturnType<typeof decodeFrame>[];
    wireAutoResponder(controller, request => {
      sent.push(request);
      return echoResponse(request);
    });

    await controller.write_script_source('x'.repeat(100));
    await controller.write_script_bytecode(Uint8Array.from({ length: 52 }, (_, index) => index));

    const uploads = sent.filter(frame => frame.code === 0x04);
    const sourceUpload = uploads.filter(frame => frame.type === 0x0c);
    const bytecodeUpload = uploads.filter(frame => frame.type === 0x0d);
    // 100 字符源码 + NUL 结尾 = 101 字节，按 54 字节分块；字节码 52 字节单块
    expect(sourceUpload.map(frame => frame.body[0])).toEqual([0, 1, 1, 2]);
    expect(bytecodeUpload.map(frame => frame.body[0])).toEqual([0, 1, 2]);
    expect(Array.from(sourceUpload[1].body.slice(7, 7 + 54))).toEqual(Array(54).fill(0x78));
    // 第二块：46 个 'x' + NUL 结尾
    expect(Array.from(sourceUpload[2].body.slice(7, 7 + 47))).toEqual([...Array(46).fill(0x78), 0]);
    expect(sourceUpload[2].body.slice(7 + 47, 7 + 54)).toEqual(new Uint8Array(7)); // 剩余为填充
    expect(bytecodeUpload[1].body.slice(7, 7 + 52)).toEqual(Uint8Array.from({ length: 52 }, (_, index) => index));
  });

  it('downloads large script source and bytecode through matching payload offsets', async () => {
    const source = new TextEncoder().encode('print(1)\0');
    const bytecode = Uint8Array.from([9, 8, 7, 6, 5]);
    const controller = new LibampKeyboardController();
    const requestedOffsets: number[] = [];
    wireAutoResponder(controller, request => {
      const typeData = request.type === 0x0c ? source : bytecode;
      const subCommand = request.body[0];
      if (subCommand === 0) {
        const body = new Uint8Array(9);
        new DataView(body.buffer).setUint32(1, typeData.length, true);
        return responseFor(request, body);
      }
      if (subCommand === 1) {
        const requestView = new DataView(request.body.buffer, request.body.byteOffset, request.body.byteLength);
        const offset = requestView.getUint32(1, true);
        const requestedLength = requestView.getUint16(5, true);
        requestedOffsets.push(offset);
        const chunk = typeData.slice(offset, offset + requestedLength);
        const body = new Uint8Array(7 + chunk.length);
        const bodyView = new DataView(body.buffer);
        body[0] = 1;
        bodyView.setUint32(1, offset, true);
        bodyView.setUint16(5, chunk.length, true);
        body.set(chunk, 7);
        return responseFor(request, body);
      }
      return echoResponse(request);
    });

    await controller.read_script_source();
    await controller.read_script_bytecode();

    expect(controller.get_script_source()).toBe('print(1)');
    expect(Array.from(controller.get_script_bytecode())).toEqual(Array.from(bytecode));
    expect(requestedOffsets).toEqual([0, 0]);
  });

  it('encodes public key events before sending them through the queued transport', async () => {
    const controller = new LibampKeyboardController();
    const device = wireAutoResponder(controller, () => undefined);
    const event = new KeyboardKeyEvent();
    Object.assign(event, { event: 3, keycode: 0x4567, key_id: 0x1234, is_virtual: true });

    await controller.emit(event, true);

    // Event 包：code(0) flag(0) event(2) keycode(3-4) id(5-6) is_virtual(7) use_keymap(8)
    expect(device.sentReports).toHaveLength(1);
    expect(device.sentReports[0][0]).toBe(0x00);
    expect(Array.from(device.sentReports[0].slice(0, 9))).toEqual([0x00, 0, 3, 0x67, 0x45, 0x34, 0x12, 1, 1]);
  });
});
