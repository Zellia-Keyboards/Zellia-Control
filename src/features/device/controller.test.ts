import { DynamicKeyStroke4x4, ZelliaStarlightController } from 'emi-keyboard-controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  encodeDynamicKeyReply,
  encodeHostPacket,
  encodeReply,
  type WireDynamicKey,
} from '../../testing/virtual-keyboard';
import { onControllerEvent, withUpstreamFixes, type DeviceController } from './controller';

const STROKE: WireDynamicKey = {
  type: 'stroke',
  bindings: [0x09, 0x0200, 0, 0],
  keyControl: [0x3f, 0x04, 0, 0],
  pressBegin: 16383,
  pressFully: 49151,
  releaseBegin: 49151,
  releaseFully: 16383,
  keyId: 32,
};

function dynamicKeyReply(index: number, key: WireDynamicKey): Uint8Array {
  return encodeDynamicKeyReply(
    encodeHostPacket({ op: 'get', id: 1, kind: 'dynamicKey', index }),
    key
  );
}

beforeEach(() => {
  vi.spyOn(console, 'debug').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DeviceController', () => {
  it('is implemented by the vendored controllers', () => {
    const controller: DeviceController = new ZelliaStarlightController();
    expect(controller.get_profile_num()).toBe(4);
  });
});

describe('onControllerEvent', () => {
  function emit(controller: DeviceController & EventTarget, type: string, detail?: unknown) {
    controller.dispatchEvent(
      detail === undefined ? new Event(type) : new CustomEvent(type, { detail })
    );
  }

  it('delivers validated, typed details', () => {
    const controller = new ZelliaStarlightController();
    const debug = vi.fn();
    const error = vi.fn();
    const consoleData = vi.fn();
    const loaded = vi.fn();
    onControllerEvent(controller, 'updateDebugData', debug);
    onControllerEvent(controller, 'updateDataError', error);
    onControllerEvent(controller, 'consoleData', consoleData);
    onControllerEvent(controller, 'updateData', loaded);

    emit(controller, 'updateDebugData', { tick: 12, updated_keys: [3, 4] });
    const failure = new Error('timeout');
    emit(controller, 'updateDataError', { error: failure });
    emit(controller, 'consoleData', { text: 'hi', data: new Uint8Array([104, 105]) });
    emit(controller, 'updateData');

    expect(debug).toHaveBeenCalledWith({ tick: 12, updatedKeys: [3, 4] });
    expect(error).toHaveBeenCalledWith({ error: failure });
    expect(consoleData).toHaveBeenCalledWith({ text: 'hi', data: new Uint8Array([104, 105]) });
    expect(loaded).toHaveBeenCalledOnce();
  });

  it('drops events whose detail does not match the documented shape', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const controller = new ZelliaStarlightController();
    const debug = vi.fn();
    const consoleData = vi.fn();
    const error = vi.fn();
    onControllerEvent(controller, 'updateDebugData', debug);
    onControllerEvent(controller, 'consoleData', consoleData);
    onControllerEvent(controller, 'updateDataError', error);

    emit(controller, 'updateDebugData', { tick: 'soon', updated_keys: [1] });
    emit(controller, 'updateDebugData', { tick: 1, updated_keys: [1.5] });
    emit(controller, 'updateDebugData');
    emit(controller, 'consoleData', { text: 1, data: new Uint8Array() });
    expect(debug).not.toHaveBeenCalled();
    expect(consoleData).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(4);

    // A failure is never dropped: an unexpected detail becomes the error itself.
    emit(controller, 'updateDataError', 'boom');
    expect(error).toHaveBeenCalledWith({ error: 'boom' });
  });

  it('unsubscribes', () => {
    const controller = new ZelliaStarlightController();
    const listener = vi.fn();
    const unsubscribe = onControllerEvent(controller, 'deviceDisconnected', listener);
    unsubscribe();
    emit(controller, 'deviceDisconnected');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('withUpstreamFixes', () => {
  it('documents the vendored parser bug: non-empty dynamic-key replies throw', () => {
    const controller = new ZelliaStarlightController();
    expect(() => {
      controller.packet_process(dynamicKeyReply(0, STROKE));
    }).toThrow(TypeError);
  });

  it('keeps the parsed dynamic key and swallows only that failure', () => {
    const controller = withUpstreamFixes(new ZelliaStarlightController());
    expect(() => {
      controller.packet_process(dynamicKeyReply(4, STROKE));
    }).not.toThrow();
    expect(controller.get_dynamic_keys()[4]).toMatchObject({
      type: 1,
      bindings: [0x09, 0x0200, 0, 0],
      key_control: [0x3f, 0x04, 0, 0],
    });
    controller.packet_process(
      dynamicKeyReply(5, { type: 'mutex', bindings: [4, 7], keyIds: [31, 33], mode: 1 })
    );
    expect(controller.get_dynamic_keys()[5]).toMatchObject({ type: 4, bindings: [4, 7], mode: 1 });
  });

  it('still reports other dynamic-key processing errors', () => {
    const controller = withUpstreamFixes(new ZelliaStarlightController());
    controller.set_dynamic_keys([new DynamicKeyStroke4x4()]);
    const setReply = encodeReply(
      encodeHostPacket({ op: 'set', id: 1, kind: 'dynamicKey', index: 0, key: STROKE })
    );
    expect(() => {
      controller.packet_process(setReply);
    }).toThrow(TypeError);
  });
});
