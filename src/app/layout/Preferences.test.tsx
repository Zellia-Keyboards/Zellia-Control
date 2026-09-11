import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { THEME_COLORS, bootstrapTheme } from '../../lib/theme';
import { renderApp, resetShellState } from '../testing/render-app';

// The app starts in dark mode without stored preferences.
beforeEach(bootstrapTheme);
afterEach(resetShellState);

const root = document.documentElement;

describe('ThemeSelector', () => {
  it('picks a theme color and deselects it on a second click', async () => {
    const user = userEvent.setup();
    renderApp('/');
    const toggle = await screen.findByRole('button', { name: 'Theme Colors' });
    expect(screen.queryByRole('button', { name: 'Teal' })).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const swatches = ['Indigo', 'Red', 'Orange', 'Amber', 'Lime', 'Green', 'Teal', 'Blue'];
    for (const name of swatches) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('title', name);
    }

    const teal = screen.getByRole('button', { name: 'Teal' });
    await user.click(teal);

    expect(root.style.getPropertyValue('--color-primary')).toBe(THEME_COLORS.teal);
    expect(localStorage.getItem('themeColor')).toBe('teal');
    expect(teal).toHaveAttribute('aria-pressed', 'true');
    expect(teal).toHaveAttribute('title', 'Teal (Click to deselect)');
    expect(teal).toHaveStyle({ backgroundColor: THEME_COLORS.teal });

    await user.click(teal);

    expect(localStorage.getItem('themeColor')).toBe('null');
    expect(root.style.getPropertyValue('--color-primary')).toBe('#fafafafa');
    expect(teal).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('LanguageSwitch', () => {
  it('switches the language and moves the slider', async () => {
    const user = userEvent.setup();
    renderApp('/');
    const english = await screen.findByRole('button', { name: 'EN' });
    const chinese = screen.getByRole('button', { name: '中文' });
    const slider = english.previousElementSibling;
    expect(english).toHaveAttribute('aria-pressed', 'true');
    expect(slider).toHaveStyle({ left: '4px' });

    await user.click(chinese);

    expect(root.lang).toBe('zh');
    expect(localStorage.getItem('language')).toBe('zh');
    expect(chinese).toHaveAttribute('aria-pressed', 'true');
    expect(chinese).toHaveClass('text-white', 'font-semibold');
    expect(slider).toHaveStyle({ left: 'calc(50% + 0px)' });
    expect(screen.getByRole('button', { name: '开始使用' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation')).getByRole('link', { name: '灯光' })
    ).toBeVisible();
  });

  it('tints the slider with the theme color', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(await screen.findByRole('button', { name: 'Theme Colors' }));
    await user.click(screen.getByRole('button', { name: 'Green' }));

    const slider = screen.getByRole('button', { name: 'EN' }).previousElementSibling;
    expect(slider).toHaveStyle({
      background: `linear-gradient(135deg, ${THEME_COLORS.green}CC, ${THEME_COLORS.green}99)`,
      border: `1px solid ${THEME_COLORS.green}33`,
    });
  });
});

describe('DarkModeToggle', () => {
  it('toggles dark mode and persists it', async () => {
    const user = userEvent.setup();
    renderApp('/');
    const toggle = await screen.findByRole('button', { name: /Dark Mode/ });
    expect(root).toHaveClass('dark');

    await user.click(toggle);

    expect(root).not.toHaveClass('dark');
    expect(localStorage.getItem('darkMode')).toBe('false');

    await user.click(toggle);

    expect(root).toHaveClass('dark');
    expect(localStorage.getItem('darkMode')).toBe('true');
  });
});
