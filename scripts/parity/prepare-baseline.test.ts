import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build, preview, type PreviewServer } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';
import { staticHosting } from '../static-hosting';
import {
  type BaselineStamp,
  hashTree,
  isUpToDate,
  parseWorktrees,
  serveBaseline,
  serverUrl,
} from './prepare-baseline.mjs';

const tempDirs: string[] = [];
const servers: PreviewServer[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => server.close()));
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

async function tempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function writeTree(root: string, files: Readonly<Record<string, string>>): Promise<void> {
  for (const [file, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), content);
  }
}

describe('parseWorktrees', () => {
  it('reads the path and HEAD of every checked-out worktree', () => {
    const porcelain = [
      'worktree /repo',
      'HEAD 1111111111111111111111111111111111111111',
      'branch refs/heads/main',
      '',
      'worktree /work trees/svelte-baseline',
      'HEAD 4f232a2000000000000000000000000000000000',
      'detached',
      '',
      'worktree /repo.git',
      'bare',
      '',
      'worktree /worktrees/gone',
      'HEAD 2222222222222222222222222222222222222222',
      'branch refs/heads/gone',
      'prunable gitdir file points to non-existent location',
      '',
    ].join('\n');

    expect(parseWorktrees(porcelain)).toEqual([
      { path: '/repo', head: '1111111111111111111111111111111111111111' },
      { path: '/work trees/svelte-baseline', head: '4f232a2000000000000000000000000000000000' },
      { path: '/worktrees/gone', head: '2222222222222222222222222222222222222222' },
    ]);
  });
});

describe('hashTree', () => {
  it('changes when a file changes, is added or is renamed', async () => {
    const root = await tempDir('hash-tree-');
    await writeTree(root, { 'src/index.ts': 'export {};\n', 'package.json': '{}\n' });
    const original = hashTree(root);

    expect(hashTree(root)).toBe(original);

    await writeFile(path.join(root, 'src/index.ts'), 'export const changed = true;\n');
    const edited = hashTree(root);
    expect(edited).not.toBe(original);

    await rename(path.join(root, 'src/index.ts'), path.join(root, 'src/main.ts'));
    const renamed = hashTree(root);
    expect(renamed).not.toBe(edited);

    await writeTree(root, { 'src/extra.ts': '' });
    expect(hashTree(root)).not.toBe(renamed);
  });

  it('ignores node_modules at any depth', async () => {
    const root = await tempDir('hash-tree-');
    await writeTree(root, { 'src/index.ts': 'export {};\n' });
    const before = hashTree(root);

    await writeTree(root, {
      'node_modules/dep/index.js': 'module.exports = 1;\n',
      'test/node_modules/fixture/index.js': '',
    });

    expect(hashTree(root)).toBe(before);
  });
});

describe('isUpToDate', () => {
  const expected: BaselineStamp = {
    version: 1,
    commit: '4f232a2000000000000000000000000000000000',
    controller: 'a'.repeat(64),
    lockfile: 'b'.repeat(64),
  };

  it('accepts only a stamp with the same commit, controller, lockfile and version', () => {
    expect(isUpToDate({ ...expected }, expected)).toBe(true);
    expect(isUpToDate({ ...expected, controller: 'c'.repeat(64) }, expected)).toBe(false);
    expect(isUpToDate({ ...expected, lockfile: 'c'.repeat(64) }, expected)).toBe(false);
    expect(isUpToDate({ ...expected, commit: 'c'.repeat(40) }, expected)).toBe(false);
    expect(isUpToDate({ ...expected, version: 0 }, expected)).toBe(false);
  });

  it('rejects a missing or unreadable stamp', () => {
    expect(isUpToDate(null, expected)).toBe(false);
    expect(isUpToDate('stamp', expected)).toBe(false);
    const { controller: _controller, ...withoutController } = expected;
    expect(isUpToDate(withoutController, expected)).toBe(false);
  });

  it('does not depend on the key order of the stored stamp', () => {
    const { version, commit, controller, lockfile } = expected;
    expect(isUpToDate({ lockfile, controller, commit, version }, expected)).toBe(true);
  });
});

interface HttpResult {
  status: number;
  location: string | undefined;
  body: string;
}

function send(url: string, method: string, urlPath: string): Promise<HttpResult> {
  const { port } = new URL(url);
  return new Promise((resolve, reject) => {
    const req = request(
      { host: 'localhost', port, path: urlPath, method, headers: { accept: 'text/html' } },
      res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 0, location: res.headers.location, body });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

describe('serveBaseline', () => {
  it('serves a build exactly like the preview of this app', async () => {
    const root = await tempDir('serve-baseline-');
    await writeTree(root, {
      'index.html':
        '<!doctype html><html><head><title>Fixture</title></head><body><script type="module" src="/main.js"></script></body></html>',
      'main.js': 'document.title = "booted";\n',
    });
    const buildDir = path.join(root, 'build');
    await build({
      configFile: false,
      root,
      logLevel: 'silent',
      plugins: [staticHosting(['remap'])],
      build: { outDir: buildDir },
    });
    const reactPreview = await preview({
      configFile: false,
      root,
      logLevel: 'silent',
      plugins: [staticHosting(['remap'])],
      build: { outDir: buildDir },
      preview: { port: 0, host: 'localhost' },
    });
    servers.push(reactPreview);
    const baseline = await serveBaseline({ buildDir, port: 0 });
    servers.push(baseline);

    const index = await readFile(path.join(buildDir, 'index.html'), 'utf8');
    const baselineRoot = await send(serverUrl(baseline), 'GET', '/');
    expect(baselineRoot).toMatchObject({ status: 200, body: index });

    const requests: readonly (readonly [string, string])[] = [
      ['GET', '/'],
      ['GET', '/remap/'],
      ['GET', '/remap'],
      ['GET', '/remap?tab=layer'],
      ['HEAD', '/remap'],
      ['POST', '/remap'],
      ['GET', '/unknown/'],
      ['GET', '/unknown'],
      ['GET', '/index.html'],
      ['GET', '/remap/index.html'],
      ['GET', '/%E0%A4%A'],
      ['GET', '/..%2f..%2fetc'],
    ];
    for (const [method, urlPath] of requests) {
      expect(await send(serverUrl(baseline), method, urlPath), `${method} ${urlPath}`).toEqual(
        await send(serverUrl(reactPreview), method, urlPath)
      );
    }
  });
});
