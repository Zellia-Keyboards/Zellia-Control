/**
 * Dynamic-key placement (spec §6.4, D4–D6), as pure functions over the keymap and the slot list.
 *
 * The keymap is the source of truth: a key whose entry is `DynamicKey | slot << 8` runs that
 * slot. Device reads do not return targets, so they are rebuilt from those entries (upstream
 * `mapBackDynamicKey`), scanning layer-major with ascending key ids: single-key dynamic keys take
 * their first reference, a mutex its first two. Every change keeps two invariants:
 *
 * - A dynamic key that loses its key(s) is released, and the keys it still held get their own
 *   binding back.
 * - The slots in use are contiguous from 0. libamp's `dynamic_key_process()` and
 *   `dynamic_key_add_to_report()` stop at the first empty slot, and `keyboard_event_handler()`
 *   ignores `DynamicKey` keycodes, so a dynamic key behind an empty slot does nothing at all.
 *   When a change leaves a gap, the highest slots in use move down into it (their keys follow),
 *   so slot numbers are not stable across changes.
 */
import type { DynamicKeyMutexMode } from 'emi-keyboard-controller';
import { assertMutexMode, swapMutexKeyPriority } from './mutex-mode';
import type { DynamicKeySlot, KeyLocation, Keycode, Keymap, StrokeDistances } from './types';
import { assertFraction, assertUint, isEqual } from './validation';

export const DYNAMIC_KEY_KEYCODE = 0xa7;
const NO_KEYCODE: Keycode = 0x00;
const MAX_KEYCODE = 0xffff;
const MAX_DURATION_MS = 0xffffffff;
const NONE: DynamicKeySlot = { kind: 'none' };

export type DynamicKeyDraft =
  | {
      readonly kind: 'stroke';
      readonly target: KeyLocation;
      readonly bindings: readonly [Keycode, Keycode, Keycode, Keycode];
      readonly keyControl: readonly [number, number, number, number];
      readonly distances: StrokeDistances;
    }
  | {
      readonly kind: 'modTap';
      readonly target: KeyLocation;
      readonly tap: Keycode;
      readonly hold: Keycode;
      readonly durationMs: number;
    }
  | { readonly kind: 'toggle'; readonly target: KeyLocation; readonly binding: Keycode }
  | {
      readonly kind: 'mutex';
      readonly targets: readonly [KeyLocation, KeyLocation];
      readonly bindings: readonly [Keycode, Keycode];
      /** libamp's mode byte: priority plus bottom-out flag (see `mutex-mode.ts`). */
      readonly mode: DynamicKeyMutexMode;
    };

export interface KeymapEntry {
  readonly layer: number;
  readonly id: number;
  readonly keycode: Keycode;
}

export interface DynamicKeyChange {
  readonly keymap: Keymap;
  readonly slots: readonly DynamicKeySlot[];
  /** Slots whose content (kind, settings or targets) changed: one dynamic-key packet each. */
  readonly changedSlots: readonly number[];
  /** Keymap entries that changed, in scan order. */
  readonly changedKeymapEntries: readonly KeymapEntry[];
}

export interface DynamicKeyBinding extends DynamicKeyChange {
  /** The slot the draft was written to. */
  readonly slot: number;
}

export function dynamicKeyKeycode(slot: number): Keycode {
  return DYNAMIC_KEY_KEYCODE | (slot << 8);
}

export function dynamicKeySlotOfKeycode(keycode: Keycode): number | null {
  return (keycode & 0xff) === DYNAMIC_KEY_KEYCODE ? (keycode >> 8) & 0xff : null;
}

// ---------------------------------------------------------------------------------------------
// Helpers

function sameLocation(a: KeyLocation | null, b: KeyLocation | null): boolean {
  return a === b || (a !== null && b !== null && a.layer === b.layer && a.id === b.id);
}

function compareLocations(a: KeyLocation, b: KeyLocation): number {
  return a.layer - b.layer || a.id - b.id;
}

function keycodeAt(keymap: Keymap, location: KeyLocation): Keycode | undefined {
  return keymap[location.layer]?.[location.id];
}

function isKeymapLocation(keymap: Keymap, location: KeyLocation): boolean {
  const layer = Number.isInteger(location.layer) ? keymap[location.layer] : undefined;
  return (
    layer !== undefined &&
    Number.isInteger(location.id) &&
    location.id >= 0 &&
    location.id < layer.length
  );
}

function assertLocation(keymap: Keymap, location: KeyLocation): void {
  if (!isKeymapLocation(keymap, location)) {
    throw new RangeError(`Key ${location.id} on layer ${location.layer} is outside the keymap`);
  }
}

function copyKeymap(keymap: Keymap): Keycode[][] {
  return keymap.map(layer => [...layer]);
}

