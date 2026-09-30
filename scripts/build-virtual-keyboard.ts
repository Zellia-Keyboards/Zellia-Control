import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, type Rolldown } from 'vite';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

/**
 * Browser entry of the virtual libamp keyboard (src/testing/virtual-keyboard). Evaluated before
 * any page script, it installs the simulated device on `navigator.hid` and exposes
 * `window.__virtualKeyboard` for Playwright.
 */
export const VIRTUAL_KEYBOARD_ENTRY = 'src/testing/virtual-keyboard/browser.ts';

const CONTROLLER_ENTRY = 'src-controller/src/index.ts';

export interface BuildVirtualKeyboardOptions {
  /** Entry module, absolute or relative to the repository root. */
  entry?: string;
}

/**
 * Bundles the virtual keyboard into a single classic script (IIFE) for `addInitScript`.
 *
 * Uses Vite's build API in library mode so the bundle resolves modules exactly like the app:
 * the `emi-keyboard-controller` alias to the vendored sources and `?raw` imports.
 */
export async function buildVirtualKeyboard(
  options: BuildVirtualKeyboardOptions = {}
): Promise<string> {
  const requested = options.entry ?? VIRTUAL_KEYBOARD_ENTRY;
  const entry = path.resolve(repoRoot, requested);
  if (!existsSync(entry)) {
    throw new Error(
      `Virtual keyboard entry ${requested} not found (${entry}). The e2e \`virtualKeyboard\` ` +
        `fixture bundles ${VIRTUAL_KEYBOARD_ENTRY}, which installs the simulated keyboard on ` +
        'navigator.hid and exposes window.__virtualKeyboard. Add that module (it belongs to the ' +
        'device layer) or point the `virtualKeyboardEntry` option at another entry.'
    );
  }

  const result = await build({
    configFile: false,
    envDir: false,
    publicDir: false,
    root: repoRoot,
    logLevel: 'warn',
    resolve: { alias: { 'emi-keyboard-controller': path.join(repoRoot, CONTROLLER_ENTRY) } },
    build: {
      write: false,
      minify: false,
      sourcemap: false,
      target: 'es2022',
      reportCompressedSize: false,
      lib: {
        entry,
        formats: ['iife'],
        name: 'ZelliaVirtualKeyboard',
        fileName: () => 'virtual-keyboard.js',
      },
    },
  });
  return entryChunk(result).code;
}

function entryChunk(result: Awaited<ReturnType<typeof build>>): Rolldown.OutputChunk {
  const outputs = Array.isArray(result) ? result : [result];
  for (const output of outputs) {
    if (!('output' in output)) continue;
    for (const file of output.output) {
      if (file.type === 'chunk' && file.isEntry) return file;
    }
  }
  throw new Error('Virtual keyboard build produced no entry chunk');
}
