/**
 * Dark mode and theme color (port of the Svelte `DarkModeStore`).
 *
 * Preferences are persisted under `darkMode` ('true' | 'false') and `themeColor` (a palette
 * name or 'null'), exactly as the Svelte app did, and applied to `<html>`: the `dark` class,
 * the always-on `glassmorphism` class and the `--color-primary` custom property. Without a
 * theme color, the primary color is plain white on dark and black on light.
 */
import { useSyncExternalStore } from 'react';
import { createSignal } from '../signal';
import { readString, writeString } from '../storage';

export const THEME_COLORS = {
  indigo: '#8B5CF6', // Enhanced indigo for better dark mode visibility
  red: '#F87171', // Lighter red for dark mode
  orange: '#FB923C', // Lighter orange
  amber: '#FCD34D', // Lighter amber
  lime: '#A3E635', // Brighter lime
  green: '#4ADE80', // Lighter green
  teal: '#2DD4BF', // Lighter teal
  blue: '#0e9dec', // Alipay blue
} as const;

export type ThemeColorName = keyof typeof THEME_COLORS;

const DARK_MODE_KEY = 'darkMode';
const THEME_COLOR_KEY = 'themeColor';

export function isThemeColorName(value: unknown): value is ThemeColorName {
  return typeof value === 'string' && Object.hasOwn(THEME_COLORS, value);
}

function plainColor(isDark: boolean): string {
  return isDark ? '#fafafafa' : '#000000';
}

function root(): HTMLElement {
  return document.documentElement;
}

function setPrimaryColor(color: string): void {
  root().style.setProperty('--color-primary', color);
}

// --- Theme color ------------------------------------------------------------------------------

const themeColorChanged = createSignal();
let themeColor: ThemeColorName | null | undefined;

function readPersistedThemeColor(): ThemeColorName | null {
  const stored = readString(THEME_COLOR_KEY);
  return isThemeColorName(stored) ? stored : null;
}

export function getThemeColor(): ThemeColorName | null {
  if (themeColor === undefined) themeColor = readPersistedThemeColor();
  return themeColor;
}

/** Applies `change` with CSS transitions disabled until the next frame (no color fade). */
function withoutTransitions(change: () => void): void {
  const element = root();
  element.classList.add('no-transition');
  change();
  element.getBoundingClientRect(); // flush styles while transitions are off
  requestAnimationFrame(() => {
    element.classList.remove('no-transition');
  });
}

export function setThemeColor(color: ThemeColorName | null): void {
  withoutTransitions(() => {
    if (color === null) {
      writeString(THEME_COLOR_KEY, 'null');
      setPrimaryColor(plainColor(root().classList.contains('dark')));
    } else {
      writeString(THEME_COLOR_KEY, color);
      setPrimaryColor(THEME_COLORS[color]);
    }
    if (color !== themeColor) {
      themeColor = color;
      themeColorChanged.emit();
    }
  });
}

export function useThemeColor(): {
  color: ThemeColorName | null;
  setColor: (color: ThemeColorName | null) => void;
} {
  const color = useSyncExternalStore(themeColorChanged.subscribe, getThemeColor);
  return { color, setColor: setThemeColor };
}

// --- Dark mode --------------------------------------------------------------------------------

const darkModeChanged = createSignal();

/** The `dark` class on `<html>` is the source of truth, as in the Svelte toggle. */
function getIsDark(): boolean {
  return root().classList.contains('dark');
}

export function toggleDarkMode(): void {
  const isDark = getIsDark();
  writeString(DARK_MODE_KEY, String(!isDark));
  // Update the plain primary color first, then let the mode change transition smoothly.
  if (getThemeColor() === null) setPrimaryColor(plainColor(!isDark));
  root().classList.toggle('dark', !isDark);
  darkModeChanged.emit();
}

export function useDarkMode(): { isDark: boolean; toggle: () => void } {
  const isDark = useSyncExternalStore(darkModeChanged.subscribe, getIsDark);
  return { isDark, toggle: toggleDarkMode };
}

// --- Initial load -----------------------------------------------------------------------------

/**
 * Applies the persisted preferences to `<html>`; call once before the first render.
 *
 * The Svelte store initialised twice on load: the store factory honoured a stored value or
 * else the OS `prefers-color-scheme`, then a module-level block re-applied the stored value or
 * else dark. The second block only ever adds `dark`, so the net result is the stored value,
 * defaulting to dark regardless of the OS setting — which is what this reproduces.
 */
export function bootstrapTheme(): void {
  const storedDarkMode = readString(DARK_MODE_KEY);
  const isDark = storedDarkMode !== null ? storedDarkMode === 'true' : true;
  root().classList.toggle('dark', isDark);

  const color = getThemeColor();
  setPrimaryColor(color === null ? plainColor(isDark) : THEME_COLORS[color]);

  root().classList.add('glassmorphism');
  darkModeChanged.emit();
}
