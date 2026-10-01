/**
 * Edits of a macro slot's actions (delays in ticks). The list is in the order the keyboard plays
 * it: libamp plays actions by index, each when its time has come, so editing a time does not move
 * the action; `sortByTime` does. Added actions go in at their times.
 */
import type { Keycode, MacroAction } from '../../device/model/types';

/** What the delay of an added key counts from (upstream's delay reference). */
export type DelayReference = 'start' | 'first' | 'last';

/** The time of the earliest action; 0 without actions. */
export function firstTicks(actions: readonly MacroAction[]): number {
  return actions.length === 0 ? 0 : Math.min(...actions.map(action => action.delay));
}

/** The time of the latest action; 0 without actions. */
export function lastTicks(actions: readonly MacroAction[]): number {
  return actions.reduce((latest, action) => Math.max(latest, action.delay), 0);
}

/** The time a delay reference stands for: the macro's start, or its earliest or latest action. */
export function referenceTicks(actions: readonly MacroAction[], reference: DelayReference): number {
  switch (reference) {
    case 'start':
      return 0;
    case 'first':
      return firstTicks(actions);
    case 'last':
      return lastTicks(actions);
  }
}

/** `action` inserted before the first action that comes later (after those at its time). */
export function insertByTime(actions: readonly MacroAction[], action: MacroAction): MacroAction[] {
  const at = actions.findIndex(existing => existing.delay > action.delay);
  return at < 0 ? [...actions, action] : [...actions.slice(0, at), action, ...actions.slice(at)];
}

/**
 * "Add key": a press of `keycode` `delay` ticks after the reference and its release `duration`
 * ticks later, both virtual (from no physical key, key ID 0) like recorded events, each inserted
 * at its time.
 */
export function withKeyPress(
  actions: readonly MacroAction[],
  keycode: Keycode,
  reference: DelayReference,
  delay: number,
  duration: number
): MacroAction[] {
  const pressAt = referenceTicks(actions, reference) + delay;
  const pressed = insertByTime(actions, {
    delay: pressAt,
    keycode,
    event: 'down',
    isVirtual: true,
    keyId: 0,
  });
  return insertByTime(pressed, {
    delay: pressAt + duration,
    keycode,
    event: 'up',
    isVirtual: true,
    keyId: 0,
  });
}

/** Ordered by time; actions at the same time keep their order. */
export function sortByTime(actions: readonly MacroAction[]): MacroAction[] {
  return actions.toSorted((a, b) => a.delay - b.delay);
}

export function replaceAction(
  actions: readonly MacroAction[],
  index: number,
  patch: Partial<MacroAction>
): MacroAction[] {
  return actions.map((action, at) => (at === index ? { ...action, ...patch } : action));
}

export function removeAction(actions: readonly MacroAction[], index: number): MacroAction[] {
  return actions.filter((_, at) => at !== index);
}

/** Whether `count` more actions fit into a slot of `limit` actions. */
export function hasRoom(actions: readonly MacroAction[], count: number, limit: number): boolean {
  return actions.length + count <= limit;
}
