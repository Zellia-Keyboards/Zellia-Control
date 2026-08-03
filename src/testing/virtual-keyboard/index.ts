/**
 * Virtual libamp keyboard for tests: a WebHID device + manager and a WebUSB DFU bootloader that
 * speak the protocol of the vendored `emi-keyboard-controller` (see protocol.ts).
 *
 * - jsdom: `installVirtualHid(navigator, options)` → keyboard (call `uninstall()` afterwards).
 * - Playwright: bundle `browser.ts` and read `window.__virtualKeyboard`.
 */
export {
  createVirtualKeyboard,
  syntheticTravel,
  VirtualHid,
  VirtualHidDevice,
  type VirtualKeyboard,
  type VirtualKeyboardOptions,
} from './device';
export {
  DEFAULT_DFUSE_MEMORY_MAP,
  DFU_STATUS,
  VirtualDfuDevice,
  VirtualUsb,
  type VirtualDfuOptions,
  type VirtualDfuResetInfo,
} from './dfu';
export { installVirtualHid, type InstalledVirtualKeyboard } from './install';
export * from './protocol';
export * from './state';
