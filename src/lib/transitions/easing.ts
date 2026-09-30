/** Easing functions used by the ported transitions (from `svelte/easing`). */

export function linear(t: number): number {
  return t;
}

export function cubicOut(t: number): number {
  const f = t - 1.0;
  return f * f * f + 1.0;
}
