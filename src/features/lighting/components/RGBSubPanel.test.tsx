import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RGBMode } from 'emi-keyboard-controller';
import { describe, expect, it, vi } from 'vitest';
import type { RgbKeyConfig } from '../../device';
import { MIXED, type SharedKeyValues } from '../model';
import { RGBSubPanel, type RGBSubPanelProps } from './RGBSubPanel';
import styles from './RGBSubPanel.module.css';

const CONFIG: RgbKeyConfig = {
  mode: RGBMode.RgbModeStatic,
  color: { red: 255, green: 0, blue: 0 },
  speed: 20,
};

const SHARED: SharedKeyValues = { ...CONFIG, first: CONFIG };

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
    onEdit: vi.fn<(patch: Partial<RgbKeyConfig>) => void>(),
    onRainbow: vi.fn<(referenceHex: string, direction: number, density: number) => void>(),
  };
  const view = render(<RGBSubPanel values={SHARED} targetCount="all" {...handlers} {...props} />);
  return { ...handlers, ...view };
}

const modeButton = (name: string) => screen.getByRole('button', { name });

function colorInput(): HTMLInputElement {
  const input = screen.getByLabelText('Color');
  if (!(input instanceof HTMLInputElement)) throw new Error('expected an input');
  return input;
}

describe('RGBSubPanel', () => {
  it('shows the shared values with their mode pressed and explained', () => {
    renderPanel({ title: 'Key Configuration' });
    expect(screen.getByRole('region', { name: 'Key Configuration' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Mode' })).toBeInTheDocument();
    for (const name of MODE_NAMES) {
      expect(modeButton(name)).toHaveAttribute('aria-pressed', String(name === 'Static'));
    }
    expect(screen.getByText('Always adds Color on top of the base lighting.')).toBeInTheDocument();
    expect(colorInput()).toHaveValue('#ff0000');
    expect(colorInput()).toHaveClass(styles['color-input'] ?? '');
    expect(screen.getByText('#ff0000')).toHaveClass('uppercase');
    expect(screen.getByRole('heading', { level: 4, name: 'Speed' })).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Speed' })).toHaveValue('20');
    expect(screen.getByRole('slider', { name: 'Speed' })).not.toHaveAttribute('aria-valuetext');
    expect(colorInput()).not.toHaveAccessibleDescription();
  });

  it('falls back to its own title', () => {
    renderPanel();
    expect(screen.getByRole('heading', { level: 3, name: 'Key Configuration' })).toBeVisible();
  });

  it('names the keys its edits change (PL-047)', () => {
    const { rerender, onEdit, onRainbow } = renderPanel();
    expect(screen.getByText('All keys')).toBeInTheDocument();
    rerender(<RGBSubPanel values={SHARED} targetCount={1} onEdit={onEdit} onRainbow={onRainbow} />);
    expect(screen.getByText('1 key')).toBeInTheDocument();
    rerender(<RGBSubPanel values={SHARED} targetCount={3} onEdit={onEdit} onRainbow={onRainbow} />);
    expect(screen.getByText('3 keys')).toBeInTheDocument();
  });

  it('shows Mixed where the keys differ, with the first key’s values in the controls (PL-048)', () => {
    renderPanel({ values: { mode: MIXED, color: MIXED, speed: MIXED, first: CONFIG } });
    for (const name of MODE_NAMES)
      expect(modeButton(name)).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByText('These keys use different modes. Pick one to use it on all of them.')
    ).toBeInTheDocument();
    expect(screen.getAllByText('Mixed')).toHaveLength(2);
    // The color 'Mixed' text should have no uppercase or font-mono (it's a sibling of the color input)
    const colorMixed = colorInput().nextElementSibling;
    expect(colorMixed).toHaveTextContent('Mixed');
    expect(colorMixed).not.toHaveClass('uppercase');
    expect(colorMixed).not.toHaveClass('font-mono');
    expect(colorInput()).toHaveValue('#ff0000');
    expect(screen.getByRole('slider', { name: 'Speed' })).toHaveValue('20');
    expect(screen.queryByText('20%')).not.toBeInTheDocument();
    // Mixed speed: the slider's accessible value text overrides the raw number (PL-048).
    expect(screen.getByRole('slider', { name: 'Speed' })).toHaveAttribute(
      'aria-valuetext',
      'Mixed'
    );
    // Mixed colour: the swatch's description points at the visible "Mixed" text.
    expect(colorInput()).toHaveAccessibleDescription('Mixed');
  });

  it('explains every mode on its button (PL-049)', () => {
    renderPanel();
    expect(modeButton('Fixed')).toHaveAccessibleDescription(
      'Always shows Color, in place of the base lighting.'
    );
    expect(modeButton('Jelly')).toHaveAccessibleDescription(
      'Pressing lights up the keys around it in their own colors; the deeper the press, the farther it reaches.'
    );
  });

  it('edits one field per input', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderPanel();
    await user.click(modeButton('Jelly'));
    fireEvent.input(colorInput(), { target: { value: '#123456' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Speed' }), { target: { value: '70' } });
    expect(onEdit.mock.calls).toEqual([
      [{ mode: RGBMode.RgbModeJelly }],
      [{ color: { red: 0x12, green: 0x34, blue: 0x56 } }],
      [{ speed: 70 }],
    ]);
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

  it('runs the rainbow preset from the panel’s colour (D11)', async () => {
    const user = userEvent.setup();
    const { onRainbow, onEdit } = renderPanel({
      values: {
        ...SHARED,
        color: MIXED,
        first: { ...CONFIG, color: { red: 0, green: 0, blue: 255 } },
      },
    });
    await user.click(screen.getByRole('button', { name: 'Rainbow Preset' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Rainbow Direction' }), {
      target: { value: '180' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Rainbow Density' }), {
      target: { value: '60' },
    });
    await user.click(screen.getByRole('button', { name: 'Apply Settings' }));
    expect(onRainbow).toHaveBeenCalledExactlyOnceWith('#0000ff', 180, 60);
    expect(onEdit).not.toHaveBeenCalled();
  });
});
