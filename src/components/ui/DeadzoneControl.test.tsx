import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeadzoneControl, type DeadzoneControlProps } from './DeadzoneControl';
import styles from './DeadzoneControl.module.css';

function renderControl(props: Partial<DeadzoneControlProps> = {}) {
  const handlers = {
    onUpperChange: vi.fn<(value: number) => void>(),
    onLowerChange: vi.fn<(value: number) => void>(),
  };
  const view = render(
    <DeadzoneControl
      upperDeadzone={0.5}
      lowerDeadzone={3.5}
      maxTravelDistance={4}
      {...handlers}
      {...props}
    />
  );
  return { ...handlers, ...view };
}

const slider = (name: string) => screen.getByRole('slider', { name });
const numberInput = (name: string) => screen.getByRole('spinbutton', { name });

describe('DeadzoneControl', () => {
  it('shows the start and bottom deadzones on a dual-thumb slider', () => {
    const { container } = renderControl();
    expect(container.firstElementChild).toHaveClass(
      styles['deadzone-container'] ?? '',
      'glassmorphism-card'
    );
    expect(
      screen.getByRole('heading', { level: 4, name: 'Key Travel Deadzones' })
    ).toBeInTheDocument();
    expect(screen.getByText(/Adjust the start and bottom deadzone limits/)).toBeInTheDocument();
    expect(screen.getByText('Start: 0.500mm')).toBeInTheDocument();
    expect(screen.getByText('Bottom: 3.500mm')).toBeInTheDocument();

    for (const name of ['Start', 'Bottom']) {
      expect(slider(name)).toHaveAttribute('min', '0.005');
      expect(slider(name)).toHaveAttribute('max', '4');
      expect(slider(name)).toHaveAttribute('step', '0.005');
      expect(slider(name)).toHaveClass(styles['deadzone-slider'] ?? '');
    }
    expect(slider('Start')).toHaveValue('0.5');
    expect(slider('Start')).toHaveClass(styles['start-handle'] ?? '');
    expect(slider('Bottom')).toHaveValue('3.5');
    expect(slider('Bottom')).toHaveClass(styles['bottom-handle'] ?? '');
    expect(numberInput('Start')).toHaveAttribute('max', '3.4');
    expect(numberInput('Bottom')).toHaveAttribute('min', '0.6');
    expect(numberInput('Bottom')).toHaveAttribute('max', '4');
  });

  it('draws both deadzones and the active range to scale of the switch travel', () => {
    const { container } = renderControl({
      upperDeadzone: 0.4,
      lowerDeadzone: 2.4,
      maxTravelDistance: 3.2,
    });
    const [start, active, bottom] =
      container.querySelectorAll<HTMLElement>('.overflow-hidden > div');
    expect(start).toHaveClass(styles['deadzone-pattern'] ?? '');
    expect(start?.style.width).toBe(`${(0.4 / 3.2) * 100}%`);
    expect(active?.style.left).toBe(`${(0.4 / 3.2) * 100}%`);
    expect(active?.style.width).toBe(`${((2.4 - 0.4) / 3.2) * 100}%`);
    expect(bottom).toHaveClass(styles['deadzone-pattern'] ?? '');
    expect(bottom?.style.left).toBe(`${(2.4 / 3.2) * 100}%`);
    expect(bottom?.style.width).toBe(`${((3.2 - 2.4) / 3.2) * 100}%`);
  });

  it('rounds slider values to thousandths and keeps the start 0.1 mm above the bottom', () => {
    const { onUpperChange } = renderControl();
    fireEvent.change(slider('Start'), { target: { value: '1.2345' } });
    expect(onUpperChange).toHaveBeenLastCalledWith(1.235);
    fireEvent.change(slider('Start'), { target: { value: '3.45' } });
    expect(onUpperChange).toHaveBeenLastCalledWith(3.5 - 0.1);
    fireEvent.change(numberInput('Start'), { target: { value: '0' } });
    expect(onUpperChange).toHaveBeenLastCalledWith(0.005);
    fireEvent.change(numberInput('Start'), { target: { value: '3.6' } });
    expect(onUpperChange).toHaveBeenLastCalledWith(3.5 - 0.1);
  });

  it('keeps the bottom 0.1 mm below the start and within the travel', () => {
    const { onLowerChange } = renderControl({ maxTravelDistance: 3.8 });
    fireEvent.change(slider('Bottom'), { target: { value: '2.0004' } });
    expect(onLowerChange).toHaveBeenLastCalledWith(2);
    fireEvent.change(slider('Bottom'), { target: { value: '0.55' } });
    expect(onLowerChange).toHaveBeenLastCalledWith(0.5 + 0.1);
    fireEvent.change(numberInput('Bottom'), { target: { value: '0.2' } });
    expect(onLowerChange).toHaveBeenLastCalledWith(0.5 + 0.1);
    fireEvent.change(numberInput('Bottom'), { target: { value: '3.9' } });
    expect(onLowerChange).toHaveBeenLastCalledWith(3.8);
  });
});
