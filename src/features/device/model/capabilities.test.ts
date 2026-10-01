import { ScriptLevel } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import { macroActionLimit, supportsMacros, supportsScripts } from './capabilities';
import type { FeatureFlags } from './types';

const ZELLIA: FeatureFlags = {
  advancedKeys: true,
  rgb: true,
  scriptLevel: ScriptLevel.Disable,
  pollingRate: 8000,
  macroSlots: 0,
  macroActions: 0,
  bootloader: { enabled: true, download: true, upload: true },
};
const TRINITY: FeatureFlags = {
  ...ZELLIA,
  scriptLevel: ScriptLevel.AOT,
  macroSlots: 4,
  macroActions: 128,
};

describe('capabilities', () => {
  it('support macros when the controller declares slots with room for actions', () => {
    expect(supportsMacros(TRINITY)).toBe(true);
    expect(supportsMacros(ZELLIA)).toBe(false);
    expect(supportsMacros({ ...ZELLIA, macroSlots: 4 })).toBe(false);
    expect(supportsMacros(null)).toBe(false);
  });

  it('support scripts at every script level but Disable', () => {
    expect(supportsScripts(TRINITY)).toBe(true);
    expect(supportsScripts({ ...ZELLIA, scriptLevel: ScriptLevel.JIT })).toBe(true);
    expect(supportsScripts(ZELLIA)).toBe(false);
    expect(supportsScripts(null)).toBe(false);
  });

  it('keep the last entry of every slot for the end marker', () => {
    expect(macroActionLimit(TRINITY)).toBe(127);
    expect(macroActionLimit(ZELLIA)).toBe(0);
    expect(macroActionLimit(null)).toBe(0);
  });
});
