import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import tailwind from '@tailwindcss/postcss';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

// A utility that only appears in this file (outside src/).
const TOOLING_ONLY_CANDIDATE = 'underline-offset-[7.77px]';
/** The selector Tailwind generates for it: `.underline-offset-\[7\.77px\]`. */
const TOOLING_ONLY_SELECTOR = `.${TOOLING_ONLY_CANDIDATE.replace(/[[\].]/g, '\\$&')}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** The options postcss.config.js passes to @tailwindcss/postcss. */
async function tailwindOptions(): Promise<{ base?: string }> {
  const module: unknown = await import(
    pathToFileURL(path.join(repoRoot, 'postcss.config.js')).href
  );
  const plugins = isRecord(module) && isRecord(module.default) ? module.default.plugins : undefined;
  const options = isRecord(plugins) ? plugins['@tailwindcss/postcss'] : undefined;
  if (!isRecord(options)) throw new Error('postcss.config.js does not configure Tailwind');
  const { base } = options;
  if (base !== undefined && typeof base !== 'string') throw new Error('invalid base');
  return base === undefined ? {} : { base };
}

/** The app stylesheet's Tailwind output for the given plugin options. */
async function generate(options: { base?: string }): Promise<string> {
  const result = await postcss([tailwind(options)]).process("@import 'tailwindcss';", {
    from: path.join(repoRoot, 'src/styles/probe.css'),
  });
  return result.css;
}

describe('postcss.config.js', () => {
  it('generates utilities from app sources only', async () => {
    const css = await generate(await tailwindOptions());

    expect(css).toContain('.min-h-screen');
    expect(css).not.toContain(TOOLING_ONLY_SELECTOR);
  });

  it('would generate the probe utility if tooling files were scanned (control)', async () => {
    const css = await generate({ base: path.join(repoRoot, 'scripts') });

    expect(css).toContain(`${TOOLING_ONLY_SELECTOR} {`);
  });
});
