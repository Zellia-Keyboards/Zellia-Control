import type { Locator, Page } from '@playwright/test';
import type { ParityScenario } from '../scenario';

/**
 * Remap page (the five category tabs, the "select a key first" message, assignments, select-all
 * and the brush), the Profiles page (cards, menu, confirmations, errors, import, activation) and
 * the toolbar's profile dropdown, all with a connected keyboard.
 *
 * The captures show the whole screen, so the sidebar and the keyboard (worker E's) carry their
 * logged differences: the Save label (PL-002), modifier keycaps (PL-016) and key 64 (PL-022). The
 * dropdown's glass panel blurs the keycaps behind it, so on Remap it shows PL-016 and PL-022
 * blurred; `profiles-dropdown-lighting` and `-local` open it over the Lighting keycaps, which are
 * identical in both apps.
 */

const GET_STARTED = /Get Started|开始使用/;
/** Connected scenarios need unseeded dynamic keys: the baseline cannot load them. */
const KEYBOARD = { seedDynamicKeys: false } as const;

/** Moves the pointer onto the sidebar title, where nothing reacts to hovering. */
async function parkPointer(page: Page): Promise<void> {
  await page.mouse.move(100, 30);
}

/** The keycap whose whole label is `label`. */
function keycap(page: Page, label: string): Locator {
  return page.locator('.keycap', { hasText: new RegExp(`^${label}$`) });
}

/**
 * Clicks "Get Started" and waits until `/remap/` shows the keyboard's own keymap (the Tab key only
 * has its label once the device configuration is loaded).
 */
async function connect(page: Page): Promise<void> {
  await page.getByRole('button', { name: GET_STARTED }).click();
  await page.waitForURL('**/remap/');
  await keycap(page, 'Tab').waitFor();
}

/** The Remap page (its container is the page's only `application`). */
function remapPage(page: Page): Locator {
  return page.getByRole('application');
}

/** A palette key of the Remap page, by its label (line breaks read as spaces). */
function paletteKey(page: Page, label: string): Locator {
  return remapPage(page).getByRole('button', { name: label, exact: true });
}

/** Opens a Remap category and waits until the previous one has slid out. */
async function openTab(page: Page, name: string, firstKey: string): Promise<void> {
  await remapPage(page).getByRole('button', { name, exact: true }).click();
  await paletteKey(page, firstKey).waitFor();
  await remapPage(page).locator('main .absolute.inset-0').nth(1).waitFor({ state: 'detached' });
}

/** Deselects the only selected keycap. */
async function deselect(page: Page): Promise<void> {
  await page.locator('.keycap.selected').click();
  await page.locator('.keycap.selected').waitFor({ state: 'detached' });
}

/**
 * Selects a keycap, assigns a palette key to it and deselects it again. Selecting it first paints
 * it with the previous assignment (the brush), in both apps.
 */
async function assign(page: Page, key: string, palette: string): Promise<void> {
  await keycap(page, key).click();
  await paletteKey(page, palette).click();
  await deselect(page);
}

/** Opens the Profiles page from the sidebar. */
async function openProfiles(page: Page): Promise<void> {
  await page.getByRole('link', { name: /^(Profiles|配置文件)$/ }).click();
  await page.waitForURL('**/profiles/');
  await page.getByRole('heading', { name: 'Configure Profiles' }).waitFor();
}

async function addProfiles(page: Page, count: number): Promise<void> {
  const add = page.getByRole('button', { name: 'Add Profile' });
  for (let index = 0; index < count; index++) await add.click();
}

/** Opens the menu of the profile card at `index` (0-based, grid order). */
async function openProfileMenu(page: Page, index: number): Promise<void> {
  await page.getByRole('button', { name: 'Menu', exact: true }).nth(index).click();
  await page.getByRole('menu').waitFor();
}

/** Clicks a profile menu item (plain buttons in the baseline, menu items here). */
async function chooseMenuItem(page: Page, item: string): Promise<void> {
  await page.getByRole('menu').getByText(item, { exact: true }).click();
}

