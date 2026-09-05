import { useLayoutEffect, useState } from 'react';

/** Pixels per key unit until `--key-unit-size` is read (and when it is not a number). */
export const DEFAULT_KEY_UNIT_SIZE = 59;

/**
 * The responsive key unit size in pixels: app.css sets `--key-unit-size` per breakpoint. Like
 * the Svelte keyboard, the first render uses 59 px and the variable is read once mounted and on
 * every window resize, so keys scale through their CSS transitions.
 */
export function useKeyUnitSize(): number {
  const [size, setSize] = useState(DEFAULT_KEY_UNIT_SIZE);

  useLayoutEffect(() => {
    const update = () => {
      const value = getComputedStyle(document.documentElement).getPropertyValue('--key-unit-size');
      // An unset property keeps the current size, as in the Svelte components.
      if (value) setSize(Number.parseInt(value, 10) || DEFAULT_KEY_UNIT_SIZE);
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
    };
  }, []);

  return size;
}
