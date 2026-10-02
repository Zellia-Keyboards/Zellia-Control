/**
 * Checks and comparisons for plain domain values, shared by the device layer. Every value is
 * range-checked before it reaches the wire because the controller's DataView setters wrap
 * out-of-range values silently.
 */

/** Throws a RangeError unless `value` is an integer from 0 to `max`. */
export function assertUint(value: number, max: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError(`${label} ${value} is out of range 0..${max}`);
  }
}

/** Throws a RangeError unless `value` is a fraction of full travel (0..1). */
export function assertFraction(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} ${value} is not a fraction of travel (0..1)`);
  }
}

/** `value` clamped to 0..1; non-finite values become 0. */
export function clampFraction(value: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
}

/** Structural equality of plain values (primitives, arrays and plain objects). */
export function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every(key => Object.hasOwn(b, key) && isEqual(Reflect.get(a, key), Reflect.get(b, key)))
  );
}
