import { useSyncExternalStore } from 'react';
import { firmwareFlasher, type FirmwareFlasher } from './flasher';
import type { FlasherState } from './model/flash-steps';

function subscribe(listener: () => void): () => void {
  return firmwareFlasher().subscribe(listener);
}

function getState(): FlasherState {
  return firmwareFlasher().getState();
}

/** The app's firmware update and its state; it outlives the page (D3). */
export function useFirmwareFlasher(): {
  readonly state: FlasherState;
  readonly flasher: FirmwareFlasher;
} {
  const state = useSyncExternalStore(subscribe, getState);
  return { state, flasher: firmwareFlasher() };
}
