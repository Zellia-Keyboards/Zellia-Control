import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { moduleGraph } from './module-graph';

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
  const sources = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  /** What a page cannot load: Node built-ins and test tooling. */
  const NOT_FOR_PAGES =
    /^(?:node:.*|(?:assert|buffer|child_process|crypto|events|fs|http|https|module|net|os|path|process|stream|timers|tls|url|util|worker_threads|zlib|vitest|jsdom|@testing-library\/[^/]+|@playwright\/[^/]+)(?:\/.*)?)$/;

  it('reaches no Node built-ins or test tooling (Playwright bundles and loads it)', () => {
    const { modules, packages } = moduleGraph(sources, '/src/testing/virtual-keyboard/browser.ts');
    expect([...packages].filter(specifier => NOT_FOR_PAGES.test(specifier))).toEqual([]);
    // The walk reached the keyboard and the controller package it speaks for.
    expect(modules).toContain('/src/testing/virtual-keyboard/device.ts');
    expect(packages).toContain('emi-keyboard-controller');
  });
});
