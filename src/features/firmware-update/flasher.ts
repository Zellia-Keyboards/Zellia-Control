/**
 * The firmware update behind the 7-step updater (spec §8 Update, §1.7, §1.8, D3), driven by the
 * upstream WebDFU implementation:
 *
 * 1. A `.bin` image of 1 KiB–1 MiB is chosen.
 * 2. A connected keyboard is asked to reboot into its bootloader (`enterBootloader()`); the user
 *    can also enter DFU mode by hand and say so ("Device is in DFU Mode"). Without a keyboard —
 *    it already waits in its bootloader, or none was connected (§1.7) — the step is skipped.
 * 3. Once the keyboard has left, the one authorized bootloader that appeared after the app's
 *    request is flashed without asking (`detectBootloader(true)`): a bootloader that was already
 *    attached may belong to another board. Anything else waits for "Connect USB Device", which
 *    takes that one new authorized bootloader, else opens the browser's USB chooser
 *    (`detectBootloader(false)` needs the click's transient user activation).
 * 4.–7. `WebDfuDevice.download()` erases ("Update Program"), needs no second connection
 *    ("Connect Flash" completes at once), writes with progress ("Flash Firmware"), then
 *    manifests and resets the bootloader, which boots the new firmware ("Finish").
 *
 * The app has one flasher, {@link firmwareFlasher}, shared by the Update page and Settings, whose
 * confirmed "Enter Bootloader" starts an update that waits for its image (§1.8). It outlives the
 * page (D3): leaving the page neither aborts a flash nor forgets its progress. The session flag
 * (`setFirmwareUpdateActive`) tells the shell and the app update policy that an update is under
 * way: from the accepted image (or the Settings request) until the update succeeds, fails or is
 * reset — and, for a Settings request still waiting for its image, until a keyboard is connected
 * again.
 */
import { WebDfuDevice, type DfuProgress, type USBDevice } from 'emi-keyboard-controller';
import { deviceSession, deviceStore } from '../device';
import { FIRMWARE_FILE_ERRORS, isFirmwareFileName, readFirmwareImage } from './model/firmware-file';
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
  /** Step 2 button ("Device is in DFU Mode"); call from the click, it may open the chooser. */
  confirmDfuMode(): Promise<void>;
  /** Step 3 button ("Connect USB Device"); call from the click, it may open the chooser. */
  connectDevice(): Promise<void>;
  /**
   * Settings → "Enter Bootloader", confirmed (§1.8): starts a new update and asks the keyboard to
   * reboot into its bootloader, which is flashed once an image is chosen.
   */
  enterBootloader(): Promise<void>;
  /** "Try Again" / "Flash Another Device": ends the update and returns to step 1. */
  reset(): void;
  /** Ends the update and stops following the keyboard (the app's flasher is never disposed). */
  dispose(): void;
}

export interface FirmwareFlasherOptions {
  /** How often a newly appeared, authorized bootloader is looked for (default 500). */
  readonly pollIntervalMs?: number;
}

/** The app's request that the keyboard reboot into its bootloader. */
interface BootloaderRequest {
  /** Authorized bootloaders attached before the request, or null if the lookup failed. */
  preexisting: ReadonlySet<USBDevice> | null;
  /** The request went out (the keyboard was still connected after the lookup). */
  sent: boolean;
  /** The keyboard left after the request: it reboots into, or waits in, its bootloader. */
  keyboardLeft: boolean;
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
  readonly #unsubscribeStore: () => void;
  #state: FlasherState = { phase: 'choose' };
  /** Bumped when an update ends: continuations of older attempts stop when it moved. */
  #generation = 0;
  #disposed = false;
  #sessionActive = false;
  #image: Uint8Array | null = null;
  #request: BootloaderRequest | null = null;
  /** The device search, or the open-and-flash, in progress; at most one at a time. */
  #task: Promise<void> | null = null;
  #pollTimer: ReturnType<typeof setTimeout> | null = null;
  /** Aborts the running download; the download then closes the device itself. */
  #abort: AbortController | null = null;

