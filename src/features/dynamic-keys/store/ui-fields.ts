/**
 * Session memory for the dynamic-key fields the firmware does not store (spec D5), keyed by the
 * dynamic key's target location (a mutex's first target). Like the Svelte app's in-memory
 * configurations it lives as long as the page; records are replaced, never mutated.
 */
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { KeyLocation } from '../../device';
import { locationKey } from '../model/configured-keys';
import type { NullBindFields, TapHoldFields, ToggleFields } from '../model/ui-fields';

export interface UiFieldsState {
  readonly tapHold: Readonly<Record<string, TapHoldFields>>;
  readonly toggle: Readonly<Record<string, ToggleFields>>;
  readonly nullBind: Readonly<Record<string, NullBindFields>>;
}

export type UiFieldsKind = keyof UiFieldsState;

const EMPTY: UiFieldsState = Object.freeze({ tapHold: {}, toggle: {}, nullBind: {} });

export const uiFieldsStore = createStore<UiFieldsState>()(() => EMPTY);

function withRecord<T>(
  records: Readonly<Record<string, T>>,
  location: KeyLocation,
  fields: T
): Readonly<Record<string, T>> {
  return { ...records, [locationKey(location)]: fields };
}

function without<T>(
  records: Readonly<Record<string, T>>,
  locations: readonly KeyLocation[]
): Readonly<Record<string, T>> {
  const keys = new Set(locations.map(locationKey));
  return Object.fromEntries(Object.entries(records).filter(([key]) => !keys.has(key)));
}

export const uiFields = {
  setTapHold(location: KeyLocation, fields: TapHoldFields): void {
    uiFieldsStore.setState(state => ({ tapHold: withRecord(state.tapHold, location, fields) }));
  },
  setToggle(location: KeyLocation, fields: ToggleFields): void {
    uiFieldsStore.setState(state => ({ toggle: withRecord(state.toggle, location, fields) }));
  },
  setNullBind(location: KeyLocation, fields: NullBindFields): void {
    uiFieldsStore.setState(state => ({ nullBind: withRecord(state.nullBind, location, fields) }));
  },
  /** Drops the records of deleted dynamic keys. */
  forget(kind: UiFieldsKind, locations: readonly KeyLocation[]): void {
    uiFieldsStore.setState(state => {
      switch (kind) {
        case 'tapHold':
          return { tapHold: without(state.tapHold, locations) };
        case 'toggle':
          return { toggle: without(state.toggle, locations) };
        case 'nullBind':
          return { nullBind: without(state.nullBind, locations) };
      }
    });
  },
  forgetKind(kind: UiFieldsKind): void {
    uiFieldsStore.setState({ [kind]: {} });
  },
  /** Forgets everything (tests). */
  reset(): void {
    uiFieldsStore.setState(EMPTY, true);
  },
};

export function useUiFields<T>(selector: (state: UiFieldsState) => T): T {
  return useStore(uiFieldsStore, selector);
}

export function useTapHoldFields(location: KeyLocation | null): TapHoldFields | undefined {
  const key = location && locationKey(location);
  return useUiFields(state => (key === null ? undefined : state.tapHold[key]));
}

export function useToggleFields(location: KeyLocation | null): ToggleFields | undefined {
  const key = location && locationKey(location);
  return useUiFields(state => (key === null ? undefined : state.toggle[key]));
}

export function useNullBindFields(location: KeyLocation | null): NullBindFields | undefined {
  const key = location && locationKey(location);
  return useUiFields(state => (key === null ? undefined : state.nullBind[key]));
}
