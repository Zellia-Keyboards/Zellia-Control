import type { JSHandle, Locator, Page } from '@playwright/test';
import { expect, test, type VirtualKeyboard, type VirtualKeyboardHandle } from './fixtures';

type Keyboard = JSHandle<VirtualKeyboardHandle>;

/** emi-keyboard-controller `KeyMode` / `RGBBaseMode` / `RGBMode` values on the wire. */
const KEY_MODE = { normal: 1, rapid: 2 } as const;
const RGB_BASE_MODE = { blank: 1, rainbow: 2 } as const;
const RGB_MODE = { static: 1, cycle: 2, linear: 3, fadingDiamondRipple: 8 } as const;

/** The keyboard's u16 fraction of the 4.0 mm travel for `mm` (the controller truncates). */
const raw = (mm: number) => Math.trunc((mm / 4) * 65535);

/**
 * Opens the app with the injected keyboard, clicks "Get Started", waits for Remap with the
 * keyboard's keymap, then opens a sidebar page. Returns the keyboard's handle.
 */
async function openPage(
  page: Page,
  virtualKeyboard: VirtualKeyboard,
  name: string,
  path: string
): Promise<Keyboard> {
  await page.goto('/');
  const keyboard = await virtualKeyboard.handle();
  await page.getByRole('button', { name: 'Get Started' }).click();
  await page.waitForURL('**/remap/');
  await expect(page.locator('.keycap[data-key-id="16"]')).toHaveText('Tab');
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  return keyboard;
}

const keycap = (page: Page, id: number) => page.locator(`.keycap[data-key-id="${id}"]`);

/** Ids of the keys the on-screen keyboard shows (the chosen layout variants). */
function visibleKeyIds(page: Page): Promise<number[]> {
  return page
    .locator('.keycap')
    .evaluateAll(keycaps => keycaps.map(keycap => Number(keycap.getAttribute('data-key-id'))));
}

function activeProfile(keyboard: Keyboard) {
  return keyboard.evaluate(vk => vk.state.active);
}

function storedProfile(keyboard: Keyboard) {
  return keyboard.evaluate(vk => vk.state.profiles[vk.state.profileIndex]);
}

function advancedKey(keyboard: Keyboard, id: number) {
  return keyboard.evaluate((vk, keyId) => vk.state.active.advancedKeys[keyId], id);
}

async function save(page: Page): Promise<void> {
  await page.locator('.sidebar').getByRole('button', { name: 'Save' }).click();
}

/** `list[index]`, which the test expects to exist. */
function at<T>(list: readonly T[] | undefined, index: number): T {
  const item = list?.[index];
  if (item === undefined) throw new Error(`no entry ${index}`);
  return item;
}

/** Hue in degrees of a wire colour. */
function hue({ red, green, blue }: { red: number; green: number; blue: number }): number {
  const max = Math.max(red, green, blue);
  const delta = max - Math.min(red, green, blue);
  if (delta === 0) return 0;
  let sector: number;
  if (max === red) sector = ((green - blue) / delta + 6) % 6;
  else if (max === green) sector = (blue - red) / delta + 2;
  else sector = (red - green) / delta + 4;
  return sector * 60;
}

