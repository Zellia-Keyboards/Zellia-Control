import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

/**
 * Whether a firmware update is in progress. While active, the shell keeps the Update page
 * mounted even though the keyboard disconnects when it reboots into its bootloader, and app
 * updates are not applied (see src/app/update-policy.ts).
 */
export interface FirmwareUpdateSessionState {
  readonly active: boolean;
}

export const firmwareUpdateSession = createStore<FirmwareUpdateSessionState>()(() => ({
  active: false,
}));

export function setFirmwareUpdateActive(active: boolean): void {
  firmwareUpdateSession.setState({ active });
}

export function useFirmwareUpdateSession(): FirmwareUpdateSessionState {
  return useStore(firmwareUpdateSession);
}
