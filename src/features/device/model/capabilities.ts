/**
 * What the connected keyboard supports beyond the basics, from its controller's declarations:
 * libamp cannot report it (its `PACKET_DATA_FEATURE` reply is a `//todo`).
 */
import { ScriptLevel } from 'emi-keyboard-controller';
import type { FeatureFlags } from './types';

/** The controller declares macro slots with room for actions. */
export function supportsMacros(feature: FeatureFlags | null): boolean {
  return feature !== null && feature.macroSlots > 0 && feature.macroActions > 0;
}

/** The controller declares a script level: AOT (compiled by the app) or JIT (by the keyboard). */
export function supportsScripts(feature: FeatureFlags | null): boolean {
  return feature !== null && feature.scriptLevel !== ScriptLevel.Disable;
}

/** The most actions a macro slot holds: its last entry is the end marker the firmware stops at. */
export function macroActionLimit(feature: FeatureFlags | null): number {
  return feature !== null && feature.macroActions > 0 ? feature.macroActions - 1 : 0;
}
