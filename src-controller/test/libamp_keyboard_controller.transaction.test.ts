import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LibampKeyboardController,
  SessionCancelledError,
  TransactionSession,
} from '../src/controllers/libamp_keyboard_controller/controller';
import { AdvancedKey } from '../src/interface';
import {
  decodeFrame,
  flushPromises,
  makeFrame,
  MockHidDevice,
  responseFor,
} from './support/hid';

type ControllerInternals = {
  handleInputReport: (event: HIDInputReportEvent) => void;
};

const internals = (controller: LibampKeyboardController) => controller as unknown as ControllerInternals;

const GET = 0x02;
const SET = 0x01;
const VERSION = 0x00;
const ADVANCED_KEY = 0x01;
const KEYMAP = 0x02;
const CONFIG = 0x07;

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'debug').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function versionPayload(major: number, minor: number, patch: number, info = ''): Uint8Array {
  const encoded = new TextEncoder().encode(info);
  const payload = new Uint8Array(14 + encoded.length);
  const view = new DataView(payload.buffer);
  view.setUint16(0, encoded.length, true);
  view.setUint32(2, major, true);
  view.setUint32(6, minor, true);
  view.setUint32(10, patch, true);
  payload.set(encoded, 14);
  return payload;
}

function wireInput(controller: LibampKeyboardController, device: MockHidDevice): void {
  device.addEventListener('inputreport', internals(controller).handleInputReport as EventListener);
  controller.device = device as unknown as HIDDevice;
  device.opened = true;
}

function wireAutoResponder(
  controller: LibampKeyboardController,
  responder: (request: ReturnType<typeof decodeFrame>) => Uint8Array | undefined,
): MockHidDevice {
  const device = new MockHidDevice();
  wireInput(controller, device);
  device.onSend = report => {
    const response = responder(decodeFrame(report));
    if (response) {
      device.emitInput(response);
    }
  };
  return device;
}

function minimalState(controller: LibampKeyboardController): void {
  controller.advanced_keys = [new AdvancedKey()];
  controller.keymap = [[0x1001]];
  controller.dynamic_keys = [];
  controller.rgb_configs = [];
  controller.macros = [[]];
  controller.profile_number = 1;
}

