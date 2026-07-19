// Records the Svelte baseline's keycode behavior into the JSON fixtures next to this file.
//
//   node src/features/keycodes/__fixtures__/record-svelte-baseline.mjs <svelte-baseline-worktree>
//
// The baseline is the read-only SvelteKit app at commit 4f232a2. Its code runs unmodified (bundled
// with esbuild against its own vendored controller), so the fixtures capture what the Svelte app
// actually produced at runtime, including enum references that no longer exist:
// - svelte-keycode-display.json: FNV-1a hash per keycode low byte of keyCodeToString() over all
//   256 sub-codes (see display.test.ts for the hash input format).
// - svelte-remap-palettes.json: every Remap tab key (label, and the keycode the page assigned).
// - svelte-key-actions.json: the advanced-key picker catalog (name, category, emitted keycode).
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const baseline = process.argv[2];
if (!baseline) {
  console.error('usage: record-svelte-baseline.mjs <svelte-baseline-worktree>');
  process.exit(1);
}
const root = resolve(baseline);
const here = fileURLToPath(new URL('.', import.meta.url));
const workDir = mkdtempSync(join(tmpdir(), 'svelte-keycodes-'));
const source = 'svelte-baseline 4f232a2';

const rawImports = {
  name: 'raw-imports',
  setup(b) {
    b.onResolve({ filter: /\?raw$/ }, args => ({ path: args.path, namespace: 'raw' }));
    b.onLoad({ filter: /.*/, namespace: 'raw' }, () => ({ contents: 'export default ""' }));
  },
};

/** Bundles TypeScript that imports baseline modules and returns the evaluated module. */
async function load(contents, name) {
  const outfile = join(workDir, `${name}.mjs`);
  await build({
    stdin: { contents, loader: 'ts', resolveDir: root },
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'error',
    tsconfigRaw: {},
    alias: {
      'emi-keyboard-controller': join(root, 'src-controller/src/index.ts'),
      'svelte/store': join(workDir, 'svelte-store.mjs'),
    },
    plugins: [rawImports],
  });
  return import(pathToFileURL(outfile).href);
}

function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** JSON with flat objects kept on one line (Prettier preserves that layout). */
function stringify(value, indent = '') {
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    return `[\n${value.map(item => inner + stringify(item, inner)).join(',\n')}\n${indent}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.every(([, item]) => item === null || typeof item !== 'object')) {
      return `{ ${entries.map(([k, item]) => `${JSON.stringify(k)}: ${JSON.stringify(item)}`).join(', ')} }`;
    }
    const lines = entries.map(
      ([k, item]) => `${inner}${JSON.stringify(k)}: ${stringify(item, inner)}`
    );
    return `{\n${lines.join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}

function writeFixture(name, value) {
  writeFileSync(join(here, name), `${stringify(value)}\n`);
  console.log(`wrote ${name}`);
}

writeFileSync(join(workDir, 'svelte-store.mjs'), 'export const writable = v => ({ v });\n');

try {
  // keyCodeToString, hashed per low byte.
  const display = await load(
    `export { keyCodeToString } from './src/lib/keycodes/KeycodeDisplay';`,
    'display'
  );
  const hashes = [];
  for (let code = 0; code <= 0xff; code++) {
    let text = '';
    for (let sub = 0; sub <= 0xff; sub++) {
      const { mainString, subString } = display.keyCodeToString(code | (sub << 8));
      text += `${mainString}\u001f${subString}\u001e`;
    }
    hashes.push(fnv1a(text));
  }
  writeFixture('svelte-keycode-display.json', {
    source: `${source} src/lib/keycodes/KeycodeDisplay.ts keyCodeToString`,
    hashes,
  });

  // Remap tabs: evaluate each tab's KeyInfo literal and apply +page.svelte setKeyContent().
  const tabs = {
    basic: 'Basic',
    system: 'System',
    layer: 'Layer',
    profile: 'Profile',
    extension: 'Extension',
  };
  const { Keycode } = await load(
    `export { Keycode } from './src-controller/src/interface';`,
    'enums'
  );
  const encode = info => {
    if (
      info.keycode === Keycode.LayerControl &&
      info.subcode != undefined &&
      info.layer != undefined
    ) {
      return Keycode.LayerControl | (info.layer << 8) | (info.subcode << 12);
    }
    if (info.subcode != undefined) return info.keycode | (info.subcode << 8);
    return info.keycode;
  };
  const palettes = {
    source: `${source} src/lib/components/remap/*.svelte, routes/remap/+page.svelte`,
  };
  for (const [key, file] of Object.entries(tabs)) {
    const svelte = readFileSync(join(root, `src/lib/components/remap/${file}.svelte`), 'utf8');
    const script = svelte.slice(
      svelte.indexOf('<script lang="ts">') + 18,
      svelte.indexOf('</script>')
    );
    const literal = script.match(
      /const (?:KeyboardSlotContent|AvailableKeys)\s*:[^=]+=\s*(\[[\s\S]*?\n {2}\]);/
    );
    const imports = script.match(/import \{([^}]*)\} from '[^']*src-controller\/src\/interface';/);
    if (!literal || !imports) throw new Error(`cannot find the key list in ${file}.svelte`);
    const tab = await load(
      `import {${imports[1]}} from './src-controller/src/interface'; export default ${literal[1]};`,
      `tab-${key}`
    );
    const toEntry = info => ({ label: info.label, keycode: encode(info) });
    palettes[key] =
      key === 'basic' ? tab.default.map(row => row.map(toEntry)) : tab.default.map(toEntry);
  }
  writeFixture('svelte-remap-palettes.json', palettes);

  // Advanced-key picker: KeycodePicker emitted Number(action.keycode) and ignored subcode.
  const shared = await load(
    `export { keyActions } from './src/lib/types/AdvancedKeyShared';`,
    'actions'
  );
  writeFixture('svelte-key-actions.json', {
    source: `${source} src/lib/types/AdvancedKeyShared.ts keyActions via KeycodePicker.svelte`,
    actions: shared.keyActions.map(action => ({
      name: action.name,
      category: action.category,
      keycode: Number(action.keycode),
    })),
  });
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
