import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function removeVirtualKeyboard(): void {
  window.__virtualKeyboard?.uninstall();
  delete window.__virtualKeyboard;
  delete window.__virtualKeyboardOptions;
}

beforeEach(removeVirtualKeyboard);
afterEach(removeVirtualKeyboard);

describe('browser entry', () => {
  it('installs the virtual keyboard when the bundle is evaluated', async () => {
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
      './browser-install.ts',
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
