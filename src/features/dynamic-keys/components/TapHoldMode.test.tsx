import { Keycode as EmiKeycode, KeyModifier } from 'emi-keyboard-controller';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { deviceSession, deviceStore } from '../../device';
import { kc } from '../../keycodes';
import { dynamicKeyKeycode } from '../../../testing/virtual-keyboard';
import { uiFieldsStore } from '../store/ui-fields';
import { renderDynamicKeysPage, selectKeys, selectLayer } from '../testing/render-page';

const ESC = kc.key(EmiKeycode.Escape);
const LEFT_CTRL = kc.modifier(KeyModifier.KeyLeftCtrl);
const LEFT_SHIFT = kc.modifier(KeyModifier.KeyLeftShift);
const A = kc.key(EmiKeycode.A);
/** Seeded Starlight mod-tap (slot 1) on Caps Lock. */
const SEEDED_MOD_TAP_KEY = 30;

async function openTapHold(options: Parameters<typeof renderDynamicKeysPage>[0] = {}) {
  const page = await renderDynamicKeysPage(options);
  await page.user.click(screen.getByRole('button', { name: /^Tap Hold/ }));
  return page;
}

/** The picker card titled `title` (Tap Action / Hold Action). */
function picker(title: string): HTMLElement {
  const card = screen.getByRole('heading', { name: title }).parentElement;
  if (!card) throw new Error(`no picker ${title}`);
  return card;
}

function configuredList(): HTMLElement {
  const card = screen.getByRole('heading', { name: 'Configured Tap-Hold Keys' }).closest('div');
  const section = card?.parentElement;
  if (!section) throw new Error('no configured list');
  return section;
}

function applyButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Apply Configuration' });
}

