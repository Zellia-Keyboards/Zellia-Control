/**
 * Travel-distance units. The device stores distances and thresholds as fractions of full travel
 * (0..1); the UI shows millimetres of a 4.0 mm travel (the 1.0–4.0 mm "switch travel" control only
 * bounds sliders). Conversions are symmetric (spec D12).
 */

/** Full key travel the fractions refer to, in millimetres. */
export const TRAVEL_MM = 4.0;

export function fractionToMm(fraction: number): number {
  return fraction * TRAVEL_MM;
}

export function mmToFraction(mm: number): number {
  return mm / TRAVEL_MM;
}

/**
 * The lower deadzone is stored as the travel below the bottom-out point: `(4.0 − bottom) / 4.0`.
 * The UI edits the bottom-out point itself.
 */
export function lowerDeadzoneToBottomMm(lowerDeadzone: number): number {
  return TRAVEL_MM - fractionToMm(lowerDeadzone);
}

export function bottomMmToLowerDeadzone(bottomMm: number): number {
  return (TRAVEL_MM - bottomMm) / TRAVEL_MM;
}