function setKeycode(keymap: Keycode[][], location: KeyLocation, keycode: Keycode): void {
  const layer = keymap[location.layer];
  if (layer && location.id < layer.length) layer[location.id] = keycode;
}

/** Keys referencing each slot, in scan order. */
function referencesBySlot(keymap: Keymap, slotCount: number): Map<number, KeyLocation[]> {
  const references = new Map<number, KeyLocation[]>();
  keymap.forEach((layer, layerIndex) => {
    layer.forEach((keycode, id) => {
      const slot = dynamicKeySlotOfKeycode(keycode);
      if (slot === null || slot >= slotCount) return;
      const list = references.get(slot) ?? [];
      list.push({ layer: layerIndex, id });
      references.set(slot, list);
    });
  });
  return references;
}

function withTargets(slot: DynamicKeySlot, references: readonly KeyLocation[]): DynamicKeySlot {
  const [first = null, second = null] = references;
  switch (slot.kind) {
    case 'none':
      return slot;
    case 'stroke':
    case 'modTap':
    case 'toggle':
      return sameLocation(slot.target, first) ? slot : { ...slot, target: first };
    case 'mutex':
      return sameLocation(slot.targets[0], first) && sameLocation(slot.targets[1], second)
        ? slot
        : { ...slot, targets: [first, second] };
  }
}

function isIncomplete(slot: DynamicKeySlot): boolean {
  switch (slot.kind) {
    case 'none':
      return false;
    case 'stroke':
    case 'modTap':
    case 'toggle':
      return slot.target === null;
    case 'mutex':
      return slot.targets[0] === null || slot.targets[1] === null;
  }
}

/** The keycode a key gets back when `slot` no longer runs on it (mutex: per key). */
function bindingFor(slot: DynamicKeySlot, location: KeyLocation): Keycode {
  switch (slot.kind) {
    case 'none':
      return NO_KEYCODE;
    case 'stroke':
      return slot.bindings[0];
    case 'modTap':
      return slot.tap;
    case 'toggle':
      return slot.binding;
    case 'mutex':
      return sameLocation(location, slot.targets[1]) ? slot.bindings[1] : slot.bindings[0];
  }
}

function diffKeymap(before: Keymap, after: Keymap): KeymapEntry[] {
  const changes: KeymapEntry[] = [];
  after.forEach((layer, layerIndex) => {
    layer.forEach((keycode, id) => {
      if (before[layerIndex]?.[id] !== keycode) changes.push({ layer: layerIndex, id, keycode });
    });
  });
  return changes;
}

function diffSlots(before: readonly DynamicKeySlot[], after: readonly DynamicKeySlot[]): number[] {
  return after.flatMap((slot, index) => {
    const previous = before[index];
    return previous && isEqual(previous, slot) ? [] : [index];
  });
}

function finish(
  keymap: Keymap,
  slots: readonly DynamicKeySlot[],
  nextKeymap: Keymap,
  nextSlots: readonly DynamicKeySlot[]
): DynamicKeyChange {
  const changedKeymapEntries = diffKeymap(keymap, nextKeymap);
  const changedSlots = diffSlots(slots, nextSlots);
  return {
    keymap: changedKeymapEntries.length > 0 ? nextKeymap : keymap,
    slots: changedSlots.length > 0 ? nextSlots : slots,
    changedSlots,
    changedKeymapEntries,
  };
}

/** Gives the keys `slot` runs on their own binding back (from `original`) and frees it. */
function release(
  keymap: Keycode[][],
  slots: DynamicKeySlot[],
  original: DynamicKeySlot,
  slot: number
): void {
  for (const location of referencesBySlot(keymap, slots.length).get(slot) ?? []) {
    setKeycode(keymap, location, bindingFor(original, location));
  }
  slots[slot] = NONE;
}

/**
 * Moves the highest slots in use into empty lower slots until the slots in use are contiguous
 * from 0 (see the file comment). Keys follow their dynamic key; keys still pointing at an empty
 * slot are cleared before a dynamic key moves into it. Returns the moves (`from → to`).
 */
function compact(keymap: Keycode[][], slots: DynamicKeySlot[]): Map<number, number> {
  const moves = new Map<number, number>();
  for (;;) {
    const gap = slots.findIndex(slot => slot.kind === 'none');
    const last = slots.findLastIndex(slot => slot.kind !== 'none');
    if (gap < 0 || last < gap) return moves;
    const references = referencesBySlot(keymap, slots.length);
    for (const location of references.get(gap) ?? []) setKeycode(keymap, location, NO_KEYCODE);
    for (const location of references.get(last) ?? []) {
      setKeycode(keymap, location, dynamicKeyKeycode(gap));
    }
    slots[gap] = slots[last] ?? NONE;
    slots[last] = NONE;
    moves.set(last, gap);
  }
}

