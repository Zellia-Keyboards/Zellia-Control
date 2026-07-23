import { describe, expect, it, vi } from 'vitest';
import { createSignal } from './signal';

describe('createSignal', () => {
  it('notifies every subscribed listener on emit', () => {
    const signal = createSignal();
    const first = vi.fn();
    const second = vi.fn();
    signal.subscribe(first);
    signal.subscribe(second);
    signal.emit();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops notifying a listener once it unsubscribes', () => {
    const signal = createSignal();
    const listener = vi.fn();
    const unsubscribe = signal.subscribe(listener);
    unsubscribe();
    signal.emit();
    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps separate signals independent', () => {
    const first = createSignal();
    const second = createSignal();
    const listener = vi.fn();
    first.subscribe(listener);
    second.emit();
    expect(listener).not.toHaveBeenCalled();
  });

  it('works with subscribe and emit detached, as useSyncExternalStore calls them', () => {
    const { subscribe, emit } = createSignal();
    const listener = vi.fn();
    subscribe(listener);
    emit();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