test.describe('performance', () => {
  test('loads the selected key, tunes it, paints other keys and saves', async ({
    page,
    virtualKeyboard,
  }) => {
    const keyboard = await openPage(page, virtualKeyboard, 'Performance', '/performance/');
    await keyboard.evaluate(vk => {
      vk.clearHistory();
    });
    const actuation = page.getByRole('spinbutton', { name: 'Actuation' });
    const deactivation = page.getByRole('spinbutton', { name: 'Deactivation' });

    // The keycaps show every key's stored values (PL-005).
    await expect(keycap(page, 1)).toHaveText('↓2.000↑1.960');
    await expect(actuation).toHaveValue('2');
    await expect(deactivation).toHaveValue('1.5');

    // D12: selecting loads all values of the key and writes nothing to it.
    await keycap(page, 1).click();
    await expect(keycap(page, 1)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('1 keys selected')).toBeVisible();
    await expect(actuation).toHaveValue('2');
    await expect(deactivation).toHaveValue('1.96');
    const loaded = await advancedKey(keyboard, 1);
    expect(await keyboard.evaluate(vk => vk.sentPackets.length)).toBe(0);

    // Every change goes to the selected key at once.
    await actuation.fill('2.5');
    await expect.poll(async () => (await advancedKey(keyboard, 1))?.activation).toBe(raw(2.5));
    await expect(keycap(page, 1)).toHaveText('↓2.500↑1.960');

    await page.getByRole('switch', { name: 'Rapid Trigger Toggle' }).click();
    await expect.poll(async () => (await advancedKey(keyboard, 1))?.mode).toBe(KEY_MODE.rapid);
    await expect(page.getByText('0.32 mm')).toBeVisible();
    const sensitivity = page.getByRole('slider', { name: 'SENSITIVITY' });
    await sensitivity.focus();
    await page.keyboard.press('End');
    await expect(page.getByText('2.00 mm')).toBeVisible();
    await page.getByRole('spinbutton', { name: 'Bottom' }).fill('3.5');

    const tuned = {
      ...loaded,
      mode: KEY_MODE.rapid,
      activation: raw(2.5),
      triggerDistance: raw(2),
      releaseDistance: raw(2),
      lowerDeadzone: raw(0.5),
    };
    await expect.poll(() => advancedKey(keyboard, 1)).toEqual(tuned);
    await expect(keycap(page, 1)).toHaveText('↧0.000⇅2.000↥0.500');

    // The brush: keys added to the selection take the current settings, also after
    // deselect-all, and dragging across keys selects each of them.
    await keycap(page, 2).click();
    await expect.poll(() => advancedKey(keyboard, 2)).toEqual(tuned);
    await page.getByRole('button', { name: 'Discard selection' }).click();
    await expect(page.getByText('0 keys selected')).toBeVisible();
    await keycap(page, 3).hover();
    await page.mouse.down();
    await keycap(page, 4).hover();
    await keycap(page, 5).hover();
    await page.mouse.up();
    await expect(page.getByText('3 keys selected')).toBeVisible();
    for (const id of [3, 4, 5]) {
      await expect.poll(() => advancedKey(keyboard, id)).toEqual(tuned);
    }
    // Key 6 was never selected.
    expect(await advancedKey(keyboard, 6)).toEqual(loaded);

    // Switching layers never writes (§1.4).
    await keyboard.evaluate(vk => {
      vk.clearHistory();
    });
    await page.getByTitle('Layer 2').click();
    await expect(page.getByTitle('Layer 2')).toHaveAttribute('aria-pressed', 'true');
    expect(await keyboard.evaluate(vk => vk.sentPackets.length)).toBe(0);

    await save(page);
    await expect
      .poll(async () => (await storedProfile(keyboard))?.advancedKeys)
      .toEqual((await activeProfile(keyboard)).advancedKeys);
    expect((await storedProfile(keyboard))?.advancedKeys[5]).toEqual(tuned);
  });

  test('keeps the settings within the switch travel', async ({ page, virtualKeyboard }) => {
    const keyboard = await openPage(page, virtualKeyboard, 'Performance', '/performance/');
    await keycap(page, 1).click();
    await page.getByRole('spinbutton', { name: 'Actuation' }).fill('3.8');

    await page.getByRole('textbox', { name: 'Switch Travel Distance' }).fill('3');

    await expect(page.getByRole('spinbutton', { name: 'Actuation' })).toHaveValue('3');
    await expect(page.getByRole('slider', { name: 'Actuation' })).toHaveAttribute('max', '3');
    await expect.poll(async () => (await advancedKey(keyboard, 1))?.activation).toBe(raw(3));
  });

  test('selects every key with Ctrl/⌘+A and clears the selection with Ctrl/⌘+Escape', async ({
    page,
    virtualKeyboard,
  }) => {
    await openPage(page, virtualKeyboard, 'Performance', '/performance/');
    const selectable = Math.max(...(await visibleKeyIds(page))) + 1;

    await page.keyboard.press('ControlOrMeta+a');
    await expect(page.getByText(`${selectable} keys selected`)).toBeVisible();
    await expect(page.locator('.keycap[aria-pressed="false"]')).toHaveCount(0);

    await page.keyboard.press('ControlOrMeta+Escape');
    await expect(page.getByText('0 keys selected')).toBeVisible();
    await expect(page.locator('.keycap[aria-pressed="true"]')).toHaveCount(0);

    // The header buttons do the same.
    await page.getByRole('button', { name: 'Select all keys' }).click();
    await expect(page.getByText(`${selectable} keys selected`)).toBeVisible();
    await page.getByRole('button', { name: 'Select all keys' }).click();
    await expect(page.getByText('0 keys selected')).toBeVisible();
  });
});

