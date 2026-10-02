import type { JSHandle, Locator, Page } from '@playwright/test';
import { expect, test, type VirtualKeyboardHandle } from './fixtures';

/**
 * Dynamic Keys inside the app shell: the dashboard and one journey per editor, driven through
 * the on-screen keyboard and the editors, checked on the page and on the virtual keyboard.
 */

// libamp keycodes (src-controller `Keycode` / `KeyModifier`, `DynamicKeyMutexMode`).
const KEY = { A: 0x04, B: 0x05, C: 0x06, X: 0x1b, Z: 0x1d, Tab: 0x2b } as const;
const LEFT_SHIFT = 0x02 << 8;
const MUTEX_KEY1_PRIORITY = 2;
/** Keymap entry of a key that runs dynamic key `slot`. */
const dynamicKeyKeycode = (slot: number) => 0xa7 | (slot << 8);
/** Raw u16 travel fraction as the firmware stores it (`trunc(fraction × 65535)`). */
const raw = (mm: number) => Math.trunc((mm / 4) * 65535);

type Keyboard = JSHandle<VirtualKeyboardHandle>;

/** Connects through "Get Started" and opens Dynamic Keys from the sidebar. */
async function openDynamicKeys(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get Started' }).click();
  await page.waitForURL('**/remap/');
  await expect(keycap(page, 16)).toHaveText('Tab');
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Dynamic Keys', exact: true })
    .click();
  await expect(page).toHaveURL(/\/dynamic\/$/);
  await expect(page.getByRole('heading', { name: 'Select a Mode' })).toBeVisible();
}

const keycap = (page: Page, id: number) => page.locator(`.keycap[data-key-id="${id}"]`);

