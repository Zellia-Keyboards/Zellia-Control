import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ThemeModule from './index';

type Theme = typeof ThemeModule;

/** Fresh module instance, so persisted preferences are read again. */
async function loadTheme(): Promise<Theme> {
  vi.resetModules();
  return import('./index');
}

const root = document.documentElement;

function primaryColor(): string {
  return root.style.getPropertyValue('--color-primary');
}

/** jsdom has no matchMedia; the Svelte store consulted it on start-up. */
function stubPrefersColorScheme(dark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? dark : false,
      media: query,
    }),
  });
}

/** Captures requestAnimationFrame callbacks so frames can be run by hand. */
function captureFrames() {
  const frames: FrameRequestCallback[] = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    frames.push(callback);
    return frames.length;
  });
  return {
    flush() {
      frames.splice(0).forEach(callback => {
        callback(0);
      });
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  root.className = '';
  root.removeAttribute('style');
  stubPrefersColorScheme(false);
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'matchMedia');
});

describe('THEME_COLORS', () => {
  it('keeps the Svelte palette, names and order', async () => {
    const { THEME_COLORS } = await loadTheme();
    expect(Object.entries(THEME_COLORS)).toEqual([
      ['indigo', '#8B5CF6'],
      ['red', '#F87171'],
      ['orange', '#FB923C'],
      ['amber', '#FCD34D'],
      ['lime', '#A3E635'],
      ['green', '#4ADE80'],
      ['teal', '#2DD4BF'],
      ['blue', '#0e9dec'],
    ]);
  });
});

describe('bootstrapTheme', () => {
  it('defaults to dark mode with the plain white primary color', async () => {
    const { bootstrapTheme } = await loadTheme();
    bootstrapTheme();
    expect(root).toHaveClass('dark');
    expect(primaryColor()).toBe('#fafafafa');
  });

  it('defaults to dark even when the OS prefers light (net effect of both Svelte init paths)', async () => {
    stubPrefersColorScheme(false);
    const { bootstrapTheme } = await loadTheme();
    bootstrapTheme();
    expect(root).toHaveClass('dark');
  });

  it('restores a persisted light mode, removing a pre-existing dark class', async () => {
    localStorage.setItem('darkMode', 'false');
    stubPrefersColorScheme(true);
    root.classList.add('dark');
    const { bootstrapTheme } = await loadTheme();
    bootstrapTheme();
    expect(root).not.toHaveClass('dark');
    expect(primaryColor()).toBe('#000000');
  });

  it('restores a persisted dark mode', async () => {
    localStorage.setItem('darkMode', 'true');
    const { bootstrapTheme } = await loadTheme();
    bootstrapTheme();
    expect(root).toHaveClass('dark');
  });

  it('treats any stored value other than "true" as light', async () => {
    localStorage.setItem('darkMode', 'yes');
    const { bootstrapTheme } = await loadTheme();
    bootstrapTheme();
    expect(root).not.toHaveClass('dark');
  });

  it('applies a persisted theme color in either mode', async () => {
    localStorage.setItem('themeColor', 'teal');
    localStorage.setItem('darkMode', 'false');
    const { bootstrapTheme } = await loadTheme();
    bootstrapTheme();
    expect(primaryColor()).toBe('#2DD4BF');
  });

  it.each(['null', '', 'purple', 'constructor', 'toString'])(
    'falls back to the plain color for stored theme color %j',
    async stored => {
      localStorage.setItem('themeColor', stored);
      const { bootstrapTheme } = await loadTheme();
      bootstrapTheme();
      expect(primaryColor()).toBe('#fafafafa');
    }
  );

  it('always enables glassmorphism', async () => {
    const { bootstrapTheme } = await loadTheme();
    bootstrapTheme();
    expect(root).toHaveClass('glassmorphism');
  });

  it('does not disable transitions on the initial load', async () => {
    const { bootstrapTheme } = await loadTheme();
    bootstrapTheme();
    expect(root).not.toHaveClass('no-transition');
  });
});