/**
 * Chooses a file in the page's hidden import input and gives the file reader time to finish: the
 * two apps do not show the same outcome (F-1, F-2), so there is no common element to wait for.
 */
async function importFile(page: Page, name: string, content: string): Promise<void> {
  await page.locator('input[type="file"]').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(content),
  });
  await page.waitForTimeout(500);
}

async function openProfileDropdown(page: Page): Promise<void> {
  await page.getByTitle('Switch profiles').click();
  await page.getByRole('link', { name: /Manage All Profiles|管理所有配置文件/ }).waitFor();
}

/**
 * Opens Lighting, whose keycaps are identical in both apps, and hides its page (worker G's) below
 * the keyboard: the dropdown's glass panel then blurs the same keycaps in both apps.
 */
async function openLighting(page: Page): Promise<void> {
  await page.getByRole('link', { name: /^(Lighting|灯光)$/ }).click();
  await page.waitForURL('**/lighting/');
  await page.locator('.keycap').first().waitFor();
  await page.addStyleTag({
    content: '.glassmorphism-main > :nth-child(n + 3) { display: none !important; }',
  });
}

/** A scenario that connects the keyboard (landing on `/remap/`) before its own steps. */
function connected(
  name: string,
  setup: (page: Page) => Promise<void>,
  storage?: Readonly<Record<string, string>>
): ParityScenario {
  return {
    name,
    path: '/',
    virtualKeyboard: KEYBOARD,
    ...(storage ? { storage } : {}),
    setup: async page => {
      await connect(page);
      await setup(page);
      await parkPointer(page);
    },
  };
}

/** `keyboard-profiles` with all 16 slots used (the apps' storage schema), profile 1 active. */
const SIXTEEN_PROFILES = JSON.stringify({
  profiles: Array.from({ length: 16 }, (_, index) => ({
    id: index + 1,
    name: `Profile ${index + 1}`,
    createdAt: '2026-09-30T12:00:00.000Z',
    modifiedAt: '2026-09-30T12:00:00.000Z',
    isDefault: index === 0,
    keyMappings: {},
    lighting: {},
    performance: {},
    advancedKeys: {},
  })),
  activeProfileId: 1,
});

const TABS = [
  ['system', 'System', 'BRT-'],
  ['layer', 'Layer', 'MO(1)'],
  ['profile', 'Profile', 'PF(0)'],
  ['extension', 'Extension', 'Mouse Left'],
] as const;

