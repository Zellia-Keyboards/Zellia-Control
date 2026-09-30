/**
 * Layering of the device feature: DeviceSession stays framework-agnostic (spec §4.1), so React
 * only appears behind the store hooks.
 */
import { describe, expect, it } from 'vitest';
import { moduleGraph } from '../../testing/virtual-keyboard/module-graph';

const sources = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** React, and the entries of zustand and its helpers that bind to React. */
const REACT =
  /^(?:react(?:-dom)?(?:\/.*)?|zustand|zustand\/(?:react|traditional)|use-sync-external-store(?:\/.*)?)$/;

function reactPackages(entry: string): string[] {
  return [...moduleGraph(sources, entry).packages].filter(specifier => REACT.test(specifier));
}

describe('device layering', () => {
  it('keeps the session and everything it imports free of React', () => {
    expect(reactPackages('/src/features/device/session.ts')).toEqual([]);
  });

  it('finds React where the hooks live (the check is not vacuous)', () => {
    expect(reactPackages('/src/features/device/store.ts')).toContain('zustand');
  });
});
