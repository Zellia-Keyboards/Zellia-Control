import { readFile } from 'node:fs/promises';
import type { JSHandle, Locator, Page } from '@playwright/test';
import { expect, test, type VirtualKeyboardHandle } from './fixtures';

type Keyboard = JSHandle<VirtualKeyboardHandle>;

/** Firmware keycodes (libamp `keycode.h`) the journeys assign. */
const KEYCODE = {
  Q: 0x14,
  W: 0x1a,
  Escape: 0x29,
  Key1: 0x1e,
  Key2: 0x1f,
  LeftCtrl: 0x01_00,
  VolumeUp: 0x0f_a8,
  MomentaryLayer1: 0x01_a6,
  Profile2: 0x12_fe,
  NkroToggle: 0xa1_fe,
  MouseLeft: 0x00_a5,
} as const;

const keycap = (page: Page, id: number): Locator => page.locator(`.keycap[data-key-id="${id}"]`);
/** The Remap page's container, which holds the category tabs and the palettes. */
const remapPage = (page: Page): Locator => page.getByRole('application');
const paletteKey = (page: Page, label: string): Locator =>
  remapPage(page).getByRole('button', { name: label, exact: true });
const profileDropdown = (page: Page): Locator => page.getByTitle('Switch profiles');
const profileCard = (page: Page, name: string): Locator =>
  page.getByRole('button', { name, exact: true });

/** Clicks "Get Started" and waits for Remap with the keyboard's keymap; returns the keyboard. */
async function connect(page: Page, virtualKeyboard: { handle(): Promise<Keyboard> }) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get Started' }).click();
  await page.waitForURL('**/remap/');
  await expect(keycap(page, 16)).toHaveText('Tab');
  return virtualKeyboard.handle();
}

/** The keyboard's working keymap entry (0-based layer). */
function keymapEntry(
  keyboard: Keyboard,
  layer: number,
  keyId: number
): Promise<number | undefined> {
  return keyboard.evaluate((vk, key) => vk.state.active.keymap[key.layer]?.[key.keyId], {
    layer,
    keyId,
  });
}

/** Keymap writes the app sent since the last `clearHistory()`. */
function keymapWrites(keyboard: Keyboard): Promise<number> {
  return keyboard.evaluate(
    vk => vk.sentPackets.filter(packet => packet.op === 'set' && packet.kind === 'keymap').length
  );
}

function profileIndex(keyboard: Keyboard): Promise<number> {
  return keyboard.evaluate(vk => vk.state.profileIndex);
}

async function openProfiles(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Profiles', exact: true }).click();
  await expect(page).toHaveURL(/\/profiles\/$/);
  await expect(page.getByRole('heading', { name: 'Configure Profiles' })).toBeVisible();
}

async function openProfileMenu(page: Page, name: string): Promise<Locator> {
  await profileCard(page, name).getByRole('button', { name: 'Menu' }).click();
  return page.getByRole('menu');
}

