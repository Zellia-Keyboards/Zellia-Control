import type { Page } from '@playwright/test';
import type { ParityScenario } from '../scenario';

/**
 * Debug, Settings, About and the firmware Update page (worker I), each inside the shell.
 *
 * Connected scenarios open the page from the sidebar like a user. Before the capture the entry
 * animations are let finish and the sidebar's Save button is hidden: its label is PL-002 (the
 * shell's deviation), and hiding it keeps these captures about the pages. Copy on these pages is
 * hard-coded English in both apps except the headings and cards of Settings and About, so names
 * are matched in both languages where they are translated.
 *
 * The update scenarios drive both apps' flows with the same steps (see `continueUpdate`); a few
 * make the virtual bootloader hold or fail a transfer to show a state in the middle of a flash
 * (`tamperBootloader`).
 */

const GET_STARTED = /Get Started|开始使用/;
/** Connected scenarios need unseeded dynamic keys: the baseline cannot load them. */
const KEYBOARD = { seedDynamicKeys: false } as const;

const DEBUG_LINK = /^(Debug|调试)$/;
const SETTINGS_LINK = /^(Settings|设置)$/;
const UPDATE_LINK = /^(Update|更新)$/;
const ABOUT_LINK = /^(About|关于)$/;

/** A firmware image the updater accepts (1 KiB–1 MiB, `.bin`). */
const FIRMWARE = {
  name: 'firmware.bin',
  mimeType: 'application/octet-stream',
  buffer: Buffer.alloc(4096, 0x5a),
};

/**
 * Clicks "Get Started" and waits until `/remap/` shows the keyboard's own keymap (the Tab key
 * has its label only once the device configuration is loaded).
 */
async function connect(page: Page): Promise<void> {
  await page.getByRole('button', { name: GET_STARTED }).click();
  await page.waitForURL('**/remap/');
  await page.locator('.keycap', { hasText: /^Tab$/ }).waitFor();
}

/** Connects, then opens a page through the sidebar. */
async function connectAndOpen(page: Page, link: RegExp, path: string): Promise<void> {
  await connect(page);
  await page.getByRole('link', { name: link }).click();
  await page.waitForURL(`**${path}`);
}

/**
 * Waits until the finite CSS animations and transitions have finished (entry fades and slides,
 * which start at slightly different times in the two apps); the capture stops infinite ones.
 */
async function finishAnimations(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document.getAnimations().every(animation => {
      const iterations = animation.effect?.getComputedTiming().iterations;
      return animation.playState !== 'running' || iterations === Infinity;
    })
  );
}

/**
 * Lets the animations finish, hides the sidebar's Save button (PL-002: the baseline shows the raw
 * key `ui.save`) and moves the pointer onto the sidebar title, where nothing reacts to hovering.
 */
async function prepareCapture(page: Page): Promise<void> {
  await finishAnimations(page);
  await page.getByRole('button', { name: /^(ui\.save|Save|保存)$/ }).evaluateAll(buttons => {
    for (const button of buttons) {
      if (button instanceof HTMLElement) button.style.visibility = 'hidden';
    }
  });
  await page.mouse.move(100, 30);
}

/** Waits until Chart.js, which both apps load on demand, has drawn the travel chart's axes. */
async function waitForChart(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement) || canvas.width === 0) return false;
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() !== blank.toDataURL();
  });
}

async function openDebug(page: Page): Promise<void> {
  await connectAndOpen(page, DEBUG_LINK, '/debug/');
  await page.getByRole('heading', { name: 'Debug Tools' }).waitFor();
  await waitForChart(page);
}

async function openKeySelector(page: Page): Promise<void> {
  await openDebug(page);
  await page.getByRole('button', { name: 'Select Key...' }).click();
  await page.getByText('Select Key to Track').waitFor();
}

async function openKeyTest(page: Page): Promise<void> {
  await openDebug(page);
  // A tab in the React app (a11y role), a plain button in the baseline.
  const name = 'Key Test';
  await page.getByRole('tab', { name }).or(page.getByRole('button', { name })).click();
  await page.getByText('About Key Test').waitFor();
}

async function openSettings(page: Page): Promise<void> {
  await connectAndOpen(page, SETTINGS_LINK, '/settings/');
  await page.getByRole('heading', { name: SETTINGS_LINK }).waitFor();
}

