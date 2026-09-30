/**
 * Lighting page against the real device layer: the app's `deviceSession` connected to the virtual
 * keyboard. Key selection is driven through the key-selection store, like the shell's keyboard.
 */
import {
  act,
  fireEvent,
  render,
  screen,
  within,
  type BoundFunctions,
  type queries,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RGBBaseMode, RGBMode } from 'emi-keyboard-controller';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectVirtualKeyboard, type ConnectedKeyboard } from '../../testing/app-keyboard';
import type { WireRgbKey } from '../../testing/virtual-keyboard';
import { deviceSession, deviceStore, type Rgb } from '../device';
import { INITIAL_KEY_SELECTION, keySelection, keySelectionStore } from '../keyboard';
import {
  DEFAULT_LAYOUT_OPTIONS,
  layoutVariantIndices,
  parseLayout,
  visibleKeys,
  type LayoutKey,
} from '../keyboard/model';
import { LightingPage } from './LightingPage';
import { rainbowColors } from './model';

const TOTAL_KEYS = 70;

function renderPage() {
  return render(
    <MemoryRouter>
      <LightingPage />
    </MemoryRouter>
  );
}

it('renders nothing until a keyboard configuration is loaded', () => {
  const { container } = renderPage();
  expect(container).toBeEmptyDOMElement();
});

