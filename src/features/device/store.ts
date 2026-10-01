/**
 * Device store and its React hooks. Hooks select slices, so a component re-renders only when its
 * slice changes (snapshots are immutable and replaced, never mutated).
 */
import { useState, useSyncExternalStore } from 'react';
import { useStore } from 'zustand';
import { deviceNameOf, deviceStore, modelOf, type DeviceState } from './device-store';
import { supportsMacros, supportsScripts } from './model/capabilities';
import type { ConnectionState, DeviceConfig, FeatureFlags, ModelInfo } from './model/types';

export {
  INITIAL_DEVICE_STATE,
  createDeviceStore,
  deviceNameOf,
  deviceStore,
  modelOf,
  type DeviceState,
  type DeviceStore,
} from './device-store';

/** Reads a slice of the app's device store. */
export function useDeviceStore<T>(selector: (state: DeviceState) => T): T {
  return useStore(deviceStore, selector);
}

const selectConnection = (state: DeviceState): ConnectionState => state.connection;
const selectConfig = (state: DeviceState): DeviceConfig | null => state.config;
const selectIsReady = (state: DeviceState): boolean => state.connection.status === 'ready';
const selectModel = (state: DeviceState): ModelInfo | null => modelOf(state.connection);
const selectDeviceName = (state: DeviceState): string | null => deviceNameOf(state.connection);
const selectFeature = (state: DeviceState): FeatureFlags | null => state.feature;
const selectSupportsMacros = (state: DeviceState): boolean => supportsMacros(state.feature);
const selectSupportsScripts = (state: DeviceState): boolean => supportsScripts(state.feature);

export function useConnection(): ConnectionState {
  return useDeviceStore(selectConnection);
}

/** The loaded configuration; null until the first successful load. */
export function useDeviceConfig(): DeviceConfig | null {
  return useDeviceStore(selectConfig);
}

export function useIsReady(): boolean {
  return useDeviceStore(selectIsReady);
}

export function useModel(): ModelInfo | null {
  return useDeviceStore(selectModel);
}

export function useDeviceName(): string | null {
  return useDeviceStore(selectDeviceName);
}

/** The connected keyboard's feature flags; null until the first load. */
export function useFeatureFlags(): FeatureFlags | null {
  return useDeviceStore(selectFeature);
}

/** Whether the connected keyboard's controller declares macros. */
export function useSupportsMacros(): boolean {
  return useDeviceStore(selectSupportsMacros);
}

/** Whether the connected keyboard's controller declares scripts. */
export function useSupportsScripts(): boolean {
  return useDeviceStore(selectSupportsScripts);
}

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
 * components whose drafts start over on every load (Lighting, Macros, Scripts). Read like the
 * store's slices, so the render that shows a new configuration already has its count.
 */
export function useDeviceLoads(): number {
  const [counter] = useState(createLoadCounter);
  return useSyncExternalStore(counter.subscribe, counter.count);
}
