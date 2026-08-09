import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { afterEach, describe, expect, it } from 'vitest';

const COMPARE = fileURLToPath(new URL('./compare.mjs', import.meta.url));

type Rgba = readonly [number, number, number, number];
const WHITE: Rgba = [255, 255, 255, 255];
const BLACK: Rgba = [0, 0, 0, 255];

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

function png(width: number, height: number, paint: (x: number, y: number) => Rgba): Buffer {
  const image = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      image.data.set(paint(x, y), (y * width + x) * 4);
    }
  }
  return PNG.sync.write(image);
}

const solid = (width: number, height: number, color: Rgba) => png(width, height, () => color);

interface CaptureFixture {
  id: string;
  baseline?: Buffer;
  react?: Buffer;
  errors?: { baseline?: string[]; react?: string[] };
}

async function parityDir(captures: readonly CaptureFixture[]): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'parity-compare-'));
  tempDirs.push(dir);
  const capturesDir = path.join(dir, 'captures');
  await mkdir(path.join(capturesDir, 'baseline'), { recursive: true });
  await mkdir(path.join(capturesDir, 'react'), { recursive: true });
  for (const capture of captures) {
    const [scenario = capture.id] = capture.id.split('--');
    const record = {
      id: capture.id,
      scenario,
      path: '/',
      theme: 'dark',
      language: 'en',
      viewport: { width: 1440, height: 900 },
      browser: { name: 'chromium', channel: 'chrome', version: '153.0.0.0' },
      capturedAt: '2026-09-30T00:00:00.000Z',
      apps: {
        baseline: {
          url: 'http://localhost:4180/',
          status: 200,
          errors: capture.errors?.baseline ?? [],
        },
        react: { url: 'http://localhost:4173/', status: 200, errors: capture.errors?.react ?? [] },
      },
    };
    await writeFile(path.join(capturesDir, `${capture.id}.json`), JSON.stringify(record));
    if (capture.baseline) {
      await writeFile(path.join(capturesDir, 'baseline', `${capture.id}.png`), capture.baseline);
    }
    if (capture.react) {
      await writeFile(path.join(capturesDir, 'react', `${capture.id}.png`), capture.react);
    }
  }
  return dir;
}

function compare(dir: string, ...args: string[]): Promise<{ code: number; output: string }> {
  return new Promise(resolve => {
    execFile(process.execPath, [COMPARE, '--dir', dir, ...args], (error, stdout, stderr) => {
      const code = error ? (typeof error.code === 'number' ? error.code : 1) : 0;
      resolve({ code, output: `${stdout}${stderr}` });
    });
  });
}

interface SummaryResult {
  id: string;
  status: string;
  mismatchedPixels: number;
  totalPixels: number;
  sizeMismatch: boolean;
  diff: string | null;
}

interface Summary {
  totals: { captures: number; identical: number; different: number; missing: number };
  browsers: string[];
  results: SummaryResult[];
}

async function readSummary(dir: string): Promise<Summary> {
  const summary: unknown = JSON.parse(await readFile(path.join(dir, 'summary.json'), 'utf8'));
  if (typeof summary !== 'object' || summary === null) throw new Error('invalid summary');
  return summary as Summary;
}

describe('compare.mjs', () => {
  it('reports identical captures and exits 0', async () => {
    const image = solid(8, 6, WHITE);
    const dir = await parityDir([
      { id: 'welcome--dark-en-1440x900', baseline: image, react: image },
    ]);

    const { code, output } = await compare(dir);

    expect(code).toBe(0);
    expect(output).toContain('1 identical');
    const summary = await readSummary(dir);
    expect(summary.totals).toEqual({ captures: 1, identical: 1, different: 0, missing: 0 });
    expect(summary.browsers).toEqual(['chromium (chrome) 153.0.0.0']);
    expect(summary.results[0]).toMatchObject({ status: 'identical', mismatchedPixels: 0 });
  });

  it('counts mismatched pixels, writes a diff image and exits 1', async () => {
    const dir = await parityDir([
      {
        id: 'welcome--dark-en-1440x900',
        baseline: solid(10, 10, WHITE),
        react: png(10, 10, (x, y) => (x < 5 && y < 2 ? BLACK : WHITE)),
      },
    ]);

    const { code } = await compare(dir);

    expect(code).toBe(1);
    const [result] = (await readSummary(dir)).results;
    expect(result).toMatchObject({
      status: 'different',
      mismatchedPixels: 10,
      totalPixels: 100,
      sizeMismatch: false,
      diff: 'diff/welcome--dark-en-1440x900.png',
    });
    const diff = PNG.sync.read(
      await readFile(path.join(dir, 'diff/welcome--dark-en-1440x900.png'))
    );
    expect([diff.width, diff.height]).toEqual([10, 10]);
    // pixelmatch paints mismatches red.
    expect([...diff.data.subarray(0, 4)]).toEqual([255, 0, 0, 255]);
  });

  it('compares captures of different sizes on the larger canvas', async () => {
    const dir = await parityDir([
      { id: 'welcome--dark-en-1440x900', baseline: solid(4, 4, WHITE), react: solid(4, 5, WHITE) },
    ]);

    await compare(dir);

    expect((await readSummary(dir)).results[0]).toMatchObject({
      status: 'different',
      sizeMismatch: true,
      mismatchedPixels: 4,
      totalPixels: 20,
    });
  });

  it('reports a capture missing on one side', async () => {
    const dir = await parityDir([
      { id: 'welcome--dark-en-1440x900', baseline: solid(4, 4, WHITE) },
      { id: 'welcome--dark-zh-1440x900', baseline: solid(4, 4, WHITE), react: solid(4, 4, WHITE) },
    ]);

    const { code } = await compare(dir);

    expect(code).toBe(1);
    const summary = await readSummary(dir);
    expect(summary.totals).toEqual({ captures: 2, identical: 1, different: 0, missing: 1 });
    // Worst first.
    expect(summary.results.map(result => result.status)).toEqual(['missing', 'identical']);
  });

  it('honours --threshold', async () => {
    const light: Rgba = [250, 250, 250, 255];
    const dir = await parityDir([
      { id: 'welcome--dark-en-1440x900', baseline: solid(4, 4, WHITE), react: solid(4, 4, light) },
    ]);

    await compare(dir, '--threshold', '0');
    expect((await readSummary(dir)).results[0]?.mismatchedPixels).toBe(16);

    await compare(dir, '--threshold', '0.1');
    expect((await readSummary(dir)).results[0]?.mismatchedPixels).toBe(0);
  });

  it('writes an HTML report that links the images and escapes text', async () => {
    const image = solid(4, 4, WHITE);
    const dir = await parityDir([
      {
        id: 'welcome--dark-en-1440x900',
        baseline: image,
        react: solid(4, 4, BLACK),
        errors: { react: ['pageerror: <script>alert(1)</script>'] },
      },
    ]);

    await compare(dir);

    const html = await readFile(path.join(dir, 'index.html'), 'utf8');
    expect(html).toContain('src="captures/baseline/welcome--dark-en-1440x900.png"');
    expect(html).toContain('src="captures/react/welcome--dark-en-1440x900.png"');
    expect(html).toContain('src="diff/welcome--dark-en-1440x900.png"');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('fails with exit code 2 when there is nothing to compare', async () => {
    const dir = await parityDir([]);

    const { code, output } = await compare(dir);

    expect(code).toBe(2);
    expect(output).toMatch(/no captures/i);
  });
});
