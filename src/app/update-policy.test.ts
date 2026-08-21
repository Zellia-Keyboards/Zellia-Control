import { afterEach, describe, expect, it, vi } from 'vitest';
import { deviceStore } from '../features/device';
import { INITIAL_DEVICE_STATE } from '../features/device/device-store';
import { firmwareUpdateSession, setFirmwareUpdateActive } from '../features/firmware-update';
import { appUpdatePolicy } from './update-policy';

afterEach(() => {
  deviceStore.setState(INITIAL_DEVICE_STATE, true);
  setFirmwareUpdateActive(false);
});

describe('appUpdatePolicy', () => {
  it('is idle only without a keyboard session and without a firmware update', () => {
    expect(appUpdatePolicy.isIdle()).toBe(true);

    deviceStore.setState({ connection: { status: 'connecting' } });
    expect(appUpdatePolicy.isIdle()).toBe(false);

    deviceStore.setState({ connection: { status: 'error', message: 'Keyboard did not respond' } });
    expect(appUpdatePolicy.isIdle()).toBe(true);

    setFirmwareUpdateActive(true);
    expect(appUpdatePolicy.isIdle()).toBe(false);
  });

  it('notifies on device and firmware-update changes until unsubscribed', () => {
    const listener = vi.fn();
    const unsubscribe = appUpdatePolicy.subscribe(listener);

    deviceStore.setState({ connection: { status: 'selecting' } });
    firmwareUpdateSession.setState({ active: true });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    deviceStore.setState({ connection: { status: 'disconnected' } });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
