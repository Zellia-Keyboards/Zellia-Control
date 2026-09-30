import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { createFirmwareFlasher, type FirmwareFlasher } from './flasher';
import type { FlasherState } from './model/flash-steps';

/** A firmware flasher for the lifetime of the component: leaving the page aborts the update. */
export function useFirmwareFlasher(): {
  readonly state: FlasherState;
  readonly flasher: FirmwareFlasher;
} {
  const [flasher] = useState(createFirmwareFlasher);
  useEffect(() => flasher.attach(), [flasher]);
  const subscribe = useCallback((listener: () => void) => flasher.subscribe(listener), [flasher]);
  const getState = useCallback(() => flasher.getState(), [flasher]);
  const state = useSyncExternalStore(subscribe, getState);
  return { state, flasher };
}
