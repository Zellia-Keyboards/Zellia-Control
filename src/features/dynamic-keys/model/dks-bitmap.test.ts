import { describe, expect, it } from 'vitest';
import {
  DKS_GRIP_HEIGHT,
  DKS_GRIP_OFFSET,
  DKS_GRIP_TOP,
  DKS_GRIP_WIDTH,
  DKS_NODE_SIZE,
  DKS_NODE_SPACING,
  DKS_NODE_TOP,
  DKS_SLIDER_GAP,
  DKS_SLIDER_HEIGHT,
  DKS_SLIDER_WIDTH,
  DksAction,
  canStartDrag,
  clickNode,
  commitDrag,
  deleteInterval,
  dksIntervalWidth,
  dksNodeLeft,
  dragInterval,
  getIntervals,
  type DksBitmap,
} from './dks-bitmap';

const { Hold: H, Press: P, Release: R, Tap: T } = DksAction;

function at<V>(values: readonly V[], index: number): V {
  const value = values[index];
  if (value === undefined) throw new Error(`index ${index} out of range`);
  return value;
}

/** Actions by enum value. */
const ACTIONS: readonly DksAction[] = [H, P, R, T];

/** All 4^4 UI bitmaps. */
const ALL_BITMAPS: readonly DksBitmap[] = Array.from({ length: 256 }, (_, n): DksBitmap => [
  at(ACTIONS, n & 3),
  at(ACTIONS, (n >> 2) & 3),
  at(ACTIONS, (n >> 4) & 3),
  at(ACTIONS, (n >> 6) & 3),
]);

/**
 * The Svelte component, transcribed from baseline `DynamicMode.svelte` (4f232a2, lines 71-231).
 * Function bodies are unchanged except for explicit `this` and index checks. Component state is
 * explicit: `dksSelectedBitmaps` ($state), `dksUiBitmaps` (writable $derived) and the $effect
 * `dksUiBitmaps = dksSelectedBitmaps.map(bitmap => [...bitmap])`, which runs after every change
 * of the selected bitmaps (all callers change them in their last statement, before the next DOM
 * event).
 */
class SvelteDynamicMode {
  dksSelectedBitmaps: DksAction[][];
  dksUiBitmaps: DksAction[][] = [];
  dksDragState: {
    isDragging: boolean;
    bindingIndex: number;
    nodeIndex: number;
    startX: number;
    startMouseX: number;
  } | null = null;

  constructor(bitmaps: readonly DksBitmap[]) {
    this.dksSelectedBitmaps = bitmaps.map(bitmap => [...bitmap]);
    this.effect();
  }

  private effect(): void {
    this.dksUiBitmaps = this.dksSelectedBitmaps.map(bitmap => [...bitmap]);
  }

  static dksGetIntervals(bitmap: DksAction[]): [number, number][] {
    const intervals: [number, number][] = [];
    let start = -1;

    for (let i = 0; i < 4; i++) {
      if (bitmap[i] === DksAction.Hold) {
        continue;
      }
      if (start !== -1) {
        intervals.push([start, i]);
        start = -1;
      }
      if (bitmap[i] === DksAction.Press) {
        start = i;
      } else if (bitmap[i] === DksAction.Tap) {
        intervals.push([i, i]);
      }
    }
    return intervals;
  }

  static dksIntervalWidth = ([l, r]: [number, number]) =>
    l === r ? 0 : DKS_SLIDER_GAP * (r - l) - DKS_NODE_SPACING;

  dksUpdateBitmap(bindingIndex: number, bitmap: DksAction[]): void {
    this.dksSelectedBitmaps[bindingIndex] = [...bitmap];
    this.effect();
  }

  dksSetUIBitmap(bindingIndex: number, bitmap: DksAction[]): void {
    this.dksUiBitmaps[bindingIndex] = [...bitmap];
  }

