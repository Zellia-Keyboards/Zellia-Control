import { Fragment, type ReactNode } from 'react';
import type { PaletteKey } from '../../keycodes';

/** Renders one palette key: the page's `keyslot` snippet in the Svelte tabs. */
export type KeySlot = (key: PaletteKey) => ReactNode;

export interface PaletteTabProps {
  readonly keyslot: KeySlot;
}

export interface KeySlotsProps {
  readonly keys: readonly PaletteKey[];
  readonly keyslot: KeySlot;
}

/** `{#each keys as key}{@render keyslot(key)}{/each}`: the slots are the parent's children. */
export function KeySlots({ keys, keyslot }: KeySlotsProps) {
  return keys.map((key, index) => <Fragment key={index}>{keyslot(key)}</Fragment>);
}