describe('Tap-hold editor', () => {
  it('asks for a key until one is selected', async () => {
    await openTapHold({ seedDynamicKeys: false });
    expect(screen.getByRole('heading', { name: 'Tap-Hold Configuration' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No Key Selected' })).toBeInTheDocument();
    expect(screen.getByText(/Tap-hold keys are perfect for modifier keys/)).toBeInTheDocument();
    expect(applyButton()).toBeDisabled();
  });

  it('starts a key without a mod-tap at Esc / Left Ctrl, 200 ms and 150 ms (D15, PL-010)', async () => {
    await openTapHold({ seedDynamicKeys: false });
    selectKeys(12);

    expect(screen.getByText('Key Index: 12')).toBeInTheDocument();
    expect(screen.getAllByText('Key 12')).toHaveLength(2);
    expect(screen.getByText('• Quick tap (under 150ms):')).toBeInTheDocument();
    expect(screen.getByText('• Hold (over 200ms):')).toBeInTheDocument();
    const preview = screen.getByRole('heading', { name: 'Preview' }).parentElement;
    if (!preview) throw new Error('no preview');
    expect(within(preview).getByText('Esc')).toBeInTheDocument();
    expect(within(preview).getByText('Left Ctrl')).toBeInTheDocument();
    expect(within(preview).getByText('200ms')).toBeInTheDocument();
    expect(within(picker('Tap Action')).getByRole('button', { name: 'Esc' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(applyButton()).toBeEnabled();
    expect(screen.queryByRole('heading', { name: 'Configured Tap-Hold Keys' })).toBeNull();
  });

  it('applies a mod-tap to the key on the selected layer and lists it', async () => {
    const { keyboard, user } = await openTapHold({ seedDynamicKeys: false });
    selectLayer(2);
    selectKeys(12);
    await user.click(within(picker('Tap Action')).getByRole('button', { name: 'A' }));
    await user.click(within(picker('Hold Action')).getByRole('button', { name: 'Left Shift' }));
    fireEvent.change(screen.getByLabelText('Hold Delay'), { target: { value: '450' } });
    fireEvent.change(screen.getByLabelText('Tap Timeout'), { target: { value: '250' } });
    expect(screen.getByText('450ms', { selector: 'span.text-sm' })).toBeInTheDocument();
    expect(screen.getByText('250ms')).toBeInTheDocument();

    await user.click(applyButton());

    await expect
      .poll(() => keyboard.vk.state.active.dynamicKeys[0])
      .toEqual({
        type: 'modTap',
        bindings: [A, LEFT_SHIFT],
        duration: 250,
        keyId: 12,
      });
    await expect.poll(() => keyboard.vk.state.active.keymap[1]?.[12]).toBe(dynamicKeyKeycode(0));
    const list = configuredList();
    expect(within(list).getByText('1 key')).toBeInTheDocument();
    expect(within(list).getByText('Key 12')).toBeInTheDocument();
    expect(within(list).getByText('A')).toBeInTheDocument();
    expect(within(list).getByText('Left Shift')).toBeInTheDocument();
    expect(within(list).getByText('450milliseconds')).toBeInTheDocument();
    // The editor keeps showing what it applied.
    expect(screen.getByText('• Quick tap (under 250ms):')).toBeInTheDocument();
  });

  it('loads a key’s mod-tap from the keyboard and re-applies it to the same slot (D6)', async () => {
    const { keyboard, user } = await openTapHold();
    const seeded = keyboard.vk.state.active.dynamicKeys[1];
    expect(seeded).toMatchObject({ type: 'modTap', keyId: SEEDED_MOD_TAP_KEY });
    selectKeys(SEEDED_MOD_TAP_KEY);

    // The seed's tap is the key's own Caps Lock, its hold Left Ctrl and its duration 200 ms.
    expect(screen.getByText('• Quick tap (under 200ms):')).toBeInTheDocument();
    expect(within(picker('Tap Action')).getByRole('button', { name: 'Caps Lock' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      within(picker('Hold Action')).getByRole('button', { name: 'Left Ctrl' })
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(picker('Hold Action')).getByRole('button', { name: 'Left Shift' }));
    await user.click(applyButton());

    await expect
      .poll(() => keyboard.vk.state.active.dynamicKeys[1])
      .toMatchObject({ type: 'modTap', bindings: [kc.key(EmiKeycode.CapsLock), LEFT_SHIFT] });
    expect(keyboard.vk.state.active.dynamicKeys.filter(key => key.type === 'modTap')).toHaveLength(
      1
    );
  });

  it('deletes a configured key after its fade-out and restores its tap binding', async () => {
    const { keyboard, user } = await openTapHold();
    selectKeys(SEEDED_MOD_TAP_KEY);
    const list = configuredList();
    await user.click(within(list).getByRole('button', { name: 'Delete' }));
    // Still on the keyboard while it fades out.
    expect(keyboard.vk.state.active.dynamicKeys[1]?.type).toBe('modTap');

    await waitFor(() => {
      expect(keyboard.vk.state.active.keymap[0]?.[SEEDED_MOD_TAP_KEY]).toBe(
        kc.key(EmiKeycode.CapsLock)
      );
    });
    expect(keyboard.vk.state.active.dynamicKeys.some(key => key.type === 'modTap')).toBe(false);
    expect(screen.queryByRole('heading', { name: 'Configured Tap-Hold Keys' })).toBeNull();
  });

  it('resets every tap-hold key of the keyboard', async () => {
    const { keyboard, user } = await openTapHold();
    selectKeys(5);
    await user.click(applyButton());
    await expect.poll(() => configuredKeysCount()).toBe(2);

    await user.click(screen.getByRole('button', { name: 'Reset All Tap Hold Keys' }));

    await waitFor(() => {
      expect(keyboard.vk.state.active.dynamicKeys.some(key => key.type === 'modTap')).toBe(false);
    });
    expect(keyboard.vk.state.active.keymap[0]?.[5]).toBe(ESC);
    // The other dynamic keys stay, compacted into the first slots.
    const kinds = keyboard.vk.state.active.dynamicKeys.map(key => key.type);
    expect(kinds.slice(0, 3).toSorted()).toEqual(['mutex', 'stroke', 'toggle']);
    expect(kinds.slice(3).every(kind => kind === 'none')).toBe(true);
    expect(uiFieldsStore.getState().tapHold).toEqual({});
  });

  it('keeps a key’s hold delay across slot compaction', async () => {
    const { keyboard, user } = await openTapHold();
    selectKeys(20);
    fireEvent.change(screen.getByLabelText('Hold Delay'), { target: { value: '700' } });
    await user.click(applyButton());
    await expect
      .poll(() => keyboard.vk.state.active.dynamicKeys[4])
      .toMatchObject({
        type: 'modTap',
        keyId: 20,
      });

    // Freeing the seeded mod-tap (slot 1) moves the new one down into it.
    selectKeys(SEEDED_MOD_TAP_KEY);
    const seededItem = within(configuredList()).getByText(
      `Key ${SEEDED_MOD_TAP_KEY}`
    ).parentElement;
    if (!seededItem) throw new Error('no seeded item');
    await user.click(within(seededItem).getByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(keyboard.vk.state.active.dynamicKeys[1]).toMatchObject({ type: 'modTap', keyId: 20 });
    });
    expect(keyboard.vk.state.active.keymap[0]?.[20]).toBe(dynamicKeyKeycode(1));

    selectKeys(20);
    expect(within(configuredList()).getByText('700milliseconds')).toBeInTheDocument();
    expect(screen.getByText('• Hold (over 700ms):')).toBeInTheDocument();
    await user.click(within(picker('Tap Action')).getByRole('button', { name: 'A' }));
    await user.click(applyButton());
    await expect
      .poll(() => keyboard.vk.state.active.dynamicKeys[1])
      .toMatchObject({ type: 'modTap', bindings: [A, LEFT_CTRL], keyId: 20 });
  });

  it('keeps the editor as it is when the keyboard has no free slot', async () => {
    const { keyboard, user } = await openTapHold({ seedDynamicKeys: false });
    const slots = keyboard.vk.state.active.dynamicKeys.length;
    act(() => {
      for (let id = 0; id < slots; id++) {
        deviceSession.applyDynamicKey({ kind: 'toggle', target: { layer: 3, id }, binding: A });
      }
    });
    selectKeys(40);
    await user.click(within(picker('Tap Action')).getByRole('button', { name: 'A' }));
    await user.click(applyButton());

    expect(deviceStore.getState().lastError).toEqual({
      operation: 'applyDynamicKey',
      message: 'No free dynamic key slot',
    });
    expect(within(picker('Tap Action')).getByRole('button', { name: 'A' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.queryByRole('heading', { name: 'Configured Tap-Hold Keys' })).toBeNull();
    expect(keyboard.vk.state.active.keymap[0]?.[40]).not.toBe(dynamicKeyKeycode(0));
  });
});

function configuredKeysCount(): number {
  const heading = screen.queryByRole('heading', { name: 'Configured Tap-Hold Keys' });
  const count = heading?.parentElement?.querySelector('span')?.textContent ?? '0';
  return Number.parseInt(count, 10);
}
