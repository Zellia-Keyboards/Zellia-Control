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

function sizeError(bytes: number): string | null {
  if (bytes > MAX_FIRMWARE_BYTES) return FIRMWARE_FILE_ERRORS.tooLarge;
  if (bytes < MIN_FIRMWARE_BYTES) return FIRMWARE_FILE_ERRORS.tooSmall;
  return null;
}

/**
 * Reads the image; 1 KiB to 1 MiB are accepted. A file of the wrong size is refused before it is
 * read; what was read is checked again, as the file may have changed since it was chosen.
 */
export async function readFirmwareImage(file: Blob): Promise<FirmwareImageResult> {
  const declared = sizeError(file.size);
  if (declared) return { ok: false, message: declared };
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (error) {
    console.error('File read error:', error);
    return { ok: false, message: FIRMWARE_FILE_ERRORS.unreadable };
  }
  const read = sizeError(buffer.byteLength);
  if (read) return { ok: false, message: read };
  return { ok: true, image: new Uint8Array(buffer) };
}