  constructor(options: FirmwareFlasherOptions) {
    this.#pollIntervalMs = options.pollIntervalMs ?? 500;
    this.#unsubscribeStore = deviceStore.subscribe((state, previous) => {
      const ready = state.connection.status === 'ready';
      if (ready !== (previous.connection.status === 'ready')) this.#onKeyboardChange(ready);
    });
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

  async chooseFile(file: File): Promise<void> {
    if (this.#disposed || this.#state.phase !== 'choose') return;
    if (!isFirmwareFileName(file.name)) {
      this.#rejectFile(FIRMWARE_FILE_ERRORS.notBin);
      return;
    }
    const generation = this.#generation;
    // As in Svelte, step 2 becomes active while the file is read.
    this.#setState({ phase: 'reboot' });
    const result = await readFirmwareImage(file);
    if (generation !== this.#generation) return;
    if (!result.ok) {
      this.#rejectFile(result.message);
      return;
    }
    console.info(
      `Firmware loaded: ${file.name} (${Math.round(result.image.byteLength / 1024)} KB)`
    );
    this.#image = result.image;
    this.#setSessionActive(true);
    if (keyboardReady()) {
      // Step 2 waits for the keyboard to leave: asked now, unless Settings just asked.
      if (!this.#request || this.#request.keyboardLeft) await this.#requestBootloader(generation);
      return;
    }
    // No keyboard: it waits in its bootloader, or none was connected (§1.7). Step 2 is skipped.
    this.#setState({ phase: 'connect' });
    this.#watchForBootloader();
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

  async enterBootloader(): Promise<void> {
    if (this.#disposed) return;
    if (this.#state.phase === 'erase' || this.#state.phase === 'flash') {
      // Another board is being flashed: that update goes on; the keyboard still reboots.
      deviceSession.enterBootloader();
      return;
    }
    this.#stop();
    this.#setState({ phase: 'choose' });
    this.#setSessionActive(true);
    await this.#requestBootloader(this.#generation);
  }

  reset(): void {
    this.#stop();
    this.#setSessionActive(false);
    this.#setState({ phase: 'choose' });
  }

  dispose(): void {
    if (this.#disposed) return;
    this.reset();
    this.#disposed = true;
    this.#unsubscribeStore();
    this.#listeners.clear();
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

  /** The file is refused before anything happens; step 2 stays active next to it, as in Svelte. */
  #rejectFile(message: string): void {
    this.#setState({ phase: 'error', step: 'reboot_recovery', stepStatus: 'active', message });
  }

  /** The update failed: it is over. */
  #fail(step: FlashStepId, message: string): void {
    this.#setSessionActive(false);
    this.#setState({ phase: 'error', step, stepStatus: 'error', message });
  }

  /** The bootloader reset into the new firmware: the update is over. */
  #finish(): void {
    this.#request = null;
    this.#image = null;
    this.#setSessionActive(false);
    this.#setState({ phase: 'done' });
  }

  /** Ends the current update: aborts the download, forgets the image and the request. */
  #stop(): void {
    this.#generation += 1;
    this.#abort?.abort();
    this.#abort = null;
    if (this.#pollTimer !== null) clearTimeout(this.#pollTimer);
    this.#pollTimer = null;
    this.#task = null;
    this.#image = null;
    this.#request = null;
  }

  #onKeyboardChange(ready: boolean): void {
    const request = this.#request;
    if (!ready) {
      if (!request?.sent || request.keyboardLeft) return;
      // The keyboard left after the request: it is rebooting into its bootloader.
      request.keyboardLeft = true;
      if (this.#state.phase === 'reboot' && this.#image) {
        this.#setState({ phase: 'connect' });
        this.#watchForBootloader();
      }
      return;
    }
    // A keyboard is connected again: an update still waiting for its image (Settings) is over.
    if (this.#sessionActive && this.#image === null) {
      this.#request = null;
      this.#setSessionActive(false);
    }
  }

  /** Looks up the bootloaders, then asks the connected keyboard to reboot into its own. */
  async #requestBootloader(generation: number): Promise<void> {
    const request: BootloaderRequest = { preexisting: null, sent: false, keyboardLeft: false };
    this.#request = request;
    try {
      request.preexisting = new Set(await deviceSession.detectBootloader(true));
    } catch (error) {
      console.warn('[firmware-update] bootloader lookup failed', error);
    }
    if (generation !== this.#generation || this.#request !== request) return;
    if (!keyboardReady()) {
      // The keyboard went away meanwhile: nothing was asked of it.
      this.#request = null;
      return;
    }
    request.sent = true;
    deviceSession.enterBootloader();
  }

  #waitingForDevice(): boolean {
    return !this.#disposed && this.#image !== null && this.#state.phase === 'connect';
  }

  /**
   * Authorized bootloaders that may be flashed without the chooser: after a request, only those
   * that appeared since (none when the earlier lookup failed); otherwise all of them.
   */
  #candidates(devices: readonly USBDevice[]): USBDevice[] {
    const request = this.#request;
    if (!request) return [...devices];
    const { preexisting } = request;
    return preexisting ? devices.filter(device => !preexisting.has(device)) : [];
  }

  /** Flashes a bootloader without a click only if it appeared after the app's request. */
  #watchForBootloader(): void {
    if (!this.#request?.keyboardLeft) return;
    void this.#detectSilently();
    this.#schedulePoll();
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

  /** Flashes the one authorized bootloader that appeared after the request, if there is one. */
  async #detectSilently(): Promise<void> {
    if (this.#task || !this.#waitingForDevice() || !this.#request?.keyboardLeft) return;
    await this.#runTask(async generation => {
      let devices: USBDevice[];
      try {
        devices = await deviceSession.detectBootloader(true);
      } catch (error) {
        console.warn('[firmware-update] bootloader lookup failed', error);
        return;
      }
      if (generation !== this.#generation || !this.#waitingForDevice()) return;
      const [device, ...others] = this.#candidates(devices);
      if (device && others.length === 0) await this.#flash(device, generation);
    });
  }

  /** From a click: the one authorized candidate, else the browser's USB chooser. */
  async #pickDevice(): Promise<void> {
    // A silent lookup is quick; the click's user activation outlives it.
    while (this.#task) await this.#task;
    if (!this.#waitingForDevice()) return;
    await this.#runTask(async generation => {
      let device: USBDevice | undefined;
      try {
        const [candidate, ...others] = this.#candidates(await deviceSession.detectBootloader(true));
        device =
          candidate && others.length === 0
            ? candidate
            : (await deviceSession.detectBootloader(false))[0];
      } catch (error) {
        console.error('DFU connection error:', error);
        if (generation === this.#generation) {
          this.#fail('connect_recovery', connectErrorMessage(error));
        }
        return;
      }
      if (generation !== this.#generation) return;
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
      if (current()) this.#finish();
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

let appFlasher: FirmwareFlasher | null = null;

/** The app's firmware update: one for the Update page and Settings; it outlives the page (D3). */
export function firmwareFlasher(): FirmwareFlasher {
  appFlasher ??= createFirmwareFlasher();
  return appFlasher;
}

/**
 * Settings → "Enter Bootloader", confirmed (§1.8): starts an update waiting for its image, and the
 * keyboard reboots into its bootloader. The session flag is set before this returns.
 */
export function enterBootloaderForUpdate(): Promise<void> {
  return firmwareFlasher().enterBootloader();
}

// A hot update of this module creates a new flasher; the old one must stop following the keyboard.
import.meta.hot?.dispose(() => {
  appFlasher?.dispose();
});
