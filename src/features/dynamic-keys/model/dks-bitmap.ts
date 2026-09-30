/**
 * Dynamic keystroke (DKS) editor model, ported from the Svelte `DynamicMode.svelte`.
 *
 * Each of the four bindings has one action per stage node — 0 key pressed past actuation,
 * 1 pressed past bottom-out, 2 released past bottom-out, 3 released past actuation. A `Press`
 * opens an interval that the next non-`Hold` node closes; a `Tap` is a zero-length interval.
 *
 * The editor keeps two bitmaps per binding: the committed one and a preview shown while a grip is
 * dragged. Like the Svelte component, drags compute the next preview from the committed intervals
 * and the current preview; releasing the mouse commits the preview; clicks and deletions commit,
 * after which the preview is reset to the committed bitmap.
 */

/** Per-node action of the UI model (values unchanged from the Svelte `DKSAction`). */
export enum DksAction {
  /** No change. */
  Hold = 0,
  Press = 1,
  Release = 2,
  Tap = 3,
}

export type DksBitmap = readonly [DksAction, DksAction, DksAction, DksAction];

/** `[start, end]` node indices; `start === end` is a tap. */
export type DksInterval = readonly [start: number, end: number];

export const DKS_STAGE_COUNT = 4;

// Slider geometry in px (DynamicMode.svelte).
export const DKS_NODE_SIZE = 32;
export const DKS_NODE_SPACING = 40;
export const DKS_SLIDER_GAP = 74.25;
export const DKS_SLIDER_WIDTH = DKS_SLIDER_GAP * 3 + DKS_NODE_SIZE;
export const DKS_SLIDER_HEIGHT = DKS_NODE_SIZE;
export const DKS_NODE_TOP = DKS_SLIDER_HEIGHT / 2 - DKS_NODE_SIZE / 2;
export const DKS_GRIP_WIDTH = 12;
export const DKS_GRIP_HEIGHT = 16;
export const DKS_GRIP_OFFSET = DKS_NODE_SIZE - 10;
export const DKS_GRIP_TOP = DKS_SLIDER_HEIGHT / 2 - DKS_GRIP_HEIGHT / 2;

/** Left offset of stage node `index`. */
export function dksNodeLeft(index: number): number {
  return DKS_SLIDER_GAP * index;
}

/** Width of an interval bar beyond one node (0 for taps). */
export function dksIntervalWidth([start, end]: DksInterval): number {
  return start === end ? 0 : DKS_SLIDER_GAP * (end - start) - DKS_NODE_SPACING;
}

function toBitmap(actions: readonly DksAction[]): DksBitmap {
  const [a = DksAction.Hold, b = DksAction.Hold, c = DksAction.Hold, d = DksAction.Hold] = actions;
  return [a, b, c, d];
}

function assertNode(nodeIndex: number): void {
  if (!Number.isInteger(nodeIndex) || nodeIndex < 0 || nodeIndex >= DKS_STAGE_COUNT) {
    throw new RangeError(`DKS node index must be 0..3, got ${nodeIndex}`);
  }
}

/** Intervals of a bitmap (Svelte `dksGetIntervals`). A press never closed is dropped. */
export function getIntervals(bitmap: DksBitmap): readonly DksInterval[] {
  const intervals: DksInterval[] = [];
  let start = -1;
  bitmap.forEach((action, i) => {
    if (action === DksAction.Hold) return;
    if (start !== -1) {
      intervals.push([start, i]);
      start = -1;
    }
    if (action === DksAction.Press) start = i;
    else if (action === DksAction.Tap) intervals.push([i, i]);
  });
  return intervals;
}

const isInsideInterval = (intervals: readonly DksInterval[], nodeIndex: number): boolean =>
  intervals.some(([start, end]) => start < nodeIndex && nodeIndex < end);

/** Whether a grip drag may start at `nodeIndex` (Svelte `dksHandleMouseDown` guard). */
export function canStartDrag(preview: DksBitmap, nodeIndex: number): boolean {
  return !isInsideInterval(getIntervals(preview), nodeIndex);
}

/**
 * Removes the interval or tap starting at `start` (Svelte `dksDeleteInterval`). Pass the preview
 * bitmap; the result is the new committed bitmap.
 */
export function deleteInterval(bitmap: DksBitmap, start: number): DksBitmap {
  const next = [...bitmap];
  const intervals = getIntervals(bitmap);
  const interval = intervals.find(([l]) => l === start);
  if (interval) {
    const [from, to] = interval;
    for (let j = from + 1; j < to; j++) next[j] = DksAction.Hold;
    if (next[to] === DksAction.Release) next[to] = DksAction.Hold;
    next[from] = intervals.some(([l, r]) => l !== r && r === from)
      ? DksAction.Release
      : DksAction.Hold;
  }
  return toBitmap(next);
}

/**
 * Preview while the grip of the interval (or tap, or bare node) at `nodeIndex` is dragged by
 * `deltaX` px (Svelte `dksHandleDrag`): the end snaps to the nearest node before the next
 * interval; snapping back onto the start node makes it a tap.
 */
export function dragInterval(
  committed: DksBitmap,
  preview: DksBitmap,
  nodeIndex: number,
  deltaX: number
): DksBitmap {
  assertNode(nodeIndex);
  const next = [...preview];
  const intervals = getIntervals(committed);
  const interval: DksInterval = intervals.find(([l]) => l === nodeIndex) ?? [nodeIndex, -1];
  const upperBound = intervals.find(([l]) => l > nodeIndex)?.[0] ?? DKS_STAGE_COUNT - 1;
  const clampedX = Math.max(
    0,
    Math.min(
      deltaX + (interval[1] === -1 ? 0 : dksIntervalWidth(interval)),
      dksIntervalWidth([nodeIndex, upperBound])
    )
  );

  let closest = nodeIndex;
  let closestDistance = clampedX;
  for (let j = nodeIndex + 1; j <= upperBound; j++) {
    const distance = Math.abs(clampedX - dksIntervalWidth([nodeIndex, j]));
    if (distance < closestDistance) {
      closest = j;
      closestDistance = distance;
    }
  }

  next[nodeIndex] = nodeIndex === closest ? DksAction.Tap : DksAction.Press;
  for (let j = nodeIndex + 1; j < Math.max(interval[1], closest); j++) next[j] = DksAction.Hold;
  if (interval[1] !== -1 && next[interval[1]] === DksAction.Release) {
    next[interval[1]] = DksAction.Hold;
  }
  if (next[closest] === DksAction.Hold) next[closest] = DksAction.Release;
  return toBitmap(next);
}

/** Ends a drag: the preview becomes the committed bitmap (Svelte `dksCommitDrag`). */
export function commitDrag(preview: DksBitmap): DksBitmap {
  return toBitmap(preview);
}

/**
 * Click on stage node `nodeIndex` (Svelte `dksHandleNodeClick`): makes it a tap unless it lies
 * strictly inside a committed interval, in which case `committed` itself is returned.
 */
export function clickNode(committed: DksBitmap, preview: DksBitmap, nodeIndex: number): DksBitmap {
  assertNode(nodeIndex);
  if (isInsideInterval(getIntervals(committed), nodeIndex)) return committed;
  const next = [...preview];
  next[nodeIndex] = DksAction.Tap;
  return toBitmap(next);
}
