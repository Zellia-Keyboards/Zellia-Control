import { afterEach, describe, expect, it } from 'vitest';
import {
  VirtualHidDevice,
  createVirtualKeyboard,
  installVirtualHid,
  type InstalledVirtualKeyboard,
  type VirtualKeyboard,
  type VirtualKeyboardOptions,
} from '../../testing/virtual-keyboard';
import { HID_REQUEST_FILTERS, MODELS, matchModel } from './models';

const keyboards: VirtualKeyboard[] = [];
let installed: InstalledVirtualKeyboard | null = null;

function install(options: VirtualKeyboardOptions = {}): InstalledVirtualKeyboard {
  installed = installVirtualHid(navigator, { authorized: true, ...options });
  return installed;
}

afterEach(() => {
  for (const keyboard of keyboards.splice(0)) keyboard.dispose();
  installed?.uninstall();
  installed = null;
});

describe('model registry', () => {
  it('lists the supported models (D1)', () => {
    expect(MODELS.map(model => [model.id, model.displayName])).toEqual([
      ['zellia-starlight', 'Zellia Starlight'],
      ['zellia-60', 'Zellia 60HE'],
      ['zellia-80', 'Zellia 80HE'],
      ['oholeo', 'Oholeo Keyboard'],
      ['trinity-pad', 'Trinity Pad'],
    ]);
  });

  it('creates a fresh controller per call', () => {
    for (const model of MODELS) expect(model.create()).not.toBe(model.create());
  });

  it('requests the deduplicated union of the model filters, as today', () => {
    expect(HID_REQUEST_FILTERS).toEqual([
      { vendorId: 0xfeed, productId: 22319, usagePage: 0xff60 },
      { vendorId: 0xfeed, productId: 0xffff, usagePage: 0xff60 },
    ]);
  });

  it.each([
    ['zellia-starlight', 'zellia-starlight'],
    ['zellia-60', 'zellia-60'],
    ['zellia-80', 'zellia-80'],
    ['oholeo', 'oholeo'],
    ['trinity-pad', 'trinity-pad'],
  ] as const)('keeps the %s filter in sync with its controller', async (virtualModel, id) => {
    const vk = install({ model: virtualModel, authorized: false });
    const model = MODELS.find(entry => entry.id === id);
    await expect(model?.create().detect(false)).resolves.toEqual([vk.device]);
    const request = await vk.hid.requestDevice({
      filters: HID_REQUEST_FILTERS.map(filter => ({ ...filter })),
    });
    expect(request).toEqual([vk.device]);
  });
});

describe('matchModel', () => {
  it.each([
    ['ZelliaKB', 'zellia-starlight'],
    ['ZelliaKB Starlight', 'zellia-starlight'],
    ['Zellia Starlight', 'zellia-starlight'],
    ['Zellia 60 HE', 'zellia-60'],
    ['Zellia 80 HE', 'zellia-80'],
    ['Oholeo Keyboard', 'oholeo'],
  ])('matches a 0xFEED:22319 device named "%s" to %s', async (productName, id) => {
    const vk = install({ productName });
    await expect(matchModel(vk.device)).resolves.toMatchObject({ id });
  });

  it('matches a Trinity Pad by its product id', async () => {
    const vk = install({ model: 'trinity-pad' });
    await expect(matchModel(vk.device)).resolves.toMatchObject({ id: 'trinity-pad' });
  });

  it('does not guess for unknown product names', async () => {
    const vk = install({ productName: 'Some Other Keyboard' });
    await expect(matchModel(vk.device)).resolves.toBeNull();
  });

  it('only applies the Zellia Starlight name fallback to the raw-HID interface', async () => {
    const vk = install();
    const keyboardInterface = new VirtualHidDevice({
      vendorId: 0xfeed,
      productId: 22319,
      productName: 'Zellia Starlight',
      usagePage: 0x01,
      usage: 0x06,
    });
    vk.hid.attach(keyboardInterface, { authorized: true });
    await expect(matchModel(keyboardInterface)).resolves.toBeNull();
  });

  it('tells plugged-in models apart', async () => {
    const starlight = install();
    const zellia80 = createVirtualKeyboard({
      hid: starlight.hid,
      model: 'zellia-80',
      authorized: true,
    });
    keyboards.push(zellia80);
    await expect(matchModel(zellia80.device)).resolves.toMatchObject({ id: 'zellia-80' });
    await expect(matchModel(starlight.device)).resolves.toMatchObject({ id: 'zellia-starlight' });
  });

  it('only considers the given registry', async () => {
    const vk = install();
    const onlyZellia80 = MODELS.filter(model => model.id === 'zellia-80');
    await expect(matchModel(vk.device, onlyZellia80)).resolves.toBeNull();
  });

  it('returns null without WebHID', async () => {
    const vk = install();
    installed?.uninstall();
    installed = null;
    await expect(matchModel(vk.device)).resolves.toBeNull();
  });
});
