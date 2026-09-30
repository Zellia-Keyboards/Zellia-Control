import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActuationPointControl } from './ActuationPointControl';
import { DeadzoneControl } from './DeadzoneControl';
import { RapidTriggerToggle } from './RapidTriggerToggle';
import { SensitivityControl } from './SensitivityControl';

describe('ActuationPointControl', () => {
  function renderControl(actuationPoint: number, deactivationPoint: number) {
    const onActuationChange = vi.fn();
    const onDeactivationChange = vi.fn();
    render(
      <ActuationPointControl
        actuationPoint={actuationPoint}
        deactivationPoint={deactivationPoint}
        keysSelected={3}
        maxTravelDistance={4}
        onActuationChange={onActuationChange}
        onDeactivationChange={onDeactivationChange}
      />
    );
    return { onActuationChange, onDeactivationChange };
  }

  it('shows both points, the travel zones and the selection count', () => {
    renderControl(2, 1.5);
    expect(screen.getByText('Deactivation: 1.500mm')).toBeInTheDocument();
    expect(screen.getByText('Actuation: 2.000mm')).toBeInTheDocument();
    expect(screen.getByText('3 keys selected')).toBeInTheDocument();
    expect(screen.getByLabelText('Deactivation point')).toHaveValue('1.5');
    expect(screen.queryByText(/too sensitive/)).toBeNull();
  });

  it('warns below 0.3 mm', () => {
    renderControl(0.2, 0.1);
    expect(screen.getByText(/the key may be too sensitive/)).toBeInTheDocument();
  });

  it('keeps deactivation 0.1 mm below actuation, and both within travel', () => {
    const { onActuationChange, onDeactivationChange } = renderControl(2, 1.5);
    fireEvent.change(screen.getByLabelText('Deactivation point'), { target: { value: '1.95' } });
    expect(onDeactivationChange).toHaveBeenLastCalledWith(1.9);
    fireEvent.change(screen.getByLabelText('Actuation point'), { target: { value: '1.55' } });
    expect(onActuationChange).toHaveBeenLastCalledWith(1.6);
    fireEvent.change(screen.getByLabelText('Actuation point (mm)'), { target: { value: '5' } });
    expect(onActuationChange).toHaveBeenLastCalledWith(4);
    fireEvent.change(screen.getByLabelText('Deactivation point (mm)'), { target: { value: '0' } });
    expect(onDeactivationChange).toHaveBeenLastCalledWith(0.005);
  });
});

describe('DeadzoneControl', () => {
  it('keeps the deadzones 0.1 mm apart and within travel', () => {
    const onUpperChange = vi.fn();
    const onLowerChange = vi.fn();
    render(
      <DeadzoneControl
        upperDeadzone={0.5}
        lowerDeadzone={3.5}
        maxTravelDistance={4}
        onUpperChange={onUpperChange}
        onLowerChange={onLowerChange}
      />
    );
    expect(screen.getByText('Start: 0.500mm')).toBeInTheDocument();
    expect(screen.getByText('Bottom: 3.500mm')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Start deadzone'), { target: { value: '0.735' } });
    expect(onUpperChange).toHaveBeenLastCalledWith(0.735);
    fireEvent.change(screen.getByLabelText('Start deadzone'), { target: { value: '3.45' } });
    expect(onUpperChange).toHaveBeenLastCalledWith(3.4);
    fireEvent.change(screen.getByLabelText('Bottom deadzone'), { target: { value: '0.55' } });
    expect(onLowerChange).toHaveBeenLastCalledWith(0.6);
    fireEvent.change(screen.getByLabelText('Bottom deadzone (mm)'), { target: { value: '9' } });
    expect(onLowerChange).toHaveBeenLastCalledWith(4);
  });
});

describe('RapidTriggerToggle and SensitivityControl', () => {
  it('toggles rapid trigger', () => {
    const onToggle = vi.fn();
    render(<RapidTriggerToggle rapidTriggerEnabled={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Rapid Trigger Toggle' }));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('shows one sensitivity, or press and release separately', () => {
    const handlers = {
      onToggleSeparate: vi.fn(),
      onSensitivityChange: vi.fn(),
      onPressChange: vi.fn(),
      onReleaseChange: vi.fn(),
    };
    const { rerender } = render(
      <SensitivityControl
        separateSensitivity={false}
        sensitivityValue={0.5}
        pressSensitivity={0.5}
        releaseSensitivity={0.3}
        {...handlers}
      />
    );
    expect(screen.getByText('0.50 mm')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.8' } });
    expect(handlers.onSensitivityChange).toHaveBeenCalledWith(0.8);
    fireEvent.click(screen.getByRole('switch', { name: 'Separate Sensitivity Toggle' }));
    expect(handlers.onToggleSeparate).toHaveBeenCalledWith(true);

    rerender(
      <SensitivityControl
        separateSensitivity
        sensitivityValue={0.5}
        pressSensitivity={0.5}
        releaseSensitivity={0.3}
        {...handlers}
      />
    );
    const [press, release] = screen.getAllByRole('slider');
    if (!press || !release) throw new Error('missing sliders');
    fireEvent.change(release, { target: { value: '0.4' } });
    expect(handlers.onReleaseChange).toHaveBeenCalledWith(0.4);
    fireEvent.change(press, { target: { value: '0.2' } });
    expect(handlers.onPressChange).toHaveBeenCalledWith(0.2);
    expect(screen.getByText('0.30 mm')).toBeInTheDocument();
  });
});
