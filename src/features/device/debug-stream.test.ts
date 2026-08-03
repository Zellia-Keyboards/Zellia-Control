import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDebugStream,
  debugStream,
  subscribeDebugSamples,
  type DebugSample,
} from './debug-stream';

const SAMPLE: DebugSample = {
  tick: 10,
  keyId: 3,
  value: 0.5,
  raw: 1400,
  filteredRaw: 1398,
  state: true,
  reportState: true,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('debug stream', () => {
  it('delivers published samples to every subscriber in order', () => {
    const stream = createDebugStream();
    const received: string[] = [];
    stream.subscribe(sample => received.push(`a${sample.tick}`));
    stream.subscribe(sample => received.push(`b${sample.tick}`));
    stream.publish(SAMPLE);
    stream.publish({ ...SAMPLE, tick: 11 });
    expect(received).toEqual(['a10', 'b10', 'a11', 'b11']);
    expect(stream.size).toBe(2);
  });

  it('unsubscribes, also while publishing', () => {
    const stream = createDebugStream();
    const second = vi.fn();
    const off = stream.subscribe(() => {
      off();
    });
    stream.subscribe(second);
    stream.publish(SAMPLE);
    stream.publish(SAMPLE);
    expect(second).toHaveBeenCalledTimes(2);
    expect(stream.size).toBe(1);
  });

  it('treats every subscription separately, also for the same listener', () => {
    const stream = createDebugStream();
    const listener = vi.fn();
    const first = stream.subscribe(listener);
    stream.subscribe(listener);
    stream.publish(SAMPLE);
    first();
    stream.publish(SAMPLE);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(stream.size).toBe(1);
  });

  it('starts listeners added while publishing with the next sample', () => {
    const stream = createDebugStream();
    const late = vi.fn();
    const off = stream.subscribe(() => {
      off();
      stream.subscribe(late);
    });
    stream.publish(SAMPLE);
    expect(late).not.toHaveBeenCalled();
    stream.publish({ ...SAMPLE, tick: 11 });
    expect(late).toHaveBeenCalledExactlyOnceWith({ ...SAMPLE, tick: 11 });
  });

  it('keeps delivering when a subscriber throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const stream = createDebugStream();
    const healthy = vi.fn();
    stream.subscribe(() => {
      throw new Error('chart failed');
    });
    stream.subscribe(healthy);
    stream.publish(SAMPLE);
    expect(healthy).toHaveBeenCalledWith(SAMPLE);
    expect(console.error).toHaveBeenCalledOnce();
  });

  it('exposes the app stream through subscribeDebugSamples', () => {
    const listener = vi.fn();
    const off = subscribeDebugSamples(listener);
    debugStream.publish(SAMPLE);
    off();
    debugStream.publish(SAMPLE);
    expect(listener).toHaveBeenCalledOnce();
  });
});
