/**
 * Connects the app's `deviceSession` singleton (the one pages use) to a virtual keyboard on
 * jsdom's `navigator`, for component tests of pages that read the device store and send commands:
 *
 *   const keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false });
 *   onTestFinished(keyboard.dispose);
 */
import { deviceSession, deviceStore } from '../features/device';
import {
  installVirtualHid,
  type InstalledVirtualKeyboard,
  type VirtualKeyboardOptions,
} from './virtual-keyboard';

export interface ConnectedKeyboard {
  readonly vk: InstalledVirtualKeyboard;
  /** Disconnects the session and removes the virtual keyboard (safe to pass as a callback). */
  readonly dispose: () => void;
}

/** Resolves once the session is `ready`; throws with the session's message otherwise. */
export async function connectVirtualKeyboard(
  options: VirtualKeyboardOptions = {}
): Promise<ConnectedKeyboard> {
  const vk = installVirtualHid(navigator, options);
  const dispose = () => {
    deviceSession.disconnect();
    vk.uninstall();
  };
  await deviceSession.connect();
  const { connection } = deviceStore.getState();
  if (connection.status !== 'ready') {
    dispose();
    const reason = connection.status === 'error' ? connection.message : connection.status;
    throw new Error(`The virtual keyboard did not connect: ${reason}`);
  }
  return { vk, dispose };
}
