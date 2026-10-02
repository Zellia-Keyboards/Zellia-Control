import { useCallback, useEffect, useRef } from 'react';

interface Pending {
  readonly run: () => void;
  readonly flushOnUnmount: boolean;
}

export type ScheduleTimeout = (
  run: () => void,
  ms: number,
  options?: { readonly flushOnUnmount?: boolean }
) => void;

/**
 * `setTimeout` for a component: pending timers are cleared when it unmounts. Timers marked
 * `flushOnUnmount` (a delete waiting for its fade-out) run at once instead, so leaving the editor
 * never cancels what the user asked for.
 */
export function useTimeouts(): ScheduleTimeout {
  const pending = useRef(new Map<ReturnType<typeof setTimeout>, Pending>());

  useEffect(() => {
    const timers = pending.current;
    return () => {
      const flushed = [...timers];
      timers.clear();
      for (const [timer, { run, flushOnUnmount }] of flushed) {
        clearTimeout(timer);
        if (flushOnUnmount) run();
      }
    };
  }, []);

  return useCallback((run, ms, options) => {
    const timers = pending.current;
    const timer = setTimeout(() => {
      timers.delete(timer);
      run();
    }, ms);
    timers.set(timer, { run, flushOnUnmount: options?.flushOnUnmount ?? false });
  }, []);
}
