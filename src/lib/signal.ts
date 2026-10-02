/**
 * Change notification for the small module-level stores read with `useSyncExternalStore`
 * (language, dark mode, theme color). `subscribe` and `emit` do not depend on `this`, so they
 * can be passed on their own.
 */
export interface Signal {
  readonly subscribe: (listener: () => void) => () => void;
  readonly emit: () => void;
}

export function createSignal(): Signal {
  const listeners = new Set<() => void>();
  return {
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit: () => {
      listeners.forEach(listener => {
        listener();
      });
    },
  };
}