describe('LightingPage', () => {
  let keyboard: ConnectedKeyboard;

  beforeEach(async () => {
    // The vendored controller logs every load step.
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false });
    // The shell's keyboard reports the selectable keys (highest visible id + 1).
    keySelectionStore.setState({ ...INITIAL_KEY_SELECTION, totalKeys: TOTAL_KEYS }, true);
  });

  afterEach(() => {
    keyboard.dispose();
    keySelectionStore.setState(INITIAL_KEY_SELECTION, true);
  });

  const basePanel = () => within(screen.getByRole('region', { name: 'Base Configuration' }));
  const keyPanel = () => within(screen.getByRole('region', { name: 'Key Configuration' }));

  function colorInput(
    panel: BoundFunctions<typeof queries>,
    name: RegExp | string
  ): HTMLInputElement {
    const input = panel.getByLabelText(name);
    if (!(input instanceof HTMLInputElement)) throw new Error('expected an input');
    return input;
  }

  function deviceRgbKeys(): readonly WireRgbKey[] {
    return keyboard.vk.state.active.rgbKeys;
  }

  /** Visible keys of the connected layout with the default Layout dropdown options. */
  function layoutKeys(): readonly LayoutKey[] {
    const { connection } = deviceStore.getState();
    if (connection.status !== 'ready') throw new Error('not connected');
    const { layoutJson, layoutLabels } = connection.model;
    return visibleKeys(
      parseLayout(layoutJson),
      layoutVariantIndices(layoutLabels, DEFAULT_LAYOUT_OPTIONS)
    );
  }

  const rgb = (red: number, green: number, blue: number): Rgb => ({ red, green, blue });

  it('shows the keyboard’s base and first-key configuration', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 2, name: 'Lighting' })).toBeInTheDocument();

    const base = basePanel();
    expect(base.getByRole('button', { name: 'Blank' })).toHaveAttribute('aria-pressed', 'true');
    expect(colorInput(base, /^Color/)).toHaveValue('#a337fc');
    expect(colorInput(base, /^Secondary Color/)).toHaveValue('#000000');
    // D11 / PL-006: the device speed as {n}%.
    expect(base.getByText('20%')).toBeInTheDocument();
    expect(base.getByText('255')).toBeInTheDocument();

    const key = keyPanel();
    // Key 0 of the virtual keyboard is static red.
    expect(key.getByRole('button', { name: 'Static' })).toHaveAttribute('aria-pressed', 'true');
    expect(colorInput(key, 'Color')).toHaveValue('#ff0000');
    expect(key.getByText('20%')).toBeInTheDocument();
  });

  it('opens with the keyboard’s own modes selected', async () => {
    const { rgbBase } = keyboard.vk.state.active;
    expect(rgbBase.mode).toBe(RGBBaseMode.RgbBaseModeBlank);
    const config = deviceStore.getState().config;
    if (!config) throw new Error('no configuration');
    deviceSession.setRgbBase({ ...config.rgbBase, mode: RGBBaseMode.RgbBaseModeRainbow });
    deviceSession.setRgbKeys([
      {
        keyId: 0,
        config: {
          ...config.rgbKeys[0],
          mode: RGBMode.RgbModeBubble,
          color: rgb(0, 0, 255),
          speed: 20,
        },
      },
    ]);
    await expect
      .poll(() => keyboard.vk.state.active.rgbBase.mode)
      .toBe(RGBBaseMode.RgbBaseModeRainbow);

    renderPage();
    expect(basePanel().getByRole('button', { name: 'Rainbow' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(keyPanel().getByRole('button', { name: 'Bubble' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('applies the base configuration', async () => {
    const user = userEvent.setup();
    renderPage();
    const base = basePanel();
    await user.click(base.getByRole('button', { name: 'Wave' }));
    fireEvent.input(colorInput(base, /^Color/), { target: { value: '#00ff00' } });
    fireEvent.input(colorInput(base, /^Secondary Color/), { target: { value: '#0000ff' } });
    fireEvent.change(base.getByRole('slider', { name: 'Speed' }), { target: { value: '55' } });
    fireEvent.change(base.getByRole('spinbutton', { name: 'Direction' }), {
      target: { value: '90' },
    });
    fireEvent.change(base.getByRole('slider', { name: 'Density' }), { target: { value: '30' } });
    fireEvent.change(base.getByRole('slider', { name: 'Brightness' }), {
      target: { value: '200' },
    });
    await user.click(base.getByRole('button', { name: 'Apply' }));

    const expected = {
      mode: RGBBaseMode.RgbBaseModeWave,
      color: rgb(0, 255, 0),
      secondaryColor: rgb(0, 0, 255),
      speed: 55,
      direction: 90,
      density: 30,
      brightness: 200,
    };
    expect(deviceStore.getState().config?.rgbBase).toEqual(expected);
    await expect.poll(() => keyboard.vk.state.active.rgbBase).toEqual(expected);
  });

  it('applies the key configuration to every key when none is selected', async () => {
    const user = userEvent.setup();
    renderPage();
    const key = keyPanel();
    await user.click(key.getByRole('button', { name: 'Jelly' }));
    fireEvent.input(colorInput(key, 'Color'), { target: { value: '#123456' } });
    fireEvent.change(key.getByRole('slider', { name: 'Speed' }), { target: { value: '70' } });
    await user.click(key.getByRole('button', { name: 'Apply' }));

    const expected = { mode: RGBMode.RgbModeJelly, color: rgb(0x12, 0x34, 0x56), speed: 70 };
    await expect.poll(() => deviceRgbKeys().every(config => config.speed === 70)).toBe(true);
    expect(deviceRgbKeys()).toHaveLength(TOTAL_KEYS);
    for (const config of deviceRgbKeys()) expect(config).toEqual(expected);
  });

  it('applies the key configuration to the selected keys, then shows the first key again', async () => {
    const user = userEvent.setup();
    const before = structuredClone(deviceRgbKeys());
    renderPage();
    act(() => {
      keySelection.setSelected([3, 4]);
    });
    const key = keyPanel();
    await user.click(key.getByRole('button', { name: 'Jelly' }));
    fireEvent.input(colorInput(key, 'Color'), { target: { value: '#123456' } });
    fireEvent.change(key.getByRole('slider', { name: 'Speed' }), { target: { value: '70' } });
    await user.click(key.getByRole('button', { name: 'Apply' }));

    const expected = { mode: RGBMode.RgbModeJelly, color: rgb(0x12, 0x34, 0x56), speed: 70 };
    await expect.poll(() => deviceRgbKeys()[4]).toEqual(expected);
    expect(deviceRgbKeys()[3]).toEqual(expected);
    deviceRgbKeys().forEach((config, id) => {
      if (id !== 3 && id !== 4) expect(config).toEqual(before[id]);
    });

    // As in Svelte, the panel re-reads key 0's colour and speed; the chosen mode stays.
    expect(colorInput(key, 'Color')).toHaveValue('#ff0000');
    expect(key.getByText('20%')).toBeInTheDocument();
    expect(key.getByRole('button', { name: 'Jelly' })).toHaveAttribute('aria-pressed', 'true');
  });

  describe('rainbow preset (D11, PL-007)', () => {
    async function applyRainbow(direction: string, density: string) {
      const user = userEvent.setup();
      const key = keyPanel();
      await user.click(key.getByRole('button', { name: 'Rainbow Preset' }));
      fireEvent.change(key.getByRole('spinbutton', { name: 'Rainbow Direction' }), {
        target: { value: direction },
      });
      fireEvent.change(key.getByRole('slider', { name: 'Rainbow Density' }), {
        target: { value: density },
      });
      await user.click(key.getByRole('button', { name: 'Apply Settings' }));
    }

    it('colours every visible key from its position in the layout', async () => {
      const before = structuredClone(deviceRgbKeys());
      renderPage();
      await applyRainbow('90', '20');

      const keys = layoutKeys();
      const colors = rainbowColors(keys, '#ff0000', 90, 20);
      await expect
        .poll(() =>
          keys.every(({ id }) => deviceRgbKeys()[id]?.color.green === colors.get(id)?.green)
        )
        .toBe(true);
      for (const { id } of keys) {
        expect(deviceRgbKeys()[id]).toEqual({
          mode: RGBMode.RgbModeStatic,
          color: colors.get(id),
          speed: 20,
        });
      }
      expect(new Set(keys.map(({ id }) => JSON.stringify(colors.get(id)))).size).toBeGreaterThan(4);
      // Keys of layout options that are not shown keep their colours.
      const visible = new Set(keys.map(({ id }) => id));
      const hidden = deviceRgbKeys().flatMap((_, id) => (visible.has(id) ? [] : [id]));
      expect(hidden).toEqual([14, 15, 55, 56, 65, 66, 67, 68, 69]);
      for (const id of hidden) expect(deviceRgbKeys()[id]).toEqual(before[id]);
    });

    it('colours only the selected keys when keys are selected', async () => {
      const before = structuredClone(deviceRgbKeys());
      renderPage();
      act(() => {
        keySelection.setSelected([5, 30, 47]);
      });
      await applyRainbow('0', '30');

      const colors = rainbowColors(layoutKeys(), '#ff0000', 0, 30);
      await expect.poll(() => deviceRgbKeys()[47]?.color).toEqual(colors.get(47));
      expect(deviceRgbKeys()[5]?.color).toEqual(colors.get(5));
      expect(deviceRgbKeys()[30]?.color).toEqual(colors.get(30));
      deviceRgbKeys().forEach((config, id) => {
        if (![5, 30, 47].includes(id)) expect(config).toEqual(before[id]);
      });
    });
  });

  it('re-reads colours after the keyboard reloads, keeping the chosen modes', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(basePanel().getByRole('button', { name: 'Wave' }));
    await user.click(keyPanel().getByRole('button', { name: 'Bubble' }));

    await act(async () => {
      await deviceSession.switchProfile(1);
    });

    // Profile 1 of the virtual keyboard: orange base colour, rainbow shifted by 90°.
    expect(colorInput(basePanel(), /^Color/)).toHaveValue('#ff6000');
    expect(colorInput(keyPanel(), 'Color')).toHaveValue('#80ff00');
    expect(basePanel().getByRole('button', { name: 'Wave' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(keyPanel().getByRole('button', { name: 'Bubble' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('allows key selection and toggles it with Ctrl/⌘+A and Ctrl/⌘+Escape', async () => {
    const user = userEvent.setup();
    keySelection.setAllowSelection(false);
    const { unmount } = renderPage();
    expect(keySelectionStore.getState().allowSelection).toBe(true);

    await user.keyboard('{Control>}a{/Control}');
    expect(keySelectionStore.getState().selected).toHaveLength(TOTAL_KEYS);
    await user.keyboard('{Control>}{Escape}{/Control}');
    expect(keySelectionStore.getState().selected).toHaveLength(0);
    await user.keyboard('{Meta>}a{/Meta}');
    expect(keySelectionStore.getState().selected).toHaveLength(TOTAL_KEYS);
    await user.keyboard('{Meta>}a{/Meta}');
    expect(keySelectionStore.getState().selected).toHaveLength(0);

    unmount();
    expect(fireEvent.keyDown(window, { key: 'a', ctrlKey: true })).toBe(true);
    expect(keySelectionStore.getState().selected).toHaveLength(0);
  });
});
