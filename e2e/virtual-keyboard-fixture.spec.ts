import { expect, test } from './fixtures';

// The real entry is src/testing/virtual-keyboard/browser.ts; the stand-in keeps this test about
// the fixture itself.
test.use({ virtualKeyboardEntry: 'e2e/support/virtual-keyboard-stand-in.ts' });

test.describe('virtualKeyboard fixture', () => {
  test('installs the bundle on navigator.hid before the app starts', async ({
    page,
    virtualKeyboard,
  }) => {
    await page.goto('/');
    const keyboard = await virtualKeyboard.handle();

    expect(await keyboard.evaluate(handle => handle.state)).toEqual({
      installedBeforeDocument: true,
      disconnected: false,
    });
    expect(
      await keyboard.evaluate(handle => {
        const hid: unknown = Reflect.get(navigator, 'hid');
        return hid === handle.hid;
      })
    ).toBe(true);
  });

  test('exposes the handle for driving the keyboard', async ({ page, virtualKeyboard }) => {
    await page.goto('/');
    const keyboard = await virtualKeyboard.handle();

    await keyboard.evaluate(handle => {
      handle.disconnect();
    });

    expect(await keyboard.evaluate(handle => handle.state)).toMatchObject({ disconnected: true });
  });

  test('reinstalls on every navigation', async ({ page, virtualKeyboard }) => {
    await page.goto('/');
    const first = await virtualKeyboard.handle();
    await first.evaluate(handle => {
      handle.disconnect();
    });

    await page.goto('/remap/');
    const second = await virtualKeyboard.handle();

    expect(await second.evaluate(handle => handle.state)).toMatchObject({ disconnected: false });
  });
});
