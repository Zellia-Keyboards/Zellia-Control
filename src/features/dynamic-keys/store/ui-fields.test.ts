import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { KeyLocation } from '../../device';
import {
  uiFields,
  uiFieldsStore,
  useNullBindFields,
  useTapHoldFields,
  useToggleFields,
  useUiFields,
} from './ui-fields';

const at = (layer: number, id: number): KeyLocation => ({ layer, id });
const NULL_BIND = { bottomOutMm: 3, actuationMm: 1.5, rtDown: 0.1, rtUp: 0, continuous: false };

afterEach(() => {
  uiFields.reset();
});

describe('dynamic-key UI fields (session memory, D5)', () => {
  it('keeps each kind’s fields per key location', () => {
    uiFields.setTapHold(at(0, 12), { holdDelayMs: 450 });
    uiFields.setToggle(at(1, 12), { trigger: 'release', state: true });
    uiFields.setNullBind(at(0, 31), NULL_BIND);

    const state = uiFieldsStore.getState();
    expect(state.tapHold['0:12']).toEqual({ holdDelayMs: 450 });
    expect(state.tapHold['1:12']).toBeUndefined();
    expect(state.toggle['1:12']).toEqual({ trigger: 'release', state: true });
    expect(state.nullBind['0:31']).toEqual(NULL_BIND);
  });

  it('replaces a key’s record and forgets the given keys', () => {
    uiFields.setTapHold(at(0, 1), { holdDelayMs: 300 });
    uiFields.setTapHold(at(0, 2), { holdDelayMs: 400 });
    uiFields.setTapHold(at(0, 1), { holdDelayMs: 500 });
    uiFields.forget('tapHold', [at(0, 2)]);

    expect(uiFieldsStore.getState().tapHold).toEqual({ '0:1': { holdDelayMs: 500 } });
  });

  it('forgets every record of one kind', () => {
    uiFields.setToggle(at(0, 1), { trigger: 'press', state: true });
    uiFields.setToggle(at(2, 3), { trigger: 'release', state: false });
    uiFields.setTapHold(at(0, 1), { holdDelayMs: 300 });
    uiFields.forgetKind('toggle');

    expect(uiFieldsStore.getState().toggle).toEqual({});
    expect(uiFieldsStore.getState().tapHold).toEqual({ '0:1': { holdDelayMs: 300 } });
  });

  it('forgets the fields of a deleted dynamic key', () => {
    uiFields.setTapHold(at(0, 1), { holdDelayMs: 300 });
    uiFields.setToggle(at(0, 1), { trigger: 'release', state: true });
    uiFields.setNullBind(at(0, 2), NULL_BIND);

    uiFields.forgetDynamicKey({ kind: 'modTap', tap: 4, hold: 5, durationMs: 1, target: at(0, 1) });
    expect(uiFieldsStore.getState().tapHold).toEqual({});
    expect(uiFieldsStore.getState().toggle['0:1']).toBeDefined();

    uiFields.forgetDynamicKey({
      kind: 'mutex',
      bindings: [4, 5],
      mode: 1,
      targets: [at(0, 2), at(0, 3)],
    });
    expect(uiFieldsStore.getState().nullBind).toEqual({});
  });

  it('serves the hooks and follows updates', () => {
    const tapHold = renderHook(() => useTapHoldFields(at(0, 5)));
    const toggle = renderHook(() => useToggleFields(at(0, 5)));
    const nullBind = renderHook(() => useNullBindFields(at(0, 5)));
    const all = renderHook(() => useUiFields(state => state.tapHold));
    expect(tapHold.result.current).toBeUndefined();

    act(() => {
      uiFields.setTapHold(at(0, 5), { holdDelayMs: 250 });
      uiFields.setNullBind(at(0, 5), NULL_BIND);
    });

    expect(tapHold.result.current).toEqual({ holdDelayMs: 250 });
    expect(toggle.result.current).toBeUndefined();
    expect(nullBind.result.current).toEqual(NULL_BIND);
    expect(all.result.current).toEqual({ '0:5': { holdDelayMs: 250 } });
  });

  it('reads nothing without a key', () => {
    uiFields.setTapHold(at(0, 0), { holdDelayMs: 250 });
    expect(renderHook(() => useTapHoldFields(null)).result.current).toBeUndefined();
  });
});
