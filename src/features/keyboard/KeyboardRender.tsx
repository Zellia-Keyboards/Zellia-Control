import type { LayoutKey } from './model';

export interface KeyboardRenderProps {
  /**
   * Every key of the layout with the labels to display (all layout-group variants; the renderer
   * shows only the variants chosen in the Layout dropdown, like the Svelte component).
   */
  readonly keys: readonly LayoutKey[];
  /** Whether clicking/dragging over keys toggles their selection (default true). */
  readonly allowSelection?: boolean;
  /** Called after the user toggled `keyId`'s selection. */
  readonly onSelect?: (keyId: number) => void;
}

/** Placeholder until worker E ports KeyboardRender/Key (Wave 2). */
export function KeyboardRender(_props: KeyboardRenderProps) {
  return null;
}
