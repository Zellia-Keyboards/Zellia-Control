// Compares the parity captures of the Svelte baseline and the React app.
//
//   node scripts/parity/compare.mjs [--dir e2e/.artifacts/parity] [--threshold 0.1]
//
// Reads <dir>/captures/{baseline,react}/<id>.png and the <id>.json records written by capture.ts,
// runs pixelmatch per pair (the smaller image is padded, so size changes count as differences) and
// writes <dir>/diff/<id>.png, <dir>/summary.json and the HTML report <dir>/index.html.
// Exit code: 0 all identical, 1 differences or missing captures, 2 nothing to compare / bad input.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import pixelmatch from 'pixelmatch';
import pngjs from 'pngjs';

const { PNG } = pngjs;

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
export const PARITY_DIR = path.join(repoRoot, 'e2e/.artifacts/parity');
export const DEFAULT_THRESHOLD = 0.1;
const APPS = ['baseline', 'react'];
const STATUS_ORDER = { missing: 0, different: 1, identical: 2 };

function readRecord(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function captureIds(capturesDir) {
  const ids = new Set();
  for (const file of readdirSync(capturesDir)) {
    if (file.endsWith('.json')) ids.add(file.slice(0, -'.json'.length));
  }
  for (const app of APPS) {
    const dir = path.join(capturesDir, app);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (file.endsWith('.png')) ids.add(file.slice(0, -'.png'.length));
    }
  }
  return [...ids].sort();
}

/** Copies `image` onto a transparent canvas of the given size. */
function onCanvas(image, width, height) {
  if (image.width === width && image.height === height) return image.data;
  const canvas = new PNG({ width, height });
  canvas.data.fill(0);
  PNG.bitblt(image, canvas, 0, 0, image.width, image.height, 0, 0);
  return canvas.data;
}

function comparePair(baselineFile, reactFile, diffFile, threshold) {
  const baseline = PNG.sync.read(readFileSync(baselineFile));
  const react = PNG.sync.read(readFileSync(reactFile));
  const width = Math.max(baseline.width, react.width);
  const height = Math.max(baseline.height, react.height);
  const diff = new PNG({ width, height });
  const mismatchedPixels = pixelmatch(
    onCanvas(baseline, width, height),
    onCanvas(react, width, height),
    diff.data,
    width,
    height,
    { threshold }
  );
  writeFileSync(diffFile, PNG.sync.write(diff));
  return {
    mismatchedPixels,
    totalPixels: width * height,
    sizeMismatch: baseline.width !== react.width || baseline.height !== react.height,
    sizes: {
      baseline: { width: baseline.width, height: baseline.height },
      react: { width: react.width, height: react.height },
    },
  };
}

function describeBrowser(browser) {
  if (!browser) return null;
  return `${browser.name} (${browser.channel}) ${browser.version}`;
}

