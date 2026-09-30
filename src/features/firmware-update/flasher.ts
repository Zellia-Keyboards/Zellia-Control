/**
 * The firmware update session behind the 7-step updater (spec §8 Update, D3), driven by the
 * upstream WebDFU implementation:
 *
 * 1. A `.bin` image of 1 KiB–1 MiB is chosen.
 * 2. The keyboard is asked to reboot into its bootloader (`enterBootloader()`); the page keeps
 *    looking for an already authorized bootloader (`detectBootloader(true)`).
 * 3. Once the keyboard has left (or the user says it is in DFU mode), the bootloader is looked
 *    up again and, from a user click only, picked in the browser's USB chooser
 *    (`detectBootloader(false)` needs transient user activation); then it is opened.
 * 4.–7. `WebDfuDevice.download()` erases ("Update Program"), needs no second connection
 *    ("Connect Flash" completes at once), writes with progress ("Flash Firmware"), then
 *    manifests and resets the bootloader, which boots the new firmware ("Finish").
 *
 * While a session runs, `setFirmwareUpdateActive(true)` keeps the Update page mounted through
 * the keyboard's HID disconnect. The session ends when the flasher is detached (the page is
 * left: a running download is aborted), or when it is reset while the keyboard is connected. A
 * reset while the keyboard is away keeps it: the keyboard may still wait in its bootloader, and
 * the page is the only way to flash it.
 */
import { WebDfuDevice, type DfuProgress, type USBDevice } from 'emi-keyboard-controller';
import { deviceSession, deviceStore } from '../device';
import { isFirmwareFileName, readFirmwareImage, FIRMWARE_FILE_ERRORS } from './model/firmware-file';
import type { FlasherState, FlashStepId } from './model/flash-steps';
import { setFirmwareUpdateActive } from './session';

export const FLASHER_ERRORS = {
  noDevice: 'No device in DFU mode found. Please enter recovery mode first.',
  permissionDenied: 'Permission denied. Please allow USB access.',
  usb: (message: string): string => `USB Error: ${message}`,
  connectFailed: 'Failed to connect to device',
  flashFailed: 'Failed to flash firmware',
} as const;

export interface FirmwareFlasher {
  getState(): FlasherState;
  /** Notified after every state change. */
  subscribe(listener: () => void): () => void;
  /** Step 1: validates the file and starts the update (ignored on other steps). */
  chooseFile(file: File): Promise<void>;
  /** Step 2 button ("Device is in DFU Mode"); call from the click, it may open the picker. */
  confirmDfuMode(): Promise<void>;
  /** Step 3 button ("Connect USB Device"); call from the click, it may open the picker. */
  connectDevice(): Promise<void>;
  /** "Try Again" / "Flash Another Device": back to step 1. */
  reset(): void;
  /**
   * Starts following the keyboard connection. The returned function stops everything: a running
   * download is aborted, the session ends and the flasher returns to step 1.
   */
  attach(): () => void;
}

export interface FirmwareFlasherOptions {
  /** How often an already authorized bootloader is looked for while waiting (default 500). */
  readonly pollIntervalMs?: number;
}

function connectErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotFoundError') return FLASHER_ERRORS.noDevice;
    if (error.name === 'NotAllowedError') return FLASHER_ERRORS.permissionDenied;
    return FLASHER_ERRORS.usb(error.message);
  }
  return FLASHER_ERRORS.connectFailed;
}

function keyboardReady(): boolean {
  return deviceStore.getState().connection.status === 'ready';
}

class Flasher implements FirmwareFlasher {
  readonly #pollIntervalMs: number;
  readonly #listeners = new Set<() => void>();
  #state: FlasherState = { phase: 'choose' };
  /** Bumped by reset and detach: continuations of older attempts stop when it moved. */
  #generation = 0;
  #attached = false;
  #sessionActive = false;
  #image: Uint8Array | null = null;
  /** The keyboard was asked to enter its bootloader in this attempt. */
  #bootloaderRequested = false;
  /** The device search, or the open-and-flash, in progress; at most one at a time. */
  #task: Promise<void> | null = null;
  #pollTimer: ReturnType<typeof setTimeout> | null = null;
  /** Aborts the running download; the download then closes the device itself. */
  #abort: AbortController | null = null;
  #unsubscribeStore: (() => void) | null = null;