/** A mode card of the dashboard ("Tap Hold", "Toggle", "Dynamic Key Stroke", "Null Bind"). */
const modeCard = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^${name}`) });

const applyButton = (page: Page) => page.getByRole('button', { name: 'Apply Configuration' });

/** The card around the heading `title` (an action picker, a configured-keys list, …). */
const card = (page: Page, title: string): Locator =>
  page
    .getByRole('heading', { name: title, exact: true })
    .locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " glassmorphism-card ")][1]');

async function dynamicKey(keyboard: Keyboard, slot: number) {
  return keyboard.evaluate((vk, index) => vk.state.active.dynamicKeys[index], slot);
}

async function keymapEntry(keyboard: Keyboard, layer: number, id: number) {
  return keyboard.evaluate((vk, [l, k]) => vk.state.active.keymap[l]?.[k], [layer, id] as const);
}

async function usedSlots(keyboard: Keyboard): Promise<number> {
  return keyboard.evaluate(vk => vk.state.active.dynamicKeys.filter(k => k.type !== 'none').length);
}

test.describe('dynamic keys', () => {
  test('lists the keyboard dynamic keys on the dashboard, deletes and edits them', async ({
    page,
    virtualKeyboard,
  }) => {
    await openDynamicKeys(page);
    const keyboard = await virtualKeyboard.handle();

    // The seeded mod-tap, the two keys of the null bind, the toggle and the stroke, in the Svelte
    // table's order (by key id, the DKS keys last).
    await expect(
      page.getByRole('heading', { name: 'Configured Dynamic Keys (5)', exact: true })
    ).toBeVisible();
    const rows = page.locator('tbody tr');
    await expect(rows.locator('td:nth-child(2)')).toHaveText([
      'Tap Hold',
      'Null Bind',
      'Null Bind',
      'Toggle',
      'Dynamic Key',
    ]);

    // Keys cannot be picked on the dashboard.
    await keycap(page, 16).click();
    await expect(keycap(page, 16)).toHaveClass(/selection-disabled/);
    await expect(keycap(page, 16)).not.toHaveAttribute('aria-pressed');

    // Deleting the mod-tap (slot 1) frees its slot; the highest slot, the null bind, moves in.
    const [strokeKey, modTapKey, toggleKey, mutexFirst, mutexSecond] = await keyboard.evaluate(
      vk => vk.state.model.seedKeyIds
    );
    const modTap = await dynamicKey(keyboard, 1);
    const mutex = await dynamicKey(keyboard, 3);
    if (modTap?.type !== 'modTap' || mutex?.type !== 'mutex') {
      throw new Error('the seeded mod-tap and null bind are not in slots 1 and 3');
    }
    await rows
      .filter({ hasText: 'Tap Hold' })
      .getByRole('button', { name: 'Delete configuration' })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Configured Dynamic Keys (4)', exact: true })
    ).toBeVisible();
    await expect.poll(() => usedSlots(keyboard)).toBe(3);
    expect(await keymapEntry(keyboard, 0, modTapKey)).toBe(modTap.bindings[0]);
    expect(await dynamicKey(keyboard, 1)).toEqual(mutex);
    expect(await keymapEntry(keyboard, 0, mutexFirst)).toBe(dynamicKeyKeycode(1));
    expect(await keymapEntry(keyboard, 0, mutexSecond)).toBe(dynamicKeyKeycode(1));
    expect(await keymapEntry(keyboard, 0, strokeKey)).toBe(dynamicKeyKeycode(0));
    expect(await keymapEntry(keyboard, 0, toggleKey)).toBe(dynamicKeyKeycode(2));

    // The moved null bind is found in its new slot: both of its rows go, the toggle moves in.
    await rows
      .filter({ hasText: 'Null Bind' })
      .first()
      .getByRole('button', { name: 'Delete configuration' })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Configured Dynamic Keys (2)', exact: true })
    ).toBeVisible();
    await expect(rows.locator('td:nth-child(2)')).toHaveText(['Toggle', 'Dynamic Key']);
    await expect.poll(() => usedSlots(keyboard)).toBe(2);
    expect(await keymapEntry(keyboard, 0, mutexFirst)).toBe(mutex.bindings[0]);
    expect(await keymapEntry(keyboard, 0, mutexSecond)).toBe(mutex.bindings[1]);
    expect(await dynamicKey(keyboard, 1)).toMatchObject({ type: 'toggle', keyId: toggleKey });
    expect(await keymapEntry(keyboard, 0, toggleKey)).toBe(dynamicKeyKeycode(1));

    // Edit opens the toggle's editor with its key selected.
    await rows
      .filter({ hasText: 'Toggle' })
      .getByRole('button', { name: 'Edit configuration' })
      .click();
    await expect(page.getByRole('heading', { name: 'Toggle Configuration' })).toBeVisible();
    await expect(page.getByText(`Key Index: ${toggleKey}`)).toBeVisible();
    await expect(keycap(page, toggleKey)).toHaveAttribute('aria-pressed', 'true');

    // Back clears the selection and returns to the dashboard.
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Select a Mode' })).toBeVisible();
    await expect(keycap(page, toggleKey)).toHaveClass(/selection-disabled/);

    // Leaving the page lets Remap select keys again.
    await page.getByRole('navigation').getByRole('link', { name: 'Remap', exact: true }).click();
    await expect(page).toHaveURL(/\/remap\/$/);
    await keycap(page, 16).click();
    await expect(keycap(page, 16)).toHaveAttribute('aria-pressed', 'true');
  });

  test('tap-hold: applies a mod-tap to the selected key, deletes it and resets all', async ({
    page,
    virtualKeyboard,
  }) => {
    await openDynamicKeys(page);
    const keyboard = await virtualKeyboard.handle();
    const seededModTapKey = await keyboard.evaluate(vk => vk.state.model.seedKeyIds[1]);
    const seededTap = await keyboard.evaluate(vk => {
      const key = vk.state.active.dynamicKeys[1];
      return key?.type === 'modTap' ? key.bindings[0] : null;
    });

    await modeCard(page, 'Tap Hold').click();
    await expect(page.getByRole('heading', { name: 'Tap-Hold Configuration' })).toBeVisible();
    await expect(page.getByText('No Key Selected')).toBeVisible();
    await expect(applyButton(page)).toBeDisabled();

    await keycap(page, 16).click();
    await expect(keycap(page, 16)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Key Index: 16')).toBeVisible();

    await card(page, 'Tap Action').getByRole('button', { name: 'B', exact: true }).click();
    await card(page, 'Hold Action')
      .getByRole('button', { name: 'Left Shift', exact: true })
      .click();
    // Tap Timeout: 150 ms → 175 ms (one step).
    await page.getByLabel('Tap Timeout').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('175ms', { exact: true })).toBeVisible();
    await expect(card(page, 'Preview')).toContainText('TapB');
    await expect(card(page, 'Preview')).toContainText('HoldLeft Shift');

    await applyButton(page).click();

    // The first free slot (the seeded keys use 0–3), bound on layer 1.
    await expect
      .poll(() => dynamicKey(keyboard, 4))
      .toEqual({
        type: 'modTap',
        bindings: [KEY.B, LEFT_SHIFT],
        duration: 175,
        keyId: 16,
      });
    expect(await keymapEntry(keyboard, 0, 16)).toBe(dynamicKeyKeycode(4));
    const configured = card(page, 'Configured Tap-Hold Keys');
    await expect(configured).toContainText('2 keys');
    await expect(configured).toContainText(`Key ${seededModTapKey}`);
    await expect(configured).toContainText('Key 16');

    // Delete gives the key its tap action back.
    await configured
      .locator('.glassmorphism-card')
      .filter({ hasText: 'Key 16' })
      .getByRole('button', { name: 'Delete' })
      .click();
    await expect.poll(() => dynamicKey(keyboard, 4)).toEqual({ type: 'none' });
    expect(await keymapEntry(keyboard, 0, 16)).toBe(KEY.B);
    await expect(configured).toContainText('1 key');

    await page.getByRole('button', { name: 'Reset All Tap Hold Keys' }).click();
    await expect.poll(() => usedSlots(keyboard)).toBe(3);
    expect(await keymapEntry(keyboard, 0, seededModTapKey)).toBe(seededTap);
    await expect(page.getByRole('heading', { name: 'Configured Tap-Hold Keys' })).toHaveCount(0);
  });

  test.describe('without seeded dynamic keys', () => {
    test.use({ virtualKeyboardOptions: { seedDynamicKeys: false } });

    test('toggle: applies a toggle key on the selected layer and deletes it', async ({
      page,
      virtualKeyboard,
    }) => {
      await openDynamicKeys(page);
      const keyboard = await virtualKeyboard.handle();
      await expect(
        page.getByRole('heading', { name: 'Configured Dynamic Keys (0)', exact: true })
      ).toBeVisible();
      await expect(page.getByText('No dynamic keys available')).toBeVisible();

      await modeCard(page, 'Toggle').click();
      await page.getByTitle('Layer 2', { exact: true }).click();
      await expect(page.getByTitle('Layer 2', { exact: true })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      await keycap(page, 17).click();
      await expect(page.getByText('Key Index: 17')).toBeVisible();

      await card(page, 'Toggle Action').getByRole('button', { name: 'C', exact: true }).click();
      await applyButton(page).click();

      await expect
        .poll(() => dynamicKey(keyboard, 0))
        .toEqual({ type: 'toggle', binding: KEY.C, keyId: 17 });
      expect(await keymapEntry(keyboard, 1, 17)).toBe(dynamicKeyKeycode(0));
      expect(await keymapEntry(keyboard, 0, 17)).not.toBe(dynamicKeyKeycode(0));
      const configured = card(page, 'Configured Toggle Keys');
      await expect(configured).toContainText('1 key');
      await expect(configured).toContainText('Key 17');

      await configured.getByRole('button', { name: 'Delete' }).click();
      await expect.poll(() => dynamicKey(keyboard, 0)).toEqual({ type: 'none' });
      expect(await keymapEntry(keyboard, 1, 17)).toBe(KEY.C);
      await expect(page.getByRole('heading', { name: 'Configured Toggle Keys' })).toHaveCount(0);

      // The dashboard counts what is on the keyboard.
      await page.getByRole('button', { name: 'Back', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Configured Dynamic Keys (0)', exact: true })
      ).toBeVisible();
    });

    test('null bind: applies a pair with its behavior and deletes it', async ({
      page,
      virtualKeyboard,
    }) => {
      await openDynamicKeys(page);
      const keyboard = await virtualKeyboard.handle();

      await modeCard(page, 'Null Bind').click();
      await expect(page.getByRole('heading', { name: 'Null Bind Configuration' })).toBeVisible();
      await expect(applyButton(page)).toBeDisabled();

      await keycap(page, 44).click();
      await keycap(page, 45).click();
      await expect(applyButton(page)).toBeEnabled();
      const behavior = page.getByRole('button', { name: /^Absolute Priority Key1/ });
      await behavior.click();
      await expect(behavior).toHaveAttribute('aria-pressed', 'true');

      await applyButton(page).click();

      await expect
        .poll(() => dynamicKey(keyboard, 0))
        .toEqual({
          type: 'mutex',
          bindings: [KEY.Z, KEY.X],
          keyIds: [44, 45],
          mode: MUTEX_KEY1_PRIORITY,
        });
      expect(await keymapEntry(keyboard, 0, 44)).toBe(dynamicKeyKeycode(0));
      expect(await keymapEntry(keyboard, 0, 45)).toBe(dynamicKeyKeycode(0));
      // The editor starts over for the next pair and lists the configured one.
      await expect(applyButton(page)).toBeDisabled();
      const configured = card(page, 'Configured Null Bind Keys');
      await expect(configured).toContainText('Absolute Priority Key1');

      await configured.getByRole('button', { name: 'Delete pair' }).click();
      await expect.poll(() => dynamicKey(keyboard, 0)).toEqual({ type: 'none' });
      expect(await keymapEntry(keyboard, 0, 44)).toBe(KEY.Z);
      expect(await keymapEntry(keyboard, 0, 45)).toBe(KEY.X);
      await expect(page.getByRole('heading', { name: 'Configured Null Bind Keys' })).toHaveCount(0);
    });

    test('DKS: applies a binding with a press interval, deletes it and loads the preset', async ({
      page,
      virtualKeyboard,
    }) => {
      await openDynamicKeys(page);
      const keyboard = await virtualKeyboard.handle();

      await modeCard(page, 'Dynamic Key Stroke').click();
      await expect(
        page.getByRole('heading', { name: 'Dynamic Keystroke Configuration' })
      ).toBeVisible();
      await keycap(page, 18).click();
      await expect(page.getByText('Position: 0, 18')).toBeVisible();

      const binding1 = page.getByRole('button', { name: /^Binding 1/ });
      await binding1.click();
      await expect(page.getByText('Select a keycode for binding 1')).toBeVisible();
      await card(page, 'Keycode Selection').getByRole('button', { name: 'A', exact: true }).click();
      await expect(binding1).toHaveAccessibleName('Binding 1: A');
      await page.getByRole('button', { name: 'Done' }).click();
      await expect(page.getByText('Click on a binding button to select a keycode')).toBeVisible();

      // A tap at the first stage, stretched to a press held until the key is released fully.
      const row = binding1.locator('xpath=..');
      await row.getByRole('button', { name: 'Add tap at phase 1 to binding 1' }).click();
      await expect(row.getByRole('button', { name: 'TAP action at phase 1' })).toBeVisible();
      const grip = row.getByRole('button', { name: 'Drag to resize interval' });
      const box = await grip.boundingBox();
      if (!box) throw new Error('the grip is not visible');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 250, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();
      await expect(row.getByRole('button', { name: 'Delete interval' })).toBeVisible();

      await applyButton(page).click();

      await expect
        .poll(() => dynamicKey(keyboard, 0))
        .toEqual({
          type: 'stroke',
          bindings: [KEY.A, 0, 0, 0],
          // Binding 1 held from stage 0 through stage 2, released at stage 3.
          keyControl: [0x3f, 0, 0, 0],
          pressBegin: raw(1.5),
          pressFully: raw(3),
          releaseBegin: raw(3),
          releaseFully: raw(1.5),
          keyId: 18,
        });
      expect(await keymapEntry(keyboard, 0, 18)).toBe(dynamicKeyKeycode(0));
      const configured = card(page, 'Configured Dynamic Keys');
      await expect(configured).toContainText('1 key');

      await configured.getByRole('button', { name: 'Delete key' }).click();
      await expect.poll(() => dynamicKey(keyboard, 0)).toEqual({ type: 'none' });
      // The key gets its first binding back.
      expect(await keymapEntry(keyboard, 0, 18)).toBe(KEY.A);
      await expect(page.getByRole('heading', { name: 'Configured Dynamic Keys' })).toHaveCount(0);

      // Reset loads the preset into the editor; nothing is written for a key without a DKS.
      await keyboard.evaluate(vk => {
        vk.clearHistory();
      });
      await page.getByRole('button', { name: 'Reset Configuration' }).click();
      await expect(page.getByRole('button', { name: /^Binding \d/ })).toHaveText([
        'Esc',
        'Enter',
        'Space',
        'Backspace',
      ]);
      expect(await keyboard.evaluate(vk => vk.sentPackets.length)).toBe(0);
    });
  });
});
