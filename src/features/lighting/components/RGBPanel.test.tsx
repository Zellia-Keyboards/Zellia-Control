import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RGBBaseMode } from 'emi-keyboard-controller';
import { describe, expect, it, vi } from 'vitest';
import type { RgbBaseConfig } from '../../device';
import { RGBPanel } from './RGBPanel';
import styles from './RGBPanel.module.css';

const CONFIG: RgbBaseConfig = {
  mode: RGBBaseMode.RgbBaseModeRainbow,
  color: { red: 163, green: 55, blue: 252 },
  secondaryColor: { red: 0, green: 0, blue: 0 },
  speed: 20,
  direction: 0,
  density: 0,
  brightness: 255,
};

const RAINBOW =
  'A rainbow that starts at the hue of Color and scrolls across the keyboard. Speed sets how fast, Direction which way, Density how close the colors are.';

function colorInput(name: RegExp): HTMLInputElement {
  const input = screen.getByLabelText(name);
  if (!(input instanceof HTMLInputElement)) throw new Error('expected an input');
  return input;
}

const modeButton = (name: string) => screen.getByRole('button', { name });

describe('RGBPanel', () => {
  it('shows the base configuration with its mode pressed and explained', () => {
    render(<RGBPanel config={CONFIG} onEdit={vi.fn()} title="Base Configuration" />);
    expect(screen.getByRole('region', { name: 'Base Configuration' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Base Configuration' })).toBeVisible();
    // PL-047: edits wait for Save, not for an Apply button.
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Mode & Color' })).toBeInTheDocument();

    expect(modeButton('Rainbow')).toHaveAttribute('aria-pressed', 'true');
    expect(modeButton('Rainbow')).toHaveClass('border-primary', 'bg-primary/20');
    for (const name of ['Off', 'Blank', 'Wave']) {
      expect(modeButton(name)).toHaveAttribute('aria-pressed', 'false');
      expect(modeButton(name)).toHaveClass('glassmorphism-button');
    }
    expect(screen.getByText(RAINBOW)).toHaveClass('text-xs', 'text-gray-500');

    expect(colorInput(/^Color/)).toHaveValue('#a337fc');
    expect(colorInput(/^Color/)).toHaveClass(styles['color-input'] ?? '');
    expect(screen.getByText('#a337fc')).toHaveClass('uppercase');
    expect(colorInput(/^Secondary Color/)).toHaveValue('#000000');

    // The speed is the device value (D11), not ×1000.
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Speed' })).toHaveValue('20');
    expect(screen.getByRole('spinbutton', { name: 'Direction' })).toHaveValue(0);
    expect(screen.getByRole('slider', { name: 'Density' })).toHaveValue('0');
    expect(screen.getByRole('slider', { name: 'Brightness' })).toHaveValue('255');
    expect(screen.getByText('255')).toBeInTheDocument();
  });

  it('falls back to its own title', () => {
    render(<RGBPanel config={CONFIG} onEdit={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Base Configuration' })).toBeVisible();
  });

  it('explains every mode on its button (PL-049)', () => {
    render(<RGBPanel config={CONFIG} onEdit={vi.fn()} />);
    expect(modeButton('Off')).toHaveAccessibleDescription(
      'Turns all lighting off, the per-key effects too.'
    );
    expect(modeButton('Blank')).toHaveAccessibleDescription(
      'No base lighting: only the per-key effects light the keys.'
    );
    expect(modeButton('Rainbow')).toHaveAccessibleDescription(RAINBOW);
    expect(modeButton('Wave')).toHaveAccessibleDescription(
      'Waves that blend Color into Secondary Color and move across the keyboard. Speed sets how fast, Direction which way, Density how close the waves are.'
    );
  });

  it('edits one field per input, in whole degrees for the direction', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn<(patch: Partial<RgbBaseConfig>) => void>();
    render(<RGBPanel config={CONFIG} onEdit={onEdit} />);

    await user.click(modeButton('Wave'));
    fireEvent.input(colorInput(/^Color/), { target: { value: '#00ff00' } });
    fireEvent.input(colorInput(/^Secondary Color/), { target: { value: '#0000ff' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Speed' }), { target: { value: '55' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Direction' }), {
      target: { value: '12.5' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Density' }), { target: { value: '30' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Brightness' }), {
      target: { value: '200' },
    });

    expect(onEdit.mock.calls).toEqual([
      [{ mode: RGBBaseMode.RgbBaseModeWave }],
      [{ color: { red: 0, green: 255, blue: 0 } }],
      [{ secondaryColor: { red: 0, green: 0, blue: 255 } }],
      [{ speed: 55 }],
      [{ direction: 12 }],
      [{ density: 30 }],
      [{ brightness: 200 }],
    ]);
  });

  it('shows every new configuration, its mode included', () => {
    const { rerender } = render(<RGBPanel config={CONFIG} onEdit={vi.fn()} />);
    rerender(
      <RGBPanel
        config={{
          ...CONFIG,
          mode: RGBBaseMode.RgbBaseModeBlank,
          color: { red: 255, green: 96, blue: 0 },
          speed: 64,
          direction: 180,
          density: 12,
          brightness: 99,
        }}
        onEdit={vi.fn()}
      />
    );
    expect(modeButton('Blank')).toHaveAttribute('aria-pressed', 'true');
    expect(modeButton('Rainbow')).toHaveAttribute('aria-pressed', 'false');
    expect(colorInput(/^Color/)).toHaveValue('#ff6000');
    expect(screen.getByText('64%')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Direction' })).toHaveValue(180);
    expect(screen.getByRole('slider', { name: 'Density' })).toHaveValue('12');
    expect(screen.getByRole('slider', { name: 'Brightness' })).toHaveValue('99');
  });
});
