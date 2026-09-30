import { describe, expect, it } from 'vitest';
import { importSpecifiers, moduleGraph } from './module-graph';

describe('importSpecifiers', () => {
  it('finds static, side-effect, re-export, type-only and dynamic imports', () => {
    const source = [
      "import React from 'react';",
      "import { a, type B } from './a';",
      'import {',
      '  c,',
      '  d,',
      "} from './c';",
      "import * as e from 'e';",
      "import f, { g } from 'f';",
      "import type { H } from './h';",
      "import './side-effect';",
      "export { i } from './i';",
      "export * from './j';",
      "export type * from './k';",
      "const lazy = () => import('./lazy');",
      "export const NOT_AN_IMPORT = 'x';",
      "const text = 'from nowhere';",
    ].join('\n');
    expect(importSpecifiers(source)).toEqual([
      'react',
      './a',
      './c',
      'e',
      'f',
      './h',
      './side-effect',
      './i',
      './j',
      './k',
      './lazy',
    ]);
  });
});

describe('moduleGraph', () => {
  it('follows relative imports to .ts, .tsx and index files and collects packages', () => {
    const graph = moduleGraph(
      {
        '/src/entry.ts': "import { a } from './a';\nimport './view';\nimport('./lib');",
        '/src/a.ts': "import { b } from '../pkg-free/b';\nexport * from 'zustand/vanilla';",
        '/pkg-free/b.ts': "import 'react';",
        '/src/view.tsx': "import { a } from './a';",
        '/src/lib/index.ts': "import x from 'emi-keyboard-controller';",
        '/src/unrelated.ts': "import 'react-dom';",
      },
      '/src/entry.ts'
    );
    expect([...graph.modules].sort()).toEqual([
      '/pkg-free/b.ts',
      '/src/a.ts',
      '/src/entry.ts',
      '/src/lib/index.ts',
      '/src/view.tsx',
    ]);
    expect([...graph.packages].sort()).toEqual([
      'emi-keyboard-controller',
      'react',
      'zustand/vanilla',
    ]);
  });

  it('fails for relative imports it cannot resolve', () => {
    expect(() => moduleGraph({ '/src/entry.ts': "import './missing';" }, '/src/entry.ts')).toThrow(
      'Unknown module /src/missing (from /src/entry.ts)'
    );
  });
});
