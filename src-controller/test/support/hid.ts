export interface DecodedFrame {
  code: number;
  id: number;
  type: number;
  body: Uint8Array;
}

type InputReportListener = (event: HIDInputReportEvent) => void;
type DisconnectListener = (event: HIDConnectionEvent) => void;

function toUint8Array(data: BufferSource): Uint8Array {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

export class MockHidDevice {
  opened = false;
  readonly sentReports: Uint8Array[] = [];
  onSend?: (report: Uint8Array) => void | Promise<void>;
  private readonly inputListeners = new Set<InputReportListener>();

  async open(): Promise<void> {
    this.opened = true;
  }

  async close(): Promise<void> {
    this.opened = false;
  }

  async sendReport(_reportId: number, data: BufferSource): Promise<void> {
    const report = new Uint8Array(toUint8Array(data));
    this.sentReports.push(report);
    await this.onSend?.(report);
  }

  addEventListener(type: string, listener: EventListener): void {
    if (type === 'inputreport') {
      this.inputListeners.add(listener as InputReportListener);
    }
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (type === 'inputreport') {
      this.inputListeners.delete(listener as InputReportListener);
    }
  }

  emitInput(frame: Uint8Array): void {
    const data = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
    const event = { data } as HIDInputReportEvent;
    this.inputListeners.forEach(listener => listener(event));
  }

  get inputListenerCount(): number {
    return this.inputListeners.size;
  }
}

export class MockHidManager {
  private readonly disconnectListeners = new Set<DisconnectListener>();

  addEventListener(type: string, listener: EventListener): void {
    if (type === 'disconnect') {
      this.disconnectListeners.add(listener as DisconnectListener);
    }
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (type === 'disconnect') {
      this.disconnectListeners.delete(listener as DisconnectListener);
    }
  }

  emitDisconnect(device: MockHidDevice): void {
    const event = { device } as HIDConnectionEvent;
    this.disconnectListeners.forEach(listener => listener(event));
  }

  get disconnectListenerCount(): number {
    return this.disconnectListeners.size;
  }
}

export function installMockNavigator(hid = new MockHidManager()): MockHidManager {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { hid },
  });
  return hid;
}

// 新协议（Amp v4）：Raw HID Report 直接承载 packet。
// GET/SET/Large 包：code(0) id(1) type(2) body(3...)
// Event 包：code(0) flag(1) body(2...)
// Log 包：code(0) reserved(1) length(2-3) body(4...)
// Debug 包：code(0) length(1) tick(2-5) body(6...)
export function decodeFrame(report: Uint8Array): DecodedFrame {
  const code = report[0];
  const bodyStart = code === 0x00 ? 2 : code === 0x03 ? 4 : 3;
  return {
    code,
    id: report[1],
    type: report[2],
    body: report.slice(bodyStart),
  };
}

export function makeFrame({
  code,
  id = 0,
  type = 0,
  body = new Uint8Array(),
}: Partial<DecodedFrame> & Pick<DecodedFrame, 'code'>): Uint8Array {
  const report = new Uint8Array(64);
  report[0] = code;
  report[1] = id;
  if (code === 0x00) {
    report.set(body, 2);
  } else if (code === 0x03) {
    new DataView(report.buffer).setUint16(2, body.length, true);
    report.set(body, 4);
  } else {
    report[2] = type;
    report.set(body, 3);
  }
  return report;
}

// 固件会把事务包原样回显（含 id），因此响应直接回填请求的 code/id/type。
export function responseFor(
  request: DecodedFrame,
  body = request.body,
): Uint8Array {
  return makeFrame({ code: request.code, id: request.id, type: request.type, body });
}

export function flushPromises(): Promise<void> {
  return new Promise(resolve => queueMicrotask(resolve));
}
