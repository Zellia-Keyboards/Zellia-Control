import { Keycode as EmiKeycode } from 'emi-keyboard-controller';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { kc } from '../../keycodes';
import { dynamicKeyKeycode } from '../../../testing/virtual-keyboard';
import { uiFieldsStore } from '../store/ui-fields';
import { renderDynamicKeysPage, selectKeys } from '../testing/render-page';

const A = kc.key(EmiKeycode.A);
const F = kc.key(EmiKeycode.F);
const CAPS_LOCK = kc.key(EmiKeycode.CapsLock);
/** Seeded Starlight toggle (slot 2) on F. */
const SEEDED_TOGGLE_KEY = 34;

async function openToggle(options: Parameters<typeof renderDynamicKeysPage>[0] = {}) {
  const page = await renderDynamicKeysPage(options);
  await page.user.click(screen.getByRole('button', { name: /^Toggle/ }));
  return page;
}

function actionPicker(): HTMLElement {
  const card = screen.getByRole('heading', { name: 'Toggle Action' }).parentElement;
  if (!card) throw new Error('no action picker');
  return card;
}

function card(title: string): HTMLElement {
  const element = screen.getByRole('heading', { name: title }).parentElement;
  if (!element) throw new Error(`no ${title}`);
  return element;
}

function configuredList(): HTMLElement {
  return card('Configured Toggle Keys').parentElement ?? card('Configured Toggle Keys');
}

describe('Toggle editor', () => {
  it('asks for a key until one is selected', async () => {
    await openToggle({ seedDynamicKeys: false });
    expect(screen.getByRole('heading', { name: 'Toggle Configuration' })).toBeInTheDocument();
    expect(screen.getByText(/Toggle keys are perfect for Caps Lock/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply Configuration' })).toBeDisabled();
  });

  it('starts a key without a toggle at Caps Lock, on press, inactive', async () => {
    await openToggle({ seedDynamicKeys: false });
    selectKeys(8);

    expect(screen.getByText('Key Index: 8')).toBeInTheDocument();
    expect(within(actionPicker()).getByRole('button', { name: 'Caps Lock' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /On Press/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('switch', { name: 'Set toggle state to active' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    const preview = card('Preview');
    expect(within(preview).getByText('Caps Lock')).toBeInTheDocument();
    expect(within(preview).getByText('On Press')).toBeInTheDocument();
    expect(within(preview).getByText('Disabled')).toBeInTheDocument();
    const info = card('How it works');
    expect(info).toHaveTextContent(
      'This key will toggle Caps Lock when pressed. Each trigger will switch between active and inactive states.'
    );
    expect(within(info).getByText('Caps Lock').tagName).toBe('STRONG');
  });

  it('applies a toggle and remembers its trigger and state (UI-only)', async () => {
    const { keyboard, user } = await openToggle({ seedDynamicKeys: false });
    selectKeys(8);
    await user.click(within(actionPicker()).getByRole('button', { name: 'A' }));
    await user.click(screen.getByRole('button', { name: /On Release/ }));
    await user.click(screen.getByRole('switch', { name: 'Set toggle state to active' }));
    expect(card('How it works')).toHaveTextContent('This key will toggle A when released.');

    await user.click(screen.getByRole('button', { name: 'Apply Configuration' }));

    await expect
      .poll(() => keyboard.vk.state.active.dynamicKeys[0])
      .toEqual({ type: 'toggle', binding: A, keyId: 8 });
    await expect.poll(() => keyboard.vk.state.active.keymap[0]?.[8]).toBe(dynamicKeyKeycode(0));
    const list = configuredList();
    expect(within(list).getByText('1 key')).toBeInTheDocument();
    expect(within(list).getByText('Key 8')).toBeInTheDocument();
    expect(within(list).getByText('A')).toBeInTheDocument();
    expect(within(list).getByText('On Release')).toBeInTheDocument();
    expect(within(list).getByText('Enabled')).toBeInTheDocument();

    // Another key starts from the defaults; coming back loads the remembered fields.
    selectKeys(9);
    expect(within(actionPicker()).getByRole('button', { name: 'Caps Lock' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    selectKeys(8);
    expect(within(actionPicker()).getByRole('button', { name: 'A' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /On Release/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('switch', { name: 'Set toggle state to inactive' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it("loads the keyboard's toggle and drops unsaved edits when another key is selected", async () => {
    const { user } = await openToggle();
    selectKeys(SEEDED_TOGGLE_KEY);
    expect(within(actionPicker()).getByRole('button', { name: 'F' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(configuredList()).getByText(`Key ${SEEDED_TOGGLE_KEY}`)).toBeInTheDocument();
    expect(within(configuredList()).getByText('On Press')).toBeInTheDocument();
    expect(within(configuredList()).getByText('Disabled')).toBeInTheDocument();

    await user.click(within(actionPicker()).getByRole('button', { name: 'A' }));
    selectKeys(5);
    expect(within(actionPicker()).getByRole('button', { name: 'Caps Lock' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    selectKeys(SEEDED_TOGGLE_KEY);
    expect(within(actionPicker()).getByRole('button', { name: 'F' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('deletes a toggle key after its fade-out and restores its binding', async () => {
    const { keyboard, user } = await openToggle();
    selectKeys(SEEDED_TOGGLE_KEY);
    await user.click(within(configuredList()).getByRole('button', { name: 'Delete' }));
    expect(keyboard.vk.state.active.dynamicKeys[2]?.type).toBe('toggle');

    await waitFor(() => {
      expect(keyboard.vk.state.active.keymap[0]?.[SEEDED_TOGGLE_KEY]).toBe(F);
    });
    expect(keyboard.vk.state.active.dynamicKeys.some(key => key.type === 'toggle')).toBe(false);
    expect(screen.queryByRole('heading', { name: 'Configured Toggle Keys' })).toBeNull();
  });

  it('resets every toggle key of the keyboard', async () => {
    const { keyboard, user } = await openToggle();
    selectKeys(3);
    await user.click(screen.getByRole('switch', { name: 'Set toggle state to active' }));
    await user.click(screen.getByRole('button', { name: 'Apply Configuration' }));
    expect(within(configuredList()).getByText('2 keys')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset All Toggle Keys' }));

    await waitFor(() => {
      expect(keyboard.vk.state.active.dynamicKeys.some(key => key.type === 'toggle')).toBe(false);
    });
    expect(keyboard.vk.state.active.keymap[0]?.[3]).toBe(CAPS_LOCK);
    expect(keyboard.vk.state.active.keymap[0]?.[SEEDED_TOGGLE_KEY]).toBe(F);
    expect(uiFieldsStore.getState().toggle).toEqual({});
  });
});
