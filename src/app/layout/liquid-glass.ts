import { useCallback, useState, type MouseEvent } from 'react';

export interface LiquidGlass {
  /** Pointer position relative to the button, in px (0, 0 until the pointer moves over it). */
  readonly x: number;
  readonly y: number;
  readonly onMouseMove: (event: MouseEvent<HTMLElement>) => void;
}

/** Tracks the pointer over a button for the "liquid glass" highlight of the Svelte buttons. */
export function useLiquidGlass(): LiquidGlass {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const onMouseMove = useCallback((event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, []);
  return { x: position.x, y: position.y, onMouseMove };
}

/**
 * The buttons' `background: radial-gradient(…), linear-gradient(…); background-size: 100% 100%,
 * 200% 100%` as one `background` value: React only re-applies the properties that changed, and
 * setting the shorthand alone on a pointer move would reset the sizes.
 */
export function liquidGlassBackground(radius: number, x: number, y: number): string {
  return (
    `radial-gradient(circle ${radius}px at ${x}px ${y}px, rgba(255,255,255,0.3), transparent) ` +
    '0% 0% / 100% 100%, ' +
    'linear-gradient(to right, var(--color-primary-600), var(--color-primary-500), ' +
    'var(--color-primary-600)) 0% 0% / 200% 100%'
  );
}

/** The glow layer that follows the pointer while the button is hovered. */
export function liquidGlassGlow(radius: number, x: number, y: number): string {
  return `radial-gradient(circle ${radius}px at ${x}px ${y}px, rgba(255,255,255,0.4), transparent)`;
}
