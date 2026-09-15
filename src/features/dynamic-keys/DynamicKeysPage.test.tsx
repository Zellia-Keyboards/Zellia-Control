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

/** The table rows below the header. */
function tableRows(): HTMLElement[] {
  return within(configuredTable()).getAllByRole('row').slice(1);
}

/** The text of column `column` in every table row. */
function columnTexts(column: number): (string | null | undefined)[] {
  return tableRows().map(row => within(row).getAllByRole('cell')[column]?.textContent);
}

/** The `index`-th table row whose Mode column reads `mode`. */
function rowOfMode(mode: string, index = 0): HTMLElement {
  const row = tableRows().filter(
    candidate => within(candidate).getAllByRole('cell')[1]?.textContent === mode
  )[index];
  if (!row) throw new Error(`no ${mode} row ${index}`);
  return row;
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
    // In the Svelte table's order: by key id (mod-tap 30, null bind 31 + 33, toggle 34), the
    // DKS keys last.
    expect(columnTexts(1)).toEqual(['Tap Hold', 'Null Bind', 'Null Bind', 'Toggle', 'Dynamic Key']);
    const config = deviceStore.getState().config;
    const modTap = config?.dynamicKeys[1];
    expect(modTap?.kind).toBe('modTap');
    const tap = modTap?.kind === 'modTap' ? modTap.tap : -1;
    expect(columnTexts(2)).toEqual([
      `Tap: ${tap} / Hold: ${kc.modifier(KeyModifier.KeyLeftCtrl)}`,
      'Bottom out: 0mm',
      'Bottom out: 0mm',
      '0 states',
      '2 bindings',
    ]);
    // Key names as the Svelte table showed them.
    for (const row of tableRows()) {
      const [keyCell] = within(row).getAllByRole('cell');
      expect(keyCell?.textContent).toBe('UNUnknown');
    }
  });

  it('deletes a dynamic key from the keyboard and gives its key back its own binding', async () => {
    const { keyboard, user } = await renderDynamicKeysPage();
    const original = keyboard.vk.state.active.dynamicKeys[2];
    expect(original?.type).toBe('toggle');
    const binding = original?.type === 'toggle' ? original.binding : -1;

    await user.click(
      within(rowOfMode('Toggle')).getByRole('button', { name: 'Delete configuration' })
    );

    await expect.poll(() => keyboard.vk.state.active.keymap[0]?.[TOGGLE_KEY]).toBe(binding);
    expect(keyboard.vk.state.active.dynamicKeys.filter(key => key.type === 'toggle')).toEqual([]);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Configured Dynamic Keys (4)' })
    ).toBeInTheDocument();
  });

  it('deleting a null-bind row removes the pair', async () => {
    const { keyboard, user } = await renderDynamicKeysPage();
    await user.click(
      within(rowOfMode('Null Bind')).getByRole('button', { name: 'Delete configuration' })
    );

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
    await user.click(
      within(rowOfMode('Tap Hold')).getByRole('button', { name: 'Edit configuration' })
    );

    expect(screen.getByRole('heading', { name: 'Tap-Hold Configuration' })).toBeInTheDocument();
    expect(selection()).toMatchObject({ selected: [MOD_TAP_KEY], layer: 1 });
    expect(screen.getByText(`Key Index: ${MOD_TAP_KEY}`)).toBeInTheDocument();
  });

  it('edits a null bind with both of its keys selected', async () => {
    const { user } = await renderDynamicKeysPage();
    // The pair's second row edits the same pair.
    await user.click(
      within(rowOfMode('Null Bind', 1)).getByRole('button', { name: 'Edit configuration' })
    );

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

  it('follows a profile switch: the table shows the new profile’s dynamic keys', async () => {
    await renderDynamicKeysPage();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Configured Dynamic Keys (5)' })
    ).toBeInTheDocument();

    // Only profile 0 of the virtual keyboard has dynamic keys.
    await act(() => deviceSession.switchProfile(1));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Configured Dynamic Keys (0)' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No dynamic keys available' })).toBeInTheDocument();
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
