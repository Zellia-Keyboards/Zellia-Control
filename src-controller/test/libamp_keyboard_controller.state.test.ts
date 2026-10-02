import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibampKeyboardController } from '../src/controllers/libamp_keyboard_controller/controller';
import {
  AdvancedKey,
  CalibrationMode,
  DynamicKeyModTap,
  DynamicKeyMutex,
  DynamicKeyStroke4x4,
  DynamicKeyToggleKey,
  KeyboardConfigCode,
  KeyLocation,
  KeyMode,
  RGBBaseConfig,
  RGBBaseMode,
  RGBConfig,
  RGBMode,
} from '../src/interface';

const GET = 0x02;
const SET = 0x01;
const ADVANCED_KEY = 0x01;
const KEYMAP = 0x02;
const RGB_BASE = 0x03;
const RGB_CONFIG = 0x04;
const DYNAMIC_KEY = 0x05;
const CONFIG = 0x07;
const DEBUG = 0x06;
const MACRO = 0x0a;
const VERSION = 0x00;

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'debug').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function controllerWithState(): LibampKeyboardController {
  const controller = new LibampKeyboardController();
  controller.advanced_keys = [new AdvancedKey()];
  controller.rgb_base_config = new RGBBaseConfig();
  controller.rgb_configs = [new RGBConfig(), new RGBConfig()];
  controller.keymap = [[0, 0, 0, 0], [0, 0]];
  controller.dynamic_keys = [new DynamicKeyStroke4x4(), new DynamicKeyModTap(), new DynamicKeyToggleKey(), new DynamicKeyMutex()];
  controller.macros = [[]];
  return controller;
}

// 新协议包布局：code(0) id(1) type(2)，后续为包体
function packet(code: number, type: number): Uint8Array {
  const result = new Uint8Array(64);
  result[0] = code;
  result[2] = type;
  return result;
}