  dksDeleteInterval(bindingIndex: number, intervalStart: number): void {
    const bitmap = [...at(this.dksUiBitmaps, bindingIndex)];
    const intervals = SvelteDynamicMode.dksGetIntervals(bitmap);
    const interval = intervals.find(([l]) => l === intervalStart);

    if (interval) {
      const [start, end] = interval;
      for (let j = start + 1; j < end; j++) {
        bitmap[j] = DksAction.Hold;
      }
      if (bitmap[end] === DksAction.Release) {
        bitmap[end] = DksAction.Hold;
      }
      bitmap[start] = intervals.some(([l, r]) => l !== r && r === start)
        ? DksAction.Release
        : DksAction.Hold;
    }
    this.dksUpdateBitmap(bindingIndex, bitmap);
  }

  dksHandleDrag(bindingIndex: number, nodeIndex: number, deltaX: number): void {
    const bitmap = [...at(this.dksUiBitmaps, bindingIndex)];
    const intervals = SvelteDynamicMode.dksGetIntervals(at(this.dksSelectedBitmaps, bindingIndex));
    const interval = intervals.find(([l]) => l === nodeIndex) ?? [nodeIndex, -1];
    const upperBound = intervals.find(([l]) => l > nodeIndex)?.[0] ?? 3;

    const clampedX = Math.max(
      0,
      Math.min(
        deltaX + (interval[1] === -1 ? 0 : SvelteDynamicMode.dksIntervalWidth(interval)),
        SvelteDynamicMode.dksIntervalWidth([nodeIndex, upperBound])
      )
    );

    let closest = nodeIndex;
    let closestDistance = clampedX;
    for (let j = nodeIndex + 1; j <= upperBound; j++) {
      const distance = Math.abs(clampedX - SvelteDynamicMode.dksIntervalWidth([nodeIndex, j]));
      if (distance < closestDistance) {
        closest = j;
        closestDistance = distance;
      }
    }

    bitmap[nodeIndex] = nodeIndex === closest ? DksAction.Tap : DksAction.Press;

    for (let j = nodeIndex + 1; j < Math.max(interval[1], closest); j++) {
      bitmap[j] = DksAction.Hold;
    }

    if (interval[1] !== -1 && bitmap[interval[1]] === DksAction.Release) {
      bitmap[interval[1]] = DksAction.Hold;
    }

    if (bitmap[closest] === DksAction.Hold) {
      bitmap[closest] = DksAction.Release;
    }
    this.dksSetUIBitmap(bindingIndex, bitmap);
  }

  dksCommitDrag(bindingIndex: number): void {
    this.dksUpdateBitmap(bindingIndex, [...at(this.dksUiBitmaps, bindingIndex)]);
  }

  dksHandleNodeClick(bindingIndex: number, nodeIndex: number): void {
    const bitmap = [...at(this.dksSelectedBitmaps, bindingIndex)];
    const uiBitmapCopy = [...at(this.dksUiBitmaps, bindingIndex)];
    const intervals = SvelteDynamicMode.dksGetIntervals(bitmap);

    if (intervals.some(([l, r]) => l < nodeIndex && nodeIndex < r)) {
      return;
    }

    uiBitmapCopy[nodeIndex] = DksAction.Tap;
    this.dksUpdateBitmap(bindingIndex, uiBitmapCopy);
  }

  dksHandleMouseDown(clientX: number, bindingIndex: number, nodeIndex: number): void {
    const uiIntervals = SvelteDynamicMode.dksGetIntervals(at(this.dksUiBitmaps, bindingIndex));

    if (uiIntervals.some(([l, r]) => l < nodeIndex && nodeIndex < r)) {
      return;
    }

    this.dksDragState = {
      isDragging: true,
      bindingIndex,
      nodeIndex,
      startX: 0,
      startMouseX: clientX,
    };
  }

  dksHandleMouseMove(clientX: number): void {
    if (!this.dksDragState?.isDragging) return;
    const deltaX = clientX - this.dksDragState.startMouseX;
    this.dksHandleDrag(this.dksDragState.bindingIndex, this.dksDragState.nodeIndex, deltaX);
  }

  dksHandleMouseUp(): void {
    if (this.dksDragState?.isDragging) {
      this.dksCommitDrag(this.dksDragState.bindingIndex);
    }
    this.dksDragState = null;
  }
}

/** The same editor state driven through the pure functions (how the React editor uses them). */
class PureDynamicMode {
  committed: DksBitmap[];
  preview: DksBitmap[];
  drag: { bindingIndex: number; nodeIndex: number; startMouseX: number } | null = null;

