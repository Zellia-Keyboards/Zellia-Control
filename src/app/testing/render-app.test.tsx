import { describe, expect, it } from 'vitest';
import { setLanguage } from '../../lib/i18n';
import { setThemeColor, toggleDarkMode } from '../../lib/theme';
import { resetShellState } from './render-app';

describe('resetShellState', () => {
  it('restores the default appearance and forgets the preferences', () => {
    const html = document.documentElement;
    setThemeColor('teal');
    setLanguage('zh');
    if (html.classList.contains('dark')) toggleDarkMode();

    resetShellState();

    expect(html).toHaveClass('dark', 'glassmorphism');
    // The plain primary color of dark mode, not the light one.
    expect(html.style.getPropertyValue('--color-primary')).toBe('#fafafafa');
    expect(html).toHaveAttribute('lang', 'en');
    expect(localStorage.length).toBe(0);
  });
});
