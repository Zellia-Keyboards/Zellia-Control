/**
 * The device store without React: a Zustand vanilla store of immutable snapshots, written only by
 * DeviceSession. React hooks live in `store.ts`, so the session stays framework-agnostic.
 */
import { createStore, type StoreApi } from 'zustand/vanilla';
import type {
  ConnectionState,
  DeviceConfig,
  DeviceError,
  FeatureFlags,
  FirmwareVersion,
  ModelInfo,
} from './model/types';

export interface DeviceState {
  readonly connection: ConnectionState;
  /** Null until the first successful load. */
  readonly config: DeviceConfig | null;
  readonly feature: FeatureFlags | null;
  readonly firmware: FirmwareVersion | null;
  /** `updateDataStart` … `updateDataEnd` (from the request on, for profile switches). */
  readonly reloading: boolean;
  readonly saving: boolean;
  /**
   * An edit changed the configuration since the keyboard last loaded or saved it: Save has
   * something to store (lighting edits are not even on the keyboard before it).
   */
  readonly unsaved: boolean;
  readonly lastError: DeviceError | null;
}

export type DeviceStore = StoreApi<DeviceState>;

export const INITIAL_DEVICE_STATE: DeviceState = Object.freeze({
  connection: Object.freeze({ status: 'disconnected' }),
  config: null,
  feature: null,
  firmware: null,
  reloading: false,
  saving: false,
  unsaved: false,
  lastError: null,
});

export function createDeviceStore(): DeviceStore {
  return createStore<DeviceState>()(() => INITIAL_DEVICE_STATE);
}

/** The app's device store, written by `deviceSession`. */
export const deviceStore: DeviceStore = createDeviceStore();

/** The connected model, known from `loading` on. */
export function modelOf(connection: ConnectionState): ModelInfo | null {
  return connection.status === 'loading' || connection.status === 'ready' ? connection.model : null;
}

/** The connected device's product name (or the model name), known from `loading` on. */
export function deviceNameOf(connection: ConnectionState): string | null {
  return connection.status === 'loading' || connection.status === 'ready'
    ? connection.deviceName
    : null;
}
