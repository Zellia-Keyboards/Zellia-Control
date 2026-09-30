import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import tailwind from '@tailwindcss/postcss';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

// A utility that only appears in this file (outside src/).
const TOOLING_ONLY_CANDIDATE = 'underline-offset-[7.77px]';

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

describe('postcss.config.js', () => {
  it('generates utilities from app sources only', async () => {
    const result = await postcss([tailwind(await tailwindOptions())]).process(
      "@import 'tailwindcss';",
      { from: path.join(repoRoot, 'src/styles/probe.css') }
    );

    expect(result.css).toContain('.min-h-screen');
    expect(TOOLING_ONLY_CANDIDATE).toContain('7.77px');
    expect(result.css).not.toContain('7\\.77px');
  });
});
