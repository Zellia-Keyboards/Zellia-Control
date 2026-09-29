import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActuationPointControl, type ActuationPointControlProps } from './ActuationPointControl';
import styles from './ActuationPointControl.module.css';

function renderControl(props: Partial<ActuationPointControlProps> = {}) {
  const handlers = {
    onActuationChange: vi.fn<(value: number) => void>(),
    onDeactivationChange: vi.fn<(value: number) => void>(),
  };
  const view = render(
    <ActuationPointControl
      actuationPoint={2}
      deactivationPoint={1.5}
      keysSelected={0}
      maxTravelDistance={4}
      {...handlers}
      {...props}
    />
  );
  return { ...handlers, ...view };
}

const slider = (name: string) => screen.getByRole('slider', { name });
const numberInput = (name: string) => screen.getByRole('spinbutton', { name });

describe('ActuationPointControl', () => {
  it('shows both points, the selected key count and the dual-thumb slider', () => {
    renderControl({ keysSelected: 3 });
    expect(screen.getByRole('heading', { level: 3, name: 'Actuation Point' })).toBeInTheDocument();
    expect(screen.getByText('Set the actuation point for your keys.')).toBeInTheDocument();
    expect(screen.getByText('Deactivation: 1.500mm')).toBeInTheDocument();
    expect(screen.getByText('Actuation: 2.000mm')).toBeInTheDocument();
    expect(screen.getByText('3 keys selected')).toBeInTheDocument();

    for (const name of ['Deactivation', 'Actuation']) {
      expect(slider(name)).toHaveAttribute('min', '0.005');
      expect(slider(name)).toHaveAttribute('max', '4');
      expect(slider(name)).toHaveAttribute('step', '0.005');
      expect(slider(name)).toHaveClass(styles['actuation-slider'] ?? '');
    }
    expect(slider('Deactivation')).toHaveValue('1.5');
    expect(slider('Deactivation')).toHaveClass(styles['deactivation-handle'] ?? '');
    expect(slider('Actuation')).toHaveValue('2');
    expect(slider('Actuation')).toHaveClass(styles['actuation-handle'] ?? '');

    expect(numberInput('Deactivation')).toHaveValue(1.5);
    expect(numberInput('Deactivation')).toHaveAttribute('min', '0.005');
    expect(numberInput('Deactivation')).toHaveAttribute('max', '1.9');
    expect(numberInput('Actuation')).toHaveValue(2);
    expect(numberInput('Actuation')).toHaveAttribute('min', '1.6');
    expect(numberInput('Actuation')).toHaveAttribute('max', '4');
  });

  it('draws the deadzone, hysteresis and active regions to scale of the switch travel', () => {
    const { container } = renderControl({
      actuationPoint: 2,
      deactivationPoint: 1,
      maxTravelDistance: 3.2,
    });
    const regions = container.querySelectorAll<HTMLElement>('.overflow-hidden > div');
    expect(regions).toHaveLength(3);
    const [deadzone, hysteresis, active] = regions;
    expect(deadzone).toHaveClass(styles['deadzone-pattern'] ?? '');
    expect(deadzone?.style.left).toBe('0%');
    expect(deadzone?.style.width).toBe(`${(1 / 3.2) * 100}%`);
    expect(hysteresis?.style.left).toBe(`${(1 / 3.2) * 100}%`);
    expect(hysteresis?.style.width).toBe(`${((2 - 1) / 3.2) * 100}%`);
    expect(active?.style.left).toBe(`${(2 / 3.2) * 100}%`);
    expect(active?.style.width).toBe(`${((3.2 - 2) / 3.2) * 100}%`);
  });

  it('warns about actuation points below 0.3 mm', () => {
    const { rerender } = renderControl({ actuationPoint: 0.3, deactivationPoint: 0.1 });
    const warning = /too sensitive/;
    expect(screen.queryByText(warning)).not.toBeInTheDocument();
    rerender(
      <ActuationPointControl
        actuationPoint={0.25}
        deactivationPoint={0.1}
        keysSelected={0}
        maxTravelDistance={4}
        onActuationChange={vi.fn()}
        onDeactivationChange={vi.fn()}
      />
    );
    expect(screen.getByText(warning)).toBeInTheDocument();
  });

  it('keeps the deactivation point at least 0.1 mm above the actuation point', () => {
    const { onDeactivationChange } = renderControl();
    fireEvent.change(slider('Deactivation'), { target: { value: '1.2' } });
    expect(onDeactivationChange).toHaveBeenLastCalledWith(1.2);
    fireEvent.change(slider('Deactivation'), { target: { value: '1.95' } });
    expect(onDeactivationChange).toHaveBeenLastCalledWith(2 - 0.1);
    fireEvent.change(numberInput('Deactivation'), { target: { value: '0.001' } });
    expect(onDeactivationChange).toHaveBeenLastCalledWith(0.005);
    fireEvent.change(numberInput('Deactivation'), { target: { value: '3' } });
    expect(onDeactivationChange).toHaveBeenLastCalledWith(2 - 0.1);
  });

  it('keeps the actuation point 0.1 mm below the deactivation point and within the travel', () => {
    const { onActuationChange } = renderControl({ maxTravelDistance: 3 });
    fireEvent.change(slider('Actuation'), { target: { value: '2.5' } });
    expect(onActuationChange).toHaveBeenLastCalledWith(2.5);
    fireEvent.change(slider('Actuation'), { target: { value: '1.55' } });
    expect(onActuationChange).toHaveBeenLastCalledWith(1.5 + 0.1);
    fireEvent.change(numberInput('Actuation'), { target: { value: '1' } });
    expect(onActuationChange).toHaveBeenLastCalledWith(1.5 + 0.1);
    fireEvent.change(numberInput('Actuation'), { target: { value: '3.5' } });
    expect(onActuationChange).toHaveBeenLastCalledWith(3);
  });
});
