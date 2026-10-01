/**
 * Macro timing (libamp `macro.c`): an action's delay is in ticks from the start of the macro, and
 * the keyboard ticks at its polling rate. The page shows and takes milliseconds.
 */

/** The largest value a macro timing field (libamp's `uint32_t`) holds. */
export const U32_MAX = 0xffffffff;

/** The controller's default when a model declares no polling rate (`Feature.polling_rate`). */
export const DEFAULT_POLLING_RATE = 1000;

function ticksPerSecond(pollingRate: number): number {
  return Number.isFinite(pollingRate) && pollingRate > 0 ? pollingRate : DEFAULT_POLLING_RATE;
}

export function ticksToMs(ticks: number, pollingRate: number): number {
  return (ticks * 1000) / ticksPerSecond(pollingRate);
}

/** The nearest whole tick; negative and non-finite times are 0 (delays are u32). */
export function msToTicks(ms: number, pollingRate: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.min(Math.round((ms * ticksPerSecond(pollingRate)) / 1000), U32_MAX);
}

/** At most three decimals: a tick of an 8 kHz keyboard is 0.125 ms. */
export function formatMs(ms: number): string {
  return String(Math.round(ms * 1000) / 1000);
}
