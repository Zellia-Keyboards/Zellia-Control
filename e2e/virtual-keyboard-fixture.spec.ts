import { expect, test } from './fixtures';

test.describe('virtualKeyboard fixture', () => {
  test('installs the keyboard on navigator.hid before the app starts', async ({
    page,
    virtualKeyboard,
  }) => {
    // Init scripts run in order: this one runs after the fixture's, still before the document.
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'hid-before-document',
        String(Reflect.has(navigator, 'hid') && document.getElementById('root') === null)
      );
    });
    await page.goto('/');
    const keyboard = await virtualKeyboard.handle();

    expect(await page.evaluate(() => sessionStorage.getItem('hid-before-document'))).toBe('true');
    expect(await keyboard.evaluate(handle => Reflect.get(navigator, 'hid') === handle.hid)).toBe(
      true
    );
    expect(
      await keyboard.evaluate(({ connected, state }) => ({ connected, model: state.model.id }))
    ).toEqual({ connected: true, model: 'zellia-starlight' });
  });

  test('exposes the handle for driving the keyboard', async ({ page, virtualKeyboard }) => {
    await page.goto('/');
    const keyboard = await virtualKeyboard.handle();

    await keyboard.evaluate(handle => {
      handle.disconnect();
    });

    expect(await keyboard.evaluate(handle => handle.connected)).toBe(false);
  });

  test('reinstalls on every navigation', async ({ page, virtualKeyboard }) => {
    await page.goto('/');
    const first = await virtualKeyboard.handle();
    await first.evaluate(handle => {
      handle.disconnect();
    });

    await page.goto('/remap/');
    const second = await virtualKeyboard.handle();

    expect(await second.evaluate(handle => handle.connected)).toBe(true);
  });

  test.describe('with options', () => {
    test.use({
      virtualKeyboardOptions: { model: 'zellia-80', seedDynamicKeys: false, picker: 'cancel' },
    });

    test('passes virtualKeyboardOptions to the keyboard', async ({ page, virtualKeyboard }) => {
      await page.goto('/');
      const keyboard = await virtualKeyboard.handle();

      expect(
        await keyboard.evaluate(({ hid, state }) => ({
          model: state.model.id,
          dynamicKeys: state.active.dynamicKeys.filter(key => key.type !== 'none').length,
          picker: hid.picker,
        }))
      ).toEqual({ model: 'zellia-80', dynamicKeys: 0, picker: 'cancel' });
    });
  });
});
