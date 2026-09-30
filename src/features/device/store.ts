/**
 * Device store and its React hooks. Hooks select slices, so a component re-renders only when its
 * slice changes (snapshots are immutable and replaced, never mutated).
 */
import { useStore } from 'zustand';
import { deviceNameOf, deviceStore, modelOf, type DeviceState } from './device-store';
import type { ConnectionState, DeviceConfig, ModelInfo } from './model/types';

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
