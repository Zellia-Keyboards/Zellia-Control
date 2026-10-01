import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Keycode } from 'emi-keyboard-controller';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { installFakeAnimations } from '../../lib/transitions/testing';
import { connectVirtualKeyboard, type ConnectedKeyboard } from '../../testing/app-keyboard';
import { deviceStore } from '../device';
import { INITIAL_KEY_SELECTION, keySelection, keySelectionStore } from '../keyboard';
import {
  DEFAULT_LAYOUT_OPTIONS,
  layoutVariantIndices,
  parseLayout,
  visibleKeys,
} from '../keyboard/model';
import { REMAP_PALETTES, kc, type PaletteKey } from '../keycodes';
import { RemapPage } from './RemapPage';

const TOAST = 'Select the key you want to remap first';

const TABS: readonly (readonly [string, readonly PaletteKey[]])[] = [
  ['Basic', REMAP_PALETTES.basic.flat()],
  ['System', REMAP_PALETTES.system],
  ['Layer', REMAP_PALETTES.layer],
  ['Profile', REMAP_PALETTES.profile],
  ['Extension', REMAP_PALETTES.extension],
];

function renderPage() {
  return render(
    <MemoryRouter>
      <RemapPage />
    </MemoryRouter>
  );
}

function tab(name: string): HTMLElement {
  return within(screen.getByRole('navigation', { name: 'Categories' })).getByRole('button', {
    name,
  });
}

/** The panels in the tab viewport (two while a tab change animates). */
function panels(): HTMLElement[] {
  const viewport = screen.getByRole('main').firstElementChild;
  if (!viewport) throw new Error('Missing tab viewport');
  return Array.from(viewport.children, child => {
    if (!(child instanceof HTMLElement)) throw new Error('Unexpected panel');
    return child;
  });
}

function paletteButtons(): HTMLElement[] {
  return within(screen.getByRole('main')).getAllByRole('button');
}

function paletteKey(label: string): HTMLElement {
  return within(screen.getByRole('main')).getByRole('button', { name: label });
}

function select(...keys: number[]) {
  act(() => {
    keySelection.setSelected(keys);
  });
}

async function connect(): Promise<ConnectedKeyboard> {
  const keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false });
  onTestFinished(keyboard.dispose);
  keyboard.vk.clearHistory();
  return keyboard;
}

/** Keycodes written to `layer`/`id` by keymap packets, in order. */
function keymapWrites(keyboard: ConnectedKeyboard, layer: number, id: number): number[] {
  return keyboard.vk.sentPackets.flatMap(packet =>
    packet.op === 'set' &&
    packet.kind === 'keymap' &&
    packet.layer === layer &&
    id >= packet.start &&
    id < packet.start + packet.keycodes.length
      ? [packet.keycodes[id - packet.start] ?? -1]
      : []
  );
}

function keymapPackets(keyboard: ConnectedKeyboard) {
  return keyboard.vk.sentPackets.filter(packet => packet.op === 'set' && packet.kind === 'keymap');
}

function deviceKeycode(keyboard: ConnectedKeyboard, layer: number, id: number): number | undefined {
  return keyboard.vk.state.active.keymap[layer]?.[id];
}

