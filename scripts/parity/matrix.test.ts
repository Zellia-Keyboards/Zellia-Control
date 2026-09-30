import { describe, expect, it } from 'vitest';
import { PARITY_VARIANTS, captureId, seededStorage } from './matrix';

describe('PARITY_VARIANTS', () => {
  it('covers light/dark × en/zh × 1440×900/2560×1440', () => {
    expect(PARITY_VARIANTS).toHaveLength(8);
    expect(new Set(PARITY_VARIANTS.map(variant => variant.theme))).toEqual(
      new Set(['light', 'dark'])
    );
    expect(new Set(PARITY_VARIANTS.map(variant => variant.language))).toEqual(
      new Set(['en', 'zh'])
    );
    expect(
      new Set(PARITY_VARIANTS.map(({ viewport }) => `${viewport.width}x${viewport.height}`))
    ).toEqual(new Set(['1440x900', '2560x1440']));
  });

  it('starts with the default screen (dark, English, 1440×900)', () => {
    expect(PARITY_VARIANTS[0]).toEqual({
      theme: 'dark',
      language: 'en',
      viewport: { width: 1440, height: 900 },
    });
  });
});

describe('captureId', () => {
  it('is unique per scenario and variant and safe as a file name', () => {
    const ids = PARITY_VARIANTS.map(variant => captureId('welcome', variant));

    expect(new Set(ids).size).toBe(PARITY_VARIANTS.length);
    expect(ids).toContain('welcome--dark-en-1440x900');
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('seededStorage', () => {
  it('sets the Svelte app keys for theme and language', () => {
    expect(
      seededStorage({ theme: 'light', language: 'zh', viewport: { width: 1, height: 1 } }, {})
    ).toEqual({ darkMode: 'false', language: 'zh' });
    expect(
      seededStorage({ theme: 'dark', language: 'en', viewport: { width: 1, height: 1 } }, {})
    ).toEqual({ darkMode: 'true', language: 'en' });
  });

  it('adds the scenario storage', () => {
    expect(
      seededStorage(
        { theme: 'dark', language: 'en', viewport: { width: 1, height: 1 } },
        { themeColor: 'blue' }
      )
    ).toEqual({ themeColor: 'blue', darkMode: 'true', language: 'en' });
  });
});
