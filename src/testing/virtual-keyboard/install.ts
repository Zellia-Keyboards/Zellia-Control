import { createVirtualKeyboard, type VirtualKeyboard, type VirtualKeyboardOptions } from './device';

export interface InstalledVirtualKeyboard extends VirtualKeyboard {
  /** Restores the previous `hid`/`usb` properties and disposes the keyboard. */
  uninstall(): void;
}

/**
 * Creates a virtual keyboard and installs its managers as `nav.hid` and `nav.usb` (own
 * properties shadowing the browser's), e.g. on jsdom's `navigator`.
 */
export function installVirtualHid(
  nav: object,
  options: VirtualKeyboardOptions = {}
): InstalledVirtualKeyboard {
  const keyboard = createVirtualKeyboard(options);
  const previous = {
    hid: Object.getOwnPropertyDescriptor(nav, 'hid'),
    usb: Object.getOwnPropertyDescriptor(nav, 'usb'),
  };
  Object.defineProperty(nav, 'hid', { configurable: true, enumerable: true, value: keyboard.hid });
  Object.defineProperty(nav, 'usb', { configurable: true, enumerable: true, value: keyboard.usb });

  const restore = (key: 'hid' | 'usb') => {
    const descriptor = previous[key];
    if (descriptor) Object.defineProperty(nav, key, descriptor);
    else Reflect.deleteProperty(nav, key);
  };

  return Object.assign(keyboard, {
    uninstall(): void {
      restore('hid');
      restore('usb');
      keyboard.dispose();
    },
  });
}
