/**
 * Lighting page against the real device layer: the app's `deviceSession` connected to the virtual
 * keyboard. Key selection is driven through the key-selection store, like the shell's keyboard.
 * Lighting edits are staged; they reach the keyboard on Save (PL-047).
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
import { StrictMode } from 'react';
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
import { rainbowColors, rgbToHex } from './model';

const TOTAL_KEYS = 70;
const MIXED_MODES = 'These keys use different modes. Pick one to use it on all of them.';

function renderPage() {
  return render(
    <MemoryRouter>
      <LightingPage />
    </MemoryRouter>
  );
}

/** Lets the controller queue and the virtual keyboard finish pending exchanges. */
async function settle(): Promise<void> {
  for (let round = 0; round < 3; round++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
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

  /** The app's (staged) per-key lighting. */
  function stagedRgbKeys() {
    const config = deviceStore.getState().config;
    if (!config) throw new Error('no configuration');
    return config.rgbKeys;
  }

  function stagedHex(keyId: number): string {
    const config = stagedRgbKeys()[keyId];
    if (!config) throw new Error(`no RGB key ${keyId}`);
    return rgbToHex(config.color);
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

  async function saveToKeyboard(): Promise<void> {
    await act(async () => {
      await deviceSession.save();
    });
  }

  it('shows the base configuration, the save hint and the keys’ shared values', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 2, name: 'Lighting' })).toBeInTheDocument();
    expect(
      screen.getByText('Lighting changes reach the keyboard when you press Save.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();

    const base = basePanel();
    expect(base.getByRole('button', { name: 'Blank' })).toHaveAttribute('aria-pressed', 'true');
    expect(colorInput(base, /^Color/)).toHaveValue('#a337fc');
    expect(colorInput(base, /^Secondary Color/)).toHaveValue('#000000');
    // D11 / PL-006: the device speed as {n}%.
    expect(base.getByText('20%')).toBeInTheDocument();
    expect(base.getByText('255')).toBeInTheDocument();

    // No key selected: all keys. On the virtual keyboard every 7th key is Static and the others
    // Linear, each in its own colour, all at speed 20 (PL-048).
    const key = keyPanel();
    expect(key.getByText('All keys')).toBeInTheDocument();
    expect(key.getByRole('button', { name: 'Static' })).toHaveAttribute('aria-pressed', 'false');
    expect(key.getByRole('button', { name: 'Linear' })).toHaveAttribute('aria-pressed', 'false');
    expect(key.getByText(MIXED_MODES)).toBeInTheDocument();
    expect(key.getByText('Mixed')).toBeInTheDocument();
    expect(colorInput(key, 'Color')).toHaveValue('#ff0000');
    expect(key.getByText('20%')).toBeInTheDocument();
  });

  it('shows what the selected keys share', () => {
    renderPage();
    act(() => {
      keySelection.setSelected([1, 2]);
    });
    const key = keyPanel();
    expect(key.getByText('2 keys')).toBeInTheDocument();
    expect(key.getByRole('button', { name: 'Linear' })).toHaveAttribute('aria-pressed', 'true');
    expect(
      key.getByText('Lights up in Color as the key goes down: the deeper the press, the brighter.')
    ).toBeInTheDocument();
    expect(key.getByText('Mixed')).toBeInTheDocument();

    act(() => {
      keySelection.setSelected([1]);
    });
    expect(key.getByText('1 key')).toBeInTheDocument();
    expect(colorInput(key, 'Color')).toHaveValue(stagedHex(1));
    expect(key.queryByText('Mixed')).not.toBeInTheDocument();
    // Selecting keys never edits them.
    expect(deviceStore.getState().unsaved).toBe(false);
  });

  it('opens with the keyboard’s own modes', async () => {
    const config = deviceStore.getState().config;
    if (!config) throw new Error('no configuration');
    deviceSession.setRgbBase({ ...config.rgbBase, mode: RGBBaseMode.RgbBaseModeRainbow });
    deviceSession.setRgbKeys(
      config.rgbKeys.map((rgbKey, keyId) => ({
        keyId,
        config: { ...rgbKey, mode: RGBMode.RgbModeBubble },
      }))
    );
    await saveToKeyboard();
    expect(keyboard.vk.state.active.rgbBase.mode).toBe(RGBBaseMode.RgbBaseModeRainbow);

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

  it('stages base edits, which reach the keyboard on Save (PL-047)', async () => {
    const user = userEvent.setup();
    const before = structuredClone(keyboard.vk.state.active.rgbBase);
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
    expect(deviceStore.getState().unsaved).toBe(true);
    expect(base.getByRole('button', { name: 'Wave' })).toHaveAttribute('aria-pressed', 'true');
    expect(base.getByText('55%')).toBeInTheDocument();
    await settle();
    expect(keyboard.vk.state.active.rgbBase).toEqual(before);

    await saveToKeyboard();
    expect(keyboard.vk.state.active.rgbBase).toEqual(expected);
  });

  it('edits only the changed field of every key while none is selected', async () => {
    const user = userEvent.setup();
    const before = structuredClone(deviceRgbKeys());
    renderPage();
    const key = keyPanel();
    await user.click(key.getByRole('button', { name: 'Jelly' }));
    expect(key.getByRole('button', { name: 'Jelly' })).toHaveAttribute('aria-pressed', 'true');
    expect(key.queryByText(MIXED_MODES)).not.toBeInTheDocument();
    fireEvent.change(key.getByRole('slider', { name: 'Speed' }), { target: { value: '70' } });
    expect(key.getByText('70%')).toBeInTheDocument();

    const expected = before.map(config => ({
      mode: RGBMode.RgbModeJelly,
      color: config.color,
      speed: 70,
    }));
    expect(stagedRgbKeys()).toEqual(expected);
    await settle();
    expect(deviceRgbKeys()).toEqual(before);

    await saveToKeyboard();
    expect(deviceRgbKeys()).toHaveLength(TOTAL_KEYS);
    expect(deviceRgbKeys()).toEqual(expected);
  });

  it('edits the selected keys only', async () => {
    const user = userEvent.setup();
    const before = structuredClone(deviceRgbKeys());
    renderPage();
    act(() => {
      keySelection.setSelected([3, 4]);
    });
    const key = keyPanel();
    await user.click(key.getByRole('button', { name: 'Jelly' }));
    fireEvent.input(colorInput(key, 'Color'), { target: { value: '#123456' } });
    expect(colorInput(key, 'Color')).toHaveValue('#123456');
    expect(key.queryByText('Mixed')).not.toBeInTheDocument();

    await saveToKeyboard();
    const edited = { mode: RGBMode.RgbModeJelly, color: rgb(0x12, 0x34, 0x56), speed: 20 };
    expect(deviceRgbKeys()[3]).toEqual(edited);
    expect(deviceRgbKeys()[4]).toEqual(edited);
    deviceRgbKeys().forEach((config, id) => {
      if (id !== 3 && id !== 4) expect(config).toEqual(before[id]);
    });
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

    it('colours every visible key from its position, keeping modes and speeds', async () => {
      const before = structuredClone(deviceRgbKeys());
      renderPage();
      await applyRainbow('90', '20');
      await saveToKeyboard();

      const keys = layoutKeys();
      // The panel's colour is the first key's (key 0, red) while the colours are mixed.
      const colors = rainbowColors(keys, '#ff0000', 90, 20);
      for (const { id } of keys) {
        expect(deviceRgbKeys()[id]).toEqual({ ...before[id], color: colors.get(id) });
      }
      expect(new Set(keys.map(({ id }) => JSON.stringify(colors.get(id)))).size).toBeGreaterThan(4);
      // Keys of layout options that are not shown keep their colours.
      const visible = new Set(keys.map(({ id }) => id));
      const hidden = deviceRgbKeys().flatMap((_, id) => (visible.has(id) ? [] : [id]));
      expect(hidden).toEqual([14, 15, 55, 56, 65, 66, 67, 68, 69]);
      for (const id of hidden) expect(deviceRgbKeys()[id]).toEqual(before[id]);
    });

    it('colours only the selected keys, from the first one’s colour', async () => {
      const before = structuredClone(deviceRgbKeys());
      renderPage();
      act(() => {
        keySelection.setSelected([5, 30, 47]);
      });
      const reference = stagedHex(5);
      await applyRainbow('0', '30');
      await saveToKeyboard();

      const colors = rainbowColors(layoutKeys(), reference, 0, 30);
      for (const id of [5, 30, 47]) {
        expect(deviceRgbKeys()[id]).toEqual({ ...before[id], color: colors.get(id) });
      }
      deviceRgbKeys().forEach((config, id) => {
        if (![5, 30, 47].includes(id)) expect(config).toEqual(before[id]);
      });
    });
  });

  describe('device loads (profile switches, resets)', () => {
    /** Profile 1 of the virtual keyboard with the Rainbow base mode and key 0 in Cycle mode. */
    function storeModesOnProfile1(): void {
      const profile = keyboard.vk.state.profiles[1];
      const key0 = profile?.rgbKeys[0];
      if (!profile || !key0) throw new Error('profile 1 has no key 0');
      profile.rgbBase = { ...profile.rgbBase, mode: RGBBaseMode.RgbBaseModeRainbow };
      profile.rgbKeys[0] = { ...key0, mode: RGBMode.RgbModeCycle };
    }

    /** Selects key 0, stages new modes in both panels, then switches to profile 1. */
    async function editAndSwitchToProfile1(user: ReturnType<typeof userEvent.setup>) {
      act(() => {
        keySelection.setSelected([0]);
      });
      await user.click(basePanel().getByRole('button', { name: 'Wave' }));
      await user.click(keyPanel().getByRole('button', { name: 'Bubble' }));
      expect(deviceStore.getState().unsaved).toBe(true);
      await act(async () => {
        await deviceSession.switchProfile(1);
      });
      expect(deviceStore.getState().config?.profileIndex).toBe(1);
    }

    it('drops unsaved edits and shows the new configuration in both panels', async () => {
      const user = userEvent.setup();
      storeModesOnProfile1();
      renderPage();
      await editAndSwitchToProfile1(user);

      expect(deviceStore.getState().unsaved).toBe(false);
      // Profile 1 of the virtual keyboard: orange base colour, rainbow shifted by 90°.
      expect(colorInput(basePanel(), /^Color/)).toHaveValue('#ff6000');
      expect(colorInput(keyPanel(), 'Color')).toHaveValue('#80ff00');
      expect(basePanel().getByRole('button', { name: 'Rainbow' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(keyPanel().getByRole('button', { name: 'Cycle' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });

    it('edits the new configuration after the load', async () => {
      const user = userEvent.setup();
      storeModesOnProfile1();
      renderPage();
      await editAndSwitchToProfile1(user);

      fireEvent.change(basePanel().getByRole('slider', { name: 'Brightness' }), {
        target: { value: '100' },
      });
      fireEvent.change(keyPanel().getByRole('slider', { name: 'Speed' }), {
        target: { value: '70' },
      });
      await saveToKeyboard();
      expect(keyboard.vk.state.active.rgbBase).toMatchObject({
        brightness: 100,
        mode: RGBBaseMode.RgbBaseModeRainbow,
      });
      expect(deviceRgbKeys()[0]).toMatchObject({ speed: 70, mode: RGBMode.RgbModeCycle });
    });
  });

  it('works under StrictMode, which renders and runs its effects twice', async () => {
    render(
      <StrictMode>
        <MemoryRouter>
          <LightingPage />
        </MemoryRouter>
      </StrictMode>
    );
    act(() => {
      keySelection.setSelected([8]);
    });
    const key = keyPanel();
    fireEvent.input(colorInput(key, 'Color'), { target: { value: '#00ffff' } });
    expect(colorInput(key, 'Color')).toHaveValue('#00ffff');
    await saveToKeyboard();
    expect(deviceRgbKeys()[8]?.color).toEqual(rgb(0, 255, 255));
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
