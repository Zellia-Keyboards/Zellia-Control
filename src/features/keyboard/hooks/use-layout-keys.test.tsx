import { act, renderHook } from '@testing-library/react';
import { ZelliaStarlightController } from 'emi-keyboard-controller';
import { afterEach, describe, expect, it } from 'vitest';
import { deviceStore, type ModelInfo } from '../../device';
import { INITIAL_DEVICE_STATE } from '../../device/device-store';
import { DEFAULT_LAYOUT_OPTIONS } from '../model';
import { layoutOptionsStore, setLayoutOptions } from '../store/layout-options';
import { useLayoutKeys } from './use-layout-keys';

function connectStarlight(): ModelInfo {
  const controller = new ZelliaStarlightController();
  const model: ModelInfo = {
    id: 'zellia-starlight',
    displayName: 'Zellia Starlight',
    layoutJson: controller.get_layout_json(),
    layoutLabels: controller.get_layout_labels(),
  };
  deviceStore.setState({ connection: { status: 'ready', model, deviceName: 'ZelliaKB' } });
  return model;
}

afterEach(() => {
  deviceStore.setState(INITIAL_DEVICE_STATE, true);
  layoutOptionsStore.setState(DEFAULT_LAYOUT_OPTIONS, true);
});

describe('useLayoutKeys', () => {
  it('is null while no keyboard is connected', () => {
    const { result } = renderHook(() => useLayoutKeys());
    expect(result.current).toBeNull();
  });

  it('parses the connected layout and follows the Layout dropdown variants', () => {
    connectStarlight();
    const { result } = renderHook(() => useLayoutKeys());
    const standard = result.current;
    if (!standard) throw new Error('expected layout keys');

    expect(standard.visible.length).toBeLessThan(standard.all.length);
    const splitBackspaceIds = (keys: typeof standard.visible) =>
      keys.filter(key => key.layoutGroup?.groupId === 0).map(key => key.id);
    expect(splitBackspaceIds(standard.visible)).toEqual([13]);

    act(() => {
      setLayoutOptions({ splitBackspace: true });
    });

    expect(result.current?.all).toBe(standard.all);
    expect(splitBackspaceIds(result.current?.visible ?? [])).toEqual([14, 15]);
  });
});
