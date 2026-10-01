import { useState, useSyncExternalStore } from 'react';
import { deviceStore, type DeviceState } from '../../device';

/**
 * Whether the keyboard has just loaded a configuration (a profile switch, a reset): it replaces
 * the configuration while the store is `reloading`, when the session rejects every edit.
 */
function isDeviceLoad(state: DeviceState, previous: DeviceState): boolean {
  return state.reloading && state.config !== previous.config;
}

function createLoadCounter() {
  let loads = 0;
  return {
    subscribe: (onLoad: () => void): (() => void) =>
      deviceStore.subscribe((state, previous) => {
        if (!isDeviceLoad(state, previous)) return;
        loads += 1;
        onLoad();
      }),
    count: () => loads,
  };
}

/**
 * How many configurations the keyboard has loaded while the component is mounted: a `key` for
 * components that start over on every load. Read like the store's slices, so the render that
 * shows a new configuration already has its count.
 */
export function useDeviceLoads(): number {
  const [counter] = useState(createLoadCounter);
  return useSyncExternalStore(counter.subscribe, counter.count);
}