test.describe('lighting', () => {
  function panels(page: Page): { base: Locator; keys: Locator } {
    return {
      base: page.getByRole('region', { name: 'Base Configuration' }),
      keys: page.getByRole('region', { name: 'Key Configuration' }),
    };
  }

  test('applies the base and the per-key lighting and saves them', async ({
    page,
    virtualKeyboard,
  }) => {
    const keyboard = await openPage(page, virtualKeyboard, 'Lighting', '/lighting/');
    const { base, keys } = panels(page);
    const before = await activeProfile(keyboard);

    // Base panel: edits wait for Apply. The speed is the device value (D11, PL-006).
    await expect(base.getByText('20%')).toBeVisible();
    await base.getByRole('button', { name: 'Rainbow', exact: true }).click();
    await expect(base.getByRole('button', { name: 'Rainbow', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await base.getByRole('slider', { name: 'Speed' }).focus();
    await page.keyboard.press('End');
    await expect(base.getByText('100%')).toBeVisible();
    await base.getByRole('spinbutton', { name: 'Direction' }).fill('90');
    await expect(base.getByText('↑ DTU')).toBeVisible();
    expect((await activeProfile(keyboard)).rgbBase).toEqual(before.rgbBase);

    await base.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect
      .poll(async () => (await activeProfile(keyboard)).rgbBase)
      .toEqual({ ...before.rgbBase, mode: RGB_BASE_MODE.rainbow, speed: 100, direction: 90 });

    // Key panel without a selection: every key, with the colour and speed the panel shows (key
    // 0's).
    const cycle = { mode: RGB_MODE.cycle, color: at(before.rgbKeys, 0).color, speed: 20 };
    await expect(keys.getByText(/^#ff0000$/i)).toBeVisible();
    await keys.getByRole('button', { name: 'Cycle', exact: true }).click();
    await keys.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect
      .poll(async () => (await activeProfile(keyboard)).rgbKeys)
      .toEqual(before.rgbKeys.map(() => cycle));

    // Key panel with keys selected: only those.
    await keycap(page, 1).click();
    await keycap(page, 2).click();
    await keys.getByRole('button', { name: 'Fading Diamond Ripple', exact: true }).click();
    await keys.getByLabel('Color', { exact: true }).fill('#00ff00');
    await keys.getByRole('button', { name: 'Apply', exact: true }).click();
    const ripple = {
      mode: RGB_MODE.fadingDiamondRipple,
      color: { red: 0, green: 255, blue: 0 },
      speed: 20,
    };
    await expect.poll(async () => (await activeProfile(keyboard)).rgbKeys[2]).toEqual(ripple);
    const applied = await activeProfile(keyboard);
    expect(applied.rgbKeys[1]).toEqual(ripple);
    expect(applied.rgbKeys[3]).toEqual(cycle);
    await expect(keycap(page, 1)).toHaveText('ripple');
    await expect(keycap(page, 3)).toHaveText('');

    await save(page);
    await expect
      .poll(async () => (await storedProfile(keyboard))?.rgbKeys)
      .toEqual(applied.rgbKeys);
    expect((await storedProfile(keyboard))?.rgbBase).toEqual(applied.rgbBase);
  });

  test('colours each key from its position with the rainbow preset', async ({
    page,
    virtualKeyboard,
  }) => {
    const keyboard = await openPage(page, virtualKeyboard, 'Lighting', '/lighting/');
    const { keys } = panels(page);
    const before = await activeProfile(keyboard);
    const visible = await visibleKeyIds(page);

    await keys.getByRole('button', { name: 'Linear', exact: true }).click();
    await keys.getByRole('button', { name: 'Rainbow Preset' }).click();
    await expect(keys.getByRole('spinbutton', { name: 'Rainbow Direction' })).toHaveValue('0');
    await keys.getByRole('button', { name: 'Apply Settings' }).click();

    // PL-007: every visible key gets the panel's mode and a colour of its own; with the
    // direction 0 and density 10 the hue moves 10° per key unit, from key 0's red.
    await expect
      .poll(async () => (await activeProfile(keyboard)).rgbKeys[1]?.mode)
      .toBe(RGB_MODE.linear);
    const { rgbKeys } = await activeProfile(keyboard);
    for (const id of visible) {
      expect(rgbKeys[id]?.mode, `key ${id}`).toBe(RGB_MODE.linear);
      expect(rgbKeys[id]?.speed, `key ${id}`).toBe(20);
    }
    // The number row: 1u keys side by side.
    const hues = [1, 2, 3, 4, 5, 6].map(id => hue(at(rgbKeys, id).color));
    for (let index = 1; index < hues.length; index++) {
      const step = (at(hues, index) - at(hues, index - 1) + 360) % 360;
      expect(step, `hue step to key ${index + 1}`).toBeCloseTo(10, 0);
    }
    // Keys of the hidden layout variants keep their lighting.
    for (let id = 0; id < rgbKeys.length; id++) {
      if (!visible.includes(id))
        expect(rgbKeys[id], `hidden key ${id}`).toEqual(before.rgbKeys[id]);
    }
    await expect(keycap(page, 1)).toHaveText('reactive');

    // With keys selected, only they are coloured.
    await keycap(page, 10).click();
    await keys.getByRole('button', { name: 'Static', exact: true }).click();
    await keys.getByRole('button', { name: 'Apply Settings' }).click();
    await expect
      .poll(async () => (await activeProfile(keyboard)).rgbKeys[10]?.mode)
      .toBe(RGB_MODE.static);
    expect((await activeProfile(keyboard)).rgbKeys[9]?.mode).toBe(RGB_MODE.linear);
  });

  test('selects every key with Ctrl/⌘+A and clears the selection with Ctrl/⌘+Escape', async ({
    page,
    virtualKeyboard,
  }) => {
    await openPage(page, virtualKeyboard, 'Lighting', '/lighting/');

    await page.keyboard.press('ControlOrMeta+a');
    await expect(page.locator('.keycap[aria-pressed="false"]')).toHaveCount(0);

    await page.keyboard.press('ControlOrMeta+Escape');
    await expect(page.locator('.keycap[aria-pressed="true"]')).toHaveCount(0);
  });
});
