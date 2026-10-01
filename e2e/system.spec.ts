import type { JSHandle, Locator, Page } from '@playwright/test';
import { expect, test, type VirtualKeyboardHandle } from './fixtures';

/** Keyboard operation codes (`0xFE | operation << 8` key events, libamp `keycode.h`). */
const REBOOT = 0x00;
const FACTORY_RESET = 0x01;
const BOOTLOADER = 0x03;

/** A firmware image the updater accepts (1 KiB–1 MiB, `.bin`), with varied bytes. */
const IMAGE = Buffer.from(Array.from({ length: 6 * 1024 + 100 }, (_, index) => (index * 7) % 251));
const FIRMWARE = { name: 'firmware.bin', mimeType: 'application/octet-stream', buffer: IMAGE };

/** Clicks "Get Started" on the welcome screen and waits for Remap with the keyboard's keymap. */
async function connect(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get Started' }).click();
  await page.waitForURL('**/remap/');
  await expect(page.locator('.keycap[data-key-id="16"]')).toHaveText('Tab');
}

/** Opens a page from the sidebar's navigation. */
async function openFromSidebar(page: Page, name: string, path: string): Promise<void> {
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
}

/** Keyboard operations the app sent (reboot, factory reset, bootloader, …), in order. */
function operations(keyboard: JSHandle<VirtualKeyboardHandle>): Promise<number[]> {
  return keyboard.evaluate(vk =>
    vk.sentPackets.flatMap(packet =>
      packet.op === 'event' && (packet.keycode & 0xff) === 0xfe ? [packet.keycode >> 8] : []
    )
  );
}

/** Whether the keyboard streams debug data (its debug config bit, `KeyboardConfigDebug`). */
function debugStreaming(keyboard: JSHandle<VirtualKeyboardHandle>): Promise<boolean> {
  return keyboard.evaluate(vk => vk.state.config[0] === true);
}

/** The bytes the bootloader programmed since its last erase. */
function flashedImage(keyboard: JSHandle<VirtualKeyboardHandle>): Promise<number[]> {
  return keyboard.evaluate(vk => Array.from(vk.dfu?.image ?? []));
}

function travelChart(page: Page) {
  return page.getByRole('img', { name: 'Key Distance' });
}

/** What the travel chart currently shows. */
function chartPixels(page: Page): Promise<string> {
  return travelChart(page).evaluate(canvas => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('the chart is not a canvas');
    return canvas.toDataURL();
  });
}

/** Whether Chart.js has drawn the travel chart: its canvas is no longer blank. */
function chartDrawn(page: Page): Promise<boolean> {
  return travelChart(page).evaluate(canvas => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('the chart is not a canvas');
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() !== blank.toDataURL();
  });
}

/** Resolves after the page has rendered two more frames. */
function nextFrames(page: Page): Promise<void> {
  return page.evaluate(
    () =>
      new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      })
  );
}

/** The updater's current step (the active one, `aria-current="step"`). */
function activeStep(page: Page) {
  return page.getByRole('list', { name: 'Update steps' }).locator('[aria-current="step"]');
}

async function chooseFirmware(page: Page, file = FIRMWARE): Promise<void> {
  await page.locator('#firmware-file-input').setInputFiles(file);
}

/** Presses Tab until `target` has the focus, at most `max` times. */
async function tabTo(page: Page, target: Locator, max = 40): Promise<void> {
  for (let presses = 0; presses < max; presses += 1) {
    if (await target.evaluate(element => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

/** The computed value of the theme's `primary-500` as a border colour. */
function primaryBorderColor(page: Page): Promise<string> {
  return page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.borderColor = 'var(--color-primary-500)';
    document.body.append(probe);
    const color = getComputedStyle(probe).borderTopColor;
    probe.remove();
    return color;
  });
}

/**
 * Pulls the bootloader's cable: unplugs the one authorized DFU device from the simulator's USB
 * bus, which stands in for `navigator.usb` (`VirtualUsb`, src/testing/virtual-keyboard/dfu.ts).
 */
async function unplugBootloader(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const usb: unknown = Reflect.get(navigator, 'usb');
    if (typeof usb !== 'object' || usb === null) throw new Error('no USB bus');
    const getDevices: unknown = Reflect.get(usb, 'getDevices');
    const unplug: unknown = Reflect.get(usb, 'unplug');
    if (typeof getDevices !== 'function' || typeof unplug !== 'function') {
      throw new Error('navigator.usb is not the virtual USB bus');
    }
    const devices: unknown = await Reflect.apply(getDevices, usb, []);
    if (!Array.isArray(devices) || devices.length !== 1) throw new Error('not one bootloader');
    Reflect.apply(unplug, usb, devices);
  });
}

