/**
 * The Key Test event log (the state of `debug/KeyTest.svelte`): browser keydown/keyup events
 * recorded with the time since the first event and the delta to the previous one. Pure, so
 * the component can apply it with functional state updates from its window listeners.
 */

export type KeyTestEventType = 'Press' | 'Release';

export interface KeyTestEvent {
  /** Time since the first recorded event, e.g. `1.234s`. */
  readonly time: string;
  readonly type: KeyTestEventType;
  readonly key: string;
  /** Milliseconds since the previous event (0 for the first). */
  readonly delta: number;
}

export interface KeyTestLog {
  readonly listening: boolean;
  readonly events: readonly KeyTestEvent[];
  /** `performance.now()` of the first event since listening started or the log was cleared. */
  readonly startTime: number | null;
  readonly lastEventTime: number | null;
  /** Keys held down, so auto-repeat does not log another press. */
  readonly pressed: ReadonlySet<string>;
}

export const INITIAL_KEY_TEST_LOG: KeyTestLog = Object.freeze({
  listening: false,
  events: Object.freeze([]),
  startTime: null,
  lastEventTime: null,
  pressed: new Set<string>(),
});

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;
  return `${seconds}.${milliseconds.toString().padStart(3, '0')}s`;
}

/** The physical key (`KeyboardEvent.code`), else the produced key. */
export function keyName(event: Pick<KeyboardEvent, 'code' | 'key'>): string {
  if (event.code) return event.code;
  return event.key || 'Unknown';
}

function record(
  log: KeyTestLog,
  type: KeyTestEventType,
  key: string,
  now: number,
  pressed: ReadonlySet<string>
): KeyTestLog {
  const startTime = log.startTime ?? now;
  const delta = log.lastEventTime !== null ? Math.round(now - log.lastEventTime) : 0;
  const event: KeyTestEvent = {
    time: formatTime(Math.round(now - startTime)),
    type,
    key,
    delta,
  };
  return { ...log, events: [...log.events, event], startTime, lastEventTime: now, pressed };
}

export function recordKeyDown(log: KeyTestLog, key: string, now: number): KeyTestLog {
  if (!log.listening || log.pressed.has(key)) return log;
  return record(log, 'Press', key, now, new Set([...log.pressed, key]));
}

export function recordKeyUp(log: KeyTestLog, key: string, now: number): KeyTestLog {
  if (!log.listening) return log;
  const pressed = new Set(log.pressed);
  pressed.delete(key);
  return record(log, 'Release', key, now, pressed);
}

/**
 * Clears the events, the timing and the held keys. Releases are not seen while stopped, so a key
 * held before is forgotten: otherwise its next press would be taken for an auto-repeat and never
 * logged (a Svelte bug, which kept the set across Stop and Start).
 */
export function startListening(log: KeyTestLog): KeyTestLog {
  return {
    ...log,
    listening: true,
    events: [],
    startTime: null,
    lastEventTime: null,
    pressed: new Set(),
  };
}

export function stopListening(log: KeyTestLog): KeyTestLog {
  return log.listening ? { ...log, listening: false } : log;
}

export function clearEvents(log: KeyTestLog): KeyTestLog {
  return { ...log, events: [], startTime: null, lastEventTime: null, pressed: new Set() };
}
