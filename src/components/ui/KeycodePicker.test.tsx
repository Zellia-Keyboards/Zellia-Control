import { KeyModifier, LayerControlKeycode, MouseKeycode } from 'emi-keyboard-controller';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTION_CATEGORIES, kc } from '../../features/keycodes';
import { installFakeAnimations, type FakeAnimations } from '../../lib/transitions/testing';
import { KeycodePicker, type KeycodePickerCategory } from './KeycodePicker';

let animations: FakeAnimations;

beforeEach(() => {
  vi.useFakeTimers();
  animations = installFakeAnimations();
});

afterEach(() => {
  animations.uninstall();
  vi.useRealTimers();
});

function section(name: string): HTMLElement {
  const toggle = screen.getByRole('button', { name });
  const container = toggle.parentElement;
  if (!container) throw new Error(`no section ${name}`);
  return container;
}

describe('KeycodePicker', () => {
  it('opens the default section and emits full keycodes of every category (D15)', () => {
    const onActionSelect = vi.fn();
    render(
      <KeycodePicker
        categories={ACTION_CATEGORIES}
        title="Tap Action"
        selectedAction={null}
        onActionSelect={onActionSelect}
      />
    );
    expect(screen.getByRole('button', { name: 'Basic' })).toHaveAttribute('aria-expanded', 'true');
    for (const name of ['Layer', 'System', 'Mouse']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-expanded', 'false');
    }

    fireEvent.click(within(section('Basic')).getByRole('button', { name: 'Left Shift' }));
    fireEvent.click(screen.getByRole('button', { name: 'Layer' }));
    fireEvent.click(within(section('Layer')).getByRole('button', { name: 'MO(1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mouse' }));
    fireEvent.click(within(section('Mouse')).getByRole('button', { name: 'Wheel Up' }));

    expect(onActionSelect.mock.calls).toEqual([
      [kc.modifier(KeyModifier.KeyLeftShift)],
      [kc.layer(LayerControlKeycode.LayerMomentary, 1)],
      [kc.mouse(MouseKeycode.MouseWheelUp)],
    ]);
  });

  it('marks the selected action pressed', () => {
    render(
      <KeycodePicker
        categories={ACTION_CATEGORIES}
        description="Pick one"
        selectedAction={kc.modifier(KeyModifier.KeyLeftCtrl)}
        onActionSelect={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Left Ctrl' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Esc' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('uses the Svelte card classes with and without a description', () => {
    const { container, rerender } = render(
      <KeycodePicker
        categories={ACTION_CATEGORIES}
        title="T"
        selectedAction={null}
        onActionSelect={() => {}}
      />
    );
    expect(container.firstElementChild).toHaveClass(
      'rounded-lg border border-gray-200 dark:border-gray-600 p-4 sm:p-6 bg-white dark:bg-gray-900 glassmorphism-card',
      { exact: true }
    );
    rerender(
      <KeycodePicker
        categories={ACTION_CATEGORIES}
        description="D"
        selectedAction={null}
        onActionSelect={() => {}}
      />
    );
    expect(container.firstElementChild).toHaveClass(
      'rounded-lg border p-4 sm:p-6 glassmorphism-card',
      {
        exact: true,
      }
    );
  });

  it('slides a section in and out (300 ms, y axis), but not the default one on mount', () => {
    render(
      <KeycodePicker
        categories={ACTION_CATEGORIES}
        title="T"
        selectedAction={null}
        onActionSelect={() => {}}
      />
    );
    expect(animations.all).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Basic' }));
    const basic = within(section('Basic')).getByRole('button', { name: 'Esc' }).closest('.px-4');
    expect(basic).not.toBeNull();
    // The outro keeps the content mounted until it finished.
    act(() => {
      vi.advanceTimersByTime(0);
    });
    const outro = animations.all.at(-1);
    expect(outro?.duration).toBe(300);
    expect(outro?.keyframes[0]).toMatchObject({ overflow: 'hidden' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(within(section('Basic')).queryByRole('button', { name: 'Esc' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'System' }));
    expect(within(section('System')).getByRole('button', { name: 'Vol+' })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(animations.all.at(-1)?.duration).toBe(300);
  });

  it('shows the categories it is given, the first one open', () => {
    const categories: readonly KeycodePickerCategory[] = [
      { name: 'Letters', actions: [{ name: 'A', keycode: 0x04 }] },
      { name: 'Digits', actions: [{ name: '1', keycode: 0x1e }] },
    ];
    const onActionSelect = vi.fn();
    render(
      <KeycodePicker
        categories={categories}
        selectedAction={null}
        onActionSelect={onActionSelect}
      />
    );
    expect(screen.getByRole('button', { name: 'Letters' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Digits' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(onActionSelect).toHaveBeenCalledWith(0x04);
  });
});