describe('LibampKeyboardController state packet codecs', () => {
  it('serializes and parses advanced-key values in the firmware byte order', () => {
    const controller = controllerWithState();
    const config = controller.advanced_keys[0].config;
    Object.assign(config, {
      mode: KeyMode.KeyAnalogSpeedMode,
      calibration_mode: CalibrationMode.KeyAutoCalibrationNegative,
      activation_value: 0.25,
      deactivation_value: 0.5,
      trigger_distance: 0.75,
      release_distance: 0.125,
      trigger_speed: 0.625,
      release_speed: 0.375,
      upper_deadzone: 0.1,
      lower_deadzone: 0.9,
      upper_bound: 3210,
      lower_bound: 123,
    });

    const outgoing = packet(SET, ADVANCED_KEY);
    new DataView(outgoing.buffer).setUint16(3, 0, true);
    controller.packet_process_advanced_key(outgoing);
    const outgoingView = new DataView(outgoing.buffer);
    expect(Array.from(outgoing.slice(5, 7))).toEqual([KeyMode.KeyAnalogSpeedMode, CalibrationMode.KeyAutoCalibrationNegative]);
    expect(outgoingView.getUint16(7, true)).toBe(Math.trunc(0.25 * 65535));
    expect(outgoingView.getUint16(19, true)).toBe(Math.trunc(0.1 * 65535));
    expect(outgoingView.getUint16(21, true)).toBe(Math.trunc(0.9 * 65535));
    expect(outgoingView.getUint16(23, true)).toBe(3210);
    expect(outgoingView.getUint16(25, true)).toBe(123);

    const incoming = new Uint8Array(outgoing);
    incoming[0] = GET;
    controller.packet_process_advanced_key(incoming);
    expect(controller.advanced_keys[0].config).toMatchObject({
      mode: KeyMode.KeyAnalogSpeedMode,
      calibration_mode: CalibrationMode.KeyAutoCalibrationNegative,
      upper_bound: 3210,
      lower_bound: 123,
    });
    expect(controller.advanced_keys[0].config.trigger_distance).toBeCloseTo(0.75, 4);
  });

  it('round-trips RGB base settings, indexed RGB pages, and keymap pages', () => {
    const controller = controllerWithState();
    Object.assign(controller.rgb_base_config, {
      mode: RGBBaseMode.RgbBaseModeWave,
      rgb: { red: 1, green: 2, blue: 3 },
      secondary_rgb: { red: 4, green: 5, blue: 6 },
      speed: 500,
      direction: 0x12345,
      density: 300,
      brightness: 511,
    });
    const base = packet(SET, RGB_BASE);
    controller.packet_process_rgb_base_config(base);
    expect(Array.from(base.slice(3, 10))).toEqual([RGBBaseMode.RgbBaseModeWave, 1, 2, 3, 4, 5, 6]);
    expect(new DataView(base.buffer).getUint16(10, true)).toBe(500);
    expect(new DataView(base.buffer).getUint16(12, true)).toBe(0x2345);
    expect(Array.from(base.slice(14, 16))).toEqual([44, 255]);

    const baseReply = new Uint8Array(base);
    baseReply[0] = GET;
    controller.packet_process_rgb_base_config(baseReply);
    expect(controller.rgb_base_config).toMatchObject({ speed: 500, direction: 0x2345, density: 44, brightness: 255 });

    controller.rgb_configs[1] = { mode: RGBMode.RgbModeTrigger, rgb: { red: 9, green: 8, blue: 7 }, speed: 1234 };
    const rgb = packet(SET, RGB_CONFIG);
    rgb[3] = 2;
    const rgbView = new DataView(rgb.buffer);
    rgbView.setUint16(4, 1, true);
    rgbView.setUint16(12, 99, true);
    controller.packet_process_rgb_config(rgb);
    expect(Array.from(rgb.slice(6, 12))).toEqual([RGBMode.RgbModeTrigger, 9, 8, 7, 0xd2, 0x04]);
    expect(Array.from(rgb.slice(14, 20))).toEqual([0, 0, 0, 0, 0, 0]);

    const keymapWrite = packet(SET, KEYMAP);
    keymapWrite[3] = 0;
    const keymapWriteView = new DataView(keymapWrite.buffer);
    keymapWriteView.setUint16(4, 1, true);
    keymapWrite[6] = 8;
    controller.keymap[0] = [0x1001, 0x1002, 0x1003, 0x1004];
    controller.packet_process_keymap(keymapWrite);
    expect(keymapWrite[6]).toBe(3);
    expect([0, 1, 2].map(index => keymapWriteView.getUint16(7 + index * 2, true))).toEqual([0x1002, 0x1003, 0x1004]);

    const keymapRead = new Uint8Array(keymapWrite);
    keymapRead[0] = GET;
    keymapRead[6] = 2;
    const keymapReadView = new DataView(keymapRead.buffer);
    keymapReadView.setUint16(7, 0xbeef, true);
    keymapReadView.setUint16(9, 0xcafe, true);
    controller.packet_process_keymap(keymapRead);
    expect(controller.keymap[0]).toEqual([0x1001, 0xbeef, 0xcafe, 0x1004]);
  });

  it('serializes all four dynamic-key layouts at their firmware-defined offsets', () => {
    const controller = controllerWithState();
    const stroke = controller.dynamic_keys[0] as DynamicKeyStroke4x4;
    stroke.bindings = [0x101, 0x202, 0x303, 0x404];
    stroke.key_control = [1, 2, 3, 4];
    stroke.press_begin_distance = 0.1;
    stroke.press_fully_distance = 0.2;
    stroke.release_begin_distance = 0.3;
    stroke.release_fully_distance = 0.4;
    stroke.target_keys_location = [Object.assign(new KeyLocation(), { id: 12 })];

    const modTap = controller.dynamic_keys[1] as DynamicKeyModTap;
    modTap.bindings = [0x505, 0x606];
    modTap.duration = 4321;
    modTap.target_keys_location = [Object.assign(new KeyLocation(), { id: 13 })];

    const toggle = controller.dynamic_keys[2] as DynamicKeyToggleKey;
    toggle.bindings = [0x707];
    toggle.target_keys_location = [Object.assign(new KeyLocation(), { id: 14 })];

    const mutex = controller.dynamic_keys[3] as DynamicKeyMutex;
    mutex.bindings = [0x808, 0x909];
    mutex.target_keys_location = [Object.assign(new KeyLocation(), { id: 15 }), Object.assign(new KeyLocation(), { id: 16 })];
    mutex.mode = 4;

    for (let index = 0; index < controller.dynamic_keys.length; index++) {
      const outgoing = packet(SET, DYNAMIC_KEY);
      outgoing[3] = index;
      controller.packet_process_dynamic_key(outgoing);
      const view = new DataView(outgoing.buffer);
      expect(view.getUint32(5, true)).toBe(controller.dynamic_keys[index].type);
    }

    const strokeWrite = packet(SET, DYNAMIC_KEY);
    controller.packet_process_dynamic_key(strokeWrite);
    const strokeView = new DataView(strokeWrite.buffer);
    expect([0, 1, 2, 3].map(index => strokeView.getUint16(9 + index * 2, true))).toEqual(stroke.bindings);
    expect(Array.from(strokeWrite.slice(17, 21))).toEqual(stroke.key_control);
    expect(strokeView.getUint16(23, true)).toBe(Math.trunc(0.2 * 65535));
    expect(strokeView.getUint16(29, true)).toBe(12);

    const mutexWrite = packet(SET, DYNAMIC_KEY);
    mutexWrite[3] = 3;
    controller.packet_process_dynamic_key(mutexWrite);
    const mutexView = new DataView(mutexWrite.buffer);
    expect([mutexView.getUint16(9, true), mutexView.getUint16(11, true)]).toEqual([0x808, 0x909]);
    expect([mutexView.getUint16(13, true), mutexView.getUint16(15, true)]).toEqual([15, 16]);
    expect(mutexWrite[17]).toBe(4);

  });

  it('maps keyboard configuration flags and macro pages in both directions', () => {
    const controller = controllerWithState();
    Object.assign(controller.config, { debug: true, nkro: false, winlock: true, continuous_poll: true, enable_report: false, console: true });
    const configWrite = packet(SET, CONFIG);
    configWrite[3] = KeyboardConfigCode.KeyboardConfigNum;
    for (let index = 0; index < KeyboardConfigCode.KeyboardConfigNum; index++) {
      configWrite[5 + index * 2] = index;
    }
    controller.packet_process_config(configWrite);
    expect([0, 1, 2, 3, 4, 5].map(index => configWrite[6 + index * 2])).toEqual([1, 0, 1, 1, 0, 1]);

    const configRead = new Uint8Array(configWrite);
    configRead[0] = GET;
    configRead[6] = 0;
    configRead[8] = 1;
    controller.packet_process_config(configRead);
    expect(controller.config).toMatchObject({ debug: false, nkro: true, winlock: true, continuous_poll: true, enable_report: false, console: true });

    controller.macros = [[
      { delay: 0, event: { key_id: 0, is_virtual: false, event: 0, keycode: 0 } },
      { delay: 0, event: { key_id: 0, is_virtual: false, event: 0, keycode: 0 } },
      { delay: 250, event: { key_id: 9, is_virtual: true, event: 3, keycode: 0x1234 } },
    ]];
    const macroWrite = packet(SET, MACRO);
    macroWrite[3] = 0;
    const macroWriteView = new DataView(macroWrite.buffer);
    macroWriteView.setUint16(4, 1, true);
    macroWriteView.setUint16(10, 2, true);
    controller.packet_process_macro(macroWrite);
    expect(macroWriteView.getUint32(6, true)).toBe(250);
    expect(macroWriteView.getUint16(12, true)).toBe(9);
    expect(Array.from(macroWrite.slice(14, 18))).toEqual([1, 3, 0x34, 0x12]);

    const macroRead = new Uint8Array(macroWrite);
    macroRead[0] = GET;
    controller.macros = [[]];
    controller.packet_process_macro(macroRead);
    expect(controller.macros[0][2]).toEqual({
      delay: 250,
      event: { key_id: 9, is_virtual: true, event: 3, keycode: 0x1234 },
    });
  });

  it('updates debug state, emits its changed key IDs, and decodes firmware version metadata', () => {
    const controller = controllerWithState();
    const eventListener = vi.fn();
    controller.addEventListener('updateDebugData', eventListener);

    // 新协议 Debug 包：code(0x06) length(1) tick(2-5) item(6+)
    // item: index(2) state(1) report_state(1) raw(2) filtered_raw(2) value(2)
    const debug = packet(DEBUG, 0);
    debug[1] = 1;
    const debugView = new DataView(debug.buffer);
    debugView.setUint32(2, 123, true);
    debugView.setUint16(6, 0, true);
    debug[8] = 1;
    debug[9] = 1;
    debugView.setUint16(10, 2222, true);
    debugView.setUint16(12, 2111, true);
    debugView.setUint16(14, 32768, true);
    controller.packet_process_debug(debug);
    expect(controller.advanced_keys[0]).toMatchObject({ state: true, report_state: true, raw: 2222, filtered_raw: 2111 });
    expect(controller.advanced_keys[0].value).toBeCloseTo(32768 / 65535, 8);
    expect(eventListener.mock.calls[0][0].detail).toEqual({ tick: 123, updated_keys: [0] });

    const version = packet(GET, VERSION);
    const info = new TextEncoder().encode('0.1.2-test\0');
    const versionView = new DataView(version.buffer);
    versionView.setUint16(3, info.length, true);
    versionView.setUint32(5, 0, true);
    versionView.setUint32(9, 1, true);
    versionView.setUint32(13, 2, true);
    version.set(info, 17);
    expect(controller.packet_process_version(version)).toBe(true);
    expect(controller.get_firmware_version()).toEqual({ major: 0, minor: 1, patch: 2, info: '0.1.2-test' });
  });
});
