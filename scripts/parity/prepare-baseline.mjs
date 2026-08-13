// Prepares the Svelte baseline app (commit 4f232a2) for visual parity and serves its build.
//
//   node scripts/parity/prepare-baseline.mjs [--baseline-dir <dir>] [--port 4180] [--force]
//                                            [--prepare-only]
//
// In the baseline checkout it replaces src-controller/ with this repository's synced upstream
// controller, installs dependencies (yarn 1 via corepack, frozen lockfile), builds (SvelteKit
// adapter-static → build/) and serves build/ like the production static host. It never commits in
// the baseline checkout. Install and build are skipped while the stamp in build/ matches.
// prepare-baseline.d.mts types the exports for TypeScript (tests).

import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { preview } from 'vite';
import { staticHostPreview } from '../static-host.mjs';

const BASELINE_COMMIT = '4f232a2';
export const BASELINE_PORT = 4180;

const STAMP_VERSION = 1;
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const controllerSource = path.join(repoRoot, 'src-controller');

function log(message) {
  console.log(`[parity:baseline] ${message}`);
}

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

/** Parses `git worktree list --porcelain` into `{ path, head }` entries. */
export function parseWorktrees(porcelain) {
  return porcelain
    .split(/\n\s*\n/)
    .map(block => {
      const lines = block.split('\n');
      const worktree = lines.find(line => line.startsWith('worktree '));
      const head = lines.find(line => line.startsWith('HEAD '));
      return worktree && head
        ? { path: worktree.slice('worktree '.length), head: head.slice('HEAD '.length) }
        : null;
    })
    .filter(entry => entry !== null);
}

/**
 * The baseline checkout: `dir` (`--baseline-dir` / PARITY_BASELINE_DIR), otherwise a git worktree
 * of this repository whose HEAD is BASELINE_COMMIT. Verifies the checkout is at that commit.
 */
export function resolveBaselineDir(dir = process.env.PARITY_BASELINE_DIR) {
  const commit = git(['rev-parse', `${BASELINE_COMMIT}^{commit}`], repoRoot);
  let baselineDir;
  if (dir) {
    baselineDir = path.resolve(dir);
  } else {
    const match = parseWorktrees(git(['worktree', 'list', '--porcelain'], repoRoot)).find(
      worktree => worktree.head === commit
    );
    if (!match) {
      throw new Error(
        `No worktree of this repository is checked out at ${BASELINE_COMMIT}. Create one with\n` +
          `  git worktree add --detach ../svelte-baseline ${BASELINE_COMMIT}\n` +
          'or pass --baseline-dir (or PARITY_BASELINE_DIR).'
      );
    }
    baselineDir = match.path;
  }
  if (!existsSync(path.join(baselineDir, 'svelte.config.js'))) {
    throw new Error(`${baselineDir} is not the Svelte baseline (no svelte.config.js)`);
  }
  const head = git(['rev-parse', 'HEAD'], baselineDir);
  if (head !== commit) {
    throw new Error(`Baseline checkout ${baselineDir} is at ${head}, expected ${commit}`);
  }
  return baselineDir;
}

function listFiles(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => {
      if (entry.name === 'node_modules') return [];
      const file = path.join(dir, entry.name);
      return entry.isDirectory() ? listFiles(file, base) : [path.relative(base, file)];
    })
    .sort();
}

