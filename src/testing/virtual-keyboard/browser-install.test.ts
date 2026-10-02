import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import { installBrowserVirtualKeyboard, parseBrowserOptions } from './browser-install';
import type { VirtualKeyboardOptions } from './device';
import type { VirtualKeyboardBrowserOptions } from './handle';
import type { VirtualModelId } from './state';

function removeVirtualKeyboard(): void {
  window.__virtualKeyboard?.uninstall();
  delete window.__virtualKeyboard;
  delete window.__virtualKeyboardOptions;
}

beforeEach(removeVirtualKeyboard);
afterEach(removeVirtualKeyboard);

describe('parseBrowserOptions', () => {
  it('accepts every option the e2e fixture can send', () => {
    expectTypeOf<VirtualKeyboardBrowserOptions>().toExtend<VirtualKeyboardOptions>();
    expectTypeOf<
      NonNullable<VirtualKeyboardBrowserOptions['model']>
    >().toEqualTypeOf<VirtualModelId>();
    const options: Required<VirtualKeyboardBrowserOptions> = {
      model: 'oholeo',
      productName: 'Oholeo',
      firmware: { major: 1, minor: 2, patch: 3, info: 'x' },
      seedDynamicKeys: false,
      latencyMs: 1,
      debugIntervalMs: 5,
      reconnectDelayMs: null,
      calibrationDelayMs: 0,
      authorized: true,
      picker: 'cancel',
      dfu: {
        memoryMap: null,
        transferSize: 64,
        busyPolls: 2,
        pollTimeoutMs: 1,
        manifestationTolerant: true,
        authorized: true,
      },
      firmwareAfterUpdate: { patch: 4 },
    };
    expect(parseBrowserOptions(JSON.parse(JSON.stringify(options)))).toEqual(options);
  });

  it('keeps valid JSON options and drops everything else', () => {
    expect(
      parseBrowserOptions({
        model: 'zellia-80',
        productName: 'Zellia 80 HE',
        firmware: { major: 0, minor: 2, info: 'next', patch: 'x' },
        seedDynamicKeys: false,
        latencyMs: 2,
        debugIntervalMs: 16,
        reconnectDelayMs: null,
        calibrationDelayMs: 10,
        authorized: true,
        picker: 'cancel',
        dfu: { authorized: true, busyPolls: 1, memoryMap: null, bogus: 1 },
        firmwareAfterUpdate: { patch: 3 },
        unknown: 1,
      })
    ).toEqual({
      model: 'zellia-80',
      productName: 'Zellia 80 HE',
      firmware: { major: 0, minor: 2, info: 'next' },
      seedDynamicKeys: false,
      latencyMs: 2,
      debugIntervalMs: 16,
      reconnectDelayMs: null,
      calibrationDelayMs: 10,
      authorized: true,
      picker: 'cancel',
      dfu: { authorized: true, busyPolls: 1, memoryMap: null },
      firmwareAfterUpdate: { patch: 3 },
    });
    expect(parseBrowserOptions({ model: 'unknown', picker: 'maybe', latencyMs: -1 })).toEqual({});
    expect(parseBrowserOptions('nope')).toEqual({});
    expect(parseBrowserOptions(undefined)).toEqual({});
  });
});

describe('installBrowserVirtualKeyboard', () => {
  it('installs on window.navigator and exposes window.__virtualKeyboard', () => {
    window.__virtualKeyboardOptions = { model: 'zellia-60' };
    const keyboard = installBrowserVirtualKeyboard(window);
    expect(window.__virtualKeyboard).toBe(keyboard);
    expect(navigator.hid).toBe(keyboard.hid);
    expect(keyboard.device.productName).toBe('Zellia 60 HE');
  });

  it('does not install twice', () => {
    const first = installBrowserVirtualKeyboard(window);
    expect(installBrowserVirtualKeyboard(window)).toBe(first);
  });
});