describe('dark mode toggle', () => {
  it('switches dark to light, persists it and sets the plain black primary color', async () => {
    const { bootstrapTheme, toggleDarkMode } = await loadTheme();
    bootstrapTheme();
    toggleDarkMode();
    expect(root).not.toHaveClass('dark');
    expect(localStorage.getItem('darkMode')).toBe('false');
    expect(primaryColor()).toBe('#000000');
  });

  it('switches light to dark with the plain white primary color', async () => {
    localStorage.setItem('darkMode', 'false');
    const { bootstrapTheme, toggleDarkMode } = await loadTheme();
    bootstrapTheme();
    toggleDarkMode();
    expect(root).toHaveClass('dark');
    expect(localStorage.getItem('darkMode')).toBe('true');
    expect(primaryColor()).toBe('#fafafafa');
  });

  it('keeps a selected theme color when toggling', async () => {
    localStorage.setItem('themeColor', 'amber');
    const { bootstrapTheme, toggleDarkMode } = await loadTheme();
    bootstrapTheme();
    toggleDarkMode();
    expect(primaryColor()).toBe('#FCD34D');
    toggleDarkMode();
    expect(primaryColor()).toBe('#FCD34D');
  });

  it('animates the toggle (no transition guard)', async () => {
    const { bootstrapTheme, toggleDarkMode } = await loadTheme();
    bootstrapTheme();
    toggleDarkMode();
    expect(root).not.toHaveClass('no-transition');
  });

  it('useDarkMode reflects the root class and re-renders on toggle', async () => {
    const { bootstrapTheme, useDarkMode } = await loadTheme();
    bootstrapTheme();
    function Probe() {
      const { isDark, toggle } = useDarkMode();
      return (
        <button type="button" onClick={toggle}>
          {isDark ? 'dark' : 'light'}
        </button>
      );
    }
    render(<Probe />);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('dark');
    act(() => {
      button.click();
    });
    expect(button).toHaveTextContent('light');
    expect(root).not.toHaveClass('dark');
  });
});

describe('theme color', () => {
  it('reads the persisted color', async () => {
    localStorage.setItem('themeColor', 'red');
    const { getThemeColor } = await loadTheme();
    expect(getThemeColor()).toBe('red');
  });

  it.each(['null', '', 'magenta', '__proto__'])('reads %j as no color', async stored => {
    localStorage.setItem('themeColor', stored);
    const { getThemeColor } = await loadTheme();
    expect(getThemeColor()).toBeNull();
  });

  it('applies and persists a color without transitions until the next frame', async () => {
    const frames = captureFrames();
    const { setThemeColor, getThemeColor } = await loadTheme();
    setThemeColor('green');
    expect(getThemeColor()).toBe('green');
    expect(localStorage.getItem('themeColor')).toBe('green');
    expect(primaryColor()).toBe('#4ADE80');
    expect(root).toHaveClass('no-transition');
    frames.flush();
    expect(root).not.toHaveClass('no-transition');
  });

  it('clearing the color stores "null" and uses the plain color for the current mode', async () => {
    captureFrames();
    const { bootstrapTheme, setThemeColor, toggleDarkMode } = await loadTheme();
    bootstrapTheme();
    setThemeColor('blue');
    setThemeColor(null);
    expect(localStorage.getItem('themeColor')).toBe('null');
    expect(primaryColor()).toBe('#fafafafa');
    toggleDarkMode();
    setThemeColor('lime');
    setThemeColor(null);
    expect(primaryColor()).toBe('#000000');
  });

  it('useThemeColor re-renders on change', async () => {
    captureFrames();
    const { useThemeColor } = await loadTheme();
    function Probe() {
      const { color, setColor } = useThemeColor();
      return (
        <button
          type="button"
          onClick={() => {
            setColor(color === 'orange' ? null : 'orange');
          }}
        >
          {color ?? 'none'}
        </button>
      );
    }
    render(<Probe />);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('none');
    act(() => {
      button.click();
    });
    expect(button).toHaveTextContent('orange');
    act(() => {
      button.click();
    });
    expect(button).toHaveTextContent('none');
  });
});
