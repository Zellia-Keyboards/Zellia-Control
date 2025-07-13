/**
 * Color utility functions with Firefox compatibility
 */

// Check if browser supports color-mix()
const supportsColorMix = (() => {
  if (typeof window === 'undefined') return false;
  try {
    const testEl = document.createElement('div');
    testEl.style.background = 'color-mix(in srgb, black 50%, white)';
    return testEl.style.background !== '';
  } catch {
    return false;
  }
})();

/**
 * Create color-mix with fallback for Firefox
 * @param space - Color space (usually 'srgb')
 * @param color1 - First color with percentage
 * @param color2 - Second color
 * @param fallback - Fallback color for unsupported browsers
 */
export function colorMix(
  space: string,
  color1: string,
  color2: string,
  fallback: string
): string {
  if (supportsColorMix) {
    return `color-mix(in ${space}, ${color1}, ${color2})`;
  }
  return fallback;
}

/**
 * Theme-aware color mixing with fallbacks
 */
export function themeColorMix(
  percentage: number,
  darkMode: boolean,
  primaryVar: string = 'var(--theme-color-primary)',
  fallbackDark: string = 'rgba(0, 0, 0, 0.3)',
  fallbackLight: string = 'rgba(255, 255, 255, 0.7)'
): string {
  const baseColor = darkMode ? 'black' : 'white';
  const fallback = darkMode ? fallbackDark : fallbackLight;
  
  return colorMix('srgb', `${primaryVar} ${percentage}%`, baseColor, fallback);
}

/**
 * Get appropriate background color for glassmorphism cards
 */
export function getGlassmorphismBackground(
  darkMode: boolean,
  intensity: number = 5
): string {
  return themeColorMix(
    intensity,
    darkMode,
    'var(--theme-color-primary)',
    `rgba(0, 0, 0, ${0.2 + intensity * 0.01})`,
    `rgba(255, 255, 255, ${0.6 + intensity * 0.01})`
  );
}

/**
 * Get appropriate border color for glassmorphism elements
 */
export function getGlassmorphismBorder(
  darkMode: boolean,
  intensity: number = 20
): string {
  return themeColorMix(
    intensity,
    darkMode,
    'var(--theme-color-primary)',
    `rgba(255, 255, 255, ${0.1 + intensity * 0.005})`,
    `rgba(255, 255, 255, ${0.3 + intensity * 0.005})`
  );
}
