import { afterEach, describe, expect, it, vi } from 'vitest';
import { installBrowserVirtualKeyboard, parseBrowserOptions } from './browser';

afterEach(() => {
  window.__virtualKeyboard?.uninstall();
  delete window.__virtualKeyboard;
  delete window.__virtualKeyboardOptions;
});

describe('parseBrowserOptions', () => {
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

  it('installs itself when the bundle is evaluated', async () => {
    window.__virtualKeyboardOptions = { productName: 'Zellia Starlight' };
    vi.resetModules();
    await import('./browser');
    expect(window.__virtualKeyboard?.device.productName).toBe('Zellia Starlight');
    expect(navigator.hid).toBe(window.__virtualKeyboard?.hid);
  });
});

describe('browser bundle', () => {
  const sources = import.meta.glob<string>(['./*.ts', '!./*.test.ts'], {
    query: '?raw',
    import: 'default',
    eager: true,
  });

  it('only depends on the controller package (no Node built-ins), so it bundles for a page', () => {
    const visited = new Set<string>();
    const packages = new Set<string>();
    const visit = (path: string) => {
      if (visited.has(path)) return;
      visited.add(path);
      const source = sources[path];
      if (source === undefined) throw new Error(`Unknown module ${path}`);
      for (const [, specifier = ''] of source.matchAll(/from '([^']+)'/g)) {
        if (specifier.startsWith('./')) visit(`${specifier}.ts`);
        else packages.add(specifier);
      }
    };
    visit('./browser.ts');
    expect([...visited].sort()).toEqual([
      './browser.ts',
      './device.ts',
      './dfu.ts',
      './install.ts',
      './protocol.ts',
      './state.ts',
    ]);
    expect([...packages]).toEqual(['emi-keyboard-controller']);
  });
});
