import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readJson, readString, writeJson, writeString } from './storage';

function denyStorage(method: 'getItem' | 'setItem') {
  return vi.spyOn(Storage.prototype, method).mockImplementation(() => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  });
}

const parseNumberList = (value: unknown): number[] => {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'number')) {
    throw new TypeError('expected a list of numbers');
  }
  return value;
};

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('readString / writeString', () => {
    it('round-trips a string under the given key', () => {
      writeString('language', 'zh');
      expect(localStorage.getItem('language')).toBe('zh');
      expect(readString('language')).toBe('zh');
    });

    it('returns null for a missing key', () => {
      expect(readString('darkMode')).toBeNull();
    });

    it('returns null when reading throws (privacy mode, blocked storage)', () => {
      localStorage.setItem('darkMode', 'true');
      denyStorage('getItem');
      expect(readString('darkMode')).toBeNull();
    });

    it('returns null when the localStorage getter itself throws', () => {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      });
      expect(readString('darkMode')).toBeNull();
      expect(() => {
        writeString('darkMode', 'true');
      }).not.toThrow();
    });

    it('swallows write failures (quota exceeded, privacy mode)', () => {
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });
      expect(() => {
        writeString('themeColor', 'red');
      }).not.toThrow();
      expect(setItem).toHaveBeenCalledWith('themeColor', 'red');
    });
  });

  describe('readJson / writeJson', () => {
    it('writes JSON and reads it back through the parser', () => {
      writeJson('zellia-layout-config', [1, 2, 3]);
      expect(localStorage.getItem('zellia-layout-config')).toBe('[1,2,3]');
      expect(readJson('zellia-layout-config', parseNumberList, [])).toEqual([1, 2, 3]);
    });

    it('returns the fallback for a missing key without calling the parser', () => {
      const parse = vi.fn(parseNumberList);
      expect(readJson('zellia-layout-config', parse, [0])).toEqual([0]);
      expect(parse).not.toHaveBeenCalled();
    });

    it('returns the fallback for invalid JSON', () => {
      localStorage.setItem('keyboard-profiles', '{not json');
      expect(readJson('keyboard-profiles', parseNumberList, [7])).toEqual([7]);
    });

    it('returns the fallback when the parser rejects the stored shape', () => {
      localStorage.setItem('keyboard-profiles', '{"profiles":"nope"}');
      expect(readJson('keyboard-profiles', parseNumberList, [])).toEqual([]);
    });

    it('returns the fallback when reading throws', () => {
      localStorage.setItem('keyboard-profiles', '[1]');
      denyStorage('getItem');
      expect(readJson('keyboard-profiles', parseNumberList, [])).toEqual([]);
    });

    it('swallows storage write failures', () => {
      denyStorage('setItem');
      expect(() => {
        writeJson('keyboard-profiles', { profiles: [] });
      }).not.toThrow();
    });

    it('passes the parsed JSON value to the parser', () => {
      localStorage.setItem('zellia-layout-config', '{"splitSpacebar":true}');
      const parse = vi.fn((value: unknown) => value);
      readJson('zellia-layout-config', parse, null);
      expect(parse).toHaveBeenCalledWith({ splitSpacebar: true });
    });
  });
});
