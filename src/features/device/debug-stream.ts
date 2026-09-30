/**
 * Debug samples (spec §5.4, D16). DeviceSession forwards every `updateDebugData` here instead of
 * into the store, so the debug chart can append points imperatively without a React render per
 * sample.
 */

export interface DebugSample {
  /** Firmware tick of the debug packet. */
  readonly tick: number;
  readonly keyId: number;
  /** Travel as a fraction: 0 = released … 1 = bottomed out. */
  readonly value: number;
  /** Raw and filtered sensor readings. */
  readonly raw: number;
  readonly filteredRaw: number;
  /** Whether the key is pressed, and whether that press is being reported to the host. */
  readonly state: boolean;
  readonly reportState: boolean;
}

export type DebugSampleListener = (sample: DebugSample) => void;

export interface DebugStream {
  /** Adds a listener; returns its unsubscribe function. */
  subscribe(listener: DebugSampleListener): () => void;
  /** Delivers `sample` to every current listener, in subscription order. */
  publish(sample: DebugSample): void;
  /** Number of active subscriptions. */
  readonly size: number;
}

interface Subscription {
  readonly listener: DebugSampleListener;
}

export function createDebugStream(): DebugStream {
  const subscriptions = new Set<Subscription>();
  return {
    subscribe(listener) {
      const subscription: Subscription = { listener };
      subscriptions.add(subscription);
      return () => {
        subscriptions.delete(subscription);
      };
    },
    publish(sample) {
      // Listeners added while publishing start with the next sample; removed ones stop at once.
      for (const subscription of [...subscriptions]) {
        if (!subscriptions.has(subscription)) continue;
        try {
          subscription.listener(sample);
        } catch (error) {
          console.error('[device] debug sample listener failed', error);
        }
      }
    },
    get size() {
      return subscriptions.size;
    },
  };
}

/** The app's debug stream, fed by `deviceSession`. */
export const debugStream: DebugStream = createDebugStream();

/** Subscribes to the app's debug samples; returns the unsubscribe function. */
export function subscribeDebugSamples(listener: DebugSampleListener): () => void {
  return debugStream.subscribe(listener);
}
