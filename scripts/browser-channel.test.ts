import { describe, expect, it } from 'vitest';
import { chromeExecutableCandidates, resolveBrowserChannel } from './browser-channel';

const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

describe('chromeExecutableCandidates', () => {
  it('uses the stable Chrome install locations Playwright checks', () => {
    expect(chromeExecutableCandidates('darwin', {})).toEqual([MAC_CHROME]);
    expect(chromeExecutableCandidates('linux', {})).toEqual(['/opt/google/chrome/chrome']);
    expect(
      chromeExecutableCandidates('win32', {
        LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local',
        PROGRAMFILES: 'C:\\Program Files',
      })
    ).toEqual([
      'C:\\Users\\me\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    ]);
    expect(chromeExecutableCandidates('freebsd', {})).toEqual([]);
  });
});

describe('resolveBrowserChannel', () => {
  it('prefers the installed Chrome channel', () => {
    expect(
      resolveBrowserChannel({ env: {}, platform: 'darwin', exists: file => file === MAC_CHROME })
    ).toBe('chrome');
  });

  it("falls back to Playwright's bundled Chromium", () => {
    expect(resolveBrowserChannel({ env: {}, platform: 'linux', exists: () => false })).toBe(
      'chromium'
    );
  });

  it('honours PLAYWRIGHT_CHANNEL', () => {
    expect(
      resolveBrowserChannel({
        env: { PLAYWRIGHT_CHANNEL: 'chromium' },
        platform: 'darwin',
        exists: () => true,
      })
    ).toBe('chromium');
    expect(
      resolveBrowserChannel({
        env: { PLAYWRIGHT_CHANNEL: ' chrome-beta ' },
        platform: 'linux',
        exists: () => false,
      })
    ).toBe('chrome-beta');
    expect(
      resolveBrowserChannel({
        env: { PLAYWRIGHT_CHANNEL: '' },
        platform: 'linux',
        exists: () => true,
      })
    ).toBe('chrome');
  });
});
