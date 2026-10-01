/**
 * Macros page against the real device layer: the app's `deviceSession` connected to a virtual
 * Trinity Pad, whose controller declares 4 macro slots of 128 entries at 8000 Hz (a tick is
 * 0.125 ms). Macro edits are staged; they reach the keyboard on Save.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Keycode } from 'emi-keyboard-controller';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { connectVirtualKeyboard, type ConnectedKeyboard } from '../../testing/app-keyboard';
import { deviceSession, deviceStore, type DeviceState, type MacroAction } from '../device';
import { MacrosPage } from './MacrosPage';

/** libamp's modifier-only keycode of Left Shift and the Mouse keycode of the right button. */
const LEFT_SHIFT = 0x0200;
const MOUSE_RIGHT = 0x01a5;
const NO_ROOM = 'Not enough space for a complete action.';

function action(delay: number, keycode: number, event: 'down' | 'up'): MacroAction {
  return { delay, keycode, event, isVirtual: true, keyId: 0 };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MacrosPage />
    </MemoryRouter>
  );
}

/** A slot as the store has it. */
function macro(slot = 0): readonly MacroAction[] | undefined {
  return deviceStore.getState().config?.macros[slot];
}

/** The action rows of the table, without its header row. */
function rows(): HTMLElement[] {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1);
}

/** Dispatches a key event on the window like a physical key; returns whether it was cancelled. */
function key(type: 'keydown' | 'keyup', code: string, repeat = false): boolean {
  const event = new KeyboardEvent(type, { code, repeat, bubbles: true, cancelable: true });
  fireEvent(window, event);
  return event.defaultPrevented;
}

/** Dispatches a mouse button event on the page; returns whether it was cancelled. */
function mouse(type: 'mousedown' | 'mouseup', button: number): boolean {
  const event = new MouseEvent(type, { button, bubbles: true, cancelable: true });
  fireEvent(document.body, event);
  return event.defaultPrevented;
}

/** Resolves the next time the device store matches `predicate` (already true resolves at once). */
function waitForDeviceState(predicate: (state: DeviceState) => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    if (predicate(deviceStore.getState())) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error('Device store did not reach the expected state within 3000 ms'));
    }, 3000);
    const unsubscribe = deviceStore.subscribe(state => {
      if (predicate(state)) {
        clearTimeout(timer);
        unsubscribe();
        resolve();
      }
    });
  });
}

it('renders nothing until a keyboard configuration is loaded', () => {
  const { container } = renderPage();
  expect(container).toBeEmptyDOMElement();
});

it('says when the keyboard does not support macros (Zellia Starlight)', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false });
  onTestFinished(keyboard.dispose);

  renderPage();

  expect(
    screen.getByRole('heading', { name: 'This keyboard does not support macros' })
  ).toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Macro slots' })).not.toBeInTheDocument();
});

