/** Firmware file checks of the updater (messages unchanged from the Svelte flasher). */

export const MIN_FIRMWARE_BYTES = 1024;
export const MAX_FIRMWARE_BYTES = 1024 * 1024;

export const FIRMWARE_FILE_ERRORS = {
  notBin: 'Please select a .bin firmware file',
  tooLarge: 'Firmware file too large (max 1MB)',
  tooSmall: 'Firmware file too small (min 1KB)',
  unreadable: 'Failed to read firmware file',
} as const;

export type FirmwareImageResult =
  | { readonly ok: true; readonly image: Uint8Array }
  | { readonly ok: false; readonly message: string };

export function isFirmwareFileName(name: string): boolean {
  return name.endsWith('.bin');
}

/** Reads the image; 1 KiB to 1 MiB are accepted. */
export async function readFirmwareImage(file: Blob): Promise<FirmwareImageResult> {
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (error) {
    console.error('File read error:', error);
    return { ok: false, message: FIRMWARE_FILE_ERRORS.unreadable };
  }
  if (buffer.byteLength > MAX_FIRMWARE_BYTES) {
    return { ok: false, message: FIRMWARE_FILE_ERRORS.tooLarge };
  }
  if (buffer.byteLength < MIN_FIRMWARE_BYTES) {
    return { ok: false, message: FIRMWARE_FILE_ERRORS.tooSmall };
  }
  return { ok: true, image: new Uint8Array(buffer) };
}
