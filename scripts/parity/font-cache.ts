import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BrowserContext } from '@playwright/test';

const GOOGLE_FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

// Response headers the browser needs to use a replayed stylesheet or font (CORS for @font-face).
const KEPT_HEADERS = [
  'content-type',
  'access-control-allow-origin',
  'timing-allow-origin',
  'cross-origin-resource-policy',
];

interface CachedResponse {
  status: number;
  headers: Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCachedResponse(value: unknown): value is CachedResponse {
  return (
    isRecord(value) &&
    typeof value.status === 'number' &&
    isRecord(value.headers) &&
    Object.values(value.headers).every(header => typeof header === 'string')
  );
}

function keptHeaders(headers: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => KEPT_HEADERS.includes(name.toLowerCase()))
  );
}

function cacheKey(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}

async function readCached(stem: string): Promise<{ meta: CachedResponse; body: Buffer } | null> {
  try {
    const meta: unknown = JSON.parse(await readFile(`${stem}.json`, 'utf8'));
    if (!isCachedResponse(meta)) return null;
    return { meta, body: await readFile(`${stem}.body`) };
  } catch {
    return null;
  }
}

async function writeAtomic(file: string, data: string | Buffer): Promise<void> {
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, data);
  await rename(temporary, file);
}

/**
 * Serves Google Fonts requests of `context` from `dir`, fetching and storing them on first use.
 * Both apps then render with byte-identical fonts, and later runs need no network.
 */
export async function routeFontCache(context: BrowserContext, dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  await context.route(GOOGLE_FONTS, async route => {
    const stem = path.join(dir, cacheKey(route.request().url()));
    const cached = await readCached(stem);
    if (cached) {
      await route.fulfill({
        status: cached.meta.status,
        headers: cached.meta.headers,
        body: cached.body,
      });
      return;
    }
    const response = await route.fetch();
    const body = await response.body();
    const meta: CachedResponse = {
      status: response.status(),
      headers: keptHeaders(response.headers()),
    };
    if (response.ok()) {
      await writeAtomic(`${stem}.body`, body);
      await writeAtomic(`${stem}.json`, JSON.stringify(meta));
    }
    await route.fulfill({ status: meta.status, headers: meta.headers, body });
  });
}
