import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RapidTriggerToggle } from './RapidTriggerToggle';
import { SensitivityControl, type SensitivityControlProps } from './SensitivityControl';

function renderSensitivity(props: Partial<SensitivityControlProps> = {}) {
  const handlers = {
    onToggleSeparate: vi.fn<(value: boolean) => void>(),
    onSensitivityChange: vi.fn<(value: number) => void>(),
    onPressChange: vi.fn<(value: number) => void>(),
    onReleaseChange: vi.fn<(value: number) => void>(),
  };
  render(
    <SensitivityControl
      separateSensitivity={false}
      sensitivityValue={0.5}
      pressSensitivity={0.3}
      releaseSensitivity={0.7}
      {...handlers}
      {...props}
    />
  );
  return handlers;
}

describe('SensitivityControl', () => {
  it('shows one sensitivity slider for press and release by default', () => {
    renderSensitivity();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Rapid Trigger Sensitivity' })
    ).toBeInTheDocument();
    expect(screen.getByText('Adjust the sensitivity for rapid trigger.')).toBeInTheDocument();
    expect(screen.getByText('Separate Press/Release')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Separate Sensitivity Toggle' })).not.toBeChecked();
    expect(screen.getByText('⇅ SENSITIVITY')).toBeInTheDocument();
    expect(screen.getByText('0.50 mm')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();

    const slider = screen.getByRole('slider', { name: 'SENSITIVITY' });
    expect(slider).toHaveValue('0.5');
    expect(slider).toHaveAttribute('min', '0.01');
    expect(slider).toHaveAttribute('max', '2');
    expect(slider).toHaveAttribute('step', '0.01');
    expect(screen.getAllByRole('slider')).toHaveLength(1);
  });

  it('reports slider input and the separate switch', async () => {
    const user = userEvent.setup();
    const handlers = renderSensitivity();
    fireEvent.change(screen.getByRole('slider', { name: 'SENSITIVITY' }), {
      target: { value: '0.73' },
    });
    expect(handlers.onSensitivityChange).toHaveBeenLastCalledWith(0.73);
    await user.click(screen.getByRole('switch', { name: 'Separate Sensitivity Toggle' }));
    expect(handlers.onToggleSeparate).toHaveBeenLastCalledWith(true);
  });

  it('shows separate press and release sliders when they are separate', () => {
    const handlers = renderSensitivity({ separateSensitivity: true });
    expect(screen.getByRole('switch', { name: 'Separate Sensitivity Toggle' })).toBeChecked();
    expect(screen.getByText('↓ PRESS SENSITIVITY')).toBeInTheDocument();
    expect(screen.getByText('↑ RELEASE SENSITIVITY')).toBeInTheDocument();
    expect(screen.getByText('0.30 mm')).toBeInTheDocument();
    expect(screen.getByText('0.70 mm')).toBeInTheDocument();
    expect(screen.getAllByText('HIGH')).toHaveLength(2);
    expect(screen.queryByRole('slider', { name: 'SENSITIVITY' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('slider', { name: 'PRESS SENSITIVITY' }), {
      target: { value: '0.2' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'RELEASE SENSITIVITY' }), {
      target: { value: '1.5' },
    });
    expect(handlers.onPressChange).toHaveBeenLastCalledWith(0.2);
    expect(handlers.onReleaseChange).toHaveBeenLastCalledWith(1.5);
  });
});

describe('RapidTriggerToggle', () => {
  it('shows the rapid trigger switch and its description', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn<(value: boolean) => void>();
    const { rerender } = render(
      <RapidTriggerToggle rapidTriggerEnabled={false} onToggle={onToggle} />
    );
    expect(
      screen.getByRole('heading', { level: 3, name: 'Enable Rapid Trigger' })
    ).toBeInTheDocument();
    expect(screen.getByText(/Rapid Trigger dynamically actuates/)).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Rapid Trigger Toggle' }));
    expect(onToggle).toHaveBeenLastCalledWith(true);

    rerender(<RapidTriggerToggle rapidTriggerEnabled onToggle={onToggle} />);
    expect(screen.getByRole('switch', { name: 'Rapid Trigger Toggle' })).toBeChecked();
  });
});
