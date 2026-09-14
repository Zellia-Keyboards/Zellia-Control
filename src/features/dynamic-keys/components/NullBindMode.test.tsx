import { DynamicKeyMutexMode, Keycode as EmiKeycode } from 'emi-keyboard-controller';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { deviceSession, deviceStore } from '../../device';
import { keySelectionStore } from '../../keyboard';
import { kc } from '../../keycodes';
import { dynamicKeyKeycode } from '../../../testing/virtual-keyboard';
import {
  at,
  fillDynamicKeySlots,
  renderDynamicKeysPage,
  selectKeys,
  selectLayer,
} from '../testing/render-page';

const A = kc.key(EmiKeycode.A);
const D = kc.key(EmiKeycode.D);
const F = kc.key(EmiKeycode.F);
const G = kc.key(EmiKeycode.G);
/** Seeded Starlight mutex (slot 3) on A (31) and D (33), last-input priority. */
const SEEDED_PAIR = [31, 33] as const;
/** Seeded toggle (slot 2) on F (34); key 35 is G. */
const TOGGLE_KEY = 34;

/**
 * libamp's mutex mode byte: the priority in the low nibble; any high bit (the configurator writes
 * 0xF0) also reports both keys while both are bottomed out.
 */
function mutexMode(priority: DynamicKeyMutexMode, bothOnBottomOut = false): number {
  return priority | (bothOnBottomOut ? 0xf0 : 0);
}

async function openNullBind(options: Parameters<typeof renderDynamicKeysPage>[0] = {}) {
  const page = await renderDynamicKeysPage(options);
  await page.user.click(screen.getByRole('button', { name: /^Null Bind/ }));
  return page;
}

function applyButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Apply Configuration' });
}

