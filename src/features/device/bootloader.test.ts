import { describe, expect, it, onTestFinished } from 'vitest';
import { VirtualDfuDevice, VirtualUsb } from '../../testing/virtual-keyboard';
import { bootloaderFilters, detectBootloaderOf } from './bootloader';

const AT32 = { vendorId: 0x2e3c, productId: 0xdf11 };
const STM32 = { vendorId: 0x0483, productId: 0xdf11 };

function installUsb(): VirtualUsb {
  const usb = new VirtualUsb();
  Object.defineProperty(navigator, 'usb', { configurable: true, value: usb });
  onTestFinished(() => {
    Reflect.deleteProperty(navigator, 'usb');
  });
  return usb;
}

describe('bootloaderFilters', () => {
  it('keeps each distinct filter once, in order, and skips models without a bootloader', () => {
    expect(
      bootloaderFilters([
        { bootloaderFilter: AT32 },
        { bootloaderFilter: null },
        { bootloaderFilter: { ...AT32 } },
        { bootloaderFilter: STM32 },
      ])
    ).toEqual([AT32, STM32]);
  });
});

describe('detectBootloaderOf', () => {
  it('silently returns the authorized DFU devices of any filter, each once', async () => {
    const usb = installUsb();
    const at32 = new VirtualDfuDevice({ ...AT32, productName: 'AT32' });
    const stm32 = new VirtualDfuDevice({ ...STM32, productName: 'STM32' });
    const unauthorized = new VirtualDfuDevice({ ...AT32, productName: 'AT32 (new)' });
    usb.attach(at32, { authorized: true });
    usb.attach(stm32, { authorized: true });
    for (const device of [at32, stm32, unauthorized]) usb.plugIn(device);

    await expect(detectBootloaderOf([AT32, STM32, AT32], true)).resolves.toEqual([at32, stm32]);
  });

  it("opens one chooser for every filter and returns the user's pick", async () => {
    const usb = installUsb();
    const stm32 = new VirtualDfuDevice({ ...STM32, productName: 'STM32' });
    usb.plugIn(stm32);

    await expect(detectBootloaderOf([AT32, STM32], false)).resolves.toEqual([stm32]);
    // Picking a device authorizes it.
    await expect(detectBootloaderOf([STM32], true)).resolves.toEqual([stm32]);
  });

  it('returns nothing when the chooser is dismissed, without filters or without WebUSB', async () => {
    const usb = installUsb();
    usb.plugIn(new VirtualDfuDevice({ ...AT32, productName: 'AT32' }));
    usb.picker = 'cancel';
    await expect(detectBootloaderOf([AT32], false)).resolves.toEqual([]);
    await expect(detectBootloaderOf([], false)).resolves.toEqual([]);

    Reflect.deleteProperty(navigator, 'usb');
    await expect(detectBootloaderOf([AT32], false)).resolves.toEqual([]);
    await expect(detectBootloaderOf([AT32], true)).resolves.toEqual([]);
  });
});
