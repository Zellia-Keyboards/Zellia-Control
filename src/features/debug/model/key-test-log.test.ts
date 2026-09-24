import { describe, expect, it } from 'vitest';
import {
  INITIAL_KEY_TEST_LOG,
  clearEvents,
  formatTime,
  keyName,
  recordKeyDown,
  recordKeyUp,
  startListening,
  stopListening,
  type KeyTestLog,
} from './key-test-log';

function listening(): KeyTestLog {
  return startListening(INITIAL_KEY_TEST_LOG);
}

describe('formatTime', () => {
  it('shows seconds with zero-padded milliseconds', () => {
    expect(formatTime(0)).toBe('0.000s');
    expect(formatTime(7)).toBe('0.007s');
    expect(formatTime(1234)).toBe('1.234s');
    expect(formatTime(61_050)).toBe('61.050s');
  });
});

describe('keyName', () => {
  it('prefers the physical key code, then the key, then Unknown', () => {
    expect(keyName({ code: 'KeyA', key: 'a' })).toBe('KeyA');
    expect(keyName({ code: '', key: 'Unidentified' })).toBe('Unidentified');
    expect(keyName({ code: '', key: '' })).toBe('Unknown');
  });
});

describe('recording', () => {
  it('ignores keys while not listening', () => {
    expect(recordKeyDown(INITIAL_KEY_TEST_LOG, 'KeyA', 10)).toBe(INITIAL_KEY_TEST_LOG);
    expect(recordKeyUp(INITIAL_KEY_TEST_LOG, 'KeyA', 10)).toBe(INITIAL_KEY_TEST_LOG);
  });

  it('logs presses and releases with the time since the first event and the delta', () => {
    let log = listening();
    log = recordKeyDown(log, 'KeyA', 1000.4);
    log = recordKeyDown(log, 'ShiftLeft', 1100);
    log = recordKeyUp(log, 'KeyA', 1250.6);

    expect(log.events).toEqual([
      { time: '0.000s', type: 'Press', key: 'KeyA', delta: 0 },
      { time: '0.100s', type: 'Press', key: 'ShiftLeft', delta: 100 },
      { time: '0.250s', type: 'Release', key: 'KeyA', delta: 151 },
    ]);
  });

  it('skips auto-repeated presses of a held key', () => {
    let log = recordKeyDown(listening(), 'KeyA', 0);
    const held = log;
    log = recordKeyDown(log, 'KeyA', 30);
    expect(log).toBe(held);

    log = recordKeyUp(log, 'KeyA', 50);
    log = recordKeyDown(log, 'KeyA', 80);
    expect(log.events.map(event => event.type)).toEqual(['Press', 'Release', 'Press']);
  });

  it('logs a release even without a recorded press', () => {
    const log = recordKeyUp(listening(), 'KeyB', 5);
    expect(log.events).toEqual([{ time: '0.000s', type: 'Release', key: 'KeyB', delta: 0 }]);
  });
});

describe('controls', () => {
  it('starting clears the events and timing but keeps held keys', () => {
    let log = recordKeyDown(listening(), 'KeyA', 0);
    log = stopListening(log);
    log = startListening(log);

    expect(log).toMatchObject({
      listening: true,
      events: [],
      startTime: null,
      lastEventTime: null,
    });
    // KeyA is still held: its repeat is skipped.
    expect(recordKeyDown(log, 'KeyA', 10)).toBe(log);
  });

  it('stopping keeps the log', () => {
    const log = stopListening(recordKeyDown(listening(), 'KeyA', 0));
    expect(log.listening).toBe(false);
    expect(log.events).toHaveLength(1);
  });

  it('clearing empties the log and forgets held keys, still listening', () => {
    const log = clearEvents(recordKeyDown(listening(), 'KeyA', 0));
    expect(log).toMatchObject({
      listening: true,
      events: [],
      startTime: null,
      lastEventTime: null,
    });
    expect(recordKeyDown(log, 'KeyA', 10).events).toHaveLength(1);
  });
});
