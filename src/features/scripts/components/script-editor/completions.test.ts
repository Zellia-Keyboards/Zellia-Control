import { CompletionContext } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { libampCompletions } from './completions';

/** The completions at the end of `doc`. */
function complete(doc: string, explicit = false) {
  const state = EditorState.create({ doc, extensions: [javascript()] });
  return libampCompletions(new CompletionContext(state, doc.length, explicit));
}

function labels(doc: string, explicit = false): string[] | undefined {
  return complete(doc, explicit)?.options.map(option => option.label);
}

describe('libampCompletions', () => {
  it('completes the members of keyboard, led and console after their dot', () => {
    expect(labels('keyboard.')).toEqual(
      expect.arrayContaining(['watch', 'getKey', 'tap', 'press', 'release', 'getLayerIndex'])
    );
    expect(complete('  keyboard.ta')?.from).toBe('  keyboard.'.length);
    expect(labels('led.')).toEqual(['setRGB', 'setHSV', 'setMode']);
    expect(labels('console.')).toEqual(['log']);
  });

  it("completes a key's members after key.", () => {
    expect(labels('function onKeyDown(key) { key.')).toEqual(
      expect.arrayContaining(['id', 'state', 'reportState', 'emit', 'value'])
    );
  });

  it('completes the globals and callbacks at the start of a name', () => {
    expect(labels('ke')).toEqual([
      'keyboard',
      'led',
      'console',
      'Key',
      'AdvancedKey',
      'setTimeout',
      'clearTimeout',
      'loop',
      'onKeyDown',
      'onKeyUp',
      'onExit',
    ]);
    expect(complete('function ke')?.from).toBe('function '.length);
  });

  it('offers nothing for other objects, nor unasked without a name', () => {
    expect(complete('foo.')).toBeNull();
    expect(complete('')).toBeNull();
    expect(complete('x = ')).toBeNull();
    expect(labels('', true)).toContain('keyboard');
  });
});