/** Releases candidates that no longer have all their keys after an edit. */
function releaseIfIncomplete(
  keymap: Keycode[][],
  originals: readonly DynamicKeySlot[],
  candidates: Iterable<number>
): DynamicKeySlot[] {
  const slots = rebuildTargets(keymap, originals);
  for (const candidate of candidates) {
    const current = slots[candidate];
    const original = originals[candidate];
    if (current && original && isIncomplete(current)) release(keymap, slots, original, candidate);
  }
  return rebuildTargets(keymap, slots);
}

// ---------------------------------------------------------------------------------------------
// Queries

/** Sets each slot's targets from the keymap (scan order). Unchanged slots keep their identity. */
export function rebuildTargets(keymap: Keymap, slots: readonly DynamicKeySlot[]): DynamicKeySlot[] {
  const references = referencesBySlot(keymap, slots.length);
  return slots.map((slot, index) => withTargets(slot, references.get(index) ?? []));
}

/** The slot one of `targets` already runs, if any. */
export function findSlotForTargets(
  keymap: Keymap,
  slots: readonly DynamicKeySlot[],
  targets: readonly KeyLocation[]
): number | null {
  for (const target of targets) {
    const keycode = keycodeAt(keymap, target);
    const slot = keycode === undefined ? null : dynamicKeySlotOfKeycode(keycode);
    if (slot !== null && slot < slots.length) return slot;
  }
  return null;
}

/**
 * The first empty slot (D6), where a new dynamic key keeps the slots in use contiguous. Stray keys
 * still pointing at it are cleared when it is taken.
 */
export function firstFreeSlot(slots: readonly DynamicKeySlot[]): number | null {
  const index = slots.findIndex(slot => slot.kind === 'none');
  return index < 0 ? null : index;
}

// ---------------------------------------------------------------------------------------------
// Changes

/** Mutex keys are stored in keymap scan order (the order targets are rebuilt in). */
function normalizeDraft(draft: DynamicKeyDraft): DynamicKeyDraft {
  if (draft.kind !== 'mutex') return draft;
  const [first, second] = draft.targets;
  if (compareLocations(first, second) <= 0) return draft;
  return {
    ...draft,
    targets: [second, first],
    bindings: [draft.bindings[1], draft.bindings[0]],
    mode: swapMutexKeyPriority(draft.mode),
  };
}

function targetsOf(draft: DynamicKeyDraft): readonly KeyLocation[] {
  return draft.kind === 'mutex' ? draft.targets : [draft.target];
}

function assertDraft(keymap: Keymap, draft: DynamicKeyDraft): void {
  for (const target of targetsOf(draft)) assertLocation(keymap, target);
  switch (draft.kind) {
    case 'stroke':
      draft.bindings.forEach(keycode => {
        assertUint(keycode, MAX_KEYCODE, 'Keycode');
      });
      draft.keyControl.forEach(control => {
        assertUint(control, 0xff, 'Key control');
      });
      assertFraction(draft.distances.pressBegin, 'Press-begin distance');
      assertFraction(draft.distances.pressFully, 'Press-fully distance');
      assertFraction(draft.distances.releaseBegin, 'Release-begin distance');
      assertFraction(draft.distances.releaseFully, 'Release-fully distance');
      return;
    case 'modTap':
      assertUint(draft.tap, MAX_KEYCODE, 'Keycode');
      assertUint(draft.hold, MAX_KEYCODE, 'Keycode');
      assertUint(draft.durationMs, MAX_DURATION_MS, 'Duration');
      return;
    case 'toggle':
      assertUint(draft.binding, MAX_KEYCODE, 'Keycode');
      return;
    case 'mutex':
      draft.bindings.forEach(keycode => {
        assertUint(keycode, MAX_KEYCODE, 'Keycode');
      });
      assertMutexMode(draft.mode);
      if (sameLocation(draft.targets[0], draft.targets[1])) {
        throw new RangeError('A mutex needs two different keys');
      }
  }
}

function copyLocation(location: KeyLocation): KeyLocation {
  return { layer: location.layer, id: location.id };
}

function slotOf(draft: DynamicKeyDraft): DynamicKeySlot {
  switch (draft.kind) {
    case 'stroke': {
      const [b0, b1, b2, b3] = draft.bindings;
      const [c0, c1, c2, c3] = draft.keyControl;
      return {
        kind: 'stroke',
        bindings: [b0, b1, b2, b3],
        keyControl: [c0, c1, c2, c3],
        distances: { ...draft.distances },
        target: copyLocation(draft.target),
      };
    }
    case 'modTap':
      return {
        kind: 'modTap',
        tap: draft.tap,
        hold: draft.hold,
        durationMs: draft.durationMs,
        target: copyLocation(draft.target),
      };
    case 'toggle':
      return { kind: 'toggle', binding: draft.binding, target: copyLocation(draft.target) };
    case 'mutex':
      return {
        kind: 'mutex',
        bindings: [draft.bindings[0], draft.bindings[1]],
        mode: draft.mode,
        targets: [copyLocation(draft.targets[0]), copyLocation(draft.targets[1])],
      };
  }
}

