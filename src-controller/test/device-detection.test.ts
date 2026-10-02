import { afterEach, describe, expect, it, vi } from 'vitest';
import { Zellia60Controller } from '../src/controllers/zellia_60_controller/controller';
import { Zellia80Controller } from '../src/controllers/zellia_80_controller/controller';
import { ZelliaStarlightController } from '../src/controllers/zellia_starlight_controller/controller';

afterEach(() => vi.unstubAllGlobals());

describe('Zellia model detection', () => {
  it.each([true, false])('assigns each model exclusively (silent=%s)', async silent => {
    const devices = ['Zellia 60 HE', 'Zellia 80 HE', 'ZelliaKB', 'Zellia Starlight'].map(productName => ({
      productName, vendorId: 0xFEED, productId: 22319, collections: [{ usagePage: 0xFF60 }],
    }));
    const hid = { getDevices: vi.fn(async () => devices), requestDevice: vi.fn(async () => devices) };
    vi.stubGlobal('navigator', { hid });
    expect(await new Zellia60Controller().detect(silent)).toEqual([devices[0]]);
    expect(await new Zellia80Controller().detect(silent)).toEqual([devices[1]]);
    expect(await new ZelliaStarlightController().detect(silent)).toEqual(devices.slice(2));
    expect(silent ? hid.requestDevice : hid.getDevices).not.toHaveBeenCalled();
  });

  it('handles canceled authorization and ignores unrelated HID interfaces', async () => {
    const hid = {
      requestDevice: vi.fn(async () => []),
      getDevices: vi.fn(async () => [
        { productName: 'ZelliaKB', vendorId: 1, productId: 22319, collections: [{ usagePage: 0xFF60 }] },
        { productName: 'ZelliaKB', vendorId: 0xFEED, productId: 22319, collections: [{ usagePage: 1 }] },
      ]),
    };
    vi.stubGlobal('navigator', { hid });
    expect(await new ZelliaStarlightController().detect()).toEqual([]);
    expect(await new ZelliaStarlightController().detect(true)).toEqual([]);
  });
});