// Page renders and role queries are slow in jsdom on a busy machine.
describe('MacrosPage (Trinity Pad)', { timeout: 20_000 }, () => {
  let keyboard: ConnectedKeyboard;

  beforeEach(async () => {
    // The vendored controller logs every load step.
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    keyboard = await connectVirtualKeyboard({ model: 'trinity-pad', seedDynamicKeys: false });
  });

  afterEach(() => {
    keyboard.dispose();
  });

  it('shows the slots with their action counts and the chosen slot with its limit', async () => {
    deviceSession.setMacro(1, [action(0, Keycode.A, 'down')]);
    const user = userEvent.setup();
    renderPage();

    const slots = within(screen.getByRole('group', { name: 'Macro slots' })).getAllByRole('button');
    expect(slots.map(slot => slot.textContent)).toEqual([
      'Macro 1 0 actions',
      'Macro 2 1 action',
      'Macro 3 0 actions',
      'Macro 4 0 actions',
    ]);
    expect(slots[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('0 / 127 actions')).toBeInTheDocument();
    expect(
      screen.getByText('This macro has no actions yet. Record them or add keys.')
    ).toBeInTheDocument();
    expect(screen.queryByText(NO_ROOM)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Macro 2 1 action' }));

    expect(screen.getByText('1 / 127 actions')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Macro 2' })).toBeInTheDocument();
    expect(rows()).toHaveLength(1);
  });

  it('adds a press and a release of a chosen key after the delay reference', async () => {
    deviceSession.setMacro(0, [action(0, Keycode.A, 'down'), action(160, Keycode.A, 'up')]);
    const user = userEvent.setup();
    renderPage();

    const reference = screen.getByLabelText('Delay reference');
    expect(reference).toHaveValue('last');
    expect(
      within(reference)
        .getAllByRole('option')
        .map(option => option.textContent)
    ).toEqual(['From macro start', 'From first action', 'From last action']);
    const delay = screen.getByLabelText('Delay (ms)');
    expect(delay).toHaveValue(50);
    expect(screen.getByLabelText('Duration (ms)')).toHaveValue(20);

    await user.click(screen.getByRole('button', { name: 'Add key' }));
    const dialog = screen.getByRole('dialog', { name: 'Choose a key' });
    // Keycode 0 ends a macro: the picker has no "None".
    expect(within(dialog).queryByRole('button', { name: 'None' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'B' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // From the last action (160): 50 ms (400 ticks at 8000 Hz) later, released 20 ms (160) later.
    expect(macro()).toEqual([
      action(0, Keycode.A, 'down'),
      action(160, Keycode.A, 'up'),
      action(560, Keycode.B, 'down'),
      action(720, Keycode.B, 'up'),
    ]);
    expect(deviceStore.getState().unsaved).toBe(true);

    // From the macro start, 12.5 ms in: the press and the release go in at their times.
    await user.selectOptions(reference, 'From macro start');
    fireEvent.change(delay, { target: { value: '12.5' } });
    await user.click(screen.getByRole('button', { name: 'Add key' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Choose a key' })).getByRole('button', {
        name: 'C',
      })
    );
    expect(macro()?.map(entry => [entry.delay, entry.keycode, entry.event])).toEqual([
      [0, Keycode.A, 'down'],
      [100, Keycode.C, 'down'],
      [160, Keycode.A, 'up'],
      [260, Keycode.C, 'up'],
      [560, Keycode.B, 'down'],
      [720, Keycode.B, 'up'],
    ]);
    expect(screen.getByLabelText('Time of action 2')).toHaveValue(12.5);
    expect(screen.getByText('6 / 127 actions')).toBeInTheDocument();
  });

  it('edits the time, the key, the event and the virtual flag in place', async () => {
    deviceSession.setMacro(0, [action(0, Keycode.A, 'down'), action(400, Keycode.A, 'up')]);
    const user = userEvent.setup();
    renderPage();

    const second = screen.getByLabelText('Time of action 2');
    expect(second).toHaveValue(50);
    fireEvent.change(second, { target: { value: '20' } });
    fireEvent.keyDown(second, { key: 'Enter' });
    expect(macro()?.[1]?.delay).toBe(160);

    // Times snap to the keyboard's ticks (0.125 ms at 8000 Hz); an emptied field changes nothing.
    const first = screen.getByLabelText('Time of action 1');
    fireEvent.change(first, { target: { value: '0.1' } });
    fireEvent.blur(first);
    expect(macro()?.[0]?.delay).toBe(1);
    expect(first).toHaveValue(0.125);
    fireEvent.change(first, { target: { value: '' } });
    fireEvent.blur(first);
    expect(macro()?.[0]?.delay).toBe(1);
    expect(first).toHaveValue(0.125);

    await user.selectOptions(screen.getByLabelText('Event of action 1'), 'Release');
    expect(macro()?.[0]?.event).toBe('up');

    await user.click(screen.getByRole('switch', { name: 'Action 2 is virtual' }));
    expect(macro()?.[1]?.isVirtual).toBe(false);

    const keyButton = within(rows()[1] ?? document.body).getByRole('button', { name: 'A' });
    expect(keyButton).toHaveAccessibleDescription('Change the key');
    await user.click(keyButton);
    await user.click(
      within(screen.getByRole('dialog', { name: 'Choose a key' })).getByRole('button', {
        name: 'Left Shift',
      })
    );
    expect(macro()?.[1]).toEqual({
      delay: 160,
      keycode: LEFT_SHIFT,
      event: 'up',
      isVirtual: false,
      keyId: 0,
    });
    expect(
      within(rows()[1] ?? document.body).getByRole('button', { name: 'Left Shift' })
    ).toBeInTheDocument();
  });

  it('deletes actions, sorts them by time and clears the macro after a confirmation', async () => {
    deviceSession.setMacro(0, [
      action(400, Keycode.B, 'down'),
      action(0, Keycode.A, 'down'),
      action(800, Keycode.A, 'up'),
      action(900, Keycode.B, 'up'),
    ]);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Sort by time' }));
    expect(macro()?.map(entry => entry.delay)).toEqual([0, 400, 800, 900]);

    await user.click(screen.getByRole('button', { name: 'Delete action 2' }));
    expect(macro()).toEqual([
      action(0, Keycode.A, 'down'),
      action(800, Keycode.A, 'up'),
      action(900, Keycode.B, 'up'),
    ]);

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    const dialog = screen.getByRole('dialog', { name: 'Clear Macro 1?' });
    expect(dialog).toHaveAccessibleDescription('Every action of this macro will be removed.');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(macro()).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Clear Macro 1?' })).getByRole('button', {
        name: 'Clear',
      })
    );
    expect(macro()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sort by time' })).toBeDisabled();
  });

  it('records keys and mouse buttons with their timing until Stop', async () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Record' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Recording: the keys and mouse buttons you press are added to this macro.'
    );
    expect(screen.getByRole('button', { name: 'Macro 2 0 actions' })).toBeDisabled();

    now.mockReturnValue(1100);
    expect(key('keydown', 'ShiftLeft')).toBe(true);
    now.mockReturnValue(1150);
    expect(key('keydown', 'ShiftLeft', true)).toBe(true); // auto-repeat: not recorded
    expect(key('keydown', 'KeyA')).toBe(true);
    expect(key('keydown', 'BrowserBack')).toBe(true); // no HID keycode: skipped
    now.mockReturnValue(1200);
    expect(key('keyup', 'KeyA')).toBe(true);
    // A right click is recorded as Mouse Right, without the context menu.
    expect(mouse('mousedown', 2)).toBe(true);
    expect(fireEvent.contextMenu(document.body)).toBe(false);
    now.mockReturnValue(1250);
    expect(mouse('mouseup', 2)).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent('1 key could not be recorded.');

    now.mockReturnValue(1300);
    await user.click(screen.getByRole('button', { name: 'Stop' }));

    // Ticks from the start of the recording; the key still held is released at Stop, and the
    // click on Stop is not recorded.
    expect(macro()).toEqual([
      action(800, LEFT_SHIFT, 'down'),
      action(1200, Keycode.A, 'down'),
      action(1600, Keycode.A, 'up'),
      action(1600, MOUSE_RIGHT, 'down'),
      action(2000, MOUSE_RIGHT, 'up'),
      action(2400, LEFT_SHIFT, 'up'),
    ]);
    expect(screen.getByRole('status')).toHaveTextContent('1 key could not be recorded.');
    expect(key('keydown', 'KeyB')).toBe(false);
    expect(fireEvent.contextMenu(document.body)).toBe(true);
    expect(macro()).toHaveLength(6);
  });

  it('ends a recording at once when the keyboard starts loading a configuration', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Record' }));
    expect(key('keydown', 'KeyA')).toBe(true);

    keyboard.vk.notifyConfigChanged();
    await waitForDeviceState(state => state.reloading);

    // The recording ended at once: the still-held key's release is no longer intercepted (no
    // setMacro call for it, so no warning and no error).
    expect(key('keyup', 'KeyA')).toBe(false);
    expect(deviceStore.getState().lastError).toBeNull();

    await waitForDeviceState(state => !state.reloading);

    expect(screen.getByRole('button', { name: 'Record' })).toBeInTheDocument();
    expect(deviceStore.getState().lastError).toBeNull();
    expect(deviceStore.getState().unsaved).toBe(false);
    expect(macro()).toEqual([]);
  });

  it('stops recording when the macro is full, releasing the keys still held', async () => {
    const filler = Array.from({ length: 125 }, (_, index) =>
      action(index, Keycode.Z, index % 2 === 0 ? 'down' : 'up')
    );
    deviceSession.setMacro(0, filler);
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText('125 / 127 actions')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Record' }));
    now.mockReturnValue(1100);
    key('keydown', 'KeyA');
    now.mockReturnValue(1200);
    // B and its release no longer fit next to A's release: the recording ends with A released.
    key('keydown', 'KeyB');

    expect(macro()?.slice(125)).toEqual([
      action(124 + 800, Keycode.A, 'down'),
      action(124 + 1600, Keycode.A, 'up'),
    ]);
    expect(screen.getByText('127 / 127 actions')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('The macro is full.');
    expect(screen.getByRole('button', { name: 'Record' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add key' })).toBeDisabled();
    expect(screen.getByText(NO_ROOM)).toBeInTheDocument();
  });
});
