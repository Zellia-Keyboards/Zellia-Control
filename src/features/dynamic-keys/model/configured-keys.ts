/**
 * The keyboard's dynamic keys as the editors and "configured keys" tables see them (spec D5,
 * PL-009): always derived from the device snapshot, whose targets the device layer rebuilds from
 * the keymap (D4). Slot numbers change when slots are freed, so callers look dynamic keys up
 * again for every command instead of keeping a slot.
 */
import type {
  DeviceConfig,
  DynamicKeyKind,
  DynamicKeySlot,
  KeyLocation,
  Keycode,
} from '../../device';
import { dynamicKeySlotOf } from '../../keycodes';

export type ConfiguredKind = Exclude<DynamicKeyKind, 'none'>;
export type DynamicKeyOf<K extends ConfiguredKind> = Extract<DynamicKeySlot, { kind: K }>;
export type ConfiguredDynamicKey = DynamicKeyOf<ConfiguredKind>;

/** Map key for a key location: `layer:id`. */
export function locationKey(location: KeyLocation): string {
  return `${location.layer}:${location.id}`;
}

export function sameLocation(a: KeyLocation | null, b: KeyLocation | null): boolean {
  return a === b || (a !== null && b !== null && a.layer === b.layer && a.id === b.id);
}

export interface DynamicKeyRef<D extends ConfiguredDynamicKey = ConfiguredDynamicKey> {
  readonly slot: number;
  readonly dynamicKey: D;
}

/** The dynamic key the key at `location` runs: its keymap entry is `DynamicKey | slot << 8`. */
export function dynamicKeyAt(
  config: DeviceConfig | null,
  location: KeyLocation | null
): DynamicKeyRef | null {
  if (!config || !location) return null;
  const keycode = config.keymap[location.layer]?.[location.id];
  const slot = keycode === undefined ? null : dynamicKeySlotOf(keycode);
  const dynamicKey = slot === null ? undefined : config.dynamicKeys[slot];
  if (slot === null || !dynamicKey || dynamicKey.kind === 'none') return null;
  return { slot, dynamicKey };
}

function isKind<K extends ConfiguredKind>(
  dynamicKey: DynamicKeySlot,
  kind: K
): dynamicKey is DynamicKeyOf<K> {
  return dynamicKey.kind === kind;
}

/** Like {@link dynamicKeyAt}, for one kind of dynamic key. */
export function dynamicKeyOfKindAt<K extends ConfiguredKind>(
  config: DeviceConfig | null,
  location: KeyLocation | null,
  kind: K
): DynamicKeyRef<DynamicKeyOf<K>> | null {
  const found = dynamicKeyAt(config, location);
  if (!found) return null;
  const { slot, dynamicKey } = found;
  return isKind(dynamicKey, kind) ? { slot, dynamicKey } : null;
}

/** Kinds that run on one key. */
export type SingleKeyKind = Exclude<ConfiguredKind, 'mutex'>;
type SingleKeyDynamicKey = DynamicKeyOf<SingleKeyKind>;

function isSingleKeyOfKind<K extends SingleKeyKind>(
  dynamicKey: DynamicKeySlot,
  kind: K
): dynamicKey is DynamicKeyOf<K> & SingleKeyDynamicKey {
  return dynamicKey.kind === kind;
}

function targetOf(dynamicKey: SingleKeyDynamicKey): KeyLocation | null {
  return dynamicKey.target;
}

export interface ConfiguredKey<K extends SingleKeyKind> {
  readonly slot: number;
  readonly target: KeyLocation;
  readonly dynamicKey: DynamicKeyOf<K>;
}

/**
 * The Svelte order of tap-hold, toggle and null-bind keys: it kept their configurations in an
 * object keyed by key id, and integer keys enumerate in ascending order. (A key configured on two
 * layers was one entry there; here each layer has its own, in layer order.)
 */
function byKey(a: { readonly target: KeyLocation }, b: { readonly target: KeyLocation }): number {
  return a.target.id - b.target.id || a.target.layer - b.target.layer;
}

/**
 * The dynamic keys of one single-key kind that a key runs, in the Svelte lists' order: tap-hold
 * and toggle keys by key ({@link byKey}), DKS keys in slot order (see {@link tableOrder}).
 * Dynamic keys without a key (their key was remapped) do nothing and are left out.
 */
export function configuredKeys<K extends SingleKeyKind>(
  dynamicKeys: readonly DynamicKeySlot[],
  kind: K
): ConfiguredKey<K>[] {
  const list = dynamicKeys.flatMap((dynamicKey, slot) => {
    if (!isSingleKeyOfKind(dynamicKey, kind)) return [];
    const target = targetOf(dynamicKey);
    return target ? [{ slot, target, dynamicKey }] : [];
  });
  return kind === 'stroke' ? list : list.sort(byKey);
}

export interface ConfiguredMutex {
  readonly slot: number;
  /** In keymap scan order: the first is the key the UI-only fields are stored under (D5). */
  readonly targets: readonly [KeyLocation, KeyLocation];
  readonly dynamicKey: DynamicKeyOf<'mutex'>;
}

