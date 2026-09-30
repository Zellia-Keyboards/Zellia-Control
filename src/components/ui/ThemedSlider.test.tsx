import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemedSlider } from './ThemedSlider';
import styles from './ThemedSlider.module.css';

afterEach(() => {
  cleanup();
});

describe('ThemedSlider', () => {
  it('renders a themed range input with the given bounds', () => {
    render(
      <ThemedSlider
        value={300}
        min={100}
        max={1000}
        step={50}
        onChange={vi.fn()}
        aria-label="Hold delay"
      />
    );
    const slider = screen.getByRole('slider', { name: 'Hold delay' });
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveValue('300');
    expect(slider).toHaveAttribute('min', '100');
    expect(slider).toHaveAttribute('max', '1000');
    expect(slider).toHaveAttribute('step', '50');
    expect(slider).toHaveAttribute('class', `${styles['themed-slider'] ?? ''} `);
  });

  it('defaults to 0..100 in steps of 1 and appends extra classes', () => {
    render(<ThemedSlider readOnly className="mt-2" />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('0');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveAttribute('step', '1');
    expect(slider).toHaveAttribute('class', `${styles['themed-slider'] ?? ''} mt-2`);
  });

  it('passes other input attributes through', () => {
    render(<ThemedSlider id="hold-delay-slider" disabled readOnly />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('id', 'hold-delay-slider');
    expect(slider).toBeDisabled();
  });

  it('reports input as it happens and follows a controlled value', () => {
    function Controlled() {
      const [value, setValue] = useState(1);
      return (
        <>
          <ThemedSlider
            min={1}
            max={100}
            value={value}
            onChange={event => {
              setValue(Number(event.currentTarget.value));
            }}
          />
          <span data-testid="label">{value}%</span>
        </>
      );
    }
    render(<Controlled />);
    fireEvent.input(screen.getByRole('slider'), { target: { value: '42' } });
    expect(screen.getByTestId('label')).toHaveTextContent('42%');
    expect(screen.getByRole('slider')).toHaveValue('42');
  });

  it('calls onCommit on the native change event only (Svelte onchange)', () => {
    const onCommit = vi.fn();
    const onChange = vi.fn();
    render(<ThemedSlider value={1} onChange={onChange} onCommit={onCommit} />);
    const slider = screen.getByRole('slider');
    fireEvent.input(slider, { target: { value: '2' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.change(slider, { target: { value: '3' } });
    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});