/** Lets queued packets and replies of the virtual keyboard run. */
async function settle(): Promise<void> {
  for (let round = 0; round < 3; round++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

/** `totalKeys` as the keyboard sets it: the highest visible key id + 1. */
function totalVisibleKeys(): number {
  const { connection } = deviceStore.getState();
  if (connection.status !== 'ready') throw new Error('No keyboard connected');
  const { layoutJson, layoutLabels } = connection.model;
  const keys = visibleKeys(
    parseLayout(layoutJson),
    layoutVariantIndices(layoutLabels, DEFAULT_LAYOUT_OPTIONS)
  );
  return Math.max(...keys.map(key => key.id)) + 1;
}

/** `list[index]`, which the test expects to exist. */
function item<T>(list: readonly T[], index: number): T {
  const value = list[index];
  if (value === undefined) throw new Error(`no item ${index}`);
  return value;
}

const MACRO_KEYS = [
  'Record\nStart',
  'Record\nStop',
  'Record\nToggle',
  'Play\nOnce',
  'Play\nLoop',
  'Play Once\nNo Gaps',
  'Play Loop\nNo Gaps',
  'Stop',
  'Pause',
];

beforeEach(() => {
  keySelectionStore.setState(INITIAL_KEY_SELECTION, true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('RemapPage', () => {
  describe('layout', () => {
    it('shows the categories with Basic selected and the Basic palette', () => {
      renderPage();

      const heading = screen.getByRole('heading', { name: 'Categories' });
      expect(heading).toHaveClass('font-semibold mb-4');
      expect(heading).toHaveStyle({ fontSize: 'calc(1.25rem * var(--ui-scale, 1))' });
      const tabs = within(screen.getByRole('navigation', { name: 'Categories' })).getAllByRole(
        'button'
      );
      expect(tabs.map(button => button.textContent)).toEqual([
        'Basic',
        'System',
        'Layer',
        'Profile',
        'Extension',
      ]);
      expect(tab('Basic')).toHaveAttribute('aria-pressed', 'true');
      expect(tab('Basic')).toHaveClass('glassmorphism-tab active');
      expect(tab('System')).toHaveAttribute('aria-pressed', 'false');
      expect(tab('System')).not.toHaveClass('active');
      expect(paletteButtons().map(button => button.textContent)).toEqual(
        REMAP_PALETTES.basic.flat().map(key => key.label)
      );
    });

    it('renders the page container like the Svelte page', () => {
      renderPage();

      const page = screen.getByRole('application');
      expect(page).toHaveClass(
        'rounded-2xl shadow mt-2 mb-4 grow border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex glassmorphism-card bg-gray-50 dark:bg-gray-900'
      );
      expect(page).toHaveAttribute(
        'style',
        'outline: none; padding: calc(1.5rem * var(--ui-scale, 1));'
      );
      expect(page).toHaveAttribute('tabindex', '-1');
      expect(paletteKey('Esc')).toHaveClass(
        'size-14 text-wrap text-sm whitespace-pre-line rounded-lg overflow-auto transition-all duration-200 border-2'
      );
      expect(paletteKey('Print\nScreen')).toHaveTextContent('Print\nScreen', {
        normalizeWhitespace: false,
      });
    });

    it.each(TABS)('shows the %s palette in its tab', async (name, palette) => {
      const user = userEvent.setup();
      renderPage();

      await user.click(tab(name));

      expect(tab(name)).toHaveAttribute('aria-pressed', 'true');
      expect(paletteButtons().map(button => button.textContent)).toEqual(
        palette.map(key => key.label)
      );
    });

    it('allows key selection on the Remap page', () => {
      keySelection.setAllowSelection(false);
      renderPage();
      expect(keySelectionStore.getState().allowSelection).toBe(true);
    });
  });

  describe('assigning keycodes', () => {
    it('writes the key to every selected key on the selected layer', async () => {
      const keyboard = await connect();
      const layer1 = [...(keyboard.vk.state.active.keymap[0] ?? [])];
      renderPage();
      select(1, 2);
      act(() => {
        keySelection.setLayer(2);
      });

      fireEvent.click(paletteKey('Q'));

      await vi.waitFor(() => {
        expect(deviceKeycode(keyboard, 1, 1)).toBe(Keycode.Q);
        expect(deviceKeycode(keyboard, 1, 2)).toBe(Keycode.Q);
      });
      expect(keyboard.vk.state.active.keymap[0]).toEqual(layer1);
      expect(deviceStore.getState().config?.keymap[1]?.slice(1, 3)).toEqual([Keycode.Q, Keycode.Q]);
    });

    it.each(TABS)('sends the catalog keycode of every %s key (D8)', async (name, palette) => {
      const keyboard = await connect();
      const key = 1;
      renderPage();
      fireEvent.click(tab(name));
      select(key);

      const buttons = paletteButtons();
      expect(buttons).toHaveLength(palette.length);
      buttons.forEach(button => {
        fireEvent.click(button);
      });

      // Unchanged keycodes are not sent again; inert placeholders send nothing.
      const expected: number[] = [];
      let current = deviceKeycode(keyboard, 0, key);
      for (const { keycode } of palette) {
        if (keycode === null || keycode === current) continue;
        expected.push(keycode);
        current = keycode;
      }
      await vi.waitFor(() => {
        expect(keymapWrites(keyboard, 0, key)).toEqual(expected);
      });
      expect(deviceKeycode(keyboard, 0, key)).toBe(current);
      expect(deviceStore.getState().lastError).toBeNull();
    });

    it('encodes modifiers, layer keys, profiles and NKRO Toggle as the firmware expects', async () => {
      const keyboard = await connect();
      renderPage();
      select(5);
      const assign = async (tabName: string, label: string, keycode: number) => {
        fireEvent.click(tab(tabName));
        fireEvent.click(paletteKey(label));
        await vi.waitFor(() => {
          expect(deviceKeycode(keyboard, 0, 5)).toBe(keycode);
        });
      };

      await assign('Basic', 'L Ctrl', 0x0100);
      await assign('Basic', 'Fn', 0x01a6);
      await assign('Layer', 'TG(2)', 0x32a6);
      await assign('Profile', 'PF(2)', 0x12fe);
      await assign('Extension', 'NKRO\nToggle', 0xfe | (((2 << 6) | (0x20 + 1)) << 8));
    });

    it('assigns nothing for the inert profile placeholders (D8)', async () => {
      const keyboard = await connect();
      renderPage();
      fireEvent.click(tab('Profile'));
      select(1);

      for (const label of ['↔ PF', '↔ PF1', '→ PF', '← PF']) fireEvent.click(paletteKey(label));
      await settle();

      expect(keymapPackets(keyboard)).toEqual([]);
      expect(screen.queryByText(TOAST)).not.toBeInTheDocument();
    });

    it('skips selected keys that have no keymap entry', async () => {
      const keyboard = await connect();
      const keymapLength = keyboard.vk.state.active.keymap[0]?.length ?? 0;
      renderPage();
      select(keymapLength - 1, keymapLength);

      fireEvent.click(paletteKey('A'));

      await vi.waitFor(() => {
        expect(deviceKeycode(keyboard, 0, keymapLength - 1)).toBe(Keycode.A);
      });
      expect(keyboard.vk.state.active.keymap[0]).toHaveLength(keymapLength);
      expect(deviceStore.getState().lastError).toBeNull();
    });
  });

  describe('no selection', () => {
    it('asks to select a key first, for 3 s', () => {
      vi.useFakeTimers();
      const animations = installFakeAnimations();
      onTestFinished(() => {
        animations.uninstall();
      });
      renderPage();

      fireEvent.click(paletteKey('Esc'));

      const message = screen.getByText(TOAST);
      expect(message).toHaveClass(
        'glassmorphism-card bg-gray-50 dark:bg-gray-900 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 text-black dark:text-white'
      );
      const toast = message.parentElement;
      if (!toast) throw new Error('Missing toast');
      expect(toast).toHaveClass('fixed top-4 left-1/2 transform -translate-x-1/2 z-50');
      act(() => {
        vi.advanceTimersByTime(0);
      });
      // Fades in over 300 ms.
      expect(animations.of(toast).map(animation => animation.duration)).toEqual([0, 300]);

      act(() => {
        vi.advanceTimersByTime(2999);
      });
      expect(screen.getByText(TOAST)).toBe(message);
      act(() => {
        vi.advanceTimersByTime(1);
      });
      act(() => {
        vi.advanceTimersByTime(0);
      });
      expect(animations.active(toast).map(animation => animation.duration)).toEqual([300]);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(screen.queryByText(TOAST)).not.toBeInTheDocument();
    });

    it('sends nothing to the keyboard and loads no brush', async () => {
      const keyboard = await connect();
      renderPage();

      fireEvent.click(paletteKey('Q'));
      expect(screen.getByText(TOAST)).toBeInTheDocument();
      select(1);
      await settle();

      expect(keymapPackets(keyboard)).toEqual([]);
    });

    it('hides the toast 3 s after the first click, like the Svelte page', () => {
      vi.useFakeTimers();
      renderPage();

      fireEvent.click(paletteKey('Esc'));
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      fireEvent.click(paletteKey('F1'));
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.queryByText(TOAST)).not.toBeInTheDocument();
    });
  });

  describe('brush', () => {
    it('gives keys added to the selection the last assigned keycode', async () => {
      const keyboard = await connect();
      renderPage();
      select(1);
      fireEvent.click(paletteKey('B'));
      await vi.waitFor(() => {
        expect(deviceKeycode(keyboard, 0, 1)).toBe(Keycode.B);
      });
      keyboard.vk.clearHistory();

      act(() => {
        keySelection.toggleKey(2);
        keySelection.toggleKey(3);
      });

      await vi.waitFor(() => {
        expect(deviceKeycode(keyboard, 0, 2)).toBe(Keycode.B);
        expect(deviceKeycode(keyboard, 0, 3)).toBe(Keycode.B);
      });
      // Only the added keys are written.
      expect(keymapPackets(keyboard).flatMap(packet => [packet.start])).toEqual([2, 3]);
    });

    it('stays loaded after deselecting every key', async () => {
      const keyboard = await connect();
      renderPage();
      select(1);
      fireEvent.click(paletteKey('C'));

      act(() => {
        keySelection.deselectAll();
      });
      select(7);

      await vi.waitFor(() => {
        expect(deviceKeycode(keyboard, 0, 7)).toBe(Keycode.C);
      });
    });

    it('paints nothing before a keycode was assigned', async () => {
      const keyboard = await connect();
      renderPage();

      select(1, 2, 3);
      await settle();

      expect(keymapPackets(keyboard)).toEqual([]);
    });

    it('never writes when the layer changes (PL-015)', async () => {
      const keyboard = await connect();
      renderPage();
      select(1, 2);
      fireEvent.click(paletteKey('D'));
      await vi.waitFor(() => {
        expect(deviceKeycode(keyboard, 0, 2)).toBe(Keycode.D);
      });
      const layer2 = [...(keyboard.vk.state.active.keymap[1] ?? [])];
      keyboard.vk.clearHistory();

      act(() => {
        keySelection.setLayer(2);
      });
      await settle();
      expect(keymapPackets(keyboard)).toEqual([]);

      act(() => {
        keySelection.toggleKey(4);
      });
      await vi.waitFor(() => {
        expect(deviceKeycode(keyboard, 1, 4)).toBe(Keycode.D);
      });
      expect(keyboard.vk.state.active.keymap[1]).toEqual(
        layer2.map((keycode, id) => (id === 4 ? Keycode.D : keycode))
      );
    });

    it('keeps the brush when an inert placeholder is clicked', async () => {
      const keyboard = await connect();
      renderPage();
      fireEvent.click(tab('Profile'));
      select(1);
      fireEvent.click(paletteKey('PF(1)'));
      fireEvent.click(paletteKey('↔ PF'));

      act(() => {
        keySelection.toggleKey(2);
      });

      await vi.waitFor(() => {
        expect(deviceKeycode(keyboard, 0, 2)).toBe(kc.profile(1));
      });
    });

    it('paints every key with a keymap entry when all keys get selected', async () => {
      const keyboard = await connect();
      const keymapLength = keyboard.vk.state.active.keymap[0]?.length ?? 0;
      renderPage();
      act(() => {
        keySelection.setTotalKeys(totalVisibleKeys());
      });
      select(0);
      fireEvent.click(paletteKey('E'));

      await userEvent.keyboard('{Control>}a{/Control}');

      await vi.waitFor(() => {
        expect(keyboard.vk.state.active.keymap[0]).toEqual(Array(keymapLength).fill(Keycode.E));
      });
      expect(keySelectionStore.getState().selected.length).toBeGreaterThan(keymapLength);
      expect(deviceStore.getState().lastError).toBeNull();
    });

    it('is forgotten when the page is left', async () => {
      const keyboard = await connect();
      const view = renderPage();
      select(1);
      fireEvent.click(paletteKey('F'));
      await vi.waitFor(() => {
        expect(deviceKeycode(keyboard, 0, 1)).toBe(Keycode.F);
      });
      view.unmount();
      renderPage();
      keyboard.vk.clearHistory();

      act(() => {
        keySelection.toggleKey(2);
      });
      await settle();

      expect(keymapPackets(keyboard)).toEqual([]);
    });
  });

  describe('shortcuts', () => {
    it('focuses the page, also after clicks inside it', async () => {
      const user = userEvent.setup();
      renderPage();
      const page = screen.getByRole('application');
      expect(page).toHaveFocus();

      await user.click(tab('System'));

      expect(page).toHaveFocus();
    });

    it('toggles select-all with Ctrl+A', async () => {
      const user = userEvent.setup();
      renderPage();
      act(() => {
        keySelection.setTotalKeys(4);
      });

      await user.keyboard('{Control>}a{/Control}');
      expect(keySelectionStore.getState().selected).toEqual([0, 1, 2, 3]);

      await user.keyboard('{Control>}A{/Control}');
      expect(keySelectionStore.getState().selected).toEqual([]);
    });

    it('deselects every key with Escape', async () => {
      const user = userEvent.setup();
      renderPage();
      select(1, 2);

      await user.keyboard('{Escape}');

      expect(keySelectionStore.getState().selected).toEqual([]);
    });

    it('ignores ⌘+A and keys pressed outside the page, like the Svelte page', async () => {
      const user = userEvent.setup();
      renderPage();
      act(() => {
        keySelection.setTotalKeys(4);
      });

      await user.keyboard('{Meta>}a{/Meta}');
      expect(keySelectionStore.getState().selected).toEqual([]);

      select(1);
      act(() => {
        screen.getByRole('application').blur();
      });
      await user.keyboard('{Escape}');
      expect(keySelectionStore.getState().selected).toEqual([1]);
    });
  });

  describe('tab transition', () => {
    it('slides the next tab in from below and the previous one out upwards, and back', () => {
      vi.useFakeTimers();
      const animations = installFakeAnimations();
      onTestFinished(() => {
        animations.uninstall();
      });
      renderPage();
      const [basic] = panels();
      if (!basic) throw new Error('Missing Basic panel');
      expect(basic).toHaveClass('absolute inset-0 w-full h-full overflow-y-auto');

      fireEvent.click(tab('Layer'));
      const [leaving, layer] = panels();
      expect(leaving).toBe(basic);
      if (!layer) throw new Error('Missing Layer panel');
      act(() => {
        vi.advanceTimersByTime(0);
      });

      const intro = animations.of(layer).at(-1);
      const outro = animations.of(basic).at(-1);
      expect(intro?.duration).toBe(350);
      expect(intro?.keyframes[0]).toEqual({ transform: 'translateY(100%)', opacity: '0' });
      expect(intro?.keyframes.at(-1)).toEqual({ transform: 'translateY(0%)', opacity: '1' });
      expect(outro?.duration).toBe(350);
      expect(outro?.keyframes[0]).toEqual({ transform: 'translateY(0%)', opacity: '1' });
      expect(outro?.keyframes.at(-1)).toEqual({ transform: 'translateY(-100%)', opacity: '0' });

      act(() => {
        vi.advanceTimersByTime(350);
      });
      expect(panels()).toEqual([layer]);

      fireEvent.click(tab('System'));
      const system = panels()[1];
      if (!system) throw new Error('Missing System panel');
      act(() => {
        vi.advanceTimersByTime(0);
      });
      expect(animations.of(system).at(-1)?.keyframes[0]).toEqual({
        transform: 'translateY(-100%)',
        opacity: '0',
      });
      expect(animations.of(layer).at(-1)?.keyframes.at(-1)).toEqual({
        transform: 'translateY(100%)',
        opacity: '0',
      });
      act(() => {
        vi.advanceTimersByTime(350);
      });
      expect(panels()).toEqual([system]);
    });

    it('does not animate when the active tab is clicked again', () => {
      vi.useFakeTimers();
      const animations = installFakeAnimations();
      onTestFinished(() => {
        animations.uninstall();
      });
      renderPage();

      fireEvent.click(tab('Basic'));
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(animations.all).toEqual([]);
      expect(panels()).toHaveLength(1);
    });
  });

  describe('Extension groups', () => {
    it('add the Macro and Script keys on a keyboard that supports them (Trinity Pad)', async () => {
      const keyboard = await connectVirtualKeyboard({
        model: 'trinity-pad',
        seedDynamicKeys: false,
      });
      onTestFinished(keyboard.dispose);
      renderPage();
      fireEvent.click(tab('Extension'));

      const macro = screen.getByRole('region', { name: 'Macro' });
      const rows = within(macro).getAllByRole('group');
      expect(rows.map(row => row.getAttribute('aria-label'))).toEqual([
        'Macro 1',
        'Macro 2',
        'Macro 3',
        'Macro 4',
      ]);
      for (const row of rows) {
        expect(
          within(row)
            .getAllByRole('button')
            .map(button => button.textContent)
        ).toEqual(MACRO_KEYS);
      }
      const script = screen.getByRole('region', { name: 'Script' });
      expect(
        within(script)
          .getAllByRole('button')
          .map(button => button.textContent)
      ).toEqual(['Watch', 'Start', 'Stop', 'Suspend', 'Restart', 'Toggle']);

      select(0);
      fireEvent.click(within(item(rows, 1)).getByRole('button', { name: 'Play\nOnce' }));
      await vi.waitFor(() => {
        expect(deviceKeycode(keyboard, 0, 0)).toBe(0x41ad);
      });
      select(1);
      fireEvent.click(within(script).getByRole('button', { name: 'Toggle' }));
      await vi.waitFor(() => {
        expect(deviceKeycode(keyboard, 0, 1)).toBe(0x05ae);
      });
    });

    it('show neither group on a keyboard without macros and scripts (Starlight)', async () => {
      await connect();
      renderPage();
      fireEvent.click(tab('Extension'));
      expect(screen.queryByRole('region', { name: 'Macro' })).toBeNull();
      expect(screen.queryByRole('region', { name: 'Script' })).toBeNull();
      expect(paletteButtons().map(button => button.textContent)).toEqual(
        REMAP_PALETTES.extension.map(key => key.label)
      );
    });
  });
});