/** Clicks one of the three Settings cards (they are `role="button"` in both apps). */
async function clickSettingsCard(page: Page, name: RegExp): Promise<void> {
  await page.getByRole('button', { name }).click();
}

const BOOTLOADER_CARD = /^(Enter Bootloader|进入引导程序)/;
const FACTORY_RESET_CARD = /^(Factory Reset|恢复出厂设置)/;

/** Opens About and waits for its images (the Chinese donation card shows a QR code). */
async function openAbout(page: Page): Promise<void> {
  await connectAndOpen(page, ABOUT_LINK, '/about/');
  await page.getByRole('heading', { name: /About Zellia Control|关于 Zellia 控制/ }).waitFor();
  await page
    .locator('.glassmorphism-main img')
    .evaluateAll(images =>
      Promise.all(
        images.flatMap(image => (image instanceof HTMLImageElement ? [image.decode()] : []))
      )
    );
}

async function openUpdate(page: Page): Promise<void> {
  await connectAndOpen(page, UPDATE_LINK, '/update/');
  await page.getByRole('heading', { name: 'Zellia Firmware Updater' }).waitFor();
}

async function chooseFirmware(page: Page, file: typeof FIRMWARE = FIRMWARE): Promise<void> {
  await page.locator('#firmware-file-input').setInputFiles(file);
  // The React app asks the keyboard to reboot into its bootloader and moves on when it has left;
  // the baseline stays on its instructions. Both settle within this time.
  await page.waitForTimeout(1000);
}

/**
 * Presses the updater's next button. The baseline shows the DFU mode instructions (it never
 * reboots the keyboard itself), so the keyboard is first put into its bootloader by hand, as its
 * instructions say; the React app has rebooted it already and asks to connect the USB device.
 * With `enterBootloader: false` no bootloader is plugged in.
 */
async function continueUpdate(page: Page, { enterBootloader }: { enterBootloader: boolean }) {
  const dfuMode = page.getByRole('button', { name: 'Device is in DFU Mode' });
  const connectUsb = page.getByRole('button', { name: 'Connect USB Device' });
  await dfuMode.or(connectUsb).first().waitFor();
  if (await dfuMode.isVisible()) {
    if (enterBootloader) {
      await page.evaluate(() => {
        window.__virtualKeyboard?.enterBootloader();
      });
    }
    await dfuMode.click();
  } else {
    await connectUsb.click();
  }
}

/** The data stage of a USB control transfer. */
type TransferData = ArrayBuffer | ArrayBufferView;

/**
 * Makes the virtual bootloader misbehave (the same device object serves both apps): `hold` never
 * completes the second firmware block written (a data stage of 1 KiB or more), `holdDetach` the
 * DFU_DETACH request (only the baseline sends it, for its second connection), and both then set
 * `window.__parityHeld`; `failErase` stalls the DfuSe erase command (DNLOAD of `0x41` + address).
 */
async function tamperBootloader(
  page: Page,
  mode: 'hold' | 'holdDetach' | 'failErase'
): Promise<void> {
  await page.evaluate(mode => {
    const dfu: unknown = window.__virtualKeyboard?.dfu;
    if (typeof dfu !== 'object' || dfu === null) throw new Error('no virtual bootloader');
    const transferOut: unknown = Reflect.get(dfu, 'controlTransferOut');
    if (typeof transferOut !== 'function') throw new Error('the bootloader is not a USB device');
    let blocks = 0;
    const hold = () => {
      Reflect.set(window, '__parityHeld', true);
      return new Promise<never>(() => undefined);
    };
    const tampered = (setup: { readonly request: number }, data?: TransferData) => {
      const bytes =
        data === undefined
          ? new Uint8Array(0)
          : ArrayBuffer.isView(data)
            ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            : new Uint8Array(data);
      if (mode === 'hold' && bytes.byteLength >= 1024 && ++blocks === 2) return hold();
      if (mode === 'holdDetach' && setup.request === 0) return hold();
      if (mode === 'failErase' && setup.request === 1 && bytes.length === 5 && bytes[0] === 0x41) {
        return Promise.resolve({ status: 'stall', bytesWritten: 0 });
      }
      const result: unknown = Reflect.apply(transferOut, dfu, [setup, data]);
      return result;
    };
    Reflect.set(dfu, 'controlTransferOut', tampered);
  }, mode);
}

