import { describe, expect, it } from 'vitest';
import {
  dialArcPath,
  dialArrowPath,
  dialIndicator,
  directionFromInput,
  directionFromPointer,
  directionLabel,
} from './direction';

describe('directionFromPointer', () => {
  it('measures clockwise from the left of the dial centre, in whole degrees', () => {
    expect(directionFromPointer(-10, 0)).toBe(0);
    expect(directionFromPointer(0, 10)).toBe(90);
    expect(directionFromPointer(10, 0)).toBe(180);
    expect(directionFromPointer(0, -10)).toBe(270);
    expect(directionFromPointer(-10, 10)).toBe(45);
    expect(directionFromPointer(-10, 0.1)).toBe(1);
  });

  it('rounds up to 360 just before a full turn, as the Svelte dial did', () => {
    expect(directionFromPointer(-10, -0.01)).toBe(360);
  });
});

describe('directionFromInput', () => {
  it('clamps typed degrees to 0–360 and treats anything else as 0', () => {
    expect(directionFromInput('45')).toBe(45);
    expect(directionFromInput('12.5')).toBe(12.5);
    expect(directionFromInput('400')).toBe(360);
    expect(directionFromInput('-5')).toBe(0);
    expect(directionFromInput('')).toBe(0);
  });
});

describe('directionLabel', () => {
  it('names the four axis directions', () => {
    expect(directionLabel(0)).toBe('← RTL');
    expect(directionLabel(90)).toBe('↑ DTU');
    expect(directionLabel(180)).toBe('→ LTR');
    expect(directionLabel(270)).toBe('↓ UTD');
    expect(directionLabel(45)).toBe('Custom');
    expect(directionLabel(360)).toBe('Custom');
  });
});

describe('dial geometry (64×64 viewBox, radius 26)', () => {
  it('draws no arc at 0° and an arc from the left point otherwise', () => {
    expect(dialArcPath(0)).toBeNull();
    // Large-arc flag set up to 180°, cleared beyond (the Svelte markup's flags).
    expect(dialArcPath(180)).toBe('M 6 31.999999999999996 A 26 26 0 1 1 58 32');
    expect(dialArcPath(270)).toBe('M 6 31.999999999999996 A 26 26 0 0 1 32 6');
  });

  it('places the indicator on the ring where the direction starts', () => {
    expect(dialIndicator(0)).toEqual({ x: 6, y: 31.999999999999996 });
    expect(dialIndicator(180)).toEqual({ x: 58, y: 32 });
    expect(dialIndicator(270)).toEqual({ x: 32, y: 6 });
  });

  it('points the centre arrow the same way', () => {
    expect(dialArrowPath(180)).toBe(
      `M 10 0 L ${Math.cos(2.3) * 5} ${-Math.sin(2.3) * 5} L ${Math.cos(-2.3) * 5} ${-Math.sin(-2.3) * 5} Z`
    );
  });
});