test.describe('debug', () => {
  test('tracks the travel of a key picked on the modal keyboard', async ({
    page,
    virtualKeyboard,
  }) => {
    await connect(page);
    await openFromSidebar(page, 'Debug', '/debug/');
    const keyboard = await virtualKeyboard.handle();
    await expect(page.getByRole('tab', { name: 'Key Tracking' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeDisabled();
    // No toolbar and no global keyboard on Debug: keys are picked in the modal.
    await expect(page.locator('.keycap')).toHaveCount(0);
    // The empty chart: axes only.
    await expect.poll(() => chartDrawn(page)).toBe(true);
    const empty = await chartPixels(page);

    await page.getByRole('button', { name: 'Select Key...' }).click();
    const picker = page.getByRole('dialog', { name: 'Select Key to Track' });
    await expect(picker).toBeVisible();
    // The modal keyboard shows the layout's legends; 16 is Tab.
    await picker.locator('.keycap', { hasText: /^16$/ }).click();

    await expect(picker).toBeHidden();
    await expect(page.getByRole('button', { name: 'Key 16' })).toBeVisible();
    await expect(page.getByText('Recording')).toBeVisible();
    await expect.poll(() => debugStreaming(keyboard)).toBe(true);
    expect(
      await keyboard.evaluate(vk =>
        vk.sentPackets.some(packet => packet.op === 'debug' && packet.keyIds.includes(16))
      )
    ).toBe(true);
    // The chart plots the samples as they arrive (PL-011).
    await expect.poll(() => chartPixels(page)).not.toBe(empty);

    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    await expect(page.getByText('Recording')).toBeHidden();
    await expect.poll(() => debugStreaming(keyboard)).toBe(false);
    // Samples received before the click are drawn on the next frame; none come after it.
    await nextFrames(page);
    const stopped = await chartPixels(page);
    await page.waitForTimeout(300);
    expect(await chartPixels(page)).toBe(stopped);

    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await expect(page.getByText('Recording')).toBeVisible();
    await expect.poll(() => debugStreaming(keyboard)).toBe(true);

    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Select Key...' })).toBeVisible();
    await expect(page.getByText('Recording')).toBeHidden();
    await expect.poll(() => debugStreaming(keyboard)).toBe(false);

    // Leaving the page while recording stops the stream.
    await page.getByRole('button', { name: 'Select Key...' }).click();
    await picker.locator('.keycap', { hasText: /^30$/ }).click();
    await expect(page.getByRole('button', { name: 'Key 30' })).toBeVisible();
    await expect.poll(() => debugStreaming(keyboard)).toBe(true);
    await openFromSidebar(page, 'Settings', '/settings/');
    await expect.poll(() => debugStreaming(keyboard)).toBe(false);
  });

  test('logs key presses on the Key Test tab', async ({ page, virtualKeyboard }) => {
    await connect(page);
    await openFromSidebar(page, 'Debug', '/debug/');
    await virtualKeyboard.handle();
    await page.getByRole('tab', { name: 'Key Test' }).click();
    const log = page.getByRole('tabpanel');
    await expect(log.getByText('Click "Start Listening" to begin')).toBeVisible();

    await page.getByRole('button', { name: 'Start Listening' }).click();
    await expect(page.getByText('Listening Active')).toBeVisible();
    await page.keyboard.press('KeyA');
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.press('KeyS');
    await page.keyboard.up('ShiftLeft');

    const rows = log.locator('.grid-cols-4').filter({ hasText: /Press|Release/ });
    await expect(rows).toHaveCount(6);
    await expect(rows.nth(0)).toContainText('Press');
    await expect(rows.nth(0)).toContainText('KeyA');
    await expect(rows.nth(0)).toContainText('0.000s');
    await expect(rows.nth(1)).toContainText('Release');
    await expect(rows.nth(3)).toContainText('KeyS');
    await expect(rows.nth(5)).toContainText('ShiftLeft');

    await page.getByRole('button', { name: 'Stop Listening' }).click();
    await page.keyboard.press('KeyB');
    await expect(rows).toHaveCount(6);

    await page.getByRole('button', { name: 'Clear Events' }).click();
    await expect(rows).toHaveCount(0);
    await expect(log.getByText('Click "Start Listening" to begin')).toBeVisible();
  });
});

test.describe('settings', () => {
  test('restarts the keyboard at once', async ({ page, virtualKeyboard }) => {
    await connect(page);
    await openFromSidebar(page, 'Settings', '/settings/');
    const keyboard = await virtualKeyboard.handle();
    await keyboard.evaluate(vk => {
      vk.clearHistory();
    });

    await page.getByRole('button', { name: /^Restart Device/ }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await operations(keyboard)).toEqual([REBOOT]);
    // The keyboard reboots: its session ends and the app returns to the connection screen (D3).
    await expect(page).toHaveURL(/:\d+\/$/);
    await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
  });

  test('asks before a factory reset', async ({ page, virtualKeyboard }) => {
    await connect(page);
    const keyboard = await virtualKeyboard.handle();
    // A change made on the keyboard: Tab now sends A.
    await keyboard.evaluate(vk => {
      const layer = vk.state.active.keymap[0];
      if (layer) layer[16] = 0x04;
      for (const profile of vk.state.profiles) {
        const stored = profile.keymap[0];
        if (stored) stored[16] = 0x04;
      }
      vk.clearHistory();
    });
    await openFromSidebar(page, 'Settings', '/settings/');

    await page.getByRole('button', { name: /^Factory Reset/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Factory Reset' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      'Are you sure you want to reset all settings to factory defaults? This action cannot be undone.'
    );
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    expect(await operations(keyboard)).toEqual([]);
    expect(await keyboard.evaluate(vk => vk.state.active.keymap[0]?.[16])).toBe(0x04);

    await page.getByRole('button', { name: /^Factory Reset/ }).click();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect(await operations(keyboard)).toEqual([]);

    await page.getByRole('button', { name: /^Factory Reset/ }).click();
    await dialog.getByRole('button', { name: 'Factory Reset' }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => operations(keyboard)).toEqual([FACTORY_RESET]);
    // Tab sends Tab again, and the app shows the reloaded configuration.
    await expect.poll(() => keyboard.evaluate(vk => vk.state.active.keymap[0]?.[16])).toBe(0x2b);
    await openFromSidebar(page, 'Remap', '/remap/');
    await expect(page.locator('.keycap[data-key-id="16"]')).toHaveText('Tab');
  });

  test.describe('enter bootloader', () => {
    test.use({ virtualKeyboardOptions: { firmwareAfterUpdate: { patch: 1 } } });

    test('asks first, then opens the Update page and flashes the waiting bootloader', async ({
      page,
      virtualKeyboard,
    }) => {
      await connect(page);
      await openFromSidebar(page, 'Settings', '/settings/');
      const keyboard = await virtualKeyboard.handle();
      await keyboard.evaluate(vk => {
        vk.clearHistory();
      });

      await page.getByRole('button', { name: /^Enter Bootloader/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Enter Bootloader' });
      await expect(dialog).toContainText(
        'Are you sure you want to enter bootloader mode? The keyboard will disconnect and wait for a firmware update.'
      );
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).toBeHidden();
      expect(await operations(keyboard)).toEqual([]);
      expect(await keyboard.evaluate(vk => vk.connected)).toBe(true);

      await page.getByRole('button', { name: /^Enter Bootloader/ }).click();
      await dialog.getByRole('button', { name: 'Enter Bootloader' }).click();

      // §1.8: the Update page, the keyboard waiting in its bootloader.
      await expect(page).toHaveURL(/\/update\/$/);
      await expect(page.getByRole('heading', { name: 'Zellia Firmware Updater' })).toBeVisible();
      await expect.poll(() => operations(keyboard)).toEqual([BOOTLOADER]);
      await expect.poll(() => keyboard.evaluate(vk => vk.dfu?.connected)).toBe(true);
      expect(await keyboard.evaluate(vk => vk.connected)).toBe(false);
      await expect(page.locator('.sidebar').getByText('Waiting to connect')).toBeVisible();
      await expect(activeStep(page)).toHaveText('Choose Binary');

      await chooseFirmware(page);
      // The bootloader is not authorized yet: the browser's chooser needs a click.
      await expect(activeStep(page)).toHaveText('Connect Recovery');
      await page.getByRole('button', { name: 'Connect USB Device' }).click();

      await expect(page.getByText('Flashing Complete!')).toBeVisible();
      expect(await flashedImage(keyboard)).toEqual([...IMAGE]);
      await expect.poll(() => keyboard.evaluate(vk => vk.state.firmware.patch)).toBe(1);
      expect(await operations(keyboard)).toEqual([BOOTLOADER]);
    });
  });
});

test.describe('firmware update', () => {
  test.use({ virtualKeyboardOptions: { firmwareAfterUpdate: { patch: 1 } } });

  test('reboots the keyboard into its bootloader and flashes the chosen image', async ({
    page,
    virtualKeyboard,
  }) => {
    await connect(page);
    await openFromSidebar(page, 'Update', '/update/');
    const keyboard = await virtualKeyboard.handle();
    await keyboard.evaluate(vk => {
      vk.clearHistory();
    });
    await expect(activeStep(page)).toHaveText('Choose Binary');
    await expect(page.getByText('Select Firmware File')).toBeVisible();

    await chooseFirmware(page);

    // The app asks the keyboard to reboot into its bootloader (PL-042) and stays on the page.
    await expect.poll(() => operations(keyboard)).toEqual([BOOTLOADER]);
    await expect(activeStep(page)).toHaveText('Connect Recovery');
    await expect(page.getByText('Connect your device in DFU mode')).toBeVisible();
    await expect(page).toHaveURL(/\/update\/$/);
    expect(await keyboard.evaluate(vk => vk.dfu?.connected)).toBe(true);

    await page.getByRole('button', { name: 'Connect USB Device' }).click();

    await expect(page.getByText('Flashing Complete!')).toBeVisible();
    await expect(activeStep(page)).toHaveText('Finish');
    expect(await flashedImage(keyboard)).toEqual([...IMAGE]);
    // The bootloader reset into the new firmware, and the keyboard is back on the bus.
    await expect.poll(() => keyboard.evaluate(vk => vk.state.firmware.patch)).toBe(1);
    await expect.poll(() => keyboard.evaluate(vk => vk.connected)).toBe(true);
    expect(await keyboard.evaluate(vk => vk.dfu?.connected)).toBe(false);

    await page.getByRole('button', { name: 'Flash Another Device' }).click();
    await expect(activeStep(page)).toHaveText('Choose Binary');
    // The update is over: the app may go back to the connection screen and connect again.
    await page.getByRole('link', { name: 'Remap', exact: true }).click();
    await page.getByRole('button', { name: 'Go to Home' }).click();
    await page.getByRole('button', { name: 'Get Started' }).click();
    await page.waitForURL('**/remap/');
    await expect(page.locator('.keycap[data-key-id="16"]')).toHaveText('Tab');
  });

  test.describe('with an authorized bootloader', () => {
    test.use({ virtualKeyboardOptions: { dfu: { authorized: true } } });

    test('flashes the bootloader that appears after the reboot without a click', async ({
      page,
      virtualKeyboard,
    }) => {
      await connect(page);
      await openFromSidebar(page, 'Update', '/update/');
      const keyboard = await virtualKeyboard.handle();

      await chooseFirmware(page);

      await expect(page.getByText('Flashing Complete!')).toBeVisible();
      expect(await flashedImage(keyboard)).toEqual([...IMAGE]);
    });
  });

  test.describe('with a slow bootloader', () => {
    test.use({ virtualKeyboardOptions: { dfu: { busyPolls: 1, pollTimeoutMs: 250 } } });

    test('keeps flashing while another page is open and shows the result on return', async ({
      page,
      virtualKeyboard,
    }) => {
      await connect(page);
      await openFromSidebar(page, 'Update', '/update/');
      const keyboard = await virtualKeyboard.handle();
      await chooseFirmware(page);
      await page.getByRole('button', { name: 'Connect USB Device' }).click();
      await expect(activeStep(page)).toHaveText(/Update Program|Flash Firmware/);

      await openFromSidebar(page, 'About', '/about/');
      // No keyboard: the page itself waits for one; the update goes on (D3).
      await expect(page.getByText('No Keyboard Connected')).toBeVisible();
      await expect.poll(() => flashedImage(keyboard), { timeout: 20_000 }).toEqual([...IMAGE]);

      await openFromSidebar(page, 'Update', '/update/');
      await expect(page.getByText('Flashing Complete!')).toBeVisible();
    });

    test('reports a flash cut short by an unplugged bootloader and starts over', async ({
      page,
      virtualKeyboard,
    }) => {
      await connect(page);
      await openFromSidebar(page, 'Update', '/update/');
      const keyboard = await virtualKeyboard.handle();
      await chooseFirmware(page);
      await page.getByRole('button', { name: 'Connect USB Device' }).click();
      await expect(activeStep(page)).toHaveText('Flash Firmware');

      // The cable is pulled while the image is written.
      await unplugBootloader(page);

      await expect(page.getByRole('alert')).toContainText('Failed to flash firmware');
      await expect(activeStep(page)).toHaveCount(0);
      expect((await flashedImage(keyboard)).length).toBeLessThan(IMAGE.length);
      // The update is over: the page stays and starts over.
      await expect(page).toHaveURL(/\/update\/$/);
      await page.getByRole('button', { name: 'Try Again' }).click();
      await expect(activeStep(page)).toHaveText('Choose Binary');
    });
  });

  test('refuses a file that is not a .bin and leaves the keyboard alone', async ({
    page,
    virtualKeyboard,
  }) => {
    await connect(page);
    await openFromSidebar(page, 'Update', '/update/');
    const keyboard = await virtualKeyboard.handle();
    await keyboard.evaluate(vk => {
      vk.clearHistory();
    });

    await chooseFirmware(page, { ...FIRMWARE, name: 'firmware.hex' });

    await expect(page.getByRole('alert')).toContainText('Please select a .bin firmware file');
    await page.getByRole('button', { name: 'Try Again' }).click();
    await expect(activeStep(page)).toHaveText('Choose Binary');
    expect(await operations(keyboard)).toEqual([]);
    expect(await keyboard.evaluate(vk => vk.connected)).toBe(true);
    await expect(page.locator('.sidebar').getByText('ZelliaKB')).toBeVisible();
  });

  test('chooses the firmware file with Tab and Enter', async ({ page }) => {
    await page.goto('/update/');
    const input = page.getByLabel(/Drop firmware here/);
    const dropZone = page.getByRole('region', { name: 'Firmware file drop zone' });

    await tabTo(page, input);

    // The drop zone shows the keyboard focus with its hover border.
    await expect(dropZone).toHaveCSS('border-top-color', await primaryBorderColor(page));
    const chooser = page.waitForEvent('filechooser');
    await page.keyboard.press('Enter');
    await (await chooser).setFiles(FIRMWARE);
    // No keyboard to reboot: the update goes on to the bootloader.
    await expect(activeStep(page)).toHaveText('Connect Recovery');
  });

  test('without a keyboard: finds no bootloader, starts over and flashes one entered by hand', async ({
    page,
    virtualKeyboard,
  }) => {
    // §1.7: the Update page opened directly, no keyboard connected.
    await page.goto('/update/');
    const keyboard = await virtualKeyboard.handle();
    await expect(page.getByRole('heading', { name: 'Zellia Firmware Updater' })).toBeVisible();
    await expect(page.getByText('No Keyboard Connected')).toBeHidden();

    await chooseFirmware(page);
    // Nothing to reboot: step 2 is skipped.
    await expect(activeStep(page)).toHaveText('Connect Recovery');
    await page.getByRole('button', { name: 'Connect USB Device' }).click();
    // No bootloader on the bus: the chooser finds nothing, as when it is cancelled.
    await expect(page.getByRole('alert')).toContainText(
      'No device in DFU mode found. Please enter recovery mode first.'
    );

    await page.getByRole('button', { name: 'Try Again' }).click();
    await expect(activeStep(page)).toHaveText('Choose Binary');

    // The user holds BOOT while plugging the keyboard in.
    await keyboard.evaluate(vk => {
      vk.enterBootloader();
    });
    await chooseFirmware(page);
    await page.getByRole('button', { name: 'Connect USB Device' }).click();

    await expect(page.getByText('Flashing Complete!')).toBeVisible();
    expect(await flashedImage(keyboard)).toEqual([...IMAGE]);
  });
});
