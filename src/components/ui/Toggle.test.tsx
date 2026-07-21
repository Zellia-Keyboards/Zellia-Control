import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toggle } from './Toggle';

afterEach(() => {
  cleanup();
});

const TRACK_MD =
  'relative inline-flex items-center rounded-full transition-all duration-200 focus:outline-none h-6 w-11';

describe('Toggle', () => {
  it('is a switch whose checked state is exposed to assistive technology', () => {
    const { rerender } = render(<Toggle checked={false} />);
    expect(screen.getByRole('switch', { name: 'Toggle' })).toHaveAttribute('aria-checked', 'false');
    rerender(<Toggle checked ariaLabel="Rapid Trigger" />);
    expect(screen.getByRole('switch', { name: 'Rapid Trigger' })).toBeChecked();
  });

  it('reports the next value when clicked or activated from the keyboard', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(<Toggle checked={false} onToggle={onToggle} />);
    await user.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenLastCalledWith(true);
    rerender(<Toggle checked onToggle={onToggle} />);
    screen.getByRole('switch').focus();
    await user.keyboard(' ');
    expect(onToggle).toHaveBeenLastCalledWith(false);
  });

  it('renders the Svelte markup for the default (md, primary, off) switch', () => {
    const { container } = render(<Toggle />);
    expect(container.innerHTML).toBe(
      `<button type="button" role="switch" aria-checked="false" aria-label="Toggle" class="${TRACK_MD}   bg-gray-300 dark:bg-gray-600">` +
        '<span class="inline-block transform rounded-full bg-white transition-all shadow w-4 h-4 translate-x-1"></span>' +
        '</button>'
    );
  });

  it('uses the theme gradient when a primary switch is on', () => {
    render(<Toggle checked />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('class', `${TRACK_MD}   `);
    expect(toggle.style.background).toBe(
      'linear-gradient(135deg, var(--theme-color-primary) 0%, color-mix(in srgb, var(--theme-color-primary) 80%, black) 100%)'
    );
    expect(toggle.querySelector('span')).toHaveClass('translate-x-6');
  });

  it('uses the amber gradient classes and focus ring for amber switches', () => {
    render(<Toggle checked color="amber" size="lg" className="ml-2" />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute(
      'class',
      'relative inline-flex items-center rounded-full transition-all duration-200 focus:outline-none h-7 w-14 ' +
        'focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-offset-gray-900 ml-2 ' +
        'bg-gradient-to-r from-amber-500 to-orange-500'
    );
    expect(toggle).not.toHaveAttribute('style');
    expect(toggle.querySelector('span')).toHaveAttribute(
      'class',
      'inline-block transform rounded-full bg-white transition-all shadow w-5 h-5 translate-x-8'
    );
  });

  it('sizes the small switch', () => {
    render(<Toggle size="sm" />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveClass('h-5', 'w-9');
    expect(toggle.querySelector('span')).toHaveAttribute(
      'class',
      'inline-block transform rounded-full bg-white transition-all shadow h-3 w-3 translate-x-1'
    );
  });

  it('is dimmed and inert when disabled', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<Toggle disabled onToggle={onToggle} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute(
      'class',
      `${TRACK_MD}   bg-gray-300 dark:bg-gray-600 opacity-50 cursor-not-allowed`
    );
    await user.click(toggle);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
