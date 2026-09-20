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

function colorInput(name: RegExp): HTMLInputElement {
  const input = screen.getByLabelText(name);
  if (!(input instanceof HTMLInputElement)) throw new Error('expected an input');
  return input;
}

const modeButton = (name: string) => screen.getByRole('button', { name });

describe('RGBPanel', () => {
  it('shows the base configuration with its mode selected', () => {
    render(<RGBPanel baseConfig={CONFIG} onConfigChange={vi.fn()} title="Base Configuration" />);
    expect(screen.getByRole('region', { name: 'Base Configuration' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Base Configuration' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Mode & Color' })).toBeInTheDocument();

    expect(modeButton('Rainbow')).toHaveAttribute('aria-pressed', 'true');
    expect(modeButton('Rainbow')).toHaveClass('border-primary', 'bg-primary/20');
    for (const name of ['Off', 'Blank', 'Wave']) {
      expect(modeButton(name)).toHaveAttribute('aria-pressed', 'false');
      expect(modeButton(name)).toHaveClass('glassmorphism-button');
    }

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
    render(<RGBPanel baseConfig={CONFIG} onConfigChange={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Base Configuration' })).toBeVisible();
  });

  it('applies every edit at once when Apply is clicked', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn<(config: RgbBaseConfig) => void>();
    render(<RGBPanel baseConfig={CONFIG} onConfigChange={onConfigChange} />);

    await user.click(modeButton('Wave'));
    expect(modeButton('Wave')).toHaveAttribute('aria-pressed', 'true');
    expect(modeButton('Rainbow')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.input(colorInput(/^Color/), { target: { value: '#00ff00' } });
    fireEvent.input(colorInput(/^Secondary Color/), { target: { value: '#0000ff' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Speed' }), { target: { value: '55' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Direction' }), {
      target: { value: '90' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Density' }), { target: { value: '30' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Brightness' }), {
      target: { value: '200' },
    });
    expect(screen.getByText('#00ff00')).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();
    expect(onConfigChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onConfigChange).toHaveBeenCalledExactlyOnceWith({
      mode: RGBBaseMode.RgbBaseModeWave,
      color: { red: 0, green: 255, blue: 0 },
      secondaryColor: { red: 0, green: 0, blue: 255 },
      speed: 55,
      direction: 90,
      density: 30,
      brightness: 200,
    } satisfies RgbBaseConfig);
  });

  it('sends whole degrees, as the keyboard stores them', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn<(config: RgbBaseConfig) => void>();
    render(<RGBPanel baseConfig={CONFIG} onConfigChange={onConfigChange} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Direction' }), {
      target: { value: '12.5' },
    });
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onConfigChange).toHaveBeenLastCalledWith(expect.objectContaining({ direction: 12 }));
  });

  it('re-reads everything but the mode when the configuration changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RGBPanel baseConfig={CONFIG} onConfigChange={vi.fn()} />);
    await user.click(modeButton('Off'));
    fireEvent.input(colorInput(/^Color/), { target: { value: '#123456' } });

    rerender(
      <RGBPanel
        baseConfig={{
          ...CONFIG,
          mode: RGBBaseMode.RgbBaseModeBlank,
          color: { red: 255, green: 96, blue: 0 },
          speed: 64,
          direction: 180,
          density: 12,
          brightness: 99,
        }}
        onConfigChange={vi.fn()}
      />
    );
    expect(colorInput(/^Color/)).toHaveValue('#ff6000');
    expect(screen.getByText('64%')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Direction' })).toHaveValue(180);
    expect(screen.getByRole('slider', { name: 'Density' })).toHaveValue('12');
    expect(screen.getByRole('slider', { name: 'Brightness' })).toHaveValue('99');
    // "Initialize from prop but don't sync back": the chosen mode stays.
    expect(modeButton('Off')).toHaveAttribute('aria-pressed', 'true');
    expect(modeButton('Blank')).toHaveAttribute('aria-pressed', 'false');
  });
});
