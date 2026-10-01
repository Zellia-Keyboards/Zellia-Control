import type { JSHandle, Page } from '@playwright/test';
import { expect, test, type VirtualKeyboard, type VirtualKeyboardHandle } from './fixtures';

type Keyboard = JSHandle<VirtualKeyboardHandle>;

/** libamp's key events on the wire and the keycodes of the journeys. */
const PRESS = 3;
const RELEASE = 1;
const LEFT_SHIFT = 0x0200;
const B = 0x05;
const MOUSE_LEFT = 0x00a5;

// The Trinity Pad's controller declares 4 macro slots and AOT scripts.
test.use({ virtualKeyboardOptions: { model: 'trinity-pad', seedDynamicKeys: false } });

/** Opens the app with the injected keyboard, clicks "Get Started" and waits for its keymap. */
async function connect(page: Page, virtualKeyboard: VirtualKeyboard): Promise<Keyboard> {
  await page.goto('/');
  const keyboard = await virtualKeyboard.handle();
  await page.getByRole('button', { name: 'Get Started' }).click();
  await page.waitForURL('**/remap/');
  await expect(page.locator('.keycap[data-key-id="0"]')).toHaveText('Z');
  return keyboard;
}

async function openSidebarPage(page: Page, name: string, path: string): Promise<void> {
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
}

async function save(page: Page): Promise<void> {
  await page.locator('.sidebar').getByRole('button', { name: 'Save' }).click();
}

test.describe('macros', () => {
  test('records keys and a click, edits the macro and saves it to the keyboard', async ({
    page,
    virtualKeyboard,
  }) => {
    const keyboard = await connect(page, virtualKeyboard);
    await openSidebarPage(page, 'Macros', '/macros/');
    await expect(page.getByText('0 / 127 actions')).toBeVisible();

    await page.getByRole('button', { name: 'Record' }).click();
    await page.keyboard.down('Shift');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Shift');
    // A left click on the page is recorded as Mouse Left; the click on Stop is not.
    await page.getByRole('heading', { name: 'Macros' }).click();
    await page.getByRole('button', { name: 'Stop' }).click();

    const rows = page.getByRole('table', { name: 'Macro 1' }).getByRole('row');
    // The header and Shift down, A down, A up, Shift up, Mouse Left down and up.
    await expect(rows).toHaveCount(7);
    for (const row of [2, 3]) {
      await rows.nth(row).getByRole('button', { name: 'A', exact: true }).click();
      await page
        .getByRole('dialog', { name: 'Choose a key' })
        .getByRole('button', { name: 'B', exact: true })
        .click();
    }
    await expect(page.getByLabel('Event of action 2')).toHaveValue('down');
    await save(page);

    await expect
      .poll(() =>
        keyboard.evaluate(vk =>
          vk.state.macros[0]
            ?.slice(0, 7)
            .map(entry => [entry.event, entry.keycode, entry.isVirtual] as const)
        )
      )
      .toEqual([
        [PRESS, LEFT_SHIFT, true],
        [PRESS, B, true],
        [RELEASE, B, true],
        [RELEASE, LEFT_SHIFT, true],
        [PRESS, MOUSE_LEFT, true],
        [RELEASE, MOUSE_LEFT, true],
        // The end marker the firmware stops at.
        [0, 0, false],
      ]);
    const delays = await keyboard.evaluate(
      vk => vk.state.macros[0]?.slice(0, 7).map(entry => entry.delay) ?? []
    );
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(delays[6]).toBe(delays[5]);
  });
});

test.describe('scripts', () => {
  test('shows a compile error, compiles the fix and saves the source with its bytecode', async ({
    page,
    virtualKeyboard,
  }) => {
    const keyboard = await connect(page, virtualKeyboard);
    await openSidebarPage(page, 'Scripts', '/scripts/');
    const editor = page.getByRole('textbox', { name: 'Script' });

    await editor.fill('function loop() {\n  var x = ;\n}\n');
    await expect(page.getByText('Errors: fix them to send this script')).toBeVisible();
    await expect(page.getByText('Line 2: unexpected character in expression')).toBeVisible();

    await editor.fill('function loop() {\n  var x = 1;\n}\n');
    const status = page.getByRole('status');
    await expect(status).toHaveText(/^Compiled: \d+ bytes — sent to the keyboard on Save$/);
    const bytes = Number(/(\d+) bytes/.exec((await status.textContent()) ?? '')?.[1]);
    await save(page);

    await expect
      .poll(() =>
        keyboard.evaluate(vk =>
          new TextDecoder()
            .decode(vk.state.scripts.source)
            .replace(/\0$/, '')
            .replace(/\s+/g, ' ')
            .trim()
        )
      )
      .toBe('function loop() { var x = 1; }');
    const bytecode = await keyboard.evaluate(vk => Array.from(vk.state.scripts.bytecode));
    expect(bytecode).toHaveLength(bytes);
    expect(bytecode.slice(0, 2)).toEqual([0xfb, 0xac]);
  });
});