const scenarios: readonly ParityScenario[] = [
  connected('remap-basic', () => Promise.resolve()),
  ...TABS.map(([id, tab, firstKey]) =>
    connected(`remap-${id}`, async page => {
      await openTab(page, tab, firstKey);
    })
  ),
  connected('remap-toast', async page => {
    await paletteKey(page, 'Q').click();
    await page.getByText('Select the key you want to remap first').waitFor();
  }),
  connected('remap-assigned', async page => {
    await keycap(page, 'Escape').click();
    await keycap(page, '1').click();
    await keycap(page, '2').click();
    await paletteKey(page, 'Q').click();
    await page.locator('.keycap.selected', { hasText: /^Q$/ }).nth(2).waitFor();
  }),
  connected('remap-select-all', async page => {
    // Clicks focus the page; Ctrl+A selects every key.
    await remapPage(page).getByRole('heading', { name: 'Categories' }).click();
    await page.keyboard.press('Control+a');
    await page.locator('.keycap:not(.selected)').first().waitFor({ state: 'detached' });
  }),
  // PL-015: switching layers with the brush loaded writes nothing; the baseline painted the
  // selected key on the new layer.
  connected('remap-brush-layer', async page => {
    await keycap(page, 'Escape').click();
    await paletteKey(page, 'Q').click();
    await page.locator('.keycap.selected', { hasText: /^Q$/ }).waitFor();
    await page.getByTitle('Layer 2', { exact: true }).click();
    await page.waitForTimeout(500);
  }),
  // PL-008, PL-017: `↔ PF1` assigns nothing (the baseline assigned Reboot to key 5 and loaded it
  // as the brush); PF(0)–PF(3) assign libamp's profile operations.
  connected('remap-profile-assigned', async page => {
    await openTab(page, 'Profile', 'PF(0)');
    await keycap(page, '5').click();
    await paletteKey(page, '↔ PF1').click();
    await deselect(page);
    await assign(page, '1', 'PF(0)');
    await assign(page, '2', 'PF(1)');
    await assign(page, '3', 'PF(2)');
    await assign(page, '4', 'PF(3)');
  }),
  // PL-017, PL-018: a keyboard operation, the NKRO toggle and the joystick axis.
  connected('remap-extension-assigned', async page => {
    await openTab(page, 'Extension', 'Mouse Left');
    await assign(page, '1', 'Recovery');
    await assign(page, '2', 'NKRO Toggle');
    await assign(page, '3', 'Joy Positive');
    await assign(page, '4', 'Joy Negative');
  }),
  connected('profiles-dropdown', openProfileDropdown),
  connected('profiles-dropdown-lighting', async page => {
    await openLighting(page);
    await openProfileDropdown(page);
  }),
  // A local profile (5–16) is active.
  connected('profiles-dropdown-local', async page => {
    await openProfiles(page);
    await addProfiles(page, 1);
    await page.getByRole('heading', { name: 'Profile 5' }).click();
    await openLighting(page);
    await openProfileDropdown(page);
  }),
  connected('profiles-default', openProfiles),
  connected('profiles-activated', async page => {
    await openProfiles(page);
    await page.getByRole('heading', { name: 'Profile 3' }).click();
    await page.waitForTimeout(500);
  }),
  connected('profiles-menu', async page => {
    await openProfiles(page);
    await addProfiles(page, 1);
    await openProfileMenu(page, 4);
  }),
  connected('profiles-menu-active', async page => {
    await openProfiles(page);
    await openProfileMenu(page, 0);
  }),
  connected('profiles-duplicate', async page => {
    await openProfiles(page);
    await openProfileMenu(page, 0);
    await chooseMenuItem(page, 'Duplicate');
    await page.getByText('Duplicate Profile', { exact: true }).waitFor();
  }),
  connected('profiles-restore', async page => {
    await openProfiles(page);
    await openProfileMenu(page, 1);
    await chooseMenuItem(page, 'Restore Default');
    await page.getByText('Restore to Default', { exact: true }).waitFor();
  }),
  // All 16 slots are used: no Add Profile card, and Duplicate reports it.
  connected(
    'profiles-full',
    async page => {
      await openProfiles(page);
      await openProfileMenu(page, 0);
      await chooseMenuItem(page, 'Duplicate');
      await page.getByText('Maximum 16 profiles reached').waitFor();
    },
    { 'keyboard-profiles': SIXTEEN_PROFILES }
  ),
  // F-2: the imported profile's card appears at once (the baseline mutated its store in place, so
  // the card only showed once the list changed otherwise).
  connected('profiles-imported', async page => {
    await openProfiles(page);
    await importFile(page, 'travel.json', JSON.stringify({ name: 'Travel Setup' }));
  }),
  // F-1: a file that is not JSON shows the page's import error; the baseline ignored it.
  connected('profiles-import-invalid', async page => {
    await openProfiles(page);
    await importFile(page, 'broken.json', '{ broken');
  }),
  // PL-013: a profile switched on the keyboard itself becomes the active profile.
  connected('profiles-keyboard-switch', async page => {
    await openProfiles(page);
    await page.evaluate(() => {
      const keyboard = window.__virtualKeyboard;
      if (!keyboard) throw new Error('The virtual keyboard is missing');
      keyboard.state.profileIndex = 2;
      keyboard.notifyConfigChanged();
    });
    // The controller reloads 200 ms after the notification.
    await page.waitForTimeout(1500);
  }),
];

export default scenarios;
