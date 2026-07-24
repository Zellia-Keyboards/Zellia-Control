/**
 * Browser entry of the virtual keyboard (bundled for Playwright and injected with
 * `addInitScript`): installs a virtual `navigator.hid`/`navigator.usb` and exposes the keyboard
 * as `window.__virtualKeyboard`. Options may be provided as JSON in
 * `window.__virtualKeyboardOptions` before this script runs. No Node APIs are used.
 */
import type { VirtualDfuOptions } from './dfu';
import type { VirtualKeyboardOptions } from './device';
import { installVirtualHid, type InstalledVirtualKeyboard } from './install';
import type { WireVersion } from './protocol';
import { VIRTUAL_MODELS, type VirtualModelId } from './state';

declare global {
  interface Window {
    /** JSON options set by the test runner before the bundle runs. */
    __virtualKeyboardOptions?: unknown;
    __virtualKeyboard?: InstalledVirtualKeyboard;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return isNonNegative(value) && Number.isInteger(value);
}

function isModelId(value: unknown): value is VirtualModelId {
  return typeof value === 'string' && Object.hasOwn(VIRTUAL_MODELS, value);
}

function parseVersion(value: unknown): Partial<WireVersion> | undefined {
  if (!isRecord(value)) return undefined;
  const version: { -readonly [K in keyof WireVersion]?: WireVersion[K] } = {};
  if (isNonNegativeInteger(value.major)) version.major = value.major;
  if (isNonNegativeInteger(value.minor)) version.minor = value.minor;
  if (isNonNegativeInteger(value.patch)) version.patch = value.patch;
  if (typeof value.info === 'string') version.info = value.info;
  return version;
}

function parseDfu(value: unknown): VirtualDfuOptions | undefined {
  if (!isRecord(value)) return undefined;
  const dfu: VirtualDfuOptions = {};
  if (typeof value.memoryMap === 'string' || value.memoryMap === null)
    dfu.memoryMap = value.memoryMap;
  if (isNonNegativeInteger(value.transferSize) && value.transferSize > 0) {
    dfu.transferSize = value.transferSize;
  }
  if (isNonNegativeInteger(value.busyPolls)) dfu.busyPolls = value.busyPolls;
  if (isNonNegative(value.pollTimeoutMs)) dfu.pollTimeoutMs = value.pollTimeoutMs;
  if (typeof value.manifestationTolerant === 'boolean') {
    dfu.manifestationTolerant = value.manifestationTolerant;
  }
  if (typeof value.authorized === 'boolean') dfu.authorized = value.authorized;
  return dfu;
}

/** Validates options that arrive as JSON from the test runner; invalid fields are dropped. */
export function parseBrowserOptions(value: unknown): VirtualKeyboardOptions {
  if (!isRecord(value)) return {};
  const options: VirtualKeyboardOptions = {};
  if (isModelId(value.model)) options.model = value.model;
  if (typeof value.productName === 'string') options.productName = value.productName;
  const firmware = parseVersion(value.firmware);
  if (firmware) options.firmware = firmware;
  if (typeof value.seedDynamicKeys === 'boolean') options.seedDynamicKeys = value.seedDynamicKeys;
  if (isNonNegative(value.latencyMs)) options.latencyMs = value.latencyMs;
  if (isNonNegative(value.debugIntervalMs) && value.debugIntervalMs > 0) {
    options.debugIntervalMs = value.debugIntervalMs;
  }
  if (value.reconnectDelayMs === null || isNonNegative(value.reconnectDelayMs)) {
    options.reconnectDelayMs = value.reconnectDelayMs;
  }
  if (isNonNegative(value.calibrationDelayMs))
    options.calibrationDelayMs = value.calibrationDelayMs;
  if (typeof value.authorized === 'boolean') options.authorized = value.authorized;
  if (value.picker === 'first' || value.picker === 'cancel') options.picker = value.picker;
  const dfu = parseDfu(value.dfu);
  if (dfu) options.dfu = dfu;
  const firmwareAfterUpdate = parseVersion(value.firmwareAfterUpdate);
  if (firmwareAfterUpdate) options.firmwareAfterUpdate = firmwareAfterUpdate;
  return options;
}

/** Installs the virtual keyboard into `win` once and returns it. */
export function installBrowserVirtualKeyboard(win: Window): InstalledVirtualKeyboard {
  const existing = win.__virtualKeyboard;
  if (existing) return existing;
  const keyboard = installVirtualHid(
    win.navigator,
    parseBrowserOptions(win.__virtualKeyboardOptions)
  );
  win.__virtualKeyboard = keyboard;
  return keyboard;
}

if (typeof window !== 'undefined') installBrowserVirtualKeyboard(window);
