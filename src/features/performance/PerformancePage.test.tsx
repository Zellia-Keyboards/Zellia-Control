/**
 * Performance page against the real device layer: the app's `deviceSession` connected to the
 * virtual keyboard. Key selection is driven through the key-selection store, like the shell's
 * keyboard does.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalibrationMode, KeyMode } from 'emi-keyboard-controller';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectVirtualKeyboard, type ConnectedKeyboard } from '../../testing/app-keyboard';
import { fractionToRaw, type WireAdvancedKey } from '../../testing/virtual-keyboard';
import { deviceSession, deviceStore, type AdvancedKeyConfig } from '../device';
import { INITIAL_KEY_SELECTION, keySelection, keySelectionStore } from '../keyboard';
import { PerformancePage } from './PerformancePage';

const TOTAL_KEYS = 70;

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

function renderPage() {
  return render(
    <MemoryRouter>
      <PerformancePage />
    </MemoryRouter>
  );
}

/** Lets the controller's packet queue drain. */
async function settle(): Promise<void> {
  for (let round = 0; round < 3; round++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

function select(...keyIds: number[]): void {
  act(() => {
    keySelection.setSelected(keyIds);
  });
}

function deviceKey(id: number): WireAdvancedKey {
  const key = keyboard.vk.state.active.advancedKeys[id];
  if (!key) throw new Error(`no advanced key ${id}`);
  return key;
}

function storeKey(id: number): AdvancedKeyConfig {
  const key = deviceStore.getState().config?.advancedKeys[id];
  if (!key) throw new Error(`no advanced key ${id} in the store`);
  return key;
}

/** Indices of the advanced keys written since the last `clearHistory()`. */
function advancedKeyWrites(): number[] {
  return keyboard.vk.sentPackets.flatMap(packet =>
    packet.op === 'set' && packet.kind === 'advancedKey' ? [packet.index] : []
  );
}

/** Writes a key through the session and waits until the keyboard has it. */
async function seedKey(id: number, patch: Partial<AdvancedKeyConfig>): Promise<void> {
  deviceSession.setAdvancedKeys([id], { ...storeKey(id), ...patch });
  await expect.poll(() => advancedKeyWrites()).toContain(id);
  await settle();
  keyboard.vk.clearHistory();
}

const slider = (name: string) => screen.getByRole('slider', { name });
const numberInput = (name: string) => screen.getByRole('spinbutton', { name });
const rapidTriggerSwitch = () => screen.getByRole('switch', { name: 'Rapid Trigger Toggle' });

/** A rapid-trigger key with distinct values: 2.5 / 2.2 mm, 0.2 / 0.4 mm, 0.3–3.4 mm. */
const TUNED: Partial<AdvancedKeyConfig> = {
  mode: KeyMode.KeyAnalogRapidMode,
  activation: 0.625,
  deactivation: 0.55,
  triggerDistance: 0.05,
  releaseDistance: 0.1,
  triggerSpeed: 0.02,
  releaseSpeed: 0.03,
  upperDeadzone: 0.075,
  lowerDeadzone: 0.15,
};

describe('PerformancePage', () => {
  it('shows the Svelte defaults until a key is selected', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 2, name: 'Performance' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Switch Travel Distance' })).toHaveValue('4');
    expect(screen.getByRole('button', { name: 'Select all keys' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard selection' })).toBeInTheDocument();
    expect(screen.getByText('Deactivation: 1.500mm')).toBeInTheDocument();
    expect(screen.getByText('Actuation: 2.000mm')).toBeInTheDocument();
    expect(screen.getByText('0 keys selected')).toBeInTheDocument();
    expect(rapidTriggerSwitch()).not.toBeChecked();
    expect(screen.queryByText('Key Travel Deadzones')).not.toBeInTheDocument();
    expect(screen.queryByText('Rapid Trigger Sensitivity')).not.toBeInTheDocument();
  });

  it('allows key selection while it is open', () => {
    keySelection.setAllowSelection(false);
    renderPage();
    expect(keySelectionStore.getState().allowSelection).toBe(true);
  });

  it('counts the selected keys as the selection changes', () => {
    renderPage();
    select(3, 4, 5);
    expect(screen.getByText('3 keys selected')).toBeInTheDocument();
    act(() => {
      keySelection.deselectAll();
    });
    expect(screen.getByText('0 keys selected')).toBeInTheDocument();
  });

  describe('selecting keys (D12)', () => {
    it('loads every value of the first selected key without writing to it', async () => {
      await seedKey(20, TUNED);
      renderPage();
      select(20);

      expect(screen.getByText('Deactivation: 2.200mm')).toBeInTheDocument();
      expect(screen.getByText('Actuation: 2.500mm')).toBeInTheDocument();
      expect(rapidTriggerSwitch()).toBeChecked();
      expect(screen.getByText('Start: 0.300mm')).toBeInTheDocument();
      expect(screen.getByText('Bottom: 3.400mm')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'Separate Sensitivity Toggle' })).toBeChecked();
      expect(screen.getByText('0.20 mm')).toBeInTheDocument();
      expect(screen.getByText('0.40 mm')).toBeInTheDocument();
      expect(numberInput('Actuation')).toHaveValue(2.5);

      await settle();
      expect(advancedKeyWrites()).toEqual([]);
    });

    it('shows keys read from the keyboard rounded to thousandths, still without writing', async () => {
      renderPage();
      select(5);
      expect(screen.getByText('Deactivation: 1.960mm')).toBeInTheDocument();
      expect(screen.getByText('Actuation: 2.000mm')).toBeInTheDocument();
      expect(numberInput('Deactivation')).toHaveValue(1.96);
      expect(rapidTriggerSwitch()).not.toBeChecked();
      await settle();
      expect(advancedKeyWrites()).toEqual([]);
    });

    it('loads the first of the keys selected before the page opened and writes to none', async () => {
      await seedKey(7, TUNED);
      // Selected on another page: the selection outlives navigation.
      act(() => {
        keySelection.setSelected([7, 9]);
      });
      const untouched = deviceKey(9);
      renderPage();
      expect(screen.getByText('Actuation: 2.500mm')).toBeInTheDocument();
      expect(screen.getByText('2 keys selected')).toBeInTheDocument();
      await settle();
      expect(advancedKeyWrites()).toEqual([]);
      expect(deviceKey(9)).toEqual(untouched);
    });

    it('applies a change to the keys selected before the page opened as well', async () => {
      await seedKey(7, TUNED);
      act(() => {
        keySelection.setSelected([7, 9]);
      });
      renderPage();
      fireEvent.change(slider('Actuation'), { target: { value: '3' } });
      await expect.poll(() => deviceKey(9).activation).toBe(fractionToRaw(0.75));
      // The whole brush: the first key's other values too.
      expect(deviceKey(9)).toMatchObject({
        mode: KeyMode.KeyAnalogRapidMode,
        deactivation: deviceKey(7).deactivation,
        triggerDistance: deviceKey(7).triggerDistance,
        releaseDistance: deviceKey(7).releaseDistance,
        triggerSpeed: deviceKey(7).triggerSpeed,
        releaseSpeed: deviceKey(7).releaseSpeed,
        upperDeadzone: deviceKey(7).upperDeadzone,
        lowerDeadzone: deviceKey(7).lowerDeadzone,
      });
    });
  });

  describe('editing', () => {
    it('applies each change to every selected key', async () => {
      renderPage();
      select(3, 4);
      fireEvent.change(slider('Actuation'), { target: { value: '3' } });
      fireEvent.change(slider('Deactivation'), { target: { value: '2.5' } });

      expect(screen.getByText('Actuation: 3.000mm')).toBeInTheDocument();
      for (const id of [3, 4]) {
        expect(storeKey(id)).toMatchObject({ activation: 0.75, deactivation: 0.625 });
        await expect.poll(() => deviceKey(id).activation).toBe(fractionToRaw(0.75));
        await expect.poll(() => deviceKey(id).deactivation).toBe(fractionToRaw(0.625));
      }
      expect(deviceKey(5).activation).not.toBe(fractionToRaw(0.75));
    });

    it('turns on rapid trigger with its deadzones and sensitivities', async () => {
      const user = userEvent.setup();
      renderPage();
      select(3);
      const loadedTrigger = storeKey(3).triggerDistance;
      await user.click(rapidTriggerSwitch());

      expect(screen.getByRole('heading', { level: 4, name: 'Key Travel Deadzones' })).toBeVisible();
      expect(screen.getByText('Rapid Trigger Sensitivity')).toBeInTheDocument();
      await expect.poll(() => deviceKey(3).mode).toBe(KeyMode.KeyAnalogRapidMode);

      fireEvent.change(slider('Start'), { target: { value: '0.6' } });
      fireEvent.change(slider('Bottom'), { target: { value: '3' } });
      fireEvent.change(slider('SENSITIVITY'), { target: { value: '0.8' } });
      expect(storeKey(3)).toMatchObject({
        upperDeadzone: 0.15,
        lowerDeadzone: 0.25,
        triggerDistance: 0.2,
        releaseDistance: 0.2,
      });
      await expect.poll(() => deviceKey(3).lowerDeadzone).toBe(fractionToRaw(0.25));

      // Separate press/release values are their own: they still hold the loaded 0.32 mm.
      await user.click(screen.getByRole('switch', { name: 'Separate Sensitivity Toggle' }));
      expect(screen.getAllByText('0.32 mm')).toHaveLength(2);
      fireEvent.change(slider('RELEASE SENSITIVITY'), { target: { value: '1.2' } });
      expect(storeKey(3)).toMatchObject({ triggerDistance: loadedTrigger, releaseDistance: 0.3 });

      await user.click(rapidTriggerSwitch());
      expect(screen.queryByText('Key Travel Deadzones')).not.toBeInTheDocument();
      await expect.poll(() => deviceKey(3).mode).toBe(KeyMode.KeyAnalogNormalMode);
    });

    it('keeps each key’s calibration and sensor bounds', async () => {
      renderPage();
      select(3, 4);
      fireEvent.change(slider('Actuation'), { target: { value: '3' } });
      await expect.poll(() => deviceKey(4).activation).toBe(fractionToRaw(0.75));
      expect(storeKey(4)).toMatchObject({
        calibrationMode: CalibrationMode.KeyAutoCalibrationUndefined,
        upperBound: 2600,
        lowerBound: 140,
      });
    });

    it('clamps the points to the switch travel and applies them', () => {
      renderPage();
      select(3);
      fireEvent.change(screen.getByRole('textbox', { name: 'Switch Travel Distance' }), {
        target: { value: '1' },
      });
      expect(screen.getByText('Actuation: 1.000mm')).toBeInTheDocument();
      expect(screen.getByText('Deactivation: 0.900mm')).toBeInTheDocument();
      expect(slider('Actuation')).toHaveAttribute('max', '1');
      expect(storeKey(3)).toMatchObject({
        activation: 0.25,
        deactivation: 0.225,
        // Bottom-out point 1.0 mm: (4.0 − 1.0) / 4.0.
        lowerDeadzone: 0.75,
      });
    });

    it('does not write while no key is selected', async () => {
      renderPage();
      fireEvent.change(slider('Actuation'), { target: { value: '3' } });
      expect(screen.getByText('Actuation: 3.000mm')).toBeInTheDocument();
      await settle();
      expect(advancedKeyWrites()).toEqual([]);
    });

    it('ignores selected ids the keyboard has no key for', () => {
      renderPage();
      select(3, 200);
      fireEvent.change(slider('Actuation'), { target: { value: '3' } });
      expect(storeKey(3).activation).toBe(0.75);
      expect(deviceStore.getState().lastError).toBeNull();
    });
  });

  describe('brush (§1.4)', () => {
    it('gives keys added to the selection the current settings', async () => {
      renderPage();
      select(3);
      fireEvent.change(slider('Actuation'), { target: { value: '3' } });
      act(() => {
        keySelection.toggleKey(10);
      });
      expect(storeKey(10).activation).toBe(0.75);
      await expect.poll(() => deviceKey(10).activation).toBe(fractionToRaw(0.75));
    });

    it('paints the other keys of a first selection with the first key', async () => {
      await seedKey(3, TUNED);
      renderPage();
      select(3, 4, 5);
      expect(screen.getByText('Actuation: 2.500mm')).toBeInTheDocument();
      await expect.poll(() => deviceKey(5).activation).toBe(deviceKey(3).activation);
      expect(deviceKey(4)).toMatchObject({ mode: KeyMode.KeyAnalogRapidMode });
    });

    it('paints only the added keys, not keys selected before the page opened', async () => {
      await seedKey(7, TUNED);
      act(() => {
        keySelection.setSelected([7, 9]);
      });
      const untouched = deviceKey(9);
      renderPage();
      act(() => {
        keySelection.toggleKey(11);
      });
      await expect.poll(() => deviceKey(11).activation).toBe(deviceKey(7).activation);
      expect(advancedKeyWrites()).toEqual([11]);
      expect(deviceKey(9)).toEqual(untouched);
    });

    it('stays loaded after deselecting all, instead of loading the next key', async () => {
      await seedKey(12, TUNED);
      renderPage();
      select(3);
      fireEvent.change(slider('Actuation'), { target: { value: '3' } });
      act(() => {
        keySelection.deselectAll();
      });
      select(12);

      expect(screen.getByText('Actuation: 3.000mm')).toBeInTheDocument();
      expect(rapidTriggerSwitch()).not.toBeChecked();
      expect(storeKey(12)).toMatchObject({
        mode: KeyMode.KeyAnalogNormalMode,
        activation: 0.75,
        deactivation: storeKey(3).deactivation,
        triggerSpeed: storeKey(3).triggerSpeed,
      });
    });

    it('never writes when the layer changes', async () => {
      renderPage();
      select(3);
      fireEvent.change(slider('Actuation'), { target: { value: '3' } });
      await settle();
      keyboard.vk.clearHistory();
      act(() => {
        keySelection.setLayer(2);
      });
      await settle();
      expect(advancedKeyWrites()).toEqual([]);
    });
  });

  it('works under StrictMode, which runs its effects twice', async () => {
    await seedKey(7, TUNED);
    act(() => {
      keySelection.setSelected([7, 9]);
    });
    render(
      <StrictMode>
        <MemoryRouter>
          <PerformancePage />
        </MemoryRouter>
      </StrictMode>
    );
    expect(screen.getByText('Actuation: 2.500mm')).toBeInTheDocument();
    fireEvent.change(slider('Actuation'), { target: { value: '3' } });
    act(() => {
      keySelection.toggleKey(11);
    });
    expect(storeKey(9).activation).toBe(0.75);
    expect(storeKey(11).activation).toBe(0.75);
    expect(screen.getByText('3 keys selected')).toBeInTheDocument();
    // One write per key: the effects' second run subscribes once.
    await settle();
    expect(advancedKeyWrites().sort((a, b) => a - b)).toEqual([7, 9, 11]);
  });

  describe('selection shortcuts and buttons', () => {
    it('toggles select-all with Ctrl/⌘+A and deselects with Ctrl/⌘+Escape', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.keyboard('{Control>}a{/Control}');
      expect(keySelectionStore.getState().selected).toHaveLength(TOTAL_KEYS);
      await user.keyboard('{Control>}a{/Control}');
      expect(keySelectionStore.getState().selected).toHaveLength(0);
      await user.keyboard('{Meta>}A{/Meta}');
      expect(keySelectionStore.getState().selected).toHaveLength(TOTAL_KEYS);
      await user.keyboard('{Escape}');
      expect(keySelectionStore.getState().selected).toHaveLength(TOTAL_KEYS);
      await user.keyboard('{Meta>}{Escape}{/Meta}');
      expect(keySelectionStore.getState().selected).toHaveLength(0);
      await user.keyboard('a');
      expect(keySelectionStore.getState().selected).toHaveLength(0);
    });

    it('prevents the browser’s own select-all and stops listening when closed', () => {
      const { unmount } = renderPage();
      expect(fireEvent.keyDown(window, { key: 'a', ctrlKey: true })).toBe(false);
      expect(fireEvent.keyDown(window, { key: 'Escape', ctrlKey: true })).toBe(false);
      unmount();
      expect(fireEvent.keyDown(window, { key: 'a', ctrlKey: true })).toBe(true);
      expect(keySelectionStore.getState().selected).toHaveLength(0);
    });

    it('selects all keys and discards the selection from the header buttons', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'Select all keys' }));
      expect(keySelectionStore.getState().selected).toHaveLength(TOTAL_KEYS);
      await user.click(screen.getByRole('button', { name: 'Discard selection' }));
      expect(keySelectionStore.getState().selected).toHaveLength(0);
    });
  });
});
