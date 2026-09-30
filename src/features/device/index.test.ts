import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installVirtualHid, type InstalledVirtualKeyboard } from '../../testing/virtual-keyboard';
import * as device from './index';
import type { DebugSample, DeviceState, DynamicKeyDraft, ModelId } from './index';

let keyboard: InstalledVirtualKeyboard | null = null;

beforeEach(() => {
  for (const method of ['log', 'debug', 'info', 'warn', 'error'] as const) {
    vi.spyOn(console, method).mockImplementation(() => undefined);
  }
});

afterEach(() => {
  device.deviceSession.disconnect();
  keyboard?.uninstall();
  keyboard = null;
  vi.restoreAllMocks();
});

describe('device feature API', () => {
  it('exports exactly the planned values', () => {
    expect(Object.keys(device).sort()).toEqual([
      'createDeviceSession',
      'deviceSession',
      'deviceStore',
      'subscribeDebugSamples',
      'useConnection',
      'useDeviceConfig',
      'useDeviceName',
      'useDeviceStore',
      'useIsReady',
      'useModel',
    ]);
    const model: ModelId = 'zellia-80';
    const draft: DynamicKeyDraft = { kind: 'toggle', target: { layer: 0, id: 1 }, binding: 4 };
    const state: DeviceState = device.deviceStore.getState();
    expect([model, draft.kind, state.connection.status]).toEqual([
      'zellia-80',
      'toggle',
      'disconnected',
    ]);
  });

  it('binds the app session to navigator.hid only when connecting', async () => {
    expect('hid' in navigator).toBe(false);
    await device.deviceSession.connect();
    expect(device.deviceStore.getState().connection).toEqual({
      status: 'error',
      message: 'No compatible keyboards found',
    });

    keyboard = installVirtualHid(navigator, { debugIntervalMs: 5 });
    const ready = renderHook(() => device.useIsReady());
    await act(() => device.deviceSession.connect());
    expect(ready.result.current).toBe(true);
    expect(device.deviceStore.getState().config?.keymap).toEqual(keyboard.state.active.keymap);

    const samples: DebugSample[] = [];
    const unsubscribe = device.subscribeDebugSamples(sample => {
      samples.push(sample);
    });
    device.deviceSession.startDebug(4);
    await vi.waitFor(() => {
      expect(samples.some(sample => sample.keyId === 4)).toBe(true);
    });
    unsubscribe();
    device.deviceSession.stopDebug();

    act(() => {
      device.deviceSession.disconnect();
    });
    expect(ready.result.current).toBe(false);
  });
});
