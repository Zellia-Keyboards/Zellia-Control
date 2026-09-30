import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, onTestFinished } from 'vitest';
import { deviceSession, deviceStore, type DeviceConfig } from '../../features/device';
import { keySelection } from '../../features/keyboard';
import {
  lightingLabels,
  parseLayout,
  performanceLabels,
  remapLabels,
  type KeyLabels,
  type LayoutKey,
} from '../../features/keyboard/model';
import { connectVirtualKeyboard } from '../../testing/app-keyboard';
import { renderApp, resetShellState } from '../testing/render-app';

afterEach(resetShellState);

async function connect() {
  const keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false });
  onTestFinished(keyboard.dispose);
  return keyboard;
}

function loaded(): { keys: readonly LayoutKey[]; config: DeviceConfig } {
  const { connection, config } = deviceStore.getState();
  if (connection.status !== 'ready' || !config) throw new Error('not connected');
  return { keys: parseLayout(connection.model.layoutJson), config };
}

/** Label cells (slot → text) of every keycap on screen, by key id. */
function shownLabels(): Map<number, Record<number, string>> {
  const shown = new Map<number, Record<number, string>>();
  for (const cap of document.querySelectorAll<HTMLElement>('.keycap')) {
    const cells: Record<number, string> = {};
    for (const cell of cap.querySelectorAll('span')) {
      cells[Number(cell.className.replace('label-cell-', ''))] = cell.textContent;
    }
    shown.set(Number(cap.dataset.keyId), cells);
  }
  return shown;
}

/** The label cells a keycap shows for `labels`: slots 0-8 that are not empty. */
function expectedCells(labels: KeyLabels | undefined): Record<number, string> {
  const cells: Record<number, string> = {};
  labels?.slice(0, 9).forEach((label, slot) => {
    if (label) cells[slot] = label;
  });
  return cells;
}

function expectLabels(expected: ReadonlyMap<number, KeyLabels>): void {
  const shown = shownLabels();
  expect(shown.size).toBeGreaterThan(50);
  for (const [id, cells] of shown)
    expect(cells, `key ${id}`).toEqual(expectedCells(expected.get(id)));
}

function keyboardWrapper(): Element | null {
  return document.querySelector('.keycap')?.closest('.relative') ?? null;
}

describe('ShellKeyboard', () => {
  it('shows the keycodes of the selected layer on Remap', async () => {
    await connect();
    const user = userEvent.setup();
    renderApp('/remap/');
    await screen.findByTestId('page');
    const { keys, config } = loaded();

    expectLabels(remapLabels(keys, config.keymap, 0, config.dynamicKeys));
    expect(shownLabels().get(0)).toEqual({ 6: 'Escape' });

    await user.click(screen.getByTitle('Layer 2'));

    expectLabels(remapLabels(keys, config.keymap, 1, config.dynamicKeys));
  });

  it('shows the keycodes and dynamic keys of the selected layer on Dynamic Keys (PL-023)', async () => {
    await connect();
    renderApp('/dynamic/');
    await screen.findByTestId('page');
    const { keys, config } = loaded();

    expectLabels(remapLabels(keys, config.keymap, 0, config.dynamicKeys));
    expect(keyboardWrapper()?.className).toBe('relative');
  });

  it('shows performance values with smaller legends on Performance', async () => {
    await connect();
    renderApp('/performance/');
    await screen.findByTestId('page');
    const { keys, config } = loaded();

    expectLabels(performanceLabels(keys, config.advancedKeys));
    expect(keyboardWrapper()?.className).toBe('relative performance-page-keys');
  });

  it('shows lighting modes with smaller legends on Lighting', async () => {
    await connect();
    renderApp('/lighting/');
    await screen.findByTestId('page');
    const { keys, config } = loaded();

    expectLabels(lightingLabels(keys, config.rgbKeys));
    expect(keyboardWrapper()?.className).toBe('relative lighting-page-keys');
  });

  it('follows changes of the keyboard configuration', async () => {
    await connect();
    renderApp('/remap/');
    await screen.findByTestId('page');

    act(() => {
      deviceSession.setKeycodes(0, [0], 0x04);
    });

    expect(shownLabels().get(0)).toEqual({ 6: 'A' });
  });

  it('selects keys unless the page disallows selection', async () => {
    await connect();
    const user = userEvent.setup();
    renderApp('/remap/');
    await screen.findByTestId('page');
    const escape = () => document.querySelector('.keycap[data-key-id="0"]');

    await user.pointer({ keys: '[MouseLeft]', target: escape() ?? document.body });
    expect(escape()).toHaveClass('selected');

    act(() => {
      keySelection.setAllowSelection(false);
    });
    expect(escape()).not.toHaveClass('selected');
    expect(escape()).toHaveClass('selection-disabled');

    await user.pointer({ keys: '[MouseLeft]', target: escape() ?? document.body });
    await waitFor(() => {
      expect(escape()).toHaveClass('selection-disabled');
    });
    act(() => {
      keySelection.setAllowSelection(true);
    });
    // The press while selection was disallowed changed nothing.
    expect(escape()).toHaveClass('selected');
  });
});
