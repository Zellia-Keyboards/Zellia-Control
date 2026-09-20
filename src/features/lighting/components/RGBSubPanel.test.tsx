import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RGBMode } from 'emi-keyboard-controller';
import { describe, expect, it, vi } from 'vitest';
import type { RgbKeyConfig } from '../../device';
import type { LayoutKey } from '../../keyboard/model';
import { rainbowColors } from '../model';
import { RGBSubPanel, type KeyConfigEntry, type RGBSubPanelProps } from './RGBSubPanel';
import styles from './RGBSubPanel.module.css';

const CONFIG: RgbKeyConfig = {
  mode: RGBMode.RgbModeStatic,
  color: { red: 255, green: 0, blue: 0 },
  speed: 20,
};

const key = (id: number, x: number): LayoutKey => ({
  id,
  x,
  y: 0,
  width: 1,
  height: 1,
  rotationAngle: 0,
  rotationX: 0,
  rotationY: 0,
  labels: [],
  layoutGroup: null,
});

const MODE_NAMES = [
  'Fixed',
  'Static',
  'Cycle',
  'Linear',
  'Trigger',
  'String',
  'Fading String',
  'Diamond Ripple',
  'Fading Diamond Ripple',
  'Jelly',
  'Bubble',
];

function renderPanel(props: Partial<RGBSubPanelProps> = {}) {
  const handlers = {
    onConfigChange: vi.fn<(config: RgbKeyConfig) => void>(),
    onKeyConfigsChange: vi.fn<(entries: readonly KeyConfigEntry[]) => void>(),
  };
  const view = render(
    <RGBSubPanel
      config={CONFIG}
      keyboardKeys={[key(0, 0), key(1, 1), key(2, 2), key(9, 3)]}
      rgbConfigs={[CONFIG, CONFIG, CONFIG]}
      {...handlers}
      {...props}
    />
  );
  return { ...handlers, ...view };
}

const modeButton = (name: string) => screen.getByRole('button', { name });

function colorInput(): HTMLInputElement {
  const input = screen.getByLabelText('Color');
  if (!(input instanceof HTMLInputElement)) throw new Error('expected an input');
  return input;
}

describe('RGBSubPanel', () => {
  it('shows the key configuration with its mode selected', () => {
    renderPanel({ title: 'Key Configuration' });
    expect(screen.getByRole('region', { name: 'Key Configuration' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Mode' })).toBeInTheDocument();
    for (const name of MODE_NAMES) {
      expect(modeButton(name)).toHaveAttribute('aria-pressed', String(name === 'Static'));
    }
    expect(colorInput()).toHaveValue('#ff0000');
    expect(colorInput()).toHaveClass(styles['color-input'] ?? '');
    expect(screen.getByText('#ff0000')).toHaveClass('uppercase');
    expect(screen.getByRole('heading', { level: 4, name: 'Speed' })).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Speed' })).toHaveValue('20');
  });

  it('falls back to its own title', () => {
    renderPanel();
    expect(screen.getByRole('heading', { level: 3, name: 'Key Configuration' })).toBeVisible();
  });

  it('applies mode, colour and speed when Apply is clicked', async () => {
    const user = userEvent.setup();
    const { onConfigChange } = renderPanel();
    await user.click(modeButton('Jelly'));
    fireEvent.input(colorInput(), { target: { value: '#123456' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Speed' }), { target: { value: '70' } });
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(onConfigChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onConfigChange).toHaveBeenCalledExactlyOnceWith({
      mode: RGBMode.RgbModeJelly,
      color: { red: 0x12, green: 0x34, blue: 0x56 },
      speed: 70,
    } satisfies RgbKeyConfig);
  });

  it('re-reads colour and speed, but not the mode, from every new configuration', async () => {
    const user = userEvent.setup();
    const { rerender } = renderPanel();
    await user.click(modeButton('Bubble'));
    fireEvent.input(colorInput(), { target: { value: '#123456' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Speed' }), { target: { value: '70' } });

    rerender(
      <RGBSubPanel
        config={{ ...CONFIG }}
        keyboardKeys={[]}
        rgbConfigs={[]}
        onConfigChange={vi.fn()}
        onKeyConfigsChange={vi.fn()}
      />
    );
    expect(colorInput()).toHaveValue('#ff0000');
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(modeButton('Bubble')).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens and closes the rainbow preset', async () => {
    const user = userEvent.setup();
    renderPanel();
    const toggle = screen.getByRole('button', { name: 'Rainbow Preset' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Apply Settings' })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('▼')).toHaveClass('rotate-180');
    expect(screen.getByText('Rainbow Direction')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Rainbow Direction' })).toHaveValue(0);
    expect(screen.getByText('Rainbow Density')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Rainbow Density' })).toHaveValue('10');
    expect(screen.getByRole('button', { name: 'Apply Settings' })).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByRole('button', { name: 'Apply Settings' })).not.toBeInTheDocument();
  });

  it('colours each key from its position with the rainbow preset (D11)', async () => {
    const user = userEvent.setup();
    const { onKeyConfigsChange, onConfigChange } = renderPanel();
    await user.click(modeButton('Cycle'));
    await user.click(screen.getByRole('button', { name: 'Rainbow Preset' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Rainbow Direction' }), {
      target: { value: '180' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Rainbow Density' }), {
      target: { value: '60' },
    });
    await user.click(screen.getByRole('button', { name: 'Apply Settings' }));

    const colors = rainbowColors([key(0, 0), key(1, 1), key(2, 2)], '#ff0000', 180, 60);
    // Key 9 has no RGB configuration: only keys the keyboard has are coloured.
    expect(onKeyConfigsChange).toHaveBeenCalledExactlyOnceWith(
      [0, 1, 2].map(keyId => ({
        keyId,
        config: { mode: RGBMode.RgbModeCycle, speed: 20, color: colors.get(keyId) },
      }))
    );
    expect(new Set([0, 1, 2].map(id => JSON.stringify(colors.get(id)))).size).toBe(3);
    expect(onConfigChange).not.toHaveBeenCalled();
  });

  it('does nothing with the rainbow preset without a layout', async () => {
    const user = userEvent.setup();
    const { onKeyConfigsChange } = renderPanel({ keyboardKeys: [] });
    await user.click(screen.getByRole('button', { name: 'Rainbow Preset' }));
    await user.click(screen.getByRole('button', { name: 'Apply Settings' }));
    expect(onKeyConfigsChange).not.toHaveBeenCalled();
  });
});
