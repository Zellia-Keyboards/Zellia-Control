import { act, render, renderHook } from '@testing-library/react';
import { RGBBaseMode, ScriptLevel } from 'emi-keyboard-controller';
import { afterEach, describe, expect, it } from 'vitest';
import type { DeviceConfig, FeatureFlags, ModelInfo } from './model/types';
import {
  INITIAL_DEVICE_STATE,
  createDeviceStore,
  deviceNameOf,
  deviceStore,
  modelOf,
  useConnection,
  useDeviceConfig,
  useDeviceLoads,
  useDeviceName,
  useDeviceStore,
  useFeatureFlags,
  useIsReady,
  useModel,
  useSupportsMacros,
  useSupportsScripts,
} from './store';

const MODEL: ModelInfo = {
  id: 'zellia-starlight',
  displayName: 'Zellia Starlight',
  layoutJson: '[]',
  layoutLabels: [],
};

const TRINITY_FEATURE: FeatureFlags = {
  advancedKeys: true,
  rgb: true,
  scriptLevel: ScriptLevel.AOT,
  pollingRate: 8000,
  macroSlots: 4,
  macroActions: 128,
  bootloader: { enabled: false, download: false, upload: false },
};

const CONFIG: DeviceConfig = {
  advancedKeys: [],
  keymap: [],
  rgbBase: {
    mode: RGBBaseMode.RgbBaseModeOff,
    color: { red: 0, green: 0, blue: 0 },
    secondaryColor: { red: 0, green: 0, blue: 0 },
    speed: 0,
    direction: 0,
    density: 0,
    brightness: 0,
  },
  rgbKeys: [],
  dynamicKeys: [],
  profileIndex: 0,
  profileCount: 1,
  macros: [],
  script: null,
};

afterEach(() => {
  deviceStore.setState(INITIAL_DEVICE_STATE, true);
});

describe('device store', () => {
  it('starts disconnected with no data', () => {
    expect(createDeviceStore().getState()).toEqual({
      connection: { status: 'disconnected' },
      config: null,
      feature: null,
      firmware: null,
      reloading: false,
      saving: false,
      unsaved: false,
      lastError: null,
    });
  });

  it('creates independent stores', () => {
    const first = createDeviceStore();
    const second = createDeviceStore();
    first.setState({ saving: true });
    expect(second.getState().saving).toBe(false);
  });

  it('exposes the model while loading and when ready', () => {
    expect(modelOf({ status: 'loading', model: MODEL, deviceName: 'x' })).toBe(MODEL);
    expect(modelOf({ status: 'ready', model: MODEL, deviceName: 'x' })).toBe(MODEL);
    expect(modelOf({ status: 'connecting' })).toBeNull();
    expect(modelOf({ status: 'error', message: 'no' })).toBeNull();
  });

  it('exposes the device name while loading and when ready', () => {
    expect(deviceNameOf({ status: 'loading', model: MODEL, deviceName: 'ZelliaKB' })).toBe(
      'ZelliaKB'
    );
    expect(deviceNameOf({ status: 'ready', model: MODEL, deviceName: 'Zellia 80 HE' })).toBe(
      'Zellia 80 HE'
    );
    expect(deviceNameOf({ status: 'selecting' })).toBeNull();
    expect(deviceNameOf({ status: 'disconnected' })).toBeNull();
  });

  it('keeps the initial state immutable', () => {
    expect(Object.isFrozen(INITIAL_DEVICE_STATE)).toBe(true);
    expect(Object.isFrozen(INITIAL_DEVICE_STATE.connection)).toBe(true);
    const store = createDeviceStore();
    store.setState({ saving: true });
    expect(INITIAL_DEVICE_STATE.saving).toBe(false);
  });
});

describe('hooks', () => {
  it('select slices of the app store and follow its updates', () => {
    const connection = renderHook(() => useConnection());
    const ready = renderHook(() => useIsReady());
    const model = renderHook(() => useModel());
    const name = renderHook(() => useDeviceName());
    const config = renderHook(() => useDeviceConfig());
    expect(connection.result.current).toEqual({ status: 'disconnected' });
    expect([ready.result.current, model.result.current, name.result.current]).toEqual([
      false,
      null,
      null,
    ]);

    act(() => {
      deviceStore.setState({
        connection: { status: 'ready', model: MODEL, deviceName: 'ZelliaKB' },
      });
    });
    expect(ready.result.current).toBe(true);
    expect(model.result.current).toBe(MODEL);
    expect(name.result.current).toBe('ZelliaKB');
    expect(config.result.current).toBeNull();
  });

  it('only re-render components whose selected slice changed', () => {
    let renders = 0;
    function ReadyFlag() {
      renders += 1;
      const ready = useIsReady();
      return <span>{ready ? 'ready' : 'idle'}</span>;
    }
    const view = render(<ReadyFlag />);
    expect(renders).toBe(1);

    act(() => {
      deviceStore.setState({ lastError: { operation: 'save', message: 'failed' } });
    });
    expect(renders).toBe(1);

    act(() => {
      deviceStore.setState({ connection: { status: 'ready', model: MODEL, deviceName: 'x' } });
    });
    expect(renders).toBe(2);
    expect(view.container.textContent).toBe('ready');
  });

  it('accepts arbitrary selectors', () => {
    const saving = renderHook(() => useDeviceStore(state => state.saving));
    expect(saving.result.current).toBe(false);
    act(() => {
      deviceStore.setState({ saving: true });
    });
    expect(saving.result.current).toBe(true);
  });

  it('tell what the connected keyboard supports', () => {
    const feature = renderHook(() => useFeatureFlags());
    const macros = renderHook(() => useSupportsMacros());
    const scripts = renderHook(() => useSupportsScripts());
    expect([feature.result.current, macros.result.current, scripts.result.current]).toEqual([
      null,
      false,
      false,
    ]);

    act(() => {
      deviceStore.setState({ feature: TRINITY_FEATURE });
    });
    expect(feature.result.current).toBe(TRINITY_FEATURE);
    expect([macros.result.current, scripts.result.current]).toEqual([true, true]);
  });

  it('count the configurations the keyboard loads while mounted (useDeviceLoads)', () => {
    const loads = renderHook(() => useDeviceLoads());
    expect(loads.result.current).toBe(0);
    act(() => {
      deviceStore.setState({ reloading: true });
    });
    expect(loads.result.current).toBe(0);
    // A load replaces the configuration while the store is reloading.
    act(() => {
      deviceStore.setState({ config: CONFIG });
    });
    expect(loads.result.current).toBe(1);
    // An edit afterwards is no load.
    act(() => {
      deviceStore.setState({ reloading: false, config: { ...CONFIG, profileCount: 2 } });
    });
    expect(loads.result.current).toBe(1);
  });
});