test.describe('remap', () => {
  test('assigns a keycode to the selected keys and saves it on the keyboard', async ({
    page,
    virtualKeyboard,
  }) => {
    const keyboard = await connect(page, virtualKeyboard);

    await keycap(page, 0).click();
    await keycap(page, 1).click();
    await paletteKey(page, 'Q').click();

    await expect(keycap(page, 0)).toHaveText('Q');
    await expect(keycap(page, 1)).toHaveText('Q');
    await expect(keycap(page, 0)).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => keymapEntry(keyboard, 0, 0)).toBe(KEYCODE.Q);
    expect(await keymapEntry(keyboard, 0, 1)).toBe(KEYCODE.Q);
    // Not saved yet: the stored profile still has the old keys.
    expect(await keyboard.evaluate(vk => vk.state.profiles[0]?.keymap[0]?.slice(0, 2))).toEqual([
      KEYCODE.Escape,
      KEYCODE.Key1,
    ]);

    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect
      .poll(() => keyboard.evaluate(vk => vk.state.profiles[0]?.keymap[0]?.slice(0, 2)))
      .toEqual([KEYCODE.Q, KEYCODE.Q]);
  });

  test('assigns the keys of every category with their firmware keycodes', async ({
    page,
    virtualKeyboard,
  }) => {
    const keyboard = await connect(page, virtualKeyboard);
    const assignments = [
      ['Basic', 'L Ctrl', 1, KEYCODE.LeftCtrl],
      ['System', 'Vol+', 2, KEYCODE.VolumeUp],
      ['Layer', 'MO(1)', 3, KEYCODE.MomentaryLayer1],
      ['Profile', 'PF(2)', 4, KEYCODE.Profile2],
      ['Extension', 'NKRO Toggle', 5, KEYCODE.NkroToggle],
      ['Extension', 'Mouse Left', 6, KEYCODE.MouseLeft],
    ] as const;

    for (const [tab, label, keyId, keycode] of assignments) {
      await remapPage(page).getByRole('button', { name: tab, exact: true }).click();
      await expect(remapPage(page).getByRole('button', { name: tab, exact: true })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      // Only the newly selected key: the brush paints it, then the palette key overwrites it.
      await keycap(page, keyId).click();
      await paletteKey(page, label).click();
      await expect.poll(() => keymapEntry(keyboard, 0, keyId), `${tab} ${label}`).toBe(keycode);
      await keycap(page, keyId).click();
    }

    // The Profile tab's placeholders stay visible but assign nothing (D8).
    await remapPage(page).getByRole('button', { name: 'Profile', exact: true }).click();
    await keycap(page, 7).click();
    // Selecting key 7 painted it with the last assignment.
    await expect.poll(() => keymapEntry(keyboard, 0, 7)).toBe(KEYCODE.MouseLeft);
    await keyboard.evaluate(vk => {
      vk.clearHistory();
    });
    for (const placeholder of ['↔ PF', '↔ PF1', '→ PF', '← PF']) {
      await paletteKey(page, placeholder).click();
    }
    await page.waitForTimeout(300);
    expect(await keymapWrites(keyboard)).toBe(0);
    expect(await keymapEntry(keyboard, 0, 7)).toBe(KEYCODE.MouseLeft);
  });

  test('asks to select a key first when nothing is selected', async ({ page, virtualKeyboard }) => {
    const keyboard = await connect(page, virtualKeyboard);
    await keyboard.evaluate(vk => {
      vk.clearHistory();
    });
    const message = page.getByText('Select the key you want to remap first');

    await paletteKey(page, 'Q').click();

    await expect(message).toBeVisible();
    await expect(message).toBeHidden({ timeout: 5_000 });
    expect(await keymapWrites(keyboard)).toBe(0);
    await expect(keycap(page, 0)).toHaveText('Escape');
  });

  test('paints keys added to the selection, but never writes on a layer switch', async ({
    page,
    virtualKeyboard,
  }) => {
    const keyboard = await connect(page, virtualKeyboard);
    await keycap(page, 0).click();
    await paletteKey(page, 'W').click();
    await expect.poll(() => keymapEntry(keyboard, 0, 0)).toBe(KEYCODE.W);

    // Keys added to the selection get the brush keycode.
    await keycap(page, 1).click();
    await expect(keycap(page, 1)).toHaveText('W');
    expect(await keymapEntry(keyboard, 0, 1)).toBe(KEYCODE.W);

    // Switching layers writes nothing (PL-015).
    const layer2Before = await keyboard.evaluate(vk => vk.state.active.keymap[1]?.slice(0, 2));
    await keyboard.evaluate(vk => {
      vk.clearHistory();
    });
    await page.getByTitle('Layer 2', { exact: true }).click();
    await expect(page.getByTitle('Layer 2', { exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(keycap(page, 0)).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(300);
    expect(await keymapWrites(keyboard)).toBe(0);
    expect(await keyboard.evaluate(vk => vk.state.active.keymap[1]?.slice(0, 2))).toEqual(
      layer2Before
    );

    // The brush survives deselecting every key, and paints on the selected layer.
    await remapPage(page).getByRole('heading', { name: 'Categories' }).click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.keycap.selected')).toHaveCount(0);
    await keycap(page, 2).click();
    await expect.poll(() => keymapEntry(keyboard, 1, 2)).toBe(KEYCODE.W);
    expect(await keymapEntry(keyboard, 0, 2)).toBe(KEYCODE.Key2);
  });

  test('toggles every key with Ctrl+A and deselects with Escape', async ({
    page,
    virtualKeyboard,
  }) => {
    const keyboard = await connect(page, virtualKeyboard);
    await keyboard.evaluate(vk => {
      vk.clearHistory();
    });
    const keycaps = page.locator('.keycap');
    const selected = page.locator('.keycap.selected');
    const total = await keycaps.count();

    // The page has focus when it opens.
    await page.keyboard.press('Control+a');
    await expect(selected).toHaveCount(total);
    await page.keyboard.press('Control+a');
    await expect(selected).toHaveCount(0);

    await keycap(page, 0).click();
    await keycap(page, 1).click();
    await expect(selected).toHaveCount(2);
    // A click on the page gives it focus back for its shortcuts.
    await remapPage(page).getByRole('heading', { name: 'Categories' }).click();
    await page.keyboard.press('Escape');
    await expect(selected).toHaveCount(0);
    expect(await keymapWrites(keyboard)).toBe(0);
  });
});

test.describe('profiles', () => {
  test('switches the keyboard profile from the Profiles page and the toolbar (D7)', async ({
    page,
    virtualKeyboard,
  }) => {
    const keyboard = await connect(page, virtualKeyboard);
    await expect(profileDropdown(page)).toContainText('Profile 1');

    // The dropdown's link stays in the app, so the keyboard stays connected (PL-030).
    await profileDropdown(page).click();
    await page.getByRole('link', { name: 'Manage All Profiles' }).click();
    await expect(page).toHaveURL(/\/profiles\/$/);
    await expect(page.getByRole('heading', { name: 'Configure Profiles' })).toBeVisible();

    // A local profile (5–16) only becomes active in the app.
    await page.getByRole('button', { name: 'Add Profile' }).click();
    await profileCard(page, 'Profile 5').click();
    await expect(profileCard(page, 'Profile 5')).toHaveAttribute('aria-pressed', 'true');
    expect(await profileIndex(keyboard)).toBe(0);

    // Profiles 1–4 are the keyboard's own.
    await profileCard(page, 'Profile 3').click();
    await expect(profileCard(page, 'Profile 3')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => profileIndex(keyboard)).toBe(2);

    await page.getByRole('link', { name: 'Remap', exact: true }).click();
    await expect(profileDropdown(page)).toContainText('Profile 3');
    await profileDropdown(page).click();
    await page.getByRole('button', { name: 'Profile 2 Slot 2' }).click();
    await expect(profileDropdown(page)).toContainText('Profile 2');
    await expect.poll(() => profileIndex(keyboard)).toBe(1);
    await expect(keycap(page, 16)).toHaveText('Tab');
  });

  test('follows a profile switched on the keyboard itself (D7)', async ({
    page,
    virtualKeyboard,
  }) => {
    const keyboard = await connect(page, virtualKeyboard);

    await keyboard.evaluate(vk => {
      vk.state.profileIndex = 3;
      vk.notifyConfigChanged();
    });
    await expect(profileDropdown(page)).toContainText('Profile 4');

    // Also when a local profile was active.
    await openProfiles(page);
    await page.getByRole('button', { name: 'Add Profile' }).click();
    await profileCard(page, 'Profile 5').click();
    await expect(profileCard(page, 'Profile 5')).toHaveAttribute('aria-pressed', 'true');
    await keyboard.evaluate(vk => {
      vk.state.profileIndex = 1;
      vk.notifyConfigChanged();
    });
    await expect(profileCard(page, 'Profile 2')).toHaveAttribute('aria-pressed', 'true');
  });

  test('exports and imports profile files', async ({ page, virtualKeyboard }) => {
    await connect(page, virtualKeyboard);
    await openProfiles(page);
    await page.getByRole('button', { name: 'Add Profile' }).click();

    const menu = await openProfileMenu(page, 'Profile 5');
    const download = page.waitForEvent('download');
    await menu.getByRole('menuitem', { name: 'Export' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('Profile 5.json');
    const exported: unknown = JSON.parse(await readFile(await file.path(), 'utf8'));
    expect(exported).toMatchObject({ id: 5, name: 'Profile 5', isDefault: false });
    await expect(page.getByRole('menu')).toHaveCount(0);

    const input = page.getByLabel('Import profile');
    await input.setInputFiles({
      name: 'travel.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ name: 'Travel Setup', lighting: { mode: 1 } })),
    });
    await expect(profileCard(page, 'Travel Setup')).toBeVisible();

    // A file that is not JSON is reported (PL-028).
    await input.setInputFiles({
      name: 'broken.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{ broken'),
    });
    const notice = page.getByRole('dialog', { name: 'Notice' });
    await expect(notice).toContainText('Failed to import profile:');
    await notice.getByRole('button', { name: 'OK' }).click();
    await expect(notice).toBeHidden();

    // The exported file imports into the next free slot.
    await input.setInputFiles(await file.path());
    await expect(page.getByRole('heading', { name: 'Profile 5' })).toHaveCount(2);

    const stored = await page.evaluate(() => localStorage.getItem('keyboard-profiles'));
    const state: unknown = JSON.parse(stored ?? 'null');
    expect(state).toMatchObject({
      activeProfileId: 1,
      profiles: [
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
        { id: 5, name: 'Profile 5' },
        { id: 6, name: 'Travel Setup', lighting: { mode: 1 }, isDefault: false },
        { id: 7, name: 'Profile 5' },
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    });
  });

  test('duplicates, restores and deletes profiles after confirming', async ({
    page,
    virtualKeyboard,
  }) => {
    await connect(page, virtualKeyboard);
    await openProfiles(page);

    let menu = await openProfileMenu(page, 'Profile 2');
    await menu.getByRole('menuitem', { name: 'Duplicate' }).click();
    const duplicate = page.getByRole('dialog', { name: 'Duplicate Profile' });
    await expect(duplicate).toContainText('Create a copy of Profile 2 in the next available slot?');
    await duplicate.getByRole('button', { name: 'Duplicate' }).click();
    await expect(profileCard(page, 'Profile 2 (Copy)')).toBeVisible();

    menu = await openProfileMenu(page, 'Profile 2 (Copy)');
    await menu.getByRole('menuitem', { name: 'Restore Default' }).click();
    const restore = page.getByRole('dialog', { name: 'Restore to Default' });
    await restore.getByRole('button', { name: 'Restore' }).click();
    await expect(restore).toBeHidden();
    await expect(profileCard(page, 'Profile 2 (Copy)')).toBeVisible();

    // Hold to delete: released early keeps the profile, 1.5 s deletes it.
    menu = await openProfileMenu(page, 'Profile 2 (Copy)');
    const hold = menu.getByRole('menuitem', { name: /Hold to Delete/ });
    await hold.hover();
    await page.mouse.down();
    await expect(menu).toContainText('Deleting...');
    await page.mouse.up();
    await expect(hold).toHaveText('Hold to Delete (1.5s)');
    await page.mouse.down();
    await expect(page.getByRole('menu')).toHaveCount(0, { timeout: 5_000 });
    await page.mouse.up();
    await expect(profileCard(page, 'Profile 2 (Copy)')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add Profile' })).toBeVisible();
  });

  test('operates a profile menu from the keyboard', async ({ page, virtualKeyboard }) => {
    await connect(page, virtualKeyboard);
    await openProfiles(page);
    const menuButton = profileCard(page, 'Profile 2').getByRole('button', { name: 'Menu' });
    const menu = page.getByRole('menu');

    await menuButton.focus();
    await page.keyboard.press('Enter');
    await expect(menu.getByRole('menuitem', { name: 'Export' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitem', { name: 'Duplicate' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(menuButton).toBeFocused();

    // Tab closes the menu and moves on from its button.
    await page.keyboard.press('Enter');
    await expect(menu.getByRole('menuitem', { name: 'Export' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(menu).toHaveCount(0);
    await expect(profileCard(page, 'Profile 3')).toBeFocused();

    // An item returns the focus to the menu button, also through its dialog.
    await menuButton.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('End');
    await expect(menu.getByRole('menuitem', { name: 'Restore Default' })).toBeFocused();
    await page.keyboard.press('Enter');
    const restore = page.getByRole('dialog', { name: 'Restore to Default' });
    await expect(restore).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(restore).toBeHidden();
    await expect(menuButton).toBeFocused();
  });
});
