// Visual parity pipeline (`corepack yarn parity`):
//   1. prepare the Svelte baseline (prepare-baseline.mjs) and serve it on a free port,
//   2. capture every scenario in both apps (Playwright project `parity`; it builds and previews
//      this app itself),
//   3. compare the captures (compare.mjs) into e2e/.artifacts/parity/index.html.
//
//   corepack yarn parity [--force-baseline] [--baseline-dir <dir>] [playwright test args…]
//
// Unknown arguments go to `playwright test`, e.g. `corepack yarn parity --grep welcome`.
// Exit code: 0 when every capture is identical, 1 otherwise, 2 when nothing was captured.

import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PARITY_DIR, UsageError, compareCaptures, printSummary } from './compare.mjs';
import {
  prepareBaseline,
  resolveBaselineDir,
  serveBaseline,
  serverUrl,
} from './prepare-baseline.mjs';

const require = createRequire(import.meta.url);

function parseArguments(argv) {
  const options = { force: false, baselineDir: undefined, playwright: [] };
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--force-baseline') options.force = true;
    else if (argument === '--baseline-dir') options.baselineDir = argv[++index];
    else if (argument.startsWith('--baseline-dir=')) {
      options.baselineDir = argument.slice('--baseline-dir='.length);
    } else if (argument !== '--') options.playwright.push(argument);
  }
  return options;
}

function runPlaywright(args, baselineURL) {
  const cli = require.resolve('@playwright/test/cli');
  console.log(`[parity] playwright test --project=parity ${args.join(' ')}`);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, 'test', '--project=parity', ...args], {
      stdio: 'inherit',
      env: { ...process.env, PARITY_BASELINE_URL: baselineURL },
    });
    child.on('error', reject);
    child.on('exit', code => resolve(code ?? 1));
  });
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const buildDir = await prepareBaseline({
    baselineDir: resolveBaselineDir(options.baselineDir),
    force: options.force,
  });
  // A server of its own on a free port, never one found on :4180: that could be another run's
  // (which stops it when it ends) or not the baseline at all.
  const server = await serveBaseline({ buildDir, port: 0 });
  try {
    // The parity-setup project empties it as well, but only when some capture matches the
    // arguments; this way a run that captures nothing ends in "No captures", not in the last report.
    rmSync(path.join(PARITY_DIR, 'captures'), { recursive: true, force: true });
    const playwrightExit = await runPlaywright(options.playwright, serverUrl(server));
    const summary = compareCaptures({ dir: PARITY_DIR });
    printSummary(summary, PARITY_DIR);
    if (playwrightExit !== 0) {
      console.error('[parity] some captures failed; see the Playwright output above');
      return 1;
    }
    return summary.totals.identical === summary.totals.captures ? 0 : 1;
  } finally {
    await server.close();
  }
}

main().then(
  code => {
    process.exitCode = code;
  },
  error => {
    console.error(`[parity] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = error instanceof UsageError ? 2 : 1;
  }
);
