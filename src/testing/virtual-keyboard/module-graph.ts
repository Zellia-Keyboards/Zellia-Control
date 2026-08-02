/**
 * Test helper: the import graph of source modules, for tests that guard bundling and layering
 * rules (no React behind the device session, no Node built-ins behind the browser entry). Sources
 * come from `import.meta.glob(…, { query: '?raw', import: 'default', eager: true })`, keyed by
 * path. Static, side-effect, re-export and dynamic imports all count, type-only ones included.
 */

const IMPORT =
  /\b(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"\n]+)['"]|\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g;

/** The module specifiers a source imports or re-exports, in order of appearance. */
export function importSpecifiers(source: string): string[] {
  return [...source.matchAll(IMPORT)].flatMap(([, fromClause, dynamic]) => {
    const specifier = fromClause ?? dynamic;
    return specifier ? [specifier] : [];
  });
}

function join(from: string, specifier: string): string {
  const parts = from.split('/').slice(0, -1);
  for (const part of specifier.split('/')) {
    if (part === '..') parts.pop();
    else if (part !== '.') parts.push(part);
  }
  return parts.join('/');
}

const CANDIDATES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

export interface ModuleGraph {
  /** Source paths reachable from the entry, the entry included. */
  readonly modules: ReadonlySet<string>;
  /** Package specifiers imported anywhere in the graph, e.g. `zustand/vanilla`. */
  readonly packages: ReadonlySet<string>;
}

/**
 * Walks the graph from `entry` through relative imports. Throws for relative imports that are
 * not in `sources`, so a glob that misses a module fails loudly instead of hiding its imports.
 */
export function moduleGraph(sources: Readonly<Record<string, string>>, entry: string): ModuleGraph {
  const modules = new Set<string>();
  const packages = new Set<string>();
  const visit = (path: string) => {
    if (modules.has(path)) return;
    const source = sources[path];
    if (source === undefined) throw new Error(`Unknown module ${path}`);
    modules.add(path);
    for (const specifier of importSpecifiers(source)) {
      if (!specifier.startsWith('.')) {
        packages.add(specifier);
        continue;
      }
      const base = join(path, specifier);
      const resolved = CANDIDATES.map(suffix => base + suffix).find(
        candidate => sources[candidate] !== undefined
      );
      if (resolved === undefined) throw new Error(`Unknown module ${base} (from ${path})`);
      visit(resolved);
    }
  };
  visit(entry);
  return { modules, packages };
}