  constructor(bitmaps: readonly DksBitmap[]) {
    this.committed = [...bitmaps];
    this.preview = [...bitmaps];
  }

  private commit(bindingIndex: number, bitmap: DksBitmap): void {
    this.committed[bindingIndex] = bitmap;
    this.preview = [...this.committed];
  }

  deleteInterval(bindingIndex: number, start: number): void {
    this.commit(bindingIndex, deleteInterval(at(this.preview, bindingIndex), start));
  }

  clickNode(bindingIndex: number, nodeIndex: number): void {
    const committed = at(this.committed, bindingIndex);
    const next = clickNode(committed, at(this.preview, bindingIndex), nodeIndex);
    if (next !== committed) this.commit(bindingIndex, next);
  }

  mouseDown(clientX: number, bindingIndex: number, nodeIndex: number): void {
    if (canStartDrag(at(this.preview, bindingIndex), nodeIndex)) {
      this.drag = { bindingIndex, nodeIndex, startMouseX: clientX };
    }
  }

  mouseMove(clientX: number): void {
    if (!this.drag) return;
    const { bindingIndex, nodeIndex, startMouseX } = this.drag;
    this.preview[bindingIndex] = dragInterval(
      at(this.committed, bindingIndex),
      at(this.preview, bindingIndex),
      nodeIndex,
      clientX - startMouseX
    );
  }

  mouseUp(): void {
    if (this.drag)
      this.commit(this.drag.bindingIndex, commitDrag(at(this.preview, this.drag.bindingIndex)));
    this.drag = null;
  }
}

/** Deterministic PRNG (mulberry32). */
function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('DKS slider geometry (DynamicMode.svelte constants)', () => {
  it('keeps the Svelte node, grip and slider dimensions', () => {
    expect(DKS_NODE_SIZE).toBe(32);
    expect(DKS_NODE_SPACING).toBe(40);
    expect(DKS_SLIDER_GAP).toBe(74.25);
    expect(DKS_SLIDER_WIDTH).toBe(254.75);
    expect(DKS_SLIDER_HEIGHT).toBe(32);
    expect(DKS_NODE_TOP).toBe(0);
    expect(DKS_GRIP_WIDTH).toBe(12);
    expect(DKS_GRIP_HEIGHT).toBe(16);
    expect(DKS_GRIP_OFFSET).toBe(22);
    expect(DKS_GRIP_TOP).toBe(8);
    expect([0, 1, 2, 3].map(dksNodeLeft)).toEqual([0, 74.25, 148.5, 222.75]);
    expect(dksIntervalWidth([1, 1])).toBe(0);
    expect(dksIntervalWidth([0, 3])).toBe(182.75);
  });
});

describe('getIntervals', () => {
  it('pairs each press with the next non-hold stage and makes taps zero-length intervals', () => {
    expect(getIntervals([P, H, H, R])).toEqual([[0, 3]]);
    expect(getIntervals([T, H, H, H])).toEqual([[0, 0]]);
    expect(getIntervals([P, P, H, R])).toEqual([
      [0, 1],
      [1, 3],
    ]);
    expect(getIntervals([P, H, T, R])).toEqual([
      [0, 2],
      [2, 2],
    ]);
    // A press never closed before the last stage is not an interval.
    expect(getIntervals([H, P, H, H])).toEqual([]);
    expect(getIntervals([R, R, R, R])).toEqual([]);
  });

  it('matches the Svelte dksGetIntervals for every bitmap', () => {
    for (const bitmap of ALL_BITMAPS) {
      expect(getIntervals(bitmap)).toEqual(SvelteDynamicMode.dksGetIntervals([...bitmap]));
    }
  });
});

