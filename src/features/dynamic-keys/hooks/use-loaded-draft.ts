import { useCallback, useState } from 'react';

interface LoadedDraft<D> {
  readonly deps: readonly unknown[];
  readonly draft: D;
}

function sameDeps(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

export interface LoadedDraftApi<D> {
  readonly draft: D;
  /** Edits the draft (the source stays loaded). */
  readonly update: (edit: (draft: D) => D) => void;
  /**
   * Replaces the draft and marks `deps` as loaded, e.g. after a command changed the source: the
   * editor keeps showing what it applied instead of reloading it from the device.
   */
  readonly adopt: (draft: D, deps: readonly unknown[]) => void;
}

/**
 * Editor state loaded from a source (the selected key, its dynamic key on the device, its UI-only
 * fields): the React form of the Svelte editors' load effects. Whenever an entry of `deps`
 * changes (`Object.is`), the draft reloads with `load(previousDraft)` during render.
 */
export function useLoadedDraft<D>(
  deps: readonly unknown[],
  load: (previous: D) => D,
  initial: () => D
): LoadedDraftApi<D> {
  const [state, setState] = useState<LoadedDraft<D>>(() => ({ deps, draft: load(initial()) }));
  let current = state;
  if (!sameDeps(state.deps, deps)) {
    current = { deps, draft: load(state.draft) };
    setState(current);
  }

  const update = useCallback((edit: (draft: D) => D) => {
    setState(previous => ({ deps: previous.deps, draft: edit(previous.draft) }));
  }, []);
  const adopt = useCallback((draft: D, adoptedDeps: readonly unknown[]) => {
    setState({ deps: adoptedDeps, draft });
  }, []);

  return { draft: current.draft, update, adopt };
}