/** Compares all captures in `dir` and writes the diff images, summary.json and index.html. */
export function compareCaptures({ dir = PARITY_DIR, threshold = DEFAULT_THRESHOLD } = {}) {
  const capturesDir = path.join(dir, 'captures');
  const ids = existsSync(capturesDir) ? captureIds(capturesDir) : [];
  if (ids.length === 0) {
    throw new UsageError(`No captures in ${capturesDir}; run the parity capture first.`);
  }
  const diffDir = path.join(dir, 'diff');
  rmSync(diffDir, { recursive: true, force: true });
  mkdirSync(diffDir, { recursive: true });

  const results = ids.map(id => {
    const record = readRecord(path.join(capturesDir, `${id}.json`));
    const images = Object.fromEntries(
      APPS.map(app => [app, path.join(capturesDir, app, `${id}.png`)])
    );
    const base = {
      id,
      scenario: record?.scenario ?? id.split('--')[0],
      path: record?.path ?? null,
      theme: record?.theme ?? null,
      language: record?.language ?? null,
      viewport: record?.viewport ?? null,
      browser: describeBrowser(record?.browser),
      baseline: existsSync(images.baseline) ? `captures/baseline/${id}.png` : null,
      react: existsSync(images.react) ? `captures/react/${id}.png` : null,
      errors: {
        baseline: record?.apps?.baseline?.errors ?? [],
        react: record?.apps?.react?.errors ?? [],
      },
    };
    if (!base.baseline || !base.react || !record) {
      return {
        ...base,
        status: 'missing',
        mismatchedPixels: null,
        totalPixels: null,
        mismatchRatio: null,
        sizeMismatch: false,
        diff: null,
      };
    }
    const comparison = comparePair(
      images.baseline,
      images.react,
      path.join(diffDir, `${id}.png`),
      threshold
    );
    return {
      ...base,
      status: comparison.mismatchedPixels === 0 ? 'identical' : 'different',
      ...comparison,
      mismatchRatio: comparison.mismatchedPixels / comparison.totalPixels,
      diff: `diff/${id}.png`,
    };
  });

  results.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (b.mismatchRatio ?? 0) - (a.mismatchRatio ?? 0) ||
      a.id.localeCompare(b.id)
  );
  const count = status => results.filter(result => result.status === status).length;
  const summary = {
    generatedAt: new Date().toISOString(),
    threshold,
    browsers: [...new Set(results.map(result => result.browser).filter(Boolean))].sort(),
    totals: {
      captures: results.length,
      identical: count('identical'),
      different: count('different'),
      missing: count('missing'),
    },
    results,
  };
  writeFileSync(path.join(dir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(path.join(dir, 'index.html'), renderReport(summary));
  return summary;
}

export class UsageError extends Error {}

const escapeHtml = value =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

function percent(ratio) {
  if (ratio === null) return '—';
  if (ratio === 0) return '0%';
  return ratio < 0.0001 ? '<0.01%' : `${(ratio * 100).toFixed(2)}%`;
}

function image(src, label) {
  if (!src) return '<td class="absent">missing</td>';
  const safe = escapeHtml(src);
  return `<td><a href="${safe}"><img src="${safe}" alt="${escapeHtml(label)}" loading="lazy"></a></td>`;
}

function errorList(errors) {
  const entries = Object.entries(errors).flatMap(([app, messages]) =>
    messages.map(message => `<li><b>${escapeHtml(app)}</b> ${escapeHtml(message)}</li>`)
  );
  return entries.length === 0 ? '' : `<ul class="errors">${entries.join('')}</ul>`;
}

function renderRow(result) {
  const variant = [
    result.theme,
    result.language,
    result.viewport && `${result.viewport.width}×${result.viewport.height}`,
    result.path,
  ]
    .filter(Boolean)
    .join(' · ');
  const pixels =
    result.mismatchedPixels === null
      ? ''
      : `<br><small>${result.mismatchedPixels.toLocaleString('en')} px${result.sizeMismatch ? ' · size differs' : ''}</small>`;
  return `<tr class="${result.status}">
  <td><b>${escapeHtml(result.scenario)}</b><br><small>${escapeHtml(variant)}</small><br><code>${escapeHtml(result.id)}</code>${errorList(result.errors)}</td>
  <td class="status">${escapeHtml(result.status)}</td>
  <td>${percent(result.mismatchRatio)}${pixels}</td>
  ${image(result.baseline, `${result.id} baseline`)}
  ${image(result.react, `${result.id} react`)}
  ${image(result.diff, `${result.id} diff`)}
</tr>`;
}

function renderReport(summary) {
  const { totals } = summary;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Zellia Control visual parity</title>
<style>
  body { font: 14px/1.4 system-ui, sans-serif; margin: 24px; color: #111; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
  code { font-size: 12px; word-break: break-all; }
  img { width: 360px; border: 1px solid #ccc; background: repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 0 0 / 16px 16px; }
  tr.identical .status { color: #15803d; }
  tr.different .status { color: #b91c1c; }
  tr.missing .status, td.absent { color: #b45309; }
  .errors { margin: 6px 0 0; padding-left: 16px; color: #b91c1c; font-size: 12px; }
</style>
</head>
<body>
<h1>Visual parity: Svelte baseline vs React</h1>
<p>${totals.captures} captures · ${totals.identical} identical · ${totals.different} different · ${totals.missing} missing</p>
<p><small>Generated ${escapeHtml(summary.generatedAt)} · pixelmatch threshold ${summary.threshold} · browser ${escapeHtml(summary.browsers.join(', ') || 'unknown')}</small></p>
<p><small>Every difference must be fixed or recorded in docs/migration/parity-log.md.</small></p>
<table>
<thead><tr><th>Capture</th><th>Status</th><th>Mismatch</th><th>Baseline (Svelte)</th><th>React</th><th>Diff</th></tr></thead>
<tbody>
${summary.results.map(renderRow).join('\n')}
</tbody>
</table>
</body>
</html>
`;
}

function main() {
  const { values } = parseArgs({
    options: {
      dir: { type: 'string', default: PARITY_DIR },
      threshold: { type: 'string', default: String(DEFAULT_THRESHOLD) },
    },
  });
  const threshold = Number(values.threshold);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new UsageError(`--threshold must be between 0 and 1 (got ${values.threshold})`);
  }
  const dir = path.resolve(values.dir);
  const summary = compareCaptures({ dir, threshold });
  printSummary(summary, dir);
  return summary.totals.identical === summary.totals.captures ? 0 : 1;
}

/** Prints the totals, every non-identical capture and the report location. */
export function printSummary(summary, dir = PARITY_DIR) {
  const { totals } = summary;
  console.log(
    `[parity:compare] ${totals.captures} captures: ${totals.identical} identical, ` +
      `${totals.different} different, ${totals.missing} missing`
  );
  for (const result of summary.results.filter(result => result.status !== 'identical')) {
    console.log(
      `  ${result.status.padEnd(9)} ${percent(result.mismatchRatio).padStart(7)}  ${result.id}`
    );
  }
  console.log(`[parity:compare] report: ${path.join(dir, 'index.html')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`[parity:compare] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = error instanceof UsageError ? 2 : 1;
  }
}
