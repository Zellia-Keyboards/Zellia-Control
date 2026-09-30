import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { type Server, createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const playwrightCli = createRequire(import.meta.url).resolve('@playwright/test/cli');

const servers: Server[] = [];
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      server =>
        new Promise<void>(resolve => {
          server.close(() => {
            resolve();
          });
        })
    )
  );
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

/** An unrelated HTTP server, e.g. another worktree's preview or the Svelte baseline's. */
async function foreignServer(): Promise<number> {
  const server = createServer((_request, response) => response.end('another app'));
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('no port');
  return address.port;
}

function playwright(
  args: readonly string[],
  env: NodeJS.ProcessEnv
): Promise<{ code: number; output: string }> {
  return new Promise(resolve => {
    execFile(
      process.execPath,
      [playwrightCli, 'test', ...args],
      { cwd: repoRoot, env: { ...process.env, ...env } },
      (error, stdout, stderr) => {
        const code = error ? (typeof error.code === 'number' ? error.code : 1) : 0;
        resolve({ code, output: `${stdout}${stderr}` });
      }
    );
  });
}

describe('playwright.config.ts', () => {
  it('fails instead of testing a server it did not start', async () => {
    const port = await foreignServer();
    const output = await mkdtemp(path.join(tmpdir(), 'playwright-config-'));
    tempDirs.push(output);

    const result = await playwright(
      ['--project=e2e', '--grep', 'welcome screen', '--reporter=line', `--output=${output}`],
      { E2E_PORT: String(port) }
    );

    expect(result.code).not.toBe(0);
    expect(result.output).toContain(`http://localhost:${port} is already used`);
  });

  it('starts every parity capture run, filtered or not, by removing earlier captures', async () => {
    // `--list` resolves the run (projects, dependencies, --grep) without starting the server.
    const result = await playwright(
      ['--project=parity', '--list', '--grep', 'welcome--dark-en-1440x900'],
      {}
    );

    expect(result.code, result.output).toBe(0);
    const listed = result.output.split('\n').filter(line => line.includes(' › '));
    expect(listed).toEqual([
      expect.stringMatching(
        /\[parity-setup\] › scripts\/parity\/reset-captures\.ts:\d+:\d+ › remove the captures of earlier runs$/
      ),
      expect.stringMatching(
        /\[parity\] › scripts\/parity\/capture\.ts:\d+:\d+ › welcome--dark-en-1440x900$/
      ),
    ]);
  });
});
