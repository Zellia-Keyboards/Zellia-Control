import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { afterEach, describe, expect, it } from 'vitest';
import { VIRTUAL_KEYBOARD_ENTRY, buildVirtualKeyboard } from './build-virtual-keyboard';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const tempDirs: string[] = [];

interface BrowserGlobal {
  [name: string]: unknown;
  __virtualKeyboard?: { layoutKeys: number; readme: string };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

async function writeEntry(source: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'virtual-keyboard-entry-'));
  tempDirs.push(dir);
  const entry = path.join(dir, 'entry.ts');
  await writeFile(entry, source);
  return entry;
}

describe('buildVirtualKeyboard', () => {
  it('targets the browser entry of the virtual keyboard module', () => {
    expect(VIRTUAL_KEYBOARD_ENTRY).toBe('src/testing/virtual-keyboard/browser.ts');
  });

  it('fails with an actionable message when the entry is missing', async () => {
    await expect(buildVirtualKeyboard({ entry: 'src/testing/does-not-exist.ts' })).rejects.toThrow(
      /src\/testing\/does-not-exist\.ts.*not found.*virtualKeyboard/s
    );
  });

  it('bundles the entry, the controller alias and ?raw imports into one classic script', async () => {
    const readme = path.join(repoRoot, 'src-controller/README.md');
    const entry = await writeEntry(
      [
        "import { ZelliaStarlightController } from 'emi-keyboard-controller';",
        `import readme from ${JSON.stringify(`${readme}?raw`)};`,
        'const layout: string = new ZelliaStarlightController().get_layout_json();',
        'window.__virtualKeyboard = { layoutKeys: JSON.parse(layout).length, readme };',
        '',
      ].join('\n')
    );

    const code = await buildVirtualKeyboard({ entry });

    expect(code).not.toMatch(/^\s*(import|export)\s/m);
    // A browser-like global: `window` and `self` are the global object itself.
    const global: BrowserGlobal = { console, crypto, navigator: {} };
    global.window = global;
    global.self = global;
    vm.runInNewContext(code, vm.createContext(global));
    expect(global.__virtualKeyboard?.layoutKeys).toBeGreaterThan(0);
    expect(global.__virtualKeyboard?.readme).toContain('# emi-keyboard-controller');
  });
});