/**
 * Writes `draft` to the slot already bound to one of its keys, else to the first free slot (D6),
 * and points its keys at it. Returns null when no slot is free; throws RangeError for invalid
 * drafts. Keys the reused slot no longer covers get their binding back, and dynamic keys that
 * lose their key(s) to the draft are released. `slot` is where the draft ends up once the slots
 * are compacted.
 */
export function bindDynamicKey(
  keymap: Keymap,
  slots: readonly DynamicKeySlot[],
  draft: DynamicKeyDraft
): DynamicKeyBinding | null {
  assertDraft(keymap, draft);
  const normalized = normalizeDraft(draft);
  const targets = targetsOf(normalized);
  const slot = findSlotForTargets(keymap, slots, targets) ?? firstFreeSlot(slots);
  if (slot === null) return null;
  const previous = slots[slot] ?? NONE;

  const nextKeymap = copyKeymap(keymap);
  for (const location of referencesBySlot(keymap, slots.length).get(slot) ?? []) {
    if (!targets.some(target => sameLocation(target, location))) {
      setKeycode(nextKeymap, location, bindingFor(previous, location));
    }
  }
  const displaced = new Set<number>();
  for (const target of targets) {
    const other = dynamicKeySlotOfKeycode(keycodeAt(keymap, target) ?? NO_KEYCODE);
    if (other !== null && other !== slot && other < slots.length) displaced.add(other);
    setKeycode(nextKeymap, target, dynamicKeyKeycode(slot));
  }
  const nextSlots = [...slots];
  nextSlots[slot] = slotOf(normalized);
  const released = releaseIfIncomplete(nextKeymap, nextSlots, displaced);
  const moves = compact(nextKeymap, released);
  return { ...finish(keymap, slots, nextKeymap, released), slot: moves.get(slot) ?? slot };
}

/** Frees `slots` and gives their keys their own bindings back (D5), then compacts the slots. */
export function unbindDynamicKeys(
  keymap: Keymap,
  slots: readonly DynamicKeySlot[],
  indices: readonly number[]
): DynamicKeyChange {
  const nextKeymap = copyKeymap(keymap);
  const nextSlots = [...slots];
  for (const index of indices) {
    const slot = slots[index];
    if (slot && slot.kind !== 'none') release(nextKeymap, nextSlots, slot, index);
  }
  const rebuilt = rebuildTargets(nextKeymap, nextSlots);
  compact(nextKeymap, rebuilt);
  return finish(keymap, slots, nextKeymap, rebuilt);
}

export function unbindDynamicKey(
  keymap: Keymap,
  slots: readonly DynamicKeySlot[],
  slot: number
): DynamicKeyChange {
  return unbindDynamicKeys(keymap, slots, [slot]);
}

/** Applies keymap edits; dynamic keys whose keys are overwritten are released. */
export function setKeymapEntries(
  keymap: Keymap,
  slots: readonly DynamicKeySlot[],
  entries: readonly KeymapEntry[]
): DynamicKeyChange {
  for (const entry of entries) {
    assertLocation(keymap, entry);
    assertUint(entry.keycode, MAX_KEYCODE, 'Keycode');
  }
  const nextKeymap = copyKeymap(keymap);
  const overwritten = new Set<number>();
  for (const entry of entries) {
    const before = dynamicKeySlotOfKeycode(keycodeAt(keymap, entry) ?? NO_KEYCODE);
    if (
      before !== null &&
      before < slots.length &&
      before !== dynamicKeySlotOfKeycode(entry.keycode)
    ) {
      overwritten.add(before);
    }
    setKeycode(nextKeymap, entry, entry.keycode);
  }
  const released = releaseIfIncomplete(nextKeymap, slots, overwritten);
  compact(nextKeymap, released);
  return finish(keymap, slots, nextKeymap, released);
}

/**
 * Releases every dynamic key that is missing key(s) and compacts the slots, e.g. before a save
 * (expects rebuilt slots).
 */
export function releaseIncompleteDynamicKeys(
  keymap: Keymap,
  slots: readonly DynamicKeySlot[]
): DynamicKeyChange {
  const incomplete = slots.flatMap((slot, index) => (isIncomplete(slot) ? [index] : []));
  return unbindDynamicKeys(keymap, slots, incomplete);
}
