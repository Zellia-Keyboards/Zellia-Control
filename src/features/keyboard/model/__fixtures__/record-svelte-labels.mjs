// Records the Svelte baseline's keycap labels into svelte-labels.json next to this file.
//
//   node src/features/keyboard/model/__fixtures__/record-svelte-labels.mjs <svelte-baseline-worktree>
//
// Runs the baseline's unmodified transformKeyboardKeys() (src/lib/utils/keyboardKeyTransformer)
// over the Zellia Starlight layout (default variant) for a deterministic scenario, and stores the
// scenario inputs next to the outputs so labels.test.ts can replay them. Advanced keys are passed
// with the flat field names the transformer reads (it predates the nested `config`), i.e. the
// labels it was built to show. Sparse label arrays are normalized to 12 slots ('' when empty).
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const baseline = process.argv[2];
if (!baseline) {
  console.error('usage: record-svelte-labels.mjs <svelte-baseline-worktree>');
  process.exit(1);
}
const root = resolve(baseline);
const here = fileURLToPath(new URL('.', import.meta.url));
const repo = resolve(here, '../../../../..');
const workDir = mkdtempSync(join(tmpdir(), 'svelte-labels-'));
// Controllers read self.crypto when constructed.
globalThis.self ??= globalThis;

async function loadBaseline() {
  const outfile = join(workDir, 'labels.mjs');
  await build({
    stdin: {
      contents: `
        export * from './src/lib/utils/keyboardKeyTransformer.svelte';
        export { ZelliaStarlightController } from 'emi-keyboard-controller';
        export { Serial } from '@ijprest/kle-serial';`,
      loader: 'ts',
      resolveDir: root,
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'error',
    tsconfigRaw: {},
    nodePaths: [join(repo, 'node_modules')],
    alias: { 'emi-keyboard-controller': join(root, 'src-controller/src/index.ts') },
    plugins: [
      {
        name: 'raw-imports',
        setup(b) {
          b.onResolve({ filter: /\?raw$/ }, args => ({ path: args.path, namespace: 'raw' }));
          b.onLoad({ filter: /.*/, namespace: 'raw' }, () => ({ contents: 'export default ""' }));
        },
      },
    ],
  });
  return import(pathToFileURL(outfile).href);
}

/** JSON with flat arrays/objects kept on one line (Prettier preserves that layout). */
function stringify(value, indent = '') {
  const inner = `${indent}  `;
  const flat = item => item === null || typeof item !== 'object';
  if (Array.isArray(value)) {
    if (value.every(flat)) return `[${value.map(item => JSON.stringify(item)).join(', ')}]`;
    return `[\n${value.map(item => inner + stringify(item, inner)).join(',\n')}\n${indent}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.every(([, item]) => flat(item))) {
      return `{ ${entries.map(([k, item]) => `${JSON.stringify(k)}: ${JSON.stringify(item)}`).join(', ')} }`;
    }
    const lines = entries.map(
      ([k, item]) => `${inner}${JSON.stringify(k)}: ${stringify(item, inner)}`
    );
    return `{\n${lines.join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}

const round = value => Math.round(value * 1e6) / 1e6;

try {
  const svelte = await loadBaseline();
  const controller = new svelte.ZelliaStarlightController();
  const variant = [0, 0, 0];
  const keys = svelte.filterVisibleKeys(
    svelte.mapToExtendedKeys(
      svelte.Serial.deserialize(JSON.parse(controller.get_layout_json())).keys
    ),
    variant
  );
  const ids = Array.from({ length: 70 }, (_, id) => id);
  const normalize = labels => Array.from({ length: 12 }, (_, slot) => labels[slot] ?? '');
  const run = (page, advancedKeys, rgbConfigs, keymap, selectedLayer, dynamicKeys) =>
    svelte
      .transformKeyboardKeys(
        keys,
        advancedKeys,
        rgbConfigs,
        page,
        keymap,
        selectedLayer,
        dynamicKeys
      )
      .map(key => normalize(key.labels));

  // Performance: every mode, equal and different press/release values, deadzones.
  const advancedKeys = ids.map(id => {
    const activation = round(((id % 7) + 1) / 8);
    const triggerDistance = round(0.02 * ((id % 6) + 1));
    const triggerSpeed = round(0.01 * ((id % 3) + 1));
    return {
      mode: id % 4,
      activation,
      deactivation: id % 3 === 0 ? activation : round(activation - 0.01 * ((id % 5) + 1)),
      triggerDistance,
      // id % 5 === 1: differs from the trigger distance only below the 3-decimal display.
      releaseDistance:
        id % 5 === 1
          ? round(triggerDistance + 0.00001)
          : id % 2
            ? triggerDistance
            : round(0.03 * ((id % 4) + 1)),
      triggerSpeed,
      releaseSpeed: id % 4 === 3 && id % 8 === 3 ? triggerSpeed : 0.015,
      upperDeadzone: round(0.005 * (id % 10)),
      lowerDeadzone: round(0.1 + 0.01 * (id % 9)),
    };
  });
  const flatAdvancedKeys = advancedKeys.map(k => ({
    mode: k.mode,
    activation_value: k.activation,
    deactivation_value: k.deactivation,
    trigger_distance: k.triggerDistance,
    release_distance: k.releaseDistance,
    trigger_speed: k.triggerSpeed,
    release_speed: k.releaseSpeed,
    upper_deadzone: k.upperDeadzone,
    lower_deadzone: k.lowerDeadzone,
  }));

  // Remap: one keycode of every category on layer 0 (keyboard operations the Svelte table named
  // through removed enums are left out), dynamic keys bound to existing, 'none' and missing
  // slots; the controller's default keymap (64 keys) on layer 1.
  const special = [
    0x0000, 0x0004, 0x0204, 0x0200, 0x0f00, 0x8028, 0x00a3, 0x00a4, 0x01a6, 0x12a6, 0x33a6, 0x00a5,
    0x13a5, 0x14a5, 0x0da8, 0xffa8, 0x82a9, 0x00a9, 0x05aa, 0x20aa, 0x00a7, 0x01a7, 0x02a7, 0x03a7,
    0x04a7, 0x05a7, 0x1fa7, 0x05fd, 0x00ab, 0x03ab, 0x3cac, 0x12ad, 0x00fe, 0x03fe, 0x06fe, 0x00ff,
    0x01ff, 0x00ae, 0x00af, 0x00b0,
  ];
  const layer0 = ids.map(id => special[id] ?? 0x04 + (id % 26) + ((id % 3) << 8));
  const keymap = [layer0, [...controller.keymap[0]]];
  const dynamicKeyKinds = ['stroke', 'modTap', 'toggle', 'mutex', 'none'];
  const typeOfKind = { none: 0, stroke: 1, modTap: 2, toggle: 3, mutex: 4 };
  const dynamicKeys = dynamicKeyKinds.map(kind => ({ type: typeOfKind[kind] }));

  // Lighting: every RGB mode.
  const rgbModes = ids.map(id => id % 11);
  const rgbConfigs = rgbModes.map(mode => ({ mode }));

  const fixture = {
    source: 'svelte-baseline 4f232a2 src/lib/utils/keyboardKeyTransformer.svelte.ts',
    variant,
    keyIds: keys.map(key => key.id),
    performance: {
      advancedKeyFields: Object.keys(advancedKeys[0]),
      advancedKeys: advancedKeys.map(key => Object.values(key)),
      labels: run('/performance', flatAdvancedKeys, rgbConfigs, keymap, 1, dynamicKeys),
    },
    remap: {
      keymap,
      dynamicKeyKinds,
      layers: Object.fromEntries(
        [0, 1, 5].map(layer => [
          String(layer),
          run('/remap', flatAdvancedKeys, rgbConfigs, keymap, layer + 1, dynamicKeys),
        ])
      ),
    },
    lighting: {
      rgbModes,
      labels: run('/lighting', flatAdvancedKeys, rgbConfigs, keymap, 1, dynamicKeys),
    },
  };
  writeFileSync(join(here, 'svelte-labels.json'), `${stringify(fixture)}\n`);
  console.log('wrote svelte-labels.json');
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
