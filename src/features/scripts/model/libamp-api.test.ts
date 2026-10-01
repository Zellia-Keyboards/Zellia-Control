import { describe, expect, it } from 'vitest';
import { KEY_MEMBERS, SCRIPT_CALLBACKS, SCRIPT_GLOBALS, SCRIPT_MEMBERS } from './libamp-api';

describe("libamp's script API", () => {
  it('lists the callbacks script.c calls', () => {
    expect(SCRIPT_CALLBACKS.map(entry => entry.label)).toEqual([
      'loop',
      'onKeyDown',
      'onKeyUp',
      'onExit',
    ]);
  });

  it('has the members of every global object', () => {
    const objects = SCRIPT_GLOBALS.filter(entry => entry.kind === 'variable').map(
      entry => entry.label
    );
    expect(objects).toEqual(['keyboard', 'led', 'console']);
    expect(Object.keys(SCRIPT_MEMBERS)).toEqual(objects);
  });

  it('follows the firmware where the spec named other functions', () => {
    const keyboard = SCRIPT_MEMBERS.keyboard.map(entry => entry.label);
    expect(keyboard).toEqual(expect.arrayContaining(['watch', 'getKey', 'tap', 'getLayerIndex']));
    // Commented out in mqjs_libamp_stdlib.c; `emit` is a method of keys.
    expect(keyboard).not.toContain('suspend');
    expect(keyboard).not.toContain('emit');
    expect(KEY_MEMBERS.map(entry => entry.label)).toContain('emit');
    expect(SCRIPT_MEMBERS.led.map(entry => entry.label)).toEqual(['setRGB', 'setHSV', 'setMode']);
    expect(SCRIPT_MEMBERS.console.map(entry => entry.label)).toEqual(['log']);
  });

  it('names every entry once in its scope', () => {
    const scopes = [
      [...SCRIPT_GLOBALS, ...SCRIPT_CALLBACKS],
      ...Object.values(SCRIPT_MEMBERS),
      KEY_MEMBERS,
    ];
    for (const entries of scopes) {
      const labels = entries.map(entry => entry.label);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });
});