/** The mutexes (null binds) with both of their keys, in slot order. */
export function configuredMutexes(dynamicKeys: readonly DynamicKeySlot[]): ConfiguredMutex[] {
  return dynamicKeys.flatMap((dynamicKey, slot) => {
    if (!isKind(dynamicKey, 'mutex')) return [];
    const [first, second] = dynamicKey.targets;
    return first && second ? [{ slot, targets: [first, second] as const, dynamicKey }] : [];
  });
}

export interface DashboardRow {
  /** Unique per key: {@link locationKey} of the row's key. */
  readonly id: string;
  readonly slot: number;
  readonly target: KeyLocation;
  readonly dynamicKey: ConfiguredDynamicKey;
}

/**
 * The Svelte table's order. It listed an object of configurations in key order: tap-hold, toggle
 * and null-bind entries were keyed by key id ({@link byKey}), DKS entries by `layer,key` (string
 * keys, after them, in the order they were first added). Its sort by key name kept that order,
 * every name being "Unknown". DKS rows are in slot order here: a new dynamic key takes the slot
 * after the last one in use, so the two orders agree until a delete moves the last dynamic key
 * down into the freed slot (deviation PL-040).
 */
function tableOrder(a: DashboardRow, b: DashboardRow): number {
  const aStroke = a.dynamicKey.kind === 'stroke';
  const bStroke = b.dynamicKey.kind === 'stroke';
  if (aStroke !== bStroke) return aStroke ? 1 : -1;
  return aStroke ? a.slot - b.slot : byKey(a, b);
}

/**
 * Rows of the dashboard's configured-keys table, in the Svelte table's order: one per configured
 * key, as the Svelte table listed one entry per key (a mutex has a row for each of its two keys).
 */
export function dashboardRows(dynamicKeys: readonly DynamicKeySlot[]): DashboardRow[] {
  const rows = dynamicKeys.flatMap((dynamicKey, slot): DashboardRow[] => {
    switch (dynamicKey.kind) {
      case 'none':
        return [];
      case 'mutex': {
        const [first, second] = dynamicKey.targets;
        if (!first || !second) return [];
        return [first, second].map(target => ({
          id: locationKey(target),
          slot,
          target,
          dynamicKey,
        }));
      }
      case 'stroke':
      case 'modTap':
      case 'toggle': {
        const { target } = dynamicKey;
        return target ? [{ id: locationKey(target), slot, target, dynamicKey }] : [];
      }
    }
  });
  return rows.sort(tableOrder);
}

/**
 * A dynamic key's content as a string, equal for equal content: editors reload their draft when
 * it changes (a device reload creates new but often equal objects).
 */
export function dynamicKeySignature(dynamicKey: ConfiguredDynamicKey | null): string {
  if (!dynamicKey) return '';
  const location = (target: KeyLocation | null) => (target ? locationKey(target) : '-');
  switch (dynamicKey.kind) {
    case 'stroke': {
      const { pressBegin, pressFully, releaseBegin, releaseFully } = dynamicKey.distances;
      return [
        'stroke',
        ...dynamicKey.bindings,
        ...dynamicKey.keyControl,
        pressBegin,
        pressFully,
        releaseBegin,
        releaseFully,
        location(dynamicKey.target),
      ].join(',');
    }
    case 'modTap':
      return [
        'modTap',
        dynamicKey.tap,
        dynamicKey.hold,
        dynamicKey.durationMs,
        location(dynamicKey.target),
      ].join(',');
    case 'toggle':
      return ['toggle', dynamicKey.binding, location(dynamicKey.target)].join(',');
    case 'mutex':
      return [
        'mutex',
        ...dynamicKey.bindings,
        dynamicKey.mode,
        ...dynamicKey.targets.map(location),
      ].join(',');
  }
}

/** The keycode `dynamicKey` gives back to `location` when it is removed (mutex: per key). */
function bindingFor(dynamicKey: ConfiguredDynamicKey, location: KeyLocation): Keycode {
  switch (dynamicKey.kind) {
    case 'stroke':
      return dynamicKey.bindings[0];
    case 'modTap':
      return dynamicKey.tap;
    case 'toggle':
      return dynamicKey.binding;
    case 'mutex':
      return sameLocation(location, dynamicKey.targets[1])
        ? dynamicKey.bindings[1]
        : dynamicKey.bindings[0];
  }
}

/**
 * The key's own keycode: its keymap entry, or, when it runs a dynamic key, the binding that
 * dynamic key would give it back (what the Svelte null-bind editor meant to read from the keymap).
 */
export function ownBinding(config: DeviceConfig | null, location: KeyLocation): Keycode {
  const keycode = config?.keymap[location.layer]?.[location.id];
  if (keycode === undefined) return 0;
  if (dynamicKeySlotOf(keycode) === null) return keycode;
  const found = dynamicKeyAt(config, location);
  return found ? bindingFor(found.dynamicKey, location) : 0;
}
