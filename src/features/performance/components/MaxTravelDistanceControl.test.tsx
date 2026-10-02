import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MaxTravelDistanceControl } from './MaxTravelDistanceControl';
import styles from './MaxTravelDistanceControl.module.css';

/** The page owns the travel: reported values come back as the prop, as in the Svelte page. */
function Harness({ onClampValues }: { onClampValues: (maxDistance: number) => void }) {
  const [maxTravelDistance, setMaxTravelDistance] = useState(4.0);
  return (
    <>
      <MaxTravelDistanceControl
        maxTravelDistance={maxTravelDistance}
        onMaxTravelChange={setMaxTravelDistance}
        onClampValues={onClampValues}
      />
      <output>{maxTravelDistance}</output>
    </>
  );
}

function travelInput(): HTMLInputElement {
  const input = screen.getByRole('textbox', { name: 'Switch Travel Distance' });
  if (!(input instanceof HTMLInputElement)) throw new Error('expected an input');
  return input;
}

describe('MaxTravelDistanceControl', () => {
  it('shows the travel in a badge with its unit and tooltip', () => {
    const { container } = render(
      <MaxTravelDistanceControl maxTravelDistance={4} onMaxTravelChange={vi.fn()} />
    );
    expect(travelInput()).toHaveValue('4');
    expect(travelInput()).toHaveAttribute('inputmode', 'decimal');
    expect(travelInput()).toHaveClass(styles['travel-input'] ?? '');
    expect(screen.getByText('mm')).toBeInTheDocument();
    expect(screen.getByText('Switch Travel Distance')).toHaveClass(styles['travel-tooltip'] ?? '');
    expect(container.firstElementChild).toHaveClass(
      styles['travel-badge'] ?? '',
      'group',
      'relative',
      'glassmorphism-card'
    );
  });

  it('reports the typed travel clamped to 1.0–4.0 and lets the page clamp its values', async () => {
    const user = userEvent.setup();
    const onClampValues = vi.fn();
    render(<Harness onClampValues={onClampValues} />);

    await user.clear(travelInput());
    await user.type(travelInput(), '3.5');
    expect(screen.getByRole('status')).toHaveTextContent('3.5');
    expect(travelInput()).toHaveValue('3.5');
    expect(onClampValues).toHaveBeenLastCalledWith(3.5);

    fireEvent.change(travelInput(), { target: { value: '0.5' } });
    expect(screen.getByRole('status')).toHaveTextContent('1');
    // The clamped travel is written back into the input when it changes.
    expect(travelInput()).toHaveValue('1');
    expect(onClampValues).toHaveBeenLastCalledWith(1);
  });

  it('clamps on every keystroke, like the Svelte badge', async () => {
    const user = userEvent.setup();
    render(<Harness onClampValues={vi.fn()} />);
    // "0" becomes 1.0 at once, so typing "0.5" ends at 1.5 mm.
    await user.tripleClick(travelInput());
    await user.keyboard('0.5');
    expect(travelInput()).toHaveValue('1.5');
    expect(screen.getByRole('status')).toHaveTextContent('1.5');
  });

  it('keeps only digits and the first decimal point', () => {
    render(<Harness onClampValues={vi.fn()} />);
    fireEvent.change(travelInput(), { target: { value: '2a.5.7' } });
    expect(travelInput()).toHaveValue('2.5');
    expect(screen.getByRole('status')).toHaveTextContent('2.5');
  });

  it('keeps the typed text while the clamped travel does not change', async () => {
    const user = userEvent.setup();
    const onClampValues = vi.fn();
    render(<Harness onClampValues={onClampValues} />);
    await user.clear(travelInput());
    await user.type(travelInput(), '9');
    expect(travelInput()).toHaveValue('9');
    expect(screen.getByRole('status')).toHaveTextContent('4');
    expect(onClampValues).toHaveBeenLastCalledWith(4);
  });

  it('treats an empty or unparsable input as 4.0 mm', async () => {
    const user = userEvent.setup();
    const onClampValues = vi.fn();
    render(<Harness onClampValues={onClampValues} />);
    await user.clear(travelInput());
    await user.type(travelInput(), '2');
    await user.clear(travelInput());
    expect(screen.getByRole('status')).toHaveTextContent('4');
    expect(travelInput()).toHaveValue('4');
    fireEvent.change(travelInput(), { target: { value: '.' } });
    expect(onClampValues).toHaveBeenLastCalledWith(4);
    expect(screen.getByRole('status')).toHaveTextContent('4');
  });

  it('follows the travel when the page changes it', () => {
    const { rerender } = render(
      <MaxTravelDistanceControl maxTravelDistance={4} onMaxTravelChange={vi.fn()} />
    );
    rerender(<MaxTravelDistanceControl maxTravelDistance={2.5} onMaxTravelChange={vi.fn()} />);
    expect(travelInput()).toHaveValue('2.5');
  });
});
