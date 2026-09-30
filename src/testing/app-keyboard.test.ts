import { describe, expect, it, onTestFinished } from 'vitest';
import { deviceSession, deviceStore } from '../features/device';
import { connectVirtualKeyboard } from './app-keyboard';

describe('connectVirtualKeyboard', () => {
  it('connects the app session and loads the keyboard', async () => {
    const keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false });
    onTestFinished(keyboard.dispose);

    const { connection, config } = deviceStore.getState();
    expect(connection).toMatchObject({ status: 'ready', model: { id: 'zellia-starlight' } });
    expect(config?.keymap[0]).toEqual(keyboard.vk.state.active.keymap[0]);
  });

  it('sends commands to the virtual keyboard', async () => {
    const keyboard = await connectVirtualKeyboard();
    onTestFinished(keyboard.dispose);

    deviceSession.setKeycodes(0, [1], 0x04);

    await expect.poll(() => keyboard.vk.state.active.keymap[0]?.[1]).toBe(0x04);
  });

  it('disconnects and uninstalls on dispose, so the next test can connect again', async () => {
    const first = await connectVirtualKeyboard();
    first.dispose();

    expect(deviceStore.getState().connection.status).toBe('disconnected');
    expect(Reflect.get(navigator, 'hid')).toBeUndefined();

    const second = await connectVirtualKeyboard({ model: 'zellia-80' });
    onTestFinished(second.dispose);
    expect(deviceStore.getState().connection).toMatchObject({ model: { id: 'zellia-80' } });
  });

  it('throws with the reason when the keyboard does not connect', async () => {
    await expect(connectVirtualKeyboard({ picker: 'cancel' })).rejects.toThrow(
      /did not connect: No compatible keyboards found/
    );
    expect(deviceStore.getState().connection.status).toBe('disconnected');
  });
});
