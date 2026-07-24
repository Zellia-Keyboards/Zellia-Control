import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setLanguage } from '../../lib/i18n';
import { NoKeySelected } from './NoKeySelected';

beforeEach(() => {
  setLanguage('en');
});

afterEach(() => {
  cleanup();
  setLanguage('en');
});

describe('NoKeySelected', () => {
  it('renders the Svelte empty state markup', () => {
    const { container } = render(<NoKeySelected />);
    expect(container.innerHTML).toBe(
      '<div class="flex-1 flex items-center justify-center ">' +
        '<div class="text-center max-w-md mx-auto">' +
        '<div class="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100 dark:bg-gray-800 glassmorphism-card">' +
        '<svg class="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>' +
        '</svg></div>' +
        '<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No Key Selected</h3>' +
        '<p class="text-gray-600 dark:text-gray-400 mb-4">Select a key from the keyboard layout to configure its behavior</p>' +
        '</div></div>'
    );
  });

  it('shows the translated tip with a space after the label', () => {
    render(<NoKeySelected tipKey="advancedkey.tapHoldTip" className="p-8" />);
    const tip = screen.getByText(/Tap-hold keys are perfect/).closest('div');
    expect(tip).toHaveAttribute(
      'class',
      'border rounded-lg p-4 text-sm bg-primary-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700 text-primary-800 dark:text-primary-200 glassmorphism-card'
    );
    expect(tip).toHaveTextContent(
      'Tip: Tap-hold keys are perfect for modifier keys that can also function as regular keys when tapped quickly'
    );
    expect(tip?.querySelector('strong')).toHaveTextContent('Tip:');
    expect(tip?.parentElement?.parentElement).toHaveClass('p-8');
  });

  it('follows the language', () => {
    render(<NoKeySelected tipKey="advancedkey.toggleTip" />);
    act(() => {
      setLanguage('zh');
    });
    expect(screen.getByRole('heading', { name: '未选择按键' })).toBeInTheDocument();
    expect(screen.getByText('提示:')).toBeInTheDocument();
  });
});
