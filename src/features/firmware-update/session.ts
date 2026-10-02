import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

/**
 * Whether a firmware update is under way (spec §8 Update, D3, D18): from the accepted image, or
 * from Settings' confirmed "Enter Bootloader", until the update succeeds, fails or is reset. The
 * keyboard disconnects when it reboots into its bootloader: the shell keeps the Update page, and
 * app updates are not applied (see src/app/update-policy.ts). Kept by the firmware flasher
 * (`./flasher.ts`).
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
