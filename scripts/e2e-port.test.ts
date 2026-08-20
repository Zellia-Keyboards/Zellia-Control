import { describe, expect, it } from 'vitest';
import { DEFAULT_E2E_PORT, resolveE2EPort } from './e2e-port';

describe('resolveE2EPort', () => {
  it("defaults to a port that is not Vite's default preview port", () => {
    expect(resolveE2EPort({})).toBe(DEFAULT_E2E_PORT);
    expect(DEFAULT_E2E_PORT).toBe(4273);
    // `vite preview` (this app's and the Svelte baseline's) listens on 4173 by default.
    expect(DEFAULT_E2E_PORT).not.toBe(4173);
  });

  it('honours E2E_PORT', () => {
    expect(resolveE2EPort({ E2E_PORT: '4300' })).toBe(4300);
    expect(resolveE2EPort({ E2E_PORT: ' 4301 ' })).toBe(4301);
    expect(resolveE2EPort({ E2E_PORT: '' })).toBe(DEFAULT_E2E_PORT);
  });

  it('rejects values that are not TCP ports', () => {
    for (const value of ['abc', '0', '65536', '42.5', '-1', '0x10']) {
      expect(() => resolveE2EPort({ E2E_PORT: value }), value).toThrow(/E2E_PORT/);
    }
  });
});
