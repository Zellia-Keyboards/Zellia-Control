import { describe, expect, it, vi } from 'vitest';
import {
  FIRMWARE_FILE_ERRORS,
  MAX_FIRMWARE_BYTES,
  MIN_FIRMWARE_BYTES,
  isFirmwareFileName,
  readFirmwareImage,
} from './firmware-file';

function file(size: number, name = 'firmware.bin'): File {
  return new File([new Uint8Array(size).map((_, index) => index & 0xff)], name);
}

describe('isFirmwareFileName', () => {
  it('accepts only .bin files', () => {
    expect(isFirmwareFileName('zellia.bin')).toBe(true);
    expect(isFirmwareFileName('zellia.hex')).toBe(false);
    expect(isFirmwareFileName('zellia.BIN')).toBe(false);
    expect(isFirmwareFileName('bin')).toBe(false);
  });
});

describe('readFirmwareImage', () => {
  it('reads images from 1 KiB to 1 MiB', async () => {
    for (const size of [MIN_FIRMWARE_BYTES, 5000, MAX_FIRMWARE_BYTES]) {
      const result = await readFirmwareImage(file(size));
      expect(result.ok && result.image.byteLength).toBe(size);
    }
    const result = await readFirmwareImage(file(1500));
    expect(result.ok && Array.from(result.image.subarray(254, 258))).toEqual([254, 255, 0, 1]);
  });

  it('rejects smaller and larger files with the Svelte messages', async () => {
    await expect(readFirmwareImage(file(MIN_FIRMWARE_BYTES - 1))).resolves.toEqual({
      ok: false,
      message: 'Firmware file too small (min 1KB)',
    });
    await expect(readFirmwareImage(file(MAX_FIRMWARE_BYTES + 1))).resolves.toEqual({
      ok: false,
      message: 'Firmware file too large (max 1MB)',
    });
  });

  it('refuses a file of the wrong size without reading it', async () => {
    const huge = file(MAX_FIRMWARE_BYTES + 1);
    const read = vi.spyOn(huge, 'arrayBuffer');

    await expect(readFirmwareImage(huge)).resolves.toMatchObject({ ok: false });
    expect(read).not.toHaveBeenCalled();
  });

  it('checks the size of what was actually read', async () => {
    const changed = file(2048);
    Object.defineProperty(changed, 'arrayBuffer', {
      value: () => Promise.resolve(new ArrayBuffer(MAX_FIRMWARE_BYTES + 1)),
    });
    await expect(readFirmwareImage(changed)).resolves.toEqual({
      ok: false,
      message: FIRMWARE_FILE_ERRORS.tooLarge,
    });
  });

  it('reports files that cannot be read', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const unreadable = file(2048);
    Object.defineProperty(unreadable, 'arrayBuffer', {
      value: () => Promise.reject(new DOMException('gone', 'NotReadableError')),
    });
    await expect(readFirmwareImage(unreadable)).resolves.toEqual({
      ok: false,
      message: FIRMWARE_FILE_ERRORS.unreadable,
    });
    expect(logged).toHaveBeenCalledOnce();
  });
});
