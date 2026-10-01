import { describe, expect, it } from 'vitest';
import { SCRIPT_BUFFER_BYTES, exceedsScriptBuffer, scriptSourceBytes } from './limits';

describe('script limits', () => {
  it("count the source in UTF-8 with the controller's terminating NUL", () => {
    expect(scriptSourceBytes('')).toBe(1);
    expect(scriptSourceBytes('abc')).toBe(4);
    expect(scriptSourceBytes('é')).toBe(3);
  });

  it("compare with libamp's default 1 KB buffers", () => {
    expect(SCRIPT_BUFFER_BYTES).toBe(1024);
    expect(exceedsScriptBuffer(1024)).toBe(false);
    expect(exceedsScriptBuffer(1025)).toBe(true);
  });
});
