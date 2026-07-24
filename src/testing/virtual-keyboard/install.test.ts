import { Zellia80Controller, ZelliaStarlightController } from 'emi-keyboard-controller';
import { afterEach, describe, expect, it } from 'vitest';
import { installVirtualHid, type InstalledVirtualKeyboard } from './install';

const installed: InstalledVirtualKeyboard[] = [];

afterEach(() => {
  for (const keyboard of installed.splice(0).reverse()) keyboard.uninstall();
});

describe('installVirtualHid', () => {
  it('installs navigator.hid and navigator.usb for the vendored controllers', async () => {
    const keyboard = installVirtualHid(navigator);
    installed.push(keyboard);
    expect(navigator.hid).toBe(keyboard.hid);
    expect(navigator.usb).toBe(keyboard.usb);

    await expect(new ZelliaStarlightController().detect(false)).resolves.toEqual([keyboard.device]);
    await expect(new ZelliaStarlightController().detect(true)).resolves.toEqual([keyboard.device]);
    await expect(new Zellia80Controller().detect(true)).resolves.toEqual([]);
  });

  it('passes options to the keyboard', () => {
    const keyboard = installVirtualHid(navigator, { model: 'zellia-80', authorized: true });
    installed.push(keyboard);
    expect(keyboard.device.productName).toBe('Zellia 80 HE');
    expect(keyboard.state.model.id).toBe('zellia-80');
  });

  it('restores the previous navigator properties and disposes the keyboard', async () => {
    const target = { hid: 'original' };
    const keyboard = installVirtualHid(target);
    expect(target.hid).toBe(keyboard.hid);
    expect('usb' in target).toBe(true);

    keyboard.uninstall();
    expect(target.hid).toBe('original');
    expect('usb' in target).toBe(false);

    await keyboard.device.open();
    await keyboard.device.sendReport(0, new Uint8Array(64));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(keyboard.inputReports).toHaveLength(0);
  });
});