  constructor(options: FirmwareFlasherOptions) {
    this.#pollIntervalMs = options.pollIntervalMs ?? 500;
  }

  getState(): FlasherState {
    return this.#state;
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  attach(): () => void {
    this.#unsubscribeStore?.();
    this.#attached = true;
    this.#unsubscribeStore = deviceStore.subscribe(state => {
      // The keyboard left after the bootloader request: it is rebooting into DFU mode.
      if (
        this.#state.phase === 'reboot' &&
        this.#bootloaderRequested &&
        state.connection.status !== 'ready'
      ) {
        this.#setState({ phase: 'connect' });
        void this.#detectSilently();
      }
    });
    return () => {
      this.#attached = false;
      this.#unsubscribeStore?.();
      this.#unsubscribeStore = null;
      this.#stop();
      this.#setSessionActive(false);
      this.#setState({ phase: 'choose' });
    };
  }

  async chooseFile(file: File): Promise<void> {
    if (this.#state.phase !== 'choose') return;
    if (!isFirmwareFileName(file.name)) {
      this.#fail('reboot_recovery', FIRMWARE_FILE_ERRORS.notBin, 'active');
      return;
    }
    const generation = this.#generation;
    // As in Svelte, step 2 becomes active while the file is read.
    this.#setState({ phase: 'reboot' });
    const result = await readFirmwareImage(file);
    if (generation !== this.#generation) return;
    if (!result.ok) {
      this.#fail('reboot_recovery', result.message, 'active');
      return;
    }
    console.info(
      `Firmware loaded: ${file.name} (${Math.round(result.image.byteLength / 1024)} KB)`
    );
    this.#image = result.image;
    this.#setSessionActive(true);
    if (keyboardReady()) {
      this.#bootloaderRequested = true;
      deviceSession.enterBootloader();
    }
    this.#schedulePoll();
  }

  async confirmDfuMode(): Promise<void> {
    if (this.#state.phase !== 'reboot' || !this.#image) return;
    this.#setState({ phase: 'connect' });
    await this.#pickDevice();
  }

  async connectDevice(): Promise<void> {
    if (this.#state.phase !== 'connect' || !this.#image) return;
    await this.#pickDevice();
  }

  reset(): void {
    this.#stop();
    if (keyboardReady()) this.#setSessionActive(false);
    this.#setState({ phase: 'choose' });
  }

  // -------------------------------------------------------------------------------------------

  #setState(state: FlasherState): void {
    if (state.phase === 'choose' && this.#state.phase === 'choose') return;
    this.#state = state;
    for (const listener of [...this.#listeners]) listener();
  }

  #setSessionActive(active: boolean): void {
    if (this.#sessionActive === active) return;
    this.#sessionActive = active;
    setFirmwareUpdateActive(active);
  }

  #fail(step: FlashStepId, message: string, stepStatus: 'active' | 'error' = 'error'): void {
    this.#setState({ phase: 'error', step, stepStatus, message });
  }

  /** Ends the current attempt: aborts the download and forgets the image. */
  #stop(): void {
    this.#generation += 1;
    this.#abort?.abort();
    this.#abort = null;
    if (this.#pollTimer !== null) clearTimeout(this.#pollTimer);
    this.#pollTimer = null;
    this.#task = null;
    this.#image = null;
    this.#bootloaderRequested = false;
  }

  #waitingForDevice(): boolean {
    const { phase } = this.#state;
    return this.#attached && this.#image !== null && (phase === 'reboot' || phase === 'connect');
  }

  #schedulePoll(): void {
    if (this.#pollTimer !== null) clearTimeout(this.#pollTimer);
    this.#pollTimer = setTimeout(() => {
      this.#pollTimer = null;
      if (!this.#waitingForDevice()) return;
      void this.#detectSilently().finally(() => {
        if (this.#waitingForDevice()) this.#schedulePoll();
      });
    }, this.#pollIntervalMs);
  }

  #runTask(work: (generation: number) => Promise<void>): Promise<void> {
    const generation = this.#generation;
    const task = work(generation).finally(() => {
      if (this.#task === task) this.#task = null;
    });
    this.#task = task;
    return task;
  }

  /** Looks for an already authorized bootloader (no picker) and flashes it when found. */
  async #detectSilently(): Promise<void> {
    if (this.#task || !this.#waitingForDevice()) return;
    await this.#runTask(async generation => {
      let devices: USBDevice[];
      try {
        devices = await deviceSession.detectBootloader(true);
      } catch (error) {
        console.warn('[firmware-update] bootloader lookup failed', error);
        return;
      }
      if (generation !== this.#generation || !this.#waitingForDevice()) return;
      const [device] = devices;
      if (device) await this.#flash(device, generation);
    });
  }

  /** From a click: the authorized bootloader, else the browser's USB chooser. */
  async #pickDevice(): Promise<void> {
    // A silent lookup is quick; the click's user activation outlives it.
    if (this.#task) await this.#task;
    if (this.#state.phase !== 'connect' || !this.#waitingForDevice()) return;
    await this.#runTask(async generation => {
      let devices: USBDevice[];
      try {
        devices = await deviceSession.detectBootloader(true);
        if (devices.length === 0) devices = await deviceSession.detectBootloader(false);
      } catch (error) {
        console.error('DFU connection error:', error);
        if (generation === this.#generation)
          this.#fail('connect_recovery', connectErrorMessage(error));
        return;
      }
      if (generation !== this.#generation) return;
      const [device] = devices;
      if (!device) {
        this.#fail('connect_recovery', FLASHER_ERRORS.noDevice);
        return;
      }
      await this.#flash(device, generation);
    });
  }

  /** Opens the bootloader and downloads the image: erase, transfer, manifest and reset. */
  async #flash(device: USBDevice, generation: number): Promise<void> {
    const image = this.#image;
    if (!image) return;
    const current = () => generation === this.#generation;

    let dfu: WebDfuDevice;
    try {
      dfu = await WebDfuDevice.connect(device);
    } catch (error) {
      console.error('DFU connection error:', error);
      if (current()) this.#fail('connect_recovery', connectErrorMessage(error));
      return;
    }
    if (!current()) {
      await dfu.close();
      return;
    }
    const abort = new AbortController();
    this.#abort = abort;
    this.#setState({ phase: 'erase' });

    try {
      await dfu.download(image, {
        signal: abort.signal,
        onProgress: progress => {
          if (current()) this.#onProgress(progress);
        },
      });
      if (current()) this.#setState({ phase: 'done' });
    } catch (error) {
      if (!current()) return;
      console.error('Download error:', error);
      const step = this.#state.phase === 'erase' ? 'update_program' : 'flash_firmware';
      this.#fail(step, FLASHER_ERRORS.flashFailed);
    } finally {
      if (this.#abort === abort) this.#abort = null;
      // After manifestation the bootloader has reset and is gone; close() allows for that.
      await dfu.close();
    }
  }

  #onProgress(progress: DfuProgress): void {
    switch (progress.phase) {
      case 'erase':
        return;
      case 'transfer':
        this.#setState({
          phase: 'flash',
          progress:
            progress.percentage ??
            (progress.total > 0 ? (progress.transferred / progress.total) * 100 : 0),
        });
        return;
      case 'manifest':
        this.#setState({ phase: 'flash', progress: 100 });
        return;
    }
  }
}

export function createFirmwareFlasher(options: FirmwareFlasherOptions = {}): FirmwareFlasher {
  return new Flasher(options);
}