describe('LibampKeyboardController transactions', () => {
  it('deserializes the response inside the transaction before the promise resolves', async () => {
    const controller = new LibampKeyboardController();
    minimalState(controller);
    const device = new MockHidDevice();
    wireInput(controller, device);
    device.onSend = report => {
      const request = decodeFrame(report);
      if (request.code === GET && request.type === ADVANCED_KEY) {
        const body = new Uint8Array(24);
        body[2] = 2; // mode
        new DataView(body.buffer).setUint16(4, Math.trunc(0.25 * 65535), true);
        device.emitInput(responseFor(request, body));
        return;
      }
      device.emitInput(responseFor(request));
    };

    await controller.read_data();

    // 事务提交后缓存已更新，且处理器在 resolve 之前同步应用
    expect(controller.advanced_keys[0].config.mode).toBe(2);
    expect(controller.advanced_keys[0].config.activation_value).toBeCloseTo(0.25, 4);
  });

  it('aborts read_data on the first failed sub-command, cancelling remaining reads', async () => {
    vi.useFakeTimers();
    const controller = new LibampKeyboardController();
    minimalState(controller);
    controller.advanced_keys = [new AdvancedKey(), new AdvancedKey()];
    const sent: ReturnType<typeof decodeFrame>[] = [];
    // 第一个 advanced-key 读取不响应 → 超时，其余读取被取消
    wireAutoResponder(controller, request => {
      sent.push(request);
      if (request.code === GET && request.type === ADVANCED_KEY) {
        return undefined;
      }
      return responseFor(request);
    });
    const updateSpy = vi.fn();
    controller.addEventListener('updateData', updateSpy);

    const reading = controller.read_data();
    const readingExpectation = expect(reading).rejects.toThrow('Timeout waiting for packet');
    await flushPromises();
    await vi.advanceTimersByTimeAsync(200);
    await readingExpectation;

    // 只有 config 读取和第一个 advanced-key 读取被发出，剩余读取被取消
    expect(sent.map(frame => frame.type)).toEqual([CONFIG, ADVANCED_KEY]);
    expect(sent.some(frame => frame.type === KEYMAP)).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('aborts save on the first failed write, cancelling remaining writes', async () => {
    vi.useFakeTimers();
    const controller = new LibampKeyboardController();
    minimalState(controller);
    const sent: ReturnType<typeof decodeFrame>[] = [];
    // 第一个 advanced-key 写入不响应 → 超时，keymap 等剩余写入被取消
    wireAutoResponder(controller, request => {
      sent.push(request);
      if (request.code === SET && request.type === ADVANCED_KEY) {
        return undefined;
      }
      return responseFor(request);
    });

    const saving = controller.save();
    const savingExpectation = expect(saving).rejects.toThrow('Timeout waiting for packet');
    await flushPromises();
    await vi.advanceTimersByTimeAsync(200);
    await savingExpectation;

    // config 写入成功后，advanced-key 写入失败，keymap 等剩余写入被取消
    expect(sent.map(frame => frame.type)).toEqual([CONFIG, ADVANCED_KEY]);
    expect(sent.some(frame => frame.type === KEYMAP)).toBe(false);
  });

  it('cancels the active session and remaining tasks when the device requests a reload', async () => {
    vi.useFakeTimers();
    const controller = new LibampKeyboardController();
    minimalState(controller);
    const device = new MockHidDevice();
    wireInput(controller, device);

    const reading = controller.read_data();
    await flushPromises();
    expect(device.sentReports).toHaveLength(1); // config 读取在途

    // 设备发送 ConfigChanged 事件（配置已变化，要求主机重读）
    device.emitInput(makeFrame({ code: 0x00, id: 0x01 }));

    // 在途事务被拒绝，read_data 以 SessionCancelledError 结束
    await expect(reading).rejects.toThrow(SessionCancelledError);
    expect(device.sentReports).toHaveLength(1); // 剩余读取未发出

    // 设备通知触发防抖后的重新加载
    const errorSpy = vi.fn();
    const endSpy = vi.fn();
    controller.addEventListener('updateDataError', errorSpy);
    controller.addEventListener('updateDataEnd', endSpy);
    await vi.advanceTimersByTimeAsync(200);
    expect(device.sentReports).toHaveLength(2); // 新会话开始读取

    // 设备无响应 → 新会话超时失败并上报错误，但不会上报 updateData 成功事件
    await vi.advanceTimersByTimeAsync(200);
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(endSpy).toHaveBeenCalledOnce();
  });

  it('keeps a pending transaction alive when the response code or type mismatches', async () => {
    const controller = new LibampKeyboardController();
    const device = new MockHidDevice();
    wireInput(controller, device);

    const pending = controller.request_version();
    await flushPromises();
    const request = decodeFrame(device.sentReports[0]);

    // 同 id 但 code/type 不匹配的响应被丢弃，事务继续等待
    device.emitInput(makeFrame({
      code: GET,
      id: request.id,
      type: CONFIG,
      body: new Uint8Array([1]),
    }));
    await flushPromises();
    expect(device.sentReports).toHaveLength(1);

    device.emitInput(responseFor(request, versionPayload(0, 1, 2, 'ok')));
    await expect(pending).resolves.toMatchObject({ major: 0, minor: 1, patch: 2, info: 'ok' });
  });

  it('returns a version snapshot so concurrent requests do not observe later mutations', async () => {
    const controller = new LibampKeyboardController();
    const device = new MockHidDevice();
    wireInput(controller, device);

    const first = controller.request_version();
    const second = controller.request_version();
    await flushPromises();
    const firstRequest = decodeFrame(device.sentReports[0]);
    device.emitInput(responseFor(firstRequest, versionPayload(0, 1, 2, 'first')));
    await vi.waitFor(() => expect(device.sentReports).toHaveLength(2));
    const secondRequest = decodeFrame(device.sentReports[1]);
    device.emitInput(responseFor(secondRequest, versionPayload(0, 1, 3, 'second')));

    await expect(first).resolves.toMatchObject({ patch: 2, info: 'first' });
    await expect(second).resolves.toMatchObject({ patch: 3, info: 'second' });
    expect(controller.get_firmware_version()).toMatchObject({ patch: 3, info: 'second' });
  });

  it('cancels queued work of a cancelled session before it reaches the device', async () => {
    const controller = new LibampKeyboardController();
    const session = new TransactionSession('test');
    const device = new MockHidDevice();
    wireInput(controller, device);

    // 一个未响应的事务占用请求队列
    const blocked = controller.request_version();
    await flushPromises();
    expect(device.sentReports).toHaveLength(1);

    // 排队等待的会话任务（在队列中等待，尚未发出请求）
    const queued = controller.read_config(session);
    await flushPromises();
    expect(device.sentReports).toHaveLength(1);

    session.cancel('aborted by test');

    // 释放被阻塞的请求 → 队列继续 → 已取消会话的任务被拒绝，不会发出请求
    device.emitInput(responseFor(decodeFrame(device.sentReports[0]), versionPayload(0, 1, 1)));
    await expect(blocked).resolves.toMatchObject({ patch: 1 });
    await expect(queued).rejects.toThrow(SessionCancelledError);
    expect(device.sentReports).toHaveLength(1);
  });
});
