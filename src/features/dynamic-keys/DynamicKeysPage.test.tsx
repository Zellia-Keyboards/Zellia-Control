import { KeyModifier } from 'emi-keyboard-controller';
import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { deviceSession, deviceStore } from '../device';
import { keySelection, keySelectionStore } from '../keyboard';
import { kc } from '../keycodes';
import { dynamicKeyKeycode } from '../../testing/virtual-keyboard';
import { renderDynamicKeysPage, selectKeys } from './testing/render-page';

/** Seeded Starlight dynamic keys (layer 0): stroke 32, mod-tap 30, toggle 34, mutex 31 + 33. */
const STROKE_KEY = 32;
const MOD_TAP_KEY = 30;
const TOGGLE_KEY = 34;
const MUTEX_KEYS = [31, 33] as const;

function selection() {
  return keySelectionStore.getState();
}

function configuredTable() {
  return screen.getByRole('table');
}

describe('Dynamic Keys dashboard', () => {
  it('shows the mode list and an empty configured-keys panel for a keyboard without dynamic keys', async () => {
    await renderDynamicKeysPage({ seedDynamicKeys: false });

    expect(screen.getByRole('heading', { level: 1, name: 'Dynamic Keys' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Select a Mode' })).toBeInTheDocument();
    for (const name of ['Tap Hold', 'Toggle', 'Dynamic Key Stroke', 'Null Bind']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    }
    // The count is real (the Svelte heading printed the literal "(configuredKeys.length)").
    expect(
      screen.getByRole('heading', { level: 2, name: 'Configured Dynamic Keys (0)' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No dynamic keys available' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Choose the dynamic key behavior you want to configure Click on keys in the keyboard layout to configure them'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('disables key selection on the dashboard and restores it when leaving the page', async () => {
    const { unmount, user } = await renderDynamicKeysPage({ seedDynamicKeys: false });
    expect(selection().allowSelection).toBe(false);

    await user.click(screen.getByRole('button', { name: /^Toggle/ }));
    expect(selection().allowSelection).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(selection().allowSelection).toBe(false);

    unmount();
    expect(selection().allowSelection).toBe(true);
  });

  it('lists the keyboard’s dynamic keys, one row per key (a null bind has two)', async () => {
    const { keyboard } = await renderDynamicKeysPage();
    const keymap = keyboard.vk.state.active.keymap[0] ?? [];
    expect(keymap[STROKE_KEY]).toBe(dynamicKeyKeycode(0));

    expect(
      screen.getByRole('heading', { level: 2, name: 'Configured Dynamic Keys (5)' })
    ).toBeInTheDocument();
    const rows = within(configuredTable()).getAllByRole('row').slice(1);
    expect(rows.map(row => within(row).getAllByRole('cell')[1]?.textContent)).toEqual([
      'Dynamic Key',
      'Tap Hold',
      'Toggle',
      'Null Bind',
      'Null Bind',
    ]);
    const config = deviceStore.getState().config;
    const modTap = config?.dynamicKeys[1];
    expect(modTap?.kind).toBe('modTap');
    const tap = modTap?.kind === 'modTap' ? modTap.tap : -1;
    expect(rows.map(row => within(row).getAllByRole('cell')[2]?.textContent)).toEqual([
      '2 bindings',
      `Tap: ${tap} / Hold: ${kc.modifier(KeyModifier.KeyLeftCtrl)}`,
      '0 states',
      'Bottom out: 0mm',
      'Bottom out: 0mm',
    ]);
    // Key names as the Svelte table showed them.
    for (const row of rows) {
      const [keyCell] = within(row).getAllByRole('cell');
      expect(keyCell?.textContent).toBe('UNUnknown');
    }
  });

  it('deletes a dynamic key from the keyboard and gives its key back its own binding', async () => {
    const { keyboard, user } = await renderDynamicKeysPage();
    const original = keyboard.vk.state.active.dynamicKeys[2];
    expect(original?.type).toBe('toggle');
    const binding = original?.type === 'toggle' ? original.binding : -1;

    const toggleRow = within(configuredTable()).getAllByRole('row')[3];
    expect(toggleRow).toBeDefined();
    if (!toggleRow) return;
    await user.click(within(toggleRow).getByRole('button', { name: 'Delete configuration' }));

    await expect.poll(() => keyboard.vk.state.active.keymap[0]?.[TOGGLE_KEY]).toBe(binding);
    expect(keyboard.vk.state.active.dynamicKeys.filter(key => key.type === 'toggle')).toEqual([]);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Configured Dynamic Keys (4)' })
    ).toBeInTheDocument();
  });

  it('deleting a null-bind row removes the pair', async () => {
    const { keyboard, user } = await renderDynamicKeysPage();
    const mutexRow = within(configuredTable()).getAllByRole('row')[4];
    if (!mutexRow) throw new Error('missing mutex row');
    await user.click(within(mutexRow).getByRole('button', { name: 'Delete configuration' }));

    await expect
      .poll(() => keyboard.vk.state.active.dynamicKeys.some(key => key.type === 'mutex'))
      .toBe(false);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Configured Dynamic Keys (3)' })
    ).toBeInTheDocument();
  });

  it('edits a row in its mode with its key and layer selected', async () => {
    const { user } = await renderDynamicKeysPage();
    act(() => {
      keySelection.setLayer(2);
    });
    const modTapRow = within(configuredTable()).getAllByRole('row')[2];
    if (!modTapRow) throw new Error('missing mod-tap row');
    await user.click(within(modTapRow).getByRole('button', { name: 'Edit configuration' }));

    expect(screen.getByRole('heading', { name: 'Tap-Hold Configuration' })).toBeInTheDocument();
    expect(selection()).toMatchObject({ selected: [MOD_TAP_KEY], layer: 1 });
    expect(screen.getByText(`Key Index: ${MOD_TAP_KEY}`)).toBeInTheDocument();
  });

  it('edits a null bind with both of its keys selected', async () => {
    const { user } = await renderDynamicKeysPage();
    const mutexRow = within(configuredTable()).getAllByRole('row')[5];
    if (!mutexRow) throw new Error('missing mutex row');
    await user.click(within(mutexRow).getByRole('button', { name: 'Edit configuration' }));

    expect(screen.getByRole('heading', { name: 'Null Bind Configuration' })).toBeInTheDocument();
    expect(selection().selected).toEqual(MUTEX_KEYS);
  });

  it('opens a mode with a fresh selection and returns with the selection cleared', async () => {
    const { user } = await renderDynamicKeysPage();
    selectKeys(3, 4);

    await user.click(screen.getByRole('button', { name: /^Dynamic Key Stroke/ }));
    expect(
      screen.getByRole('heading', { name: 'Dynamic Keystroke Configuration' })
    ).toBeInTheDocument();
    expect(selection().selected).toEqual([]);

    selectKeys(STROKE_KEY);
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Dynamic Keys' })).toBeInTheDocument();
    expect(selection().selected).toEqual([]);
  });

  it('follows the keyboard: dynamic keys applied elsewhere appear in the table', async () => {
    await renderDynamicKeysPage({ seedDynamicKeys: false });
    act(() => {
      deviceSession.applyDynamicKey({
        kind: 'toggle',
        target: { layer: 1, id: 5 },
        binding: kc.key(0x04),
      });
    });
    expect(
      screen.getByRole('heading', { level: 2, name: 'Configured Dynamic Keys (1)' })
    ).toBeInTheDocument();
  });
});
