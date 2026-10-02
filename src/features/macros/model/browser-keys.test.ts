import { MouseKeycode } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import { kc } from '../../keycodes';
import { BROWSER_KEYCODES, hidKeycodeOf, mouseButtonKeycodeOf } from './browser-keys';

describe('browser keys', () => {
  it('map letters, digits, function keys and the numpad to their HID usages', () => {
    expect(hidKeycodeOf('KeyA')).toBe(0x04);
    expect(hidKeycodeOf('KeyZ')).toBe(0x1d);
    expect(hidKeycodeOf('Digit1')).toBe(0x1e);
    expect(hidKeycodeOf('Digit0')).toBe(0x27);
    expect(hidKeycodeOf('F1')).toBe(0x3a);
    expect(hidKeycodeOf('F12')).toBe(0x45);
    expect(hidKeycodeOf('F13')).toBe(0x68);
    expect(hidKeycodeOf('F24')).toBe(0x73);
    expect(hidKeycodeOf('Numpad1')).toBe(0x59);
    expect(hidKeycodeOf('Numpad0')).toBe(0x62);
    expect(hidKeycodeOf('NumpadEnter')).toBe(0x58);
  });

  it('map the other keys of the keyboard page', () => {
    expect(hidKeycodeOf('Space')).toBe(0x2c);
    expect(hidKeycodeOf('Quote')).toBe(0x34);
    expect(hidKeycodeOf('Backquote')).toBe(0x35);
    expect(hidKeycodeOf('IntlBackslash')).toBe(0x64);
    expect(hidKeycodeOf('ArrowUp')).toBe(0x52);
    expect(hidKeycodeOf('ContextMenu')).toBe(0x65);
    expect(hidKeycodeOf('AudioVolumeMute')).toBe(0x7f);
    expect(hidKeycodeOf('Lang1')).toBe(0x90);
  });

  it('map modifiers to libamp modifier-only keycodes', () => {
    expect(hidKeycodeOf('ControlLeft')).toBe(0x0100);
    expect(hidKeycodeOf('ShiftLeft')).toBe(0x0200);
    expect(hidKeycodeOf('AltRight')).toBe(0x4000);
    expect(hidKeycodeOf('MetaRight')).toBe(0x8000);
  });

  it('have no keycode for keys without a HID usage', () => {
    for (const code of ['', 'Fn', 'BrowserBack', 'MediaPlayPause', 'Unidentified', 'constructor']) {
      expect(hidKeycodeOf(code), code).toBeNull();
    }
  });

  it('give every key its own keycode', () => {
    expect(new Set(BROWSER_KEYCODES.values()).size).toBe(BROWSER_KEYCODES.size);
  });

  it('map the five mouse buttons to the Mouse keycodes, as upstream does', () => {
    expect([0, 1, 2, 3, 4].map(button => mouseButtonKeycodeOf(button))).toEqual([
      kc.mouse(MouseKeycode.MouseLButton),
      kc.mouse(MouseKeycode.MouseMButton),
      kc.mouse(MouseKeycode.MouseRButton),
      kc.mouse(MouseKeycode.MouseBack),
      kc.mouse(MouseKeycode.MouseForward),
    ]);
    expect(mouseButtonKeycodeOf(0)).toBe(0x00a5);
    expect(mouseButtonKeycodeOf(2)).toBe(0x01a5);
    expect(mouseButtonKeycodeOf(5)).toBeNull();
  });
});
