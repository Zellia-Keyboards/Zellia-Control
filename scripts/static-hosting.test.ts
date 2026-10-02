import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build, preview, resolveConfig, type PreviewServer, type Rolldown } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';
import { STATIC_ROUTES, staticHosting } from './static-hosting';

const tempDirs: string[] = [];
const servers: PreviewServer[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => server.close()));
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'static-hosting-'));
  tempDirs.push(root);
  await writeFile(
    path.join(root, 'index.html'),
    '<!doctype html><html><head><title>Fixture</title></head><body><script type="module" src="/main.js"></script></body></html>'
  );
  await writeFile(path.join(root, 'main.js'), 'document.title = "booted";\n');
  return root;
}

function bundleOutputs(
  result: Awaited<ReturnType<typeof build>>
): Rolldown.RolldownOutput['output'] {
  if (Array.isArray(result)) {
    const [first] = result;
    if (!first) throw new Error('empty build result');
    return first.output;
  }
  if ('output' in result) return result.output;
  throw new Error('unexpected watcher result');
}

function htmlSource(outputs: Rolldown.RolldownOutput['output'], fileName: string): string {
  const file = outputs.find(output => output.fileName === fileName);
  if (file?.type !== 'asset') throw new Error(`${fileName} was not emitted`);
  return typeof file.source === 'string' ? file.source : new TextDecoder().decode(file.source);
}

interface HttpResult {
  status: number;
  location: string | undefined;
  body: string;
}

function get(port: number, urlPath: string): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: 'localhost', port, path: urlPath, headers: { accept: 'text/html' } },
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

describe('STATIC_ROUTES', () => {
  it('lists every client-side route except the root', () => {
    expect(STATIC_ROUTES).toEqual([
      'remap',
      'performance',
      'lighting',
      'dynamic',
      'macros',
      'scripts',
      'debug',
      'settings',
      'update',
      'about',
      'profiles',
    ]);
  });
});

describe('staticHosting', () => {
  it('emits an identical index.html copy for every route', async () => {
    const root = await fixtureRoot();
    const outputs = bundleOutputs(
      await build({
        configFile: false,
        root,
        logLevel: 'silent',
        plugins: [staticHosting(['remap', 'about'])],
        build: { write: false },
      })
    );

    const index = htmlSource(outputs, 'index.html');
    expect(index).toContain('<script type="module"');
    expect(htmlSource(outputs, 'remap/index.html')).toBe(index);
    expect(htmlSource(outputs, 'about/index.html')).toBe(index);
  });

  it('defaults to STATIC_ROUTES', async () => {
    const root = await fixtureRoot();
    const outputs = bundleOutputs(
      await build({
        configFile: false,
        root,
        logLevel: 'silent',
        plugins: [staticHosting()],
        build: { write: false },
      })
    );

    const copies = outputs
      .map(output => output.fileName)
      .filter(fileName => fileName.endsWith('/index.html'))
      .sort();
    expect(copies).toEqual(STATIC_ROUTES.map(route => `${route}/index.html`).sort());
  });

  it('rejects route names that are not single path segments', () => {
    expect(() => staticHosting(['remap/'])).toThrow(/invalid route/i);
    expect(() => staticHosting(['../escape'])).toThrow(/invalid route/i);
    expect(() => staticHosting([''])).toThrow(/invalid route/i);
  });

  it('makes vite preview behave like the static host (no SPA fallback)', async () => {
    const root = await fixtureRoot();
    const outDir = path.join(root, 'dist');
    await build({
      configFile: false,
      root,
      logLevel: 'silent',
      plugins: [staticHosting(['remap'])],
      build: { outDir },
    });

    const server = await preview({
      configFile: false,
      root,
      logLevel: 'silent',
      plugins: [staticHosting(['remap'])],
      build: { outDir },
      preview: { port: 0, host: 'localhost' },
    });
    servers.push(server);
    const address = server.httpServer.address();
    if (address === null || typeof address === 'string') throw new Error('no port');

    const index = await get(address.port, '/');
    expect(index.status).toBe(200);

    const deepLink = await get(address.port, '/remap/');
    expect(deepLink.status).toBe(200);
    expect(deepLink.body).toBe(index.body);

    const withoutSlash = await get(address.port, '/remap?tab=layer');
    expect(withoutSlash.status).toBe(301);
    expect(withoutSlash.location).toBe('/remap/?tab=layer');

    const unknown = await get(address.port, '/unknown/');
    expect(unknown.status).toBe(404);
  });

  it('keeps the SPA fallback for the dev server and disables it for preview', async () => {
    const inline = { configFile: false as const, logLevel: 'silent' as const };
    const dev = await resolveConfig({ ...inline, plugins: [staticHosting()] }, 'serve');
    expect(dev.appType).toBe('spa');

    const previewConfig = await resolveConfig(
      { ...inline, plugins: [staticHosting()] },
      'serve',
      'production',
      'production',
      true
    );
    expect(previewConfig.appType).toBe('mpa');
  });

  it('fails the build when index.html is missing', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'static-hosting-lib-'));
    tempDirs.push(root);
    await mkdir(path.join(root, 'src'));
    await writeFile(path.join(root, 'src/entry.js'), 'export const value = 1;\n');
    await expect(
      build({
        configFile: false,
        root,
        logLevel: 'silent',
        plugins: [staticHosting(['remap'])],
        build: {
          write: false,
          rolldownOptions: { input: path.join(root, 'src/entry.js') },
        },
      })
    ).rejects.toThrow(/index\.html/);
  });
});
