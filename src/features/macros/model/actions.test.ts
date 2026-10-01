import { Keycode } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import type { MacroAction } from '../../device/model/types';
import {
  firstTicks,
  hasRoom,
  insertByTime,
  lastTicks,
  referenceTicks,
  removeAction,
  replaceAction,
  sortByTime,
  withKeyPress,
} from './actions';

const press = (delay: number, keycode: number = Keycode.A): MacroAction => ({
  delay,
  keycode,
  event: 'down',
  isVirtual: true,
  keyId: 0,
});
const release = (delay: number, keycode: number = Keycode.A): MacroAction => ({
  ...press(delay, keycode),
  event: 'up',
});

describe('macro actions', () => {
  it('find the times of the earliest and the latest action', () => {
    expect(firstTicks([press(100), press(40)])).toBe(40);
    expect(lastTicks([press(100), press(40)])).toBe(100);
    expect(firstTicks([])).toBe(0);
    expect(lastTicks([])).toBe(0);
  });

  it('count a delay from the macro start, its first or its last action', () => {
    const actions = [press(100), press(40)];
    expect(referenceTicks(actions, 'start')).toBe(0);
    expect(referenceTicks(actions, 'first')).toBe(40);
    expect(referenceTicks(actions, 'last')).toBe(100);
  });

  it('insert an action before the first later one, after those at its time', () => {
    const actions = [press(0), release(300)];
    expect(insertByTime(actions, press(100, Keycode.B))).toEqual([
      press(0),
      press(100, Keycode.B),
      release(300),
    ]);
    expect(insertByTime(actions, press(300, Keycode.B))).toEqual([
      press(0),
      release(300),
      press(300, Keycode.B),
    ]);
  });

  it('add a virtual press and release of a key after the delay reference, each at its time', () => {
    const actions = [press(0), release(300)];
    expect(withKeyPress(actions, Keycode.B, 'last', 400, 160)).toEqual([
      press(0),
      release(300),
      press(700, Keycode.B),
      release(860, Keycode.B),
    ]);
    expect(withKeyPress(actions, Keycode.B, 'start', 100, 50)).toEqual([
      press(0),
      press(100, Keycode.B),
      release(150, Keycode.B),
      release(300),
    ]);
    expect(withKeyPress(actions, Keycode.B, 'first', 0, 300)).toEqual([
      press(0),
      press(0, Keycode.B),
      release(300),
      release(300, Keycode.B),
    ]);
    expect(withKeyPress([], Keycode.A, 'last', 400, 160).map(action => action.delay)).toEqual([
      400, 560,
    ]);
  });

  it('sort by time, keeping the order of actions at the same time', () => {
    const late = press(300, Keycode.C);
    const first = press(100, Keycode.A);
    const second = press(100, Keycode.B);
    expect(sortByTime([late, first, second])).toEqual([first, second, late]);
  });

  it('replace one field of one action and remove actions', () => {
    expect(replaceAction([press(0), press(8)], 1, { event: 'up' })).toEqual([press(0), release(8)]);
    expect(removeAction([press(0), press(8)], 0)).toEqual([press(8)]);
  });

  it('tell whether more actions fit', () => {
    const actions = (count: number) => Array.from({ length: count }, () => press(0));
    expect(hasRoom(actions(125), 2, 127)).toBe(true);
    expect(hasRoom(actions(126), 2, 127)).toBe(false);
    expect(hasRoom([], 2, 0)).toBe(false);
  });
});
