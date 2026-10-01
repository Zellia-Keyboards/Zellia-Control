/**
 * Session memory for the dynamic-key fields the firmware does not store (spec D5), keyed by the
 * dynamic key's target location (a mutex's first target). Like the Svelte app's in-memory
 * configurations it lives as long as the page; records are replaced, never mutated.
 */
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { DeviceConfig, KeyLocation } from '../../device';
import {
  dynamicKeyOfKindAt,
  locationKey,
  type ConfiguredDynamicKey,
} from '../model/configured-keys';
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

interface Memory {
  readonly kind: UiFieldsKind;
  readonly location: KeyLocation;
}

/** Where a dynamic key's fields are stored: their record and key (a mutex's first key). */
function memoryOf(dynamicKey: ConfiguredDynamicKey): Memory | null {
  switch (dynamicKey.kind) {
    case 'stroke':
      return null;
    case 'modTap':
      return dynamicKey.target && { kind: 'tapHold', location: dynamicKey.target };
    case 'toggle':
      return dynamicKey.target && { kind: 'toggle', location: dynamicKey.target };
    case 'mutex': {
      const [first] = dynamicKey.targets;
      return first && { kind: 'nullBind', location: first };
    }
  }
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
  /** Drops the fields of a deleted dynamic key (a mutex's are under its first key). */
  forgetDynamicKey(dynamicKey: ConfiguredDynamicKey): void {
    const memory = memoryOf(dynamicKey);
    if (memory) uiFields.forget(memory.kind, [memory.location]);
  },
  /**
   * After a command that removes dynamic keys (delete, reset all): drops the fields of the dynamic
   * keys `before` had that no longer run on their key in `after`. A rejected command (e.g. while
   * the keyboard reloads) leaves the snapshot as it was, and without a snapshot (disconnected)
   * nothing is known: then the fields stay with their dynamic keys.
   */
  forgetRemoved(before: DeviceConfig | null, after: DeviceConfig | null): void {
    if (!before || !after || before === after) return;
    for (const dynamicKey of before.dynamicKeys) {
      if (dynamicKey.kind === 'none') continue;
      const memory = memoryOf(dynamicKey);
      if (memory && !dynamicKeyOfKindAt(after, memory.location, dynamicKey.kind)) {
        uiFields.forget(memory.kind, [memory.location]);
      }
    }
  },
  /** Forgets everything (tests). */
  reset(): void {
    uiFieldsStore.setState(EMPTY, true);
  },
};

export function useUiFields<T>(selector: (state: UiFieldsState) => T): T {
  return useStore(uiFieldsStore, selector);
}
