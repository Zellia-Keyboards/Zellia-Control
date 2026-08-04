import { existsSync } from 'node:fs';
import path from 'node:path';

/** Install locations of stable Google Chrome, as probed by Playwright's `chrome` channel. */
export function chromeExecutableCandidates(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv
): string[] {
  switch (platform) {
    case 'darwin':
      return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
    case 'linux':
      return ['/opt/google/chrome/chrome'];
    case 'win32':
      return [env.LOCALAPPDATA, env.PROGRAMFILES, env['PROGRAMFILES(X86)']]
        .filter((dir): dir is string => dir !== undefined && dir !== '')
        .map(dir => path.win32.join(dir, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    default:
      return [];
  }
}

export interface ResolveBrowserChannelOptions {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  exists?: (file: string) => boolean;
}

/**
 * Browser channel for every Playwright project: `PLAYWRIGHT_CHANNEL` if set, else stable Chrome
 * when it is installed, else Playwright's bundled Chromium (`npx playwright install chromium`).
 * One channel per run, so the parity harness captures both apps with the same browser.
 */
export function resolveBrowserChannel(options: ResolveBrowserChannelOptions = {}): string {
  const { env = process.env, platform = process.platform, exists = existsSync } = options;
  const override = env.PLAYWRIGHT_CHANNEL?.trim();
  if (override) return override;
  return chromeExecutableCandidates(platform, env).some(file => exists(file))
    ? 'chrome'
    : 'chromium';
}