describe('bitmap editing', () => {
  it('deletes an interval or tap (and nothing when no interval starts there)', () => {
    expect(deleteInterval([P, H, H, R], 0)).toEqual([H, H, H, H]);
    expect(deleteInterval([T, H, H, H], 0)).toEqual([H, H, H, H]);
    expect(deleteInterval([P, P, H, R], 1)).toEqual([P, R, H, H]);
    expect(deleteInterval([P, R, H, R], 2)).toEqual([P, R, H, R]);
  });

  it('drags a tap into an interval and snaps to the nearest node', () => {
    expect(dragInterval([T, R, R, R], [T, R, R, R], 0, 182.75)).toEqual([P, H, H, R]);
    expect(dragInterval([T, R, R, R], [T, R, R, R], 0, 30)).toEqual([P, R, R, R]);
    expect(dragInterval([T, R, R, R], [T, R, R, R], 0, 10)).toEqual([T, R, R, R]);
    // Dragging an interval's grip starts from its current width.
    expect(dragInterval([P, H, H, R], [P, H, H, R], 0, -150)).toEqual([P, R, H, H]);
    expect(commitDrag([P, R, H, H])).toEqual([P, R, H, H]);
  });

  it('turns a clicked node into a tap unless it lies inside an interval', () => {
    const committed: DksBitmap = [P, H, H, R];
    expect(clickNode(committed, committed, 2)).toBe(committed);
    expect(clickNode(committed, committed, 3)).toEqual([P, H, H, T]);
    expect(clickNode([R, R, R, R], [R, R, R, R], 1)).toEqual([R, T, R, R]);
    expect(canStartDrag(committed, 1)).toBe(false);
    expect(canStartDrag(committed, 0)).toBe(true);
  });

  it('rejects node indices outside the four stages', () => {
    expect(() => dragInterval([R, R, R, R], [R, R, R, R], 4, 0)).toThrow(RangeError);
    expect(() => clickNode([R, R, R, R], [R, R, R, R], -1)).toThrow(RangeError);
  });

  it('matches the Svelte deleteInterval, handleDrag and handleNodeClick for every input', () => {
    const deltas = Array.from({ length: 121 }, (_, i) => -300 + i * 5).concat(
      [0, 1, 2, 3].map(j => (j === 0 ? 0 : dksIntervalWidth([0, j]) / 2)) // exact midpoints
    );
    for (const committed of ALL_BITMAPS) {
      for (let node = 0; node < 4; node++) {
        const svelte = new SvelteDynamicMode([committed]);
        svelte.dksDeleteInterval(0, node);
        expect(deleteInterval(committed, node)).toEqual(svelte.dksSelectedBitmaps[0]);

        const click = new SvelteDynamicMode([committed]);
        click.dksHandleNodeClick(0, node);
        expect(clickNode(committed, committed, node)).toEqual(click.dksSelectedBitmaps[0]);

        for (const delta of deltas) {
          const drag = new SvelteDynamicMode([committed]);
          drag.dksHandleDrag(0, node, delta);
          expect(dragInterval(committed, committed, node, delta)).toEqual(drag.dksUiBitmaps[0]);
        }
      }
    }
  });

  it('matches the Svelte component over random editing sessions (drags read the preview)', () => {
    const next = random(0x5eed);
    const pick = <V>(values: readonly V[]): V => at(values, Math.floor(next() * values.length));
    for (let session = 0; session < 400; session++) {
      const start = [pick(ALL_BITMAPS), pick(ALL_BITMAPS), pick(ALL_BITMAPS), pick(ALL_BITMAPS)];
      const svelte = new SvelteDynamicMode(start);
      const pure = new PureDynamicMode(start);
      for (let step = 0; step < 30; step++) {
        const binding = Math.floor(next() * 4);
        const node = Math.floor(next() * 4);
        const x = Math.round(next() * 600);
        switch (pick(['down', 'move', 'move', 'move', 'up', 'click', 'delete'] as const)) {
          case 'down':
            svelte.dksHandleMouseDown(x, binding, node);
            pure.mouseDown(x, binding, node);
            break;
          case 'move':
            svelte.dksHandleMouseMove(x);
            pure.mouseMove(x);
            break;
          case 'up':
            svelte.dksHandleMouseUp();
            pure.mouseUp();
            break;
          case 'click':
            svelte.dksHandleNodeClick(binding, node);
            pure.clickNode(binding, node);
            break;
          case 'delete':
            svelte.dksDeleteInterval(binding, node);
            pure.deleteInterval(binding, node);
            break;
        }
        expect(pure.committed).toEqual(svelte.dksSelectedBitmaps);
        expect(pure.preview).toEqual(svelte.dksUiBitmaps);
      }
    }
  });
});