function behavior(name: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${name}`) });
}

function configuredPairs(): HTMLElement {
  const heading = screen.getByRole('heading', { name: 'Configured Null Bind Keys' });
  const section = heading.parentElement?.parentElement;
  if (!section) throw new Error('no configured pairs');
  return section;
}

function pairCards(): HTMLElement[] {
  return within(configuredPairs())
    .getAllByRole('button', { name: 'Delete pair' })
    .map(button => {
      const cardElement = button.closest('.group');
      if (!(cardElement instanceof HTMLElement)) throw new Error('no pair card');
      return cardElement;
    });
}

describe('Null-bind editor', () => {
  it('collects two keys, and Remove drops one from the pair only', async () => {
    const { user } = await openNullBind({ seedDynamicKeys: false });
    expect(screen.getByRole('heading', { name: 'Select Two Keys' })).toBeInTheDocument();
    expect(screen.getByText('Click a key to select')).toBeInTheDocument();
    expect(applyButton()).toBeDisabled();

    selectKeys(12);
    expect(screen.getByText('First Key')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('Click opposing key')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByText('Click a key to select')).toBeInTheDocument();
    expect(keySelectionStore.getState().selected).toEqual([12]);

    // A new selection replaces the pair again.
    selectKeys(12, 14);
    expect(screen.getByText('Configure Null Bind Behavior')).toBeInTheDocument();
    expect(applyButton()).toBeEnabled();
  });

  it('applies a mutex with the keys’ own bindings, the behavior’s mode and bottom-out (D13)', async () => {
    const { keyboard, user } = await openNullBind({ seedDynamicKeys: false });
    const own = [...(keyboard.vk.state.active.keymap[0] ?? [])];
    expect([own[31], own[33]]).toEqual([A, D]);
    selectKeys(31, 33);
    expect(behavior('Last Input')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('slider', { name: 'Bottom Out Point' })).toBeNull();

    await user.click(behavior('Neutral'));
    await user.click(screen.getByRole('switch', { name: 'Alternative Bottom Out Behavior' }));
    expect(screen.getByRole('slider', { name: 'Bottom Out Point' })).toHaveValue('4');
    await user.click(applyButton());

    await expect
      .poll(() => keyboard.vk.state.active.dynamicKeys[0])
      .toEqual({
        type: 'mutex',
        bindings: [A, D],
        keyIds: [31, 33],
        mode: mutexMode(DynamicKeyMutexMode.DKMutexNeutral, true),
      });
    expect(keyboard.vk.state.active.keymap[0]?.[31]).toBe(dynamicKeyKeycode(0));
    expect(keyboard.vk.state.active.keymap[0]?.[33]).toBe(dynamicKeyKeycode(0));
    // Apply clears the editor's pair (the keyboard selection stays).
    expect(screen.getByRole('heading', { name: 'Select Two Keys' })).toBeInTheDocument();
    expect(keySelectionStore.getState().selected).toEqual([31, 33]);

    const [card] = pairCards();
    if (!card) throw new Error('no card');
    expect(within(configuredPairs()).getByText('1 pair')).toBeInTheDocument();
    expect(within(card).getByText('Neutral')).toBeInTheDocument();
    expect(within(card).getAllByText('On')).toHaveLength(1);
    expect(within(card).getByText('Bottom Out')).toBeInTheDocument();
    expect(within(card).getByText('4.0mm')).toBeInTheDocument();
    expect(within(card).getByText('1.5mm')).toBeInTheDocument();
  });

  it.each([
    ['Last Input', DynamicKeyMutexMode.DKMutexLastPriority],
    ['Absolute Priority Key1', DynamicKeyMutexMode.DKMutexKey1Priority],
    ['Absolute Priority Key2', DynamicKeyMutexMode.DKMutexKey2Priority],
    ['Neutral', DynamicKeyMutexMode.DKMutexNeutral],
    ['Distance (Rappy Snappy)', DynamicKeyMutexMode.DKMutexDistancePriority],
  ])('sends %s as firmware mode %i', async (name, mode) => {
    const { keyboard, user } = await openNullBind({ seedDynamicKeys: false });
    selectLayer(3);
    selectKeys(4, 6);
    await user.click(behavior(name.replace(/[()]/g, '\\$&')));
    await user.click(applyButton());
    await expect
      .poll(() => keyboard.vk.state.active.dynamicKeys[0])
      .toMatchObject({ type: 'mutex', keyIds: [4, 6], mode });
    expect(keyboard.vk.state.active.keymap[2]?.[4]).toBe(dynamicKeyKeycode(0));
  });

  it("loads the keyboard's pair and shows it in the key tester", async () => {
    const { user } = await openNullBind();
    selectKeys(...SEEDED_PAIR);
    expect(behavior('Last Input')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('switch', { name: 'Alternative Bottom Out Behavior' })).toHaveAttribute(
      'aria-checked',
      'false'
    );

    await user.click(screen.getByRole('button', { name: 'Key Tester' }));
    const tester = screen.getByRole('heading', { name: 'Key Tester' }).parentElement;
    if (!tester) throw new Error('no tester');
    expect(tester).toHaveTextContent('Current Behavior: Last Input');
    expect(tester).toHaveTextContent('Bottom Out: Disabled');
    expect(tester).toHaveTextContent('Rapid Trigger: Disabled');
    expect(within(tester).queryByText('Priority Key')).toBeNull();

    await user.click(behavior('Absolute Priority Key2'));
    const key2 = within(tester).getByText('Key 2').parentElement;
    expect(key2).toHaveTextContent('Priority Key');
  });

  it('commits the bottom-out point on release and remembers it for the pair', async () => {
    const { keyboard, user } = await openNullBind({ seedDynamicKeys: false });
    selectKeys(20, 22);
    await user.click(screen.getByRole('switch', { name: 'Alternative Bottom Out Behavior' }));
    const slider = screen.getByRole('slider', { name: 'Bottom Out Point' });
    expect(slider).toHaveAttribute('min', '1.6');
    // Dragging fires input events; the release fires change, which commits.
    fireEvent.input(slider, { target: { value: '3.2' } });
    fireEvent.change(slider);
    expect(screen.getByText('3.2mm')).toBeInTheDocument();
    await user.click(applyButton());

    await expect
      .poll(() => keyboard.vk.state.active.dynamicKeys[0])
      .toMatchObject({ mode: mutexMode(DynamicKeyMutexMode.DKMutexLastPriority, true) });
    const [card] = pairCards();
    if (!card) throw new Error('no card');
    expect(within(card).getByText('3.2mm')).toBeInTheDocument();

    // Selecting the pair again loads the remembered point.
    selectKeys(20);
    selectKeys(20, 22);
    expect(screen.getByRole('slider', { name: 'Bottom Out Point' })).toHaveValue('3.2');
  });

  it('keeps a pair’s remembered fields when its slot moves', async () => {
    const { keyboard, user } = await openNullBind();
    selectKeys(20, 22);
    await user.click(screen.getByRole('switch', { name: 'Alternative Bottom Out Behavior' }));
    const slider = screen.getByRole('slider', { name: 'Bottom Out Point' });
    fireEvent.input(slider, { target: { value: '3.3' } });
    fireEvent.change(slider);
    await user.click(applyButton());
    await expect
      .poll(() => keyboard.vk.state.active.dynamicKeys[4])
      .toMatchObject({ type: 'mutex', keyIds: [20, 22] });

    // Freeing slot 0 moves the new mutex down into it.
    act(() => {
      deviceSession.removeDynamicKey(0);
    });
    await expect
      .poll(() => keyboard.vk.state.active.dynamicKeys[0])
      .toMatchObject({ type: 'mutex', keyIds: [20, 22] });
    const cards = pairCards();
    expect(cards.some(card => within(card).queryByText('3.3mm') !== null)).toBe(true);
    selectKeys(20, 22);
    expect(screen.getByRole('slider', { name: 'Bottom Out Point' })).toHaveValue('3.3');
  });

  it('writes the performance tab of a configured pair to its remembered fields', async () => {
    const { user } = await openNullBind();
    selectKeys(...SEEDED_PAIR);
    await user.click(screen.getByRole('switch', { name: 'Rapid Trigger Toggle' }));

    // The pair's card reads the remembered fields.
    const [card] = pairCards();
    if (!card) throw new Error('no card');
    expect(within(card).getByText('0.10mm')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Key Tester' }));
    const tester = screen.getByRole('heading', { name: 'Key Tester' }).parentElement;
    expect(tester).toHaveTextContent('Rapid Trigger: Enabled');

    // Back on the tab, the values come back from the pair.
    await user.click(screen.getByRole('button', { name: 'Performance' }));
    expect(screen.getByRole('switch', { name: 'Rapid Trigger Toggle' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('keeps the performance tab of an unconfigured pair local', async () => {
    const { user } = await openNullBind({ seedDynamicKeys: false });
    selectKeys(1, 2);
    await user.click(screen.getByRole('switch', { name: 'Rapid Trigger Toggle' }));
    await user.click(screen.getByRole('button', { name: 'Key Tester' }));
    const tester = screen.getByRole('heading', { name: 'Key Tester' }).parentElement;
    expect(tester).toHaveTextContent('Rapid Trigger: Disabled');

    // Applying the pair does not take the tab's rapid trigger along.
    await user.click(applyButton());
    const [card] = pairCards();
    if (!card) throw new Error('no card');
    expect(within(card).getAllByText('Off')).toHaveLength(2);
    expect(within(card).queryByText('RT Sensitivity')).toBeNull();
  });

  it('re-applies a pair’s mutex into its own slot and keeps its remembered fields (D6)', async () => {
    const { keyboard, user } = await openNullBind();
    selectKeys(...SEEDED_PAIR);
    await user.click(screen.getByRole('switch', { name: 'Rapid Trigger Toggle' }));
    await user.click(behavior('Neutral'));
    await user.click(applyButton());

    await expect
      .poll(() => keyboard.vk.state.active.dynamicKeys[3])
      .toEqual({
        type: 'mutex',
        bindings: [A, D],
        keyIds: [...SEEDED_PAIR],
        mode: mutexMode(DynamicKeyMutexMode.DKMutexNeutral),
      });
    expect(keyboard.vk.state.active.dynamicKeys.filter(key => key.type !== 'none')).toHaveLength(4);
    expect(keyboard.vk.state.active.keymap[0]?.[SEEDED_PAIR[0]]).toBe(dynamicKeyKeycode(3));
    const [card] = pairCards();
    if (!card) throw new Error('no card');
    expect(within(card).getByText('Neutral')).toBeInTheDocument();
    expect(within(card).getByText('0.10mm')).toBeInTheDocument();
  });

  it('keeps the pair and remembers nothing when the keyboard has no free slot', async () => {
    const { keyboard, user } = await openNullBind({ seedDynamicKeys: false });
    fillDynamicKeySlots();
    const own = [...(keyboard.vk.state.active.keymap[0] ?? [])];
    selectKeys(20, 22);
    await user.click(screen.getByRole('switch', { name: 'Alternative Bottom Out Behavior' }));
    const slider = screen.getByRole('slider', { name: 'Bottom Out Point' });
    fireEvent.input(slider, { target: { value: '3.2' } });
    fireEvent.change(slider);
    await user.click(applyButton());

    expect(deviceStore.getState().lastError).toEqual({
      operation: 'applyDynamicKey',
      message: 'No free dynamic key slot',
    });
    // The pair stays in the editor to try again (the Svelte apply always cleared it).
    expect(screen.getByText('Configure Null Bind Behavior')).toBeInTheDocument();
    expect(applyButton()).toBeEnabled();
    expect(screen.queryByRole('heading', { name: 'Configured Null Bind Keys' })).toBeNull();
    expect(keyboard.vk.state.active.keymap[0]?.slice(20, 23)).toEqual(own.slice(20, 23));

    // Nothing was remembered: a mutex the pair gets from elsewhere shows the default point.
    act(() => {
      deviceSession.removeDynamicKey(0);
      deviceSession.applyDynamicKey({
        kind: 'mutex',
        targets: [at(0, 20), at(0, 22)],
        bindings: [own[20] ?? 0, own[22] ?? 0],
        mode: mutexMode(DynamicKeyMutexMode.DKMutexLastPriority, true),
      });
    });
    const [card] = pairCards();
    if (!card) throw new Error('no card');
    expect(within(card).getByText('4.0mm')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Bottom Out Point' })).toHaveValue('4');
  });

  it('deletes a pair after its fade-out and gives both keys their bindings back', async () => {
    const { keyboard, user } = await openNullBind();
    const [card] = pairCards();
    if (!card) throw new Error('no card');
    await user.click(within(card).getByRole('button', { name: 'Delete pair' }));

    await waitFor(() => {
      expect(keyboard.vk.state.active.dynamicKeys.some(key => key.type === 'mutex')).toBe(false);
    });
    expect(keyboard.vk.state.active.keymap[0]?.[SEEDED_PAIR[0]]).toBe(A);
    expect(keyboard.vk.state.active.keymap[0]?.[SEEDED_PAIR[1]]).toBe(D);
    expect(screen.queryByRole('heading', { name: 'Configured Null Bind Keys' })).toBeNull();
  });

  it("binds a key that runs another dynamic key with that key's own binding", async () => {
    const { keyboard, user } = await openNullBind();
    selectKeys(TOGGLE_KEY, TOGGLE_KEY + 1);
    await user.click(applyButton());

    await waitFor(() => {
      expect(
        keyboard.vk.state.active.dynamicKeys.find(
          key => key.type === 'mutex' && key.keyIds[0] === TOGGLE_KEY
        )
      ).toMatchObject({ bindings: [F, G] });
    });
    // The toggle lost its key and was released.
    expect(keyboard.vk.state.active.dynamicKeys.some(key => key.type === 'toggle')).toBe(false);
    expect(pairCards()).toHaveLength(2);
  });
});
