import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLoadedDraft } from './use-loaded-draft';
import { useTimeouts } from './use-timeouts';

afterEach(() => {
  vi.useRealTimers();
});

describe('useLoadedDraft', () => {
  const setup = (initialSource: string) =>
    renderHook(
      ({ source }: { source: string }) =>
        useLoadedDraft<string>(
          [source],
          previous => `${previous}+${source}`,
          () => 'initial'
        ),
      { initialProps: { source: initialSource } }
    );

  it('loads the first draft from its source', () => {
    expect(setup('a').result.current.draft).toBe('initial+a');
  });

  it('keeps edits while the source stays the same', () => {
    const hook = setup('a');
    act(() => {
      hook.result.current.update(draft => `${draft}!`);
    });
    hook.rerender({ source: 'a' });
    expect(hook.result.current.draft).toBe('initial+a!');
  });

  it('reloads from the previous draft when the source changes', () => {
    const hook = setup('a');
    act(() => {
      hook.result.current.update(draft => `${draft}!`);
    });
    hook.rerender({ source: 'b' });
    expect(hook.result.current.draft).toBe('initial+a!+b');
  });

  it('adopts a draft for the source a command just changed, without reloading it', () => {
    // The device store changes in the same event as `adopt`, so the next render sees both.
    let source = 'a';
    const hook = renderHook(() =>
      useLoadedDraft<string>(
        [source],
        previous => `${previous}+${source}`,
        () => 'initial'
      )
    );
    act(() => {
      source = 'b';
      hook.result.current.adopt('applied', ['b']);
    });
    expect(hook.result.current.draft).toBe('applied');
  });
});

describe('useTimeouts', () => {
  it('runs scheduled callbacks after their delay', () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const { result } = renderHook(() => useTimeouts());
    result.current(run, 500);
    vi.advanceTimersByTime(499);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledOnce();
  });

  it('clears pending callbacks on unmount, running those marked to flush', () => {
    vi.useFakeTimers();
    const dropped = vi.fn();
    const flushed = vi.fn();
    const { result, unmount } = renderHook(() => useTimeouts());
    result.current(dropped, 500);
    result.current(flushed, 500, { flushOnUnmount: true });
    unmount();
    expect(flushed).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1000);
    expect(dropped).not.toHaveBeenCalled();
    expect(flushed).toHaveBeenCalledOnce();
  });
});
