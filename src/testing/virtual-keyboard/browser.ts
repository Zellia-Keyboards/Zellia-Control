/**
 * Browser entry of the virtual keyboard (bundled for Playwright and injected with
 * `addInitScript`): installs a virtual `navigator.hid`/`navigator.usb` and exposes the keyboard
 * as `window.__virtualKeyboard`. Options may be provided as JSON in
 * `window.__virtualKeyboardOptions` before this script runs (see `browser-install.ts`).
 */
import { installBrowserVirtualKeyboard } from './browser-install';

if (typeof window !== 'undefined') installBrowserVirtualKeyboard(window);
