/**
 * Bootloader lookup when no keyboard model is known (spec §1.7): the Update page also works
 * without a keyboard, e.g. to flash a keyboard that is already waiting in its bootloader after a
 * reload. The model's own lookup (`controller.detect_bootloader`) is used whenever a model is
 * known.
 */
import {
  detectUSBDevice,
  findDfuInterfaces,
  type DfuUsbFilter,
  type USBDevice,
  type USBDeviceFilter,
} from 'emi-keyboard-controller';

/** The distinct bootloader filters of `models`, in registry order. */
export function bootloaderFilters(
  models: readonly { readonly bootloaderFilter: DfuUsbFilter | null }[]
): DfuUsbFilter[] {
  const filters = new Map<string, DfuUsbFilter>();
  for (const { bootloaderFilter: filter } of models) {
    if (filter) filters.set(`${filter.vendorId}:${filter.productId}`, filter);
  }
  return [...filters.values()];
}

function toUsbFilter({ vendorId, productId, serialNumber }: DfuUsbFilter): USBDeviceFilter {
  return {
    ...(vendorId === undefined ? {} : { vendorId }),
    ...(productId === undefined ? {} : { productId }),
    ...(serialNumber === undefined ? {} : { serialNumber }),
  };
}

function isChooserDismissal(error: unknown): boolean {
  return (
    error instanceof DOMException && (error.name === 'AbortError' || error.name === 'NotFoundError')
  );
}

/**
 * Silent: every already authorized DFU device matching one of `filters`. Otherwise one browser
 * chooser listing the devices of all filters (needs a user gesture); `[]` when it is dismissed.
 */
export async function detectBootloaderOf(
  filters: readonly DfuUsbFilter[],
  silent: boolean
): Promise<USBDevice[]> {
  if (silent) {
    const found = await Promise.all(filters.map(filter => detectUSBDevice(filter, true)));
    return [...new Set(found.flat())];
  }
  const usb = typeof navigator === 'undefined' ? undefined : navigator.usb;
  if (!usb || filters.length === 0) return [];
  try {
    const device = await usb.requestDevice({ filters: filters.map(toUsbFilter) });
    return findDfuInterfaces(device).length > 0 ? [device] : [];
  } catch (error) {
    if (isChooserDismissal(error)) return [];
    throw error;
  }
}
