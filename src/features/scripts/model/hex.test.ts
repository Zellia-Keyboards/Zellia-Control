import { describe, expect, it } from 'vitest';
import { formatHex } from './hex';

describe('formatHex', () => {
  it('writes 16 bytes a line after their offset', () => {
    const bytes = [0xfb, 0xac, 0x01, 0x00, ...Array.from({ length: 12 }, () => 0x0a), 0xff];
    expect(formatHex(bytes)).toBe(
      '0000  fb ac 01 00 0a 0a 0a 0a 0a 0a 0a 0a 0a 0a 0a 0a\n0010  ff'
    );
    expect(formatHex([1, 2, 3], 2)).toBe('0000  01 02\n0002  03');
    expect(formatHex([])).toBe('');
  });
});
