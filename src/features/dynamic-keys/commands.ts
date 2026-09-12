/**
 * The editors' delete and "Reset All" commands: the device command, then the session memory
 * forgets the UI-only fields (spec D5) of exactly what it removed. A rejected command (e.g. while
 * the keyboard reloads after a profile switch) removes nothing, so the fields stay.
 */
import { deviceSession, deviceStore, type KeyLocation } from '../device';
import { dynamicKeyAt, dynamicKeyOfKindAt, type ConfiguredKind } from './model/configured-keys';
import { uiFields } from './store/ui-fields';

function removing(command: () => void): void {
  const before = deviceStore.getState().config;
  command();
  uiFields.forgetRemoved(before, deviceStore.getState().config);
}

/**
 * Removes the dynamic key (of `kind`, when given) that the key at `location` runs, if any. It is
 * looked up now: slots move when others are freed, so a slot is never kept across commands.
 */
export function removeDynamicKeyAt(location: KeyLocation, kind?: ConfiguredKind): void {
  const { config } = deviceStore.getState();
  const found = kind ? dynamicKeyOfKindAt(config, location, kind) : dynamicKeyAt(config, location);
  if (!found) return;
  removing(() => {
    deviceSession.removeDynamicKey(found.slot);
  });
}

/** Removes every dynamic key of `kind` (the tap-hold and toggle editors' "Reset All"). */
export function removeDynamicKeysOfKind(kind: ConfiguredKind): void {
  removing(() => {
    deviceSession.removeDynamicKeysOfKind(kind);
  });
}
