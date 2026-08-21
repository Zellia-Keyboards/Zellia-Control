import { deviceStore } from '../features/device';
import { firmwareUpdateSession } from '../features/firmware-update';
import type { UpdatePolicy } from '../lib/pwa';

/**
 * App updates are applied only when a reload interrupts nothing: no keyboard session (connecting,
 * loading or connected) and no firmware update in progress.
 */
export const appUpdatePolicy: UpdatePolicy = {
  isIdle() {
    const { status } = deviceStore.getState().connection;
    const noKeyboard = status === 'disconnected' || status === 'error';
    return noKeyboard && !firmwareUpdateSession.getState().active;
  },
  subscribe(listener) {
    const stopDevice = deviceStore.subscribe(listener);
    const stopFirmware = firmwareUpdateSession.subscribe(listener);
    return () => {
      stopDevice();
      stopFirmware();
    };
  },
};