const scenarios: readonly ParityScenario[] = [
  // Debug -------------------------------------------------------------------------------------
  {
    name: 'system-debug',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openDebug(page);
      await prepareCapture(page);
    },
  },
  {
    name: 'system-debug-selector',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openKeySelector(page);
      await prepareCapture(page);
    },
  },
  {
    // PL-011: the React chart plots the live samples; the baseline's chart stays empty.
    name: 'system-debug-tracking',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openKeySelector(page);
      // The modal keyboard shows the layout's legends: 16 is Tab.
      await page.getByRole('dialog').locator('.keycap', { hasText: /^16$/ }).click();
      await page.getByText('Recording').waitFor();
      await page.waitForTimeout(1000);
      await prepareCapture(page);
    },
  },
  {
    name: 'system-debug-key-test',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openKeyTest(page);
      await prepareCapture(page);
    },
  },
  {
    name: 'system-debug-key-test-events',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openKeyTest(page);
      await page.getByRole('button', { name: 'Start Listening' }).click();
      // Both apps time the events with performance.now(): it is pinned per event, so the log
      // shows the same times and deltas in both.
      await page.evaluate(() => {
        const clock = { now: 1000 };
        Reflect.set(window, '__parityClock', clock);
        Object.defineProperty(performance, 'now', { configurable: true, value: () => clock.now });
      });
      const events: readonly (readonly ['down' | 'up', string, number])[] = [
        ['down', 'KeyA', 1000],
        ['up', 'KeyA', 1087],
        ['down', 'KeyS', 1240],
        ['down', 'ShiftLeft', 1301],
        ['up', 'KeyS', 1356],
        ['up', 'ShiftLeft', 1512],
      ];
      for (const [type, key, time] of events) {
        await page.evaluate(now => {
          const clock: unknown = Reflect.get(window, '__parityClock');
          if (typeof clock === 'object' && clock !== null) Reflect.set(clock, 'now', now);
        }, time);
        if (type === 'down') await page.keyboard.down(key);
        else await page.keyboard.up(key);
      }
      await page.evaluate(() => Reflect.deleteProperty(performance, 'now'));
      await page.getByText('ShiftLeft').first().waitFor();
      await prepareCapture(page);
    },
  },

  // Settings ----------------------------------------------------------------------------------
  {
    name: 'system-settings',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openSettings(page);
      await prepareCapture(page);
    },
  },
  {
    // PL-012: the React app asks for confirmation; the baseline sends the keyboard into its
    // bootloader at once (and, ignoring the disconnect, keeps showing the page).
    name: 'system-settings-bootloader',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openSettings(page);
      await clickSettingsCard(page, BOOTLOADER_CARD);
      await page.waitForTimeout(500);
      await prepareCapture(page);
    },
  },
  {
    // PL-012: the React app asks for confirmation; the baseline resets the keyboard at once.
    name: 'system-settings-factory-reset',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openSettings(page);
      await clickSettingsCard(page, FACTORY_RESET_CARD);
      await page.waitForTimeout(500);
      await prepareCapture(page);
    },
  },
  {
    // PL-026: a confirmed Enter Bootloader opens the Update page, the update session started;
    // the baseline (no confirmation) stays on Settings.
    name: 'system-settings-bootloader-confirmed',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openSettings(page);
      await clickSettingsCard(page, BOOTLOADER_CARD);
      const dialog = page.getByRole('dialog');
      const confirmation = await dialog.waitFor({ timeout: 2000 }).then(
        () => true,
        () => false
      );
      if (confirmation) {
        await dialog.getByRole('button', { name: BOOTLOADER_CARD }).click();
        await page.getByRole('heading', { name: 'Zellia Firmware Updater' }).waitFor();
      }
      await page.waitForTimeout(1000);
      await prepareCapture(page);
    },
  },

  // About -------------------------------------------------------------------------------------
  {
    name: 'system-about',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openAbout(page);
      await prepareCapture(page);
    },
  },
  {
    // PL-027: the donation card at the end of the page, without the English "Support
    // Development" button (the Chinese page shows the payment codes instead, in both apps).
    name: 'system-about-donation',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openAbout(page);
      await page.locator('.glassmorphism-main').evaluate(main => {
        main.scrollTop = main.scrollHeight;
      });
      // Chrome draws images at a lower quality right after a scroll, then redraws them.
      await page.waitForTimeout(500);
      await prepareCapture(page);
    },
  },

  // Update ------------------------------------------------------------------------------------
  {
    name: 'system-update',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openUpdate(page);
      await prepareCapture(page);
    },
  },
  {
    // PL-025: the updater without a keyboard; the baseline shows "No Keyboard Connected".
    name: 'system-update-no-keyboard',
    path: '/update/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await page
        .getByRole('heading', { name: 'Zellia Firmware Updater' })
        .or(page.getByText('No Keyboard Connected'))
        .waitFor();
      await prepareCapture(page);
    },
  },
  {
    // I-1: a file that is not a .bin.
    name: 'system-update-wrong-file',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openUpdate(page);
      await chooseFirmware(page, { ...FIRMWARE, name: 'firmware.txt' });
      await prepareCapture(page);
    },
  },
  {
    // I-1: a .bin below 1 KiB.
    name: 'system-update-small-file',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openUpdate(page);
      await chooseFirmware(page, { ...FIRMWARE, buffer: Buffer.alloc(512, 0x5a) });
      await prepareCapture(page);
    },
  },
  {
    // I-2: the React app reboots the keyboard into its bootloader and waits for the USB device;
    // the baseline shows how to enter DFU mode by hand.
    name: 'system-update-file-chosen',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openUpdate(page);
      await chooseFirmware(page);
      await prepareCapture(page);
    },
  },
  {
    // No bootloader to connect: the keyboard is unplugged before the file is chosen, so no app
    // can reboot it into its bootloader, and the USB device lookup finds nothing.
    name: 'system-update-no-device',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openUpdate(page);
      await page.evaluate(() => {
        window.__virtualKeyboard?.disconnect();
      });
      await chooseFirmware(page);
      await continueUpdate(page, { enterBootloader: false });
      await page.getByText('Something went wrong').waitFor({ timeout: 10_000 });
      await prepareCapture(page);
    },
  },
  {
    // I-3: the second of the image's two blocks is held. The React app shows the written share
    // (50 %); the baseline its simulated sequence's numbers (60 %, then 70–95 %: 83 % here).
    name: 'system-update-flashing',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openUpdate(page);
      await tamperBootloader(page, 'hold');
      await chooseFirmware(page);
      await continueUpdate(page, { enterBootloader: true });
      await page.waitForFunction(() => Reflect.get(window, '__parityHeld') === true, undefined, {
        timeout: 30_000,
      });
      await page.getByRole('heading', { name: 'Flashing Firmware' }).waitFor();
      await prepareCapture(page);
    },
  },
  {
    // I-4: erasing fails. The React app shows the error on Update Program (the erase); the
    // baseline never erased (its Update Program step was a pause) and finishes.
    name: 'system-update-erase-failed',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openUpdate(page);
      await tamperBootloader(page, 'failErase');
      await chooseFirmware(page);
      await continueUpdate(page, { enterBootloader: true });
      await page
        .getByText('Something went wrong')
        .or(page.getByText('Flashing Complete!'))
        .waitFor({ timeout: 30_000 });
      await prepareCapture(page);
    },
  },
  {
    // I-5: the baseline's second connection (held here): it detached the bootloader and asked
    // for it again ("Reconnect for firmware flashing"). WebDFU writes over the first connection,
    // so the React app never stops at Connect Flash and goes on to the end.
    name: 'system-update-reconnect',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openUpdate(page);
      await tamperBootloader(page, 'holdDetach');
      await chooseFirmware(page);
      await continueUpdate(page, { enterBootloader: true });
      await page
        .getByText('Reconnect for firmware flashing')
        .or(page.getByText('Flashing Complete!'))
        .waitFor({ timeout: 30_000 });
      await prepareCapture(page);
    },
  },
  {
    name: 'system-update-done',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openUpdate(page);
      await chooseFirmware(page);
      await continueUpdate(page, { enterBootloader: true });
      await page.getByText('Flashing Complete!').waitFor({ timeout: 30_000 });
      await prepareCapture(page);
    },
  },
];

export default scenarios;
