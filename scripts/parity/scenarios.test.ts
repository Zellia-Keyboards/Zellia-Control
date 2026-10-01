import { describe, expect, it } from 'vitest';
import { loadScenarios, validateScenarios } from './scenarios';

function module(file: string, exports: unknown) {
  return { file, exports };
}

describe('loadScenarios', () => {
  it('loads every scenario file in e2e/parity/scenarios', async () => {
    const scenarios = await loadScenarios();

    expect(scenarios.map(scenario => scenario.name)).toContain('welcome');
    expect(scenarios.find(scenario => scenario.name === 'welcome')?.path).toBe('/');
  });
});

describe('validateScenarios', () => {
  it('accepts well-formed scenarios from several files', () => {
    const setup = () => Promise.resolve();
    const remap = {
      name: 'remap-basic',
      path: '/remap/',
      virtualKeyboard: true,
      storage: { themeColor: 'blue' },
      setup,
    };
    const lighting = {
      name: 'lighting-basic',
      path: '/lighting/',
      virtualKeyboard: { seedDynamicKeys: false },
    };
    const scenarios = validateScenarios([
      module('a.ts', { default: [{ name: 'welcome', path: '/' }] }),
      module('b.ts', { default: [remap, lighting] }),
    ]);

    expect(scenarios.map(scenario => scenario.name)).toEqual([
      'welcome',
      'remap-basic',
      'lighting-basic',
    ]);
    expect(scenarios[1]).toBe(remap);
    expect(scenarios[1]?.setup).toBe(setup);
  });

  it('requires a default-exported array', () => {
    expect(() => validateScenarios([module('a.ts', {})])).toThrow(/a\.ts.*default export/);
    expect(() => validateScenarios([module('a.ts', { default: { name: 'x' } })])).toThrow(
      /a\.ts.*default export/
    );
  });

  it('rejects malformed scenarios with their location', () => {
    const invalid: unknown[] = [
      { name: 'Welcome', path: '/' },
      { name: 'welcome', path: 'remap/' },
      { name: 'welcome', path: '/', setup: 'click' },
      { name: 'welcome', path: '/', virtualKeyboard: 'yes' },
      { name: 'welcome', path: '/', virtualKeyboard: [true] },
      { name: 'welcome', path: '/', storage: { themeColor: 1 } },
      { name: 'welcome', path: '/', reactOnly: 'yes' },
      'welcome',
    ];
    for (const scenario of invalid) {
      expect(() => validateScenarios([module('a.ts', { default: [scenario] })])).toThrow(
        /a\.ts\[0\]/
      );
    }
  });

  it('reserves the per-variant preference keys', () => {
    expect(() =>
      validateScenarios([
        module('a.ts', { default: [{ name: 'welcome', path: '/', storage: { darkMode: 'x' } }] }),
      ])
    ).toThrow(/darkMode/);
  });

  it('rejects duplicate names across files', () => {
    expect(() =>
      validateScenarios([
        module('a.ts', { default: [{ name: 'welcome', path: '/' }] }),
        module('b.ts', { default: [{ name: 'welcome', path: '/remap/' }] }),
      ])
    ).toThrow(/welcome.*a\.ts.*b\.ts/);
  });

  it('accepts React-only scenarios', () => {
    const [scenario] = validateScenarios([
      module('a.ts', { default: [{ name: 'macros-empty', path: '/', reactOnly: true }] }),
    ]);
    expect(scenario?.reactOnly).toBe(true);
  });
});
