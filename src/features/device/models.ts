/**
 * Supported keyboard models (D1) and matching of a picked HID device to one of them.
 *
 * Matching reuses each controller's own `detect(true)` rules (VID/PID/usage page and product-name
 * filters) by checking whether the picked device is among the devices that controller accepts.
 * Upstream's Zellia Starlight rule only accepts `ZelliaKB`, so devices that report
 * `Zellia Starlight` are matched explicitly (see src-controller/UPSTREAM.md).
 */
import {
  OholeoKeyboardController,
  TrinityPadController,
  Zellia60Controller,
  Zellia80Controller,
  ZelliaStarlightController,
} from 'emi-keyboard-controller';
import { withUpstreamFixes, type DeviceController } from './controller';
import type { ModelId } from './model/types';

export interface HidFilter {
  readonly vendorId: number;
  readonly productId: number;
  readonly usagePage: number;
}

export interface ModelDefinition {
  readonly id: ModelId;
  /** Shown when the device reports no product name. */
  readonly displayName: string;
  /** The HID filter the model's controller uses in `detect()`. */
  readonly filter: HidFilter;
  /** Product names matched in addition to the controller's own rules. */
  readonly productNameFallbacks: readonly string[];
  readonly create: () => DeviceController;
}

const ZELLIA_FILTER: HidFilter = { vendorId: 0xfeed, productId: 22319, usagePage: 0xff60 };
const TRINITY_FILTER: HidFilter = { vendorId: 0xfeed, productId: 0xffff, usagePage: 0xff60 };

export const MODELS = [
  {
    id: 'zellia-starlight',
    displayName: 'Zellia Starlight',
    filter: ZELLIA_FILTER,
    productNameFallbacks: ['Zellia Starlight'],
    create: () => withUpstreamFixes(new ZelliaStarlightController()),
  },
  {
    id: 'zellia-60',
    displayName: 'Zellia 60HE',
    filter: ZELLIA_FILTER,
    productNameFallbacks: [],
    create: () => withUpstreamFixes(new Zellia60Controller()),
  },
  {
    id: 'zellia-80',
    displayName: 'Zellia 80HE',
    filter: ZELLIA_FILTER,
    productNameFallbacks: [],
    create: () => withUpstreamFixes(new Zellia80Controller()),
  },
  {
    id: 'oholeo',
    displayName: 'Oholeo Keyboard',
    filter: ZELLIA_FILTER,
    productNameFallbacks: [],
    create: () => withUpstreamFixes(new OholeoKeyboardController()),
  },
  {
    id: 'trinity-pad',
    displayName: 'Trinity Pad',
    filter: TRINITY_FILTER,
    productNameFallbacks: [],
    create: () => withUpstreamFixes(new TrinityPadController()),
  },
] as const satisfies readonly ModelDefinition[];

function filterKey(filter: HidFilter): string {
  return `${filter.vendorId}:${filter.productId}:${filter.usagePage}`;
}

/** One browser picker for every model: the deduplicated union of the model filters. */
export const HID_REQUEST_FILTERS: readonly HidFilter[] = [
  ...new Map(MODELS.map(model => [filterKey(model.filter), model.filter])).values(),
];

function matchesFilter(device: HIDDevice, filter: HidFilter): boolean {
  return (
    device.vendorId === filter.vendorId &&
    device.productId === filter.productId &&
    device.collections.some(collection => collection.usagePage === filter.usagePage)
  );
}

function usagePages(device: HIDDevice): string {
  return device.collections.map(collection => collection.usagePage ?? -1).join(',');
}

/**
 * The same physical interface. WebHID returns the same object from `requestDevice` and
 * `getDevices`; the structural comparison only guards against implementations that do not.
 */
function sameDevice(a: HIDDevice, b: HIDDevice): boolean {
  return (
    a === b ||
    (a.vendorId === b.vendorId &&
      a.productId === b.productId &&
      a.productName === b.productName &&
      usagePages(a) === usagePages(b))
  );
}

async function acceptedBy(model: ModelDefinition, device: HIDDevice): Promise<boolean> {
  try {
    const accepted = await model.create().detect(true);
    return accepted.some(candidate => sameDevice(candidate, device));
  } catch (error) {
    console.warn(`[device] ${model.id} detection failed`, error);
    return false;
  }
}

/** The model whose controller accepts `device` (it must already be granted), or null. */
export async function matchModel(
  device: HIDDevice,
  models: readonly ModelDefinition[] = MODELS
): Promise<ModelDefinition | null> {
  for (const model of models) {
    if (await acceptedBy(model, device)) return model;
  }
  const productName = device.productName;
  return (
    models.find(
      model =>
        matchesFilter(device, model.filter) &&
        model.productNameFallbacks.some(name => productName.includes(name))
    ) ?? null
  );
}
