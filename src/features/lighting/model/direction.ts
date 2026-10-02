/**
 * Geometry of the lighting direction dial (port of `DirectionSelector.svelte`). A direction is the
 * angle of the dial's indicator, in degrees counter-clockwise from the left: 0° = left, 90° =
 * bottom, 180° = right, 270° = top. The dial is drawn in a 64×64 viewBox with a ring of radius 26
 * around (32, 32).
 */

const CENTER = 32;
const RADIUS = 26;

/** Direction of a pointer at (x, y) relative to the dial centre (screen axes, y down). */
export function directionFromPointer(x: number, y: number): number {
  let angle = Math.atan2(-y, x) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  angle = (angle + 180) % 360;
  return Math.round(angle);
}

/** The degree input's value: clamped to 0–360, anything unparsable is 0. */
export function directionFromInput(value: string): number {
  return Math.min(360, Math.max(0, Number(value) || 0));
}

/** Caption under the degree input. */
export function directionLabel(direction: number): string {
  if (direction === 0) return '← RTL';
  if (direction === 90) return '↑ DTU';
  if (direction === 180) return '→ LTR';
  if (direction === 270) return '↓ UTD';
  return 'Custom';
}

/** The highlighted arc from the left point (our 0°, SVG 180°) to the direction; none at 0°. */
export function dialArcPath(direction: number): string | null {
  if (!(direction > 0)) return null;
  const startSvg = 180;
  const endSvg = (180 + direction + 360) % 360;
  const startX = CENTER + RADIUS * Math.cos((startSvg * Math.PI) / 180);
  const startY = CENTER - RADIUS * Math.sin((startSvg * Math.PI) / 180);
  const endX = CENTER + RADIUS * Math.cos((endSvg * Math.PI) / 180);
  const endY = CENTER - RADIUS * Math.sin((endSvg * Math.PI) / 180);
  const largeArc = direction <= 180 ? 1 : 0;
  return `M ${startX} ${startY} A 26 26 0 ${largeArc} 1 ${endX} ${endY}`;
}

function directionRadians(direction: number): number {
  return (((direction - 180 + 360) % 360) * Math.PI) / 180;
}

/** Centre of the indicator dot on the ring. */
export function dialIndicator(direction: number): { readonly x: number; readonly y: number } {
  const angle = directionRadians(direction);
  return { x: CENTER + RADIUS * Math.cos(angle), y: CENTER - RADIUS * Math.sin(angle) };
}

/** The arrow in the dial centre (drawn inside `translate(32, 32)`). */
export function dialArrowPath(direction: number): string {
  const angle = directionRadians(direction);
  return (
    `M ${Math.cos(angle) * 10} ${-Math.sin(angle) * 10} ` +
    `L ${Math.cos(angle + 2.3) * 5} ${-Math.sin(angle + 2.3) * 5} ` +
    `L ${Math.cos(angle - 2.3) * 5} ${-Math.sin(angle - 2.3) * 5} Z`
  );
}
