/**
 * Keyboard layouts: KLE JSON (from `controller.get_layout_json()`) parsed with
 * `@ijprest/kle-serial`, as the Svelte app did. A key's id is the numeric `labels[0]` (the index
 * into the controller arrays; falls back to the key's position), and `labels[8]` "group,option"
 * puts a key in a layout group, visible only while that option is selected.
 */
import { Serial } from '@ijprest/kle-serial';

/** Number of KLE label slots (3×3 legend grid, then front legends). */
export const KLE_LABEL_SLOTS = 12;

export interface LayoutGroup {
  readonly groupId: number;
  readonly option: number;
}

export interface LayoutKey {
  readonly id: number;
  /** Position and size in key units. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotationAngle: number;
  readonly rotationX: number;
  readonly rotationY: number;
  /** The key's KLE labels, one per slot (`KLE_LABEL_SLOTS`), `''` when empty. */
  readonly labels: readonly string[];
  readonly layoutGroup: LayoutGroup | null;
}

function parseKeyId(label: string, fallbackIndex: number): number {
  const id = Number.parseInt(label, 10);
  return Number.isNaN(id) ? fallbackIndex : id;
}

function parseLayoutGroup(label: string): LayoutGroup | null {
  if (label === '') return null;
  const [group = '', option = ''] = label.split(',');
  const groupId = Number.parseInt(group, 10);
  const optionId = Number.parseInt(option, 10);
  if (Number.isNaN(groupId) || Number.isNaN(optionId)) return null;
  return { groupId, option: optionId };
}

function deserialize(rows: unknown): ReturnType<typeof Serial.deserialize> {
  if (!Array.isArray(rows)) throw new Error('Invalid keyboard layout: expected a JSON array');
  try {
    return Serial.deserialize(rows);
  } catch (error: unknown) {
    // kle-serial throws strings.
    throw new Error(`Invalid keyboard layout: ${String(error)}`, { cause: error });
  }
}

/**
 * Parses a KLE layout. Layouts are static per keyboard model, so invalid input is a programming
 * error: it throws.
 */
export function parseLayout(layoutJson: string): readonly LayoutKey[] {
  let rows: unknown;
  try {
    rows = JSON.parse(layoutJson);
  } catch (error: unknown) {
    throw new Error('Invalid keyboard layout: not JSON', { cause: error });
  }
  return deserialize(rows).keys.map((key, index): LayoutKey => {
    // kle-serial label arrays are sparse.
    const labels = Array.from({ length: KLE_LABEL_SLOTS }, (_, slot) => key.labels[slot] ?? '');
    return {
      id: parseKeyId(labels[0] ?? '', index),
      x: key.x,
      y: key.y,
      width: key.width,
      height: key.height,
      rotationAngle: key.rotation_angle,
      rotationX: key.rotation_x,
      rotationY: key.rotation_y,
      labels,
      layoutGroup: parseLayoutGroup(labels[8] ?? ''),
    };
  });
}

/**
 * Keys shown for the selected layout variants: ungrouped keys, plus grouped keys whose option is
 * selected for their group (`variantIndices[groupId]`).
 */
export function visibleKeys(
  keys: readonly LayoutKey[],
  variantIndices: readonly number[]
): readonly LayoutKey[] {
  return keys.filter(
    key =>
      key.layoutGroup === null || variantIndices[key.layoutGroup.groupId] === key.layoutGroup.option
  );
}