/** Content hash of a directory tree (paths and bytes), ignoring node_modules. */
export function hashTree(dir) {
  const hash = createHash('sha256');
  for (const file of listFiles(dir)) {
    hash.update(file.split(path.sep).join('/'));
    hash.update('\0');
    hash.update(readFileSync(path.join(dir, file)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function stampPath(baselineDir) {
  return path.join(baselineDir, 'build', '.parity-stamp.json');
}

function expectedStamp(baselineDir) {
  return {
    version: STAMP_VERSION,
    commit: git(['rev-parse', 'HEAD'], baselineDir),
    controller: hashTree(controllerSource),
    lockfile: createHash('sha256')
      .update(readFileSync(path.join(baselineDir, 'yarn.lock')))
      .digest('hex'),
  };
}

function readStamp(baselineDir) {
  try {
    return JSON.parse(readFileSync(stampPath(baselineDir), 'utf8'));
  } catch {
    return null;
  }
}

/** Whether the stamp read from the baseline's build/ matches the one the current inputs produce. */
export function isUpToDate(stamp, expected) {
  return (
    typeof stamp === 'object' &&
    stamp !== null &&
    Object.entries(expected).every(([key, value]) => stamp[key] === value)
  );
}

/** Replaces the baseline's (outdated) src-controller with this repository's synced copy. */
function syncController(baselineDir) {
  const target = path.join(baselineDir, 'src-controller');
  rmSync(target, { recursive: true, force: true });
  cpSync(controllerSource, target, {
    recursive: true,
    filter: source => path.basename(source) !== 'node_modules',
  });
}

function run(command, args, cwd) {
  log(`${command} ${args.join(' ')}  (in ${cwd})`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

/**
 * Syncs the controller, installs and builds the baseline unless its build is up to date.
 * Returns the build directory.
 */
export async function prepareBaseline({ baselineDir = resolveBaselineDir(), force = false } = {}) {
  const buildDir = path.join(baselineDir, 'build');
  const stamp = expectedStamp(baselineDir);
  if (!force && isUpToDate(readStamp(baselineDir), stamp)) {
    log(`build is up to date (${buildDir})`);
    return buildDir;
  }

  log(`syncing src-controller into ${baselineDir}`);
  syncController(baselineDir);
  if (force || !existsSync(path.join(baselineDir, 'node_modules', '.yarn-integrity'))) {
    await run(
      'corepack',
      ['yarn', 'install', '--frozen-lockfile', '--non-interactive'],
      baselineDir
    );
  }
  await run('corepack', ['yarn', 'build'], baselineDir);
  if (!existsSync(path.join(buildDir, 'index.html'))) {
    throw new Error(`The baseline build did not produce ${path.join(buildDir, 'index.html')}`);
  }
  writeFileSync(stampPath(baselineDir), `${JSON.stringify(stamp, null, 2)}\n`);
  log(`built ${buildDir}`);
  return buildDir;
}

/**
 * Serves the baseline build like the production static host, with the same emulation as this
 * app's `vite preview` (scripts/static-host.mjs). Port 0 picks a free port (see serverUrl).
 */
export async function serveBaseline({ buildDir, port = BASELINE_PORT }) {
  if (!statSync(buildDir, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`${buildDir} does not exist; prepare the baseline first`);
  }
  const server = await preview({
    configFile: false,
    envDir: false,
    root: path.dirname(buildDir),
    logLevel: 'warn',
    plugins: [staticHostPreview()],
    build: { outDir: path.basename(buildDir) },
    preview: { port, strictPort: true, host: 'localhost' },
  });
  log(`serving ${buildDir} at ${serverUrl(server)}`);
  return server;
}

/** Root URL of a server started by serveBaseline (resolves port 0 to the port it got). */
export function serverUrl(server) {
  const address = server.httpServer.address();
  if (address === null || typeof address === 'string') {
    throw new Error('The baseline server is not listening on a TCP port');
  }
  return `http://localhost:${address.port}/`;
}

async function main() {
  const { values } = parseArgs({
    options: {
      'baseline-dir': { type: 'string' },
      port: { type: 'string', default: String(BASELINE_PORT) },
      force: { type: 'boolean', default: false },
      'prepare-only': { type: 'boolean', default: false },
    },
  });
  const baselineDir = resolveBaselineDir(values['baseline-dir']);
  const buildDir = await prepareBaseline({ baselineDir, force: values.force });
  if (values['prepare-only']) return;
  await serveBaseline({ buildDir, port: Number(values.port) });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`[parity:baseline] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
