import { DynamicKey, DynamicKeyModTap, DynamicKeyMutex, DynamicKeyStroke4x4, DynamicKeyToggleKey, DynamicKeyType, IDynamicKey, KeyboardController, getEMIPathIdentifier, KeyboardKeycode, IAdvancedKey, IRGBBaseConfig, IRGBConfig, FirmwareVersion, MacroAction, IMacroAction, IFeature, Feature, ScriptLevel, Keycode, KeyboardKeyEvent, KeyboardConfigCode, BootloaderFeature} from "./../../interface";
import semver, { SemVer } from 'semver';

enum PacketCode {
  PacketCodeEvent = 0x00,
  PacketCodeSet = 0x01,
  PacketCodeGet = 0x02,
  PacketCodeLog = 0x03,
  PacketCodeLargeSet = 0x04,
  PacketCodeLargeGet = 0x05,
  PacketCodeDebug = 0x06,
  PacketCodeUser = 0xFF,
};

enum PacketData {
  PacketDataVersion = 0x00,
  PacketDataAdvancedKey = 0x01,
  PacketDataKeymap = 0x02,
  PacketDataRgbBaseConfig = 0x03,
  PacketDataRgbConfig = 0x04,
  PacketDataDynamicKey = 0x05,
  PacketDataProfileIndex = 0x06,
  PacketDataConfig = 0x07,
  PacketDataMacro = 0x0A,
  PacketDataFeature = 0x0B,
  PacketDataScriptSource = 0x0C,
  PacketDataScriptBytecode = 0x0D,
};
enum PacketEventFlag {
  PacketEventNoEvent = 0x00,
  PacketEventConfigChanged = 0x01,
};
enum LargeDataCmd {
    Start = 0x00,
    Payload = 0x01,
    End = 0x02,
    Abort = 0x03,
}
const REPORT_SIZE = 64;
const PACKET_ID_OFFSET = 1;
const DEBUG_PACKET_HEADER_SIZE = 6;
const DEBUG_ITEM_SIZE = 10;
const DEBUG_KEYS_PER_PACKET = 5;
const DEBUG_SUBSCRIBE_BASE = DEBUG_PACKET_HEADER_SIZE;
const LARGE_PAYLOAD_BASE = 10; // code(1)+id(1)+type(1)+sub_cmd(1)+offset(4)+length(2)

interface PendingTransaction {
    resolve: (packet: Uint8Array) => void;
    reject: (reason: any) => void;
    timer: number;
    code: number;
    type: number;
    processor?: (packet: Uint8Array) => void;
    session?: TransactionSession;
}

export class SessionCancelledError extends Error {
    constructor(public readonly sessionName: string, reason: string) {
        super(`Transaction '${sessionName}' was cancelled: ${reason}`);
        this.name = 'SessionCancelledError';
    }
}

export class TransactionSession {
    private cancelled = false;
    private cancelReason: string | null = null;

    constructor(public readonly name: string) {}

    isCancelled(): boolean {
        return this.cancelled;
    }

    getReason(): string | null {
        return this.cancelReason;
    }

    cancel(reason: string): void {
        if (this.cancelled) {
            return;
        }
        this.cancelled = true;
        this.cancelReason = reason;
    }
}

export class RequestQueue {
    private queue: { 
        task: () => Promise<any>; 
        resolve: (value: any) => void; 
        reject: (reason: any) => void 
    }[] = [];
    private isProcessing: boolean = false;

    /**
     * 添加一个任务到队列中
     * @param task 一个返回 Promise 的函数（例如：() => this.sendAndWait(...)）
     * @returns 返回该任务执行后的结果
     */
    public add<T>(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            // 将任务推入队列
            this.queue.push({ task, resolve, reject });
            // 尝试处理队列
            this.process();
        });
    }

    private async process() {
        // 如果正在处理中，直接返回，避免并发
        if (this.isProcessing) return;

        this.isProcessing = true;

        while (this.queue.length > 0) {
            // 取出第一个任务
            const item = this.queue.shift();
            if (item) {
                try {
                    // 执行任务并等待结果
                    const result = await item.task();
                    item.resolve(result);
                } catch (error) {
                    // 捕获错误并通知调用者
                    item.reject(error);
                }
            }
        }

        this.isProcessing = false;
    }
    public clear(reason: Error = new Error("Queue cleared")) {
        // 将队列中所有还未执行的 Promise 全部 reject 掉，防止外部 await 死等
        for (const item of this.queue) {
            item.reject(reason);
        }
        // 清空数组释放内存
        this.queue = [];
        // 释放处理锁
        this.isProcessing = false;
    }
}

export class LibampKeyboardController extends KeyboardController {
    device: HIDDevice | undefined;
    private handleInputReport: (event: HIDInputReportEvent) => void;
    profile_number:number = 4;
    profile_index:number = 0;
    private pendingTransactions = new Map<number, PendingTransaction>();
    private activeSession: TransactionSession | undefined;
    private nextId: number = 1;
    private txBuffer = new Uint8Array(64); // 复用发送缓冲区，避免GC
    private requestQueue = new RequestQueue();
    private reloadTimer: number | null = null;
    private isReloading: boolean = false;
    private refreshAgain: boolean = false;
    private profileSwitchReloadPending: boolean = false;
    private lastDebugTimeoutWarningAt: number = 0;
    private readonly reloadDebounceMs: number = 200;
    private readonly debugRequestTimeoutMs: number = 500;
    firmware_version : FirmwareVersion = { major: 0, minor: 0, patch: 0, info: "" };
    macros : MacroAction[][] = [[]];
    feature : Feature = {
        script_level: ScriptLevel.Disable,
        advanced_key_flag: true,
        rgb_flag: false,
        polling_rate: 1000,
        bootloader: new BootloaderFeature(true),
    };
    script_source : string = "";
    script_bytecode : Uint8Array = new Uint8Array();

    constructor() {
        super();
        this.device = undefined;this.handleInputReport = (event: HIDInputReportEvent) => {
            const data = new Uint8Array(event.data.buffer);
            const code = data[0];

            // 事务响应匹配：固件会把收到的事务包原样回显（含 id 字段），
            // 因此以 (code, id, type) 三元组关联请求与响应。
            if (code === PacketCode.PacketCodeGet ||
                code === PacketCode.PacketCodeSet ||
                code === PacketCode.PacketCodeLargeGet ||
                code === PacketCode.PacketCodeLargeSet) {
                const id = data[PACKET_ID_OFFSET];
                const pending = this.pendingTransactions.get(id);
                if (pending && pending.code === code && pending.type === data[2]) {
                    window.clearTimeout(pending.timer);
                    this.pendingTransactions.delete(id);
                    try {
                        pending.processor?.(data);
                        pending.resolve(data);
                    } catch (e) {
                        pending.reject(e);
                    }
                    return;
                }
            }

            if (code === PacketCode.PacketCodeLog) {
                const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
                const textLength = Math.min(data.byteLength - 4, view.getUint16(2, true));
                const textBytes = data.subarray(4, 4 + textLength);
                this.dispatchEvent(new CustomEvent('consoleData', {
                    detail: {
                        text: new TextDecoder().decode(textBytes),
                        data: textBytes,
                    }
                }));
                return;
            }

            if (this.isConfigChangedEvent(data)) {
                this.handleConfigChangedEvent();
                return;
            }

            this.packet_process(data);
        };

    }
    private async sendAndWait(
        buf: Uint8Array,
        timeout: number = 200,
        processor?: (packet: Uint8Array) => void,
        session?: TransactionSession,
    ): Promise<Uint8Array> {
        const id = this.allocateId();
        const packet = new Uint8Array(buf);
        packet[PACKET_ID_OFFSET] = id;
        return new Promise<Uint8Array>((resolve, reject) => {
            const timer = window.setTimeout(() => {
                if (this.pendingTransactions.get(id)) {
                    this.pendingTransactions.delete(id);
                    reject(new Error(`Timeout waiting for packet id ${id}, code ${packet[0]}, type ${packet[2]}`));
                }
            }, timeout);

            this.pendingTransactions.set(id, {
                resolve,
                reject,
                timer,
                code: packet[0],
                type: packet[2],
                processor,
                session,
            });

            this.sendReport(packet).catch((error) => {
                window.clearTimeout(timer);
                this.pendingTransactions.delete(id);
                reject(error);
            });
        });
    }

    private async enqueueCommand(
        buf: Uint8Array,
        timeout: number = 200,
        processor?: (packet: Uint8Array) => void,
        session?: TransactionSession,
    ): Promise<Uint8Array> {
        // 【关键点】必须复制一份数据！
        // 因为 buf 可能是 this.txBuffer，在排队等待期间可能会被修改。
        const packetCopy = new Uint8Array(buf);

        return this.requestQueue.add(async () => {
            if (session && session.isCancelled()) {
                throw new SessionCancelledError(session.name, session.getReason() ?? "unknown reason");
            }
            return await this.sendAndWait(packetCopy, timeout, processor, session);
        });
    }

    private handleDeviceDisconnect = (event: HIDConnectionEvent) => {
        if (this.device && event.device === this.device) {
            console.warn("[Controller] Device physically disconnected.");
            this.disconnect();
            this.dispatchEvent(new Event('deviceDisconnected'));
        }
    };

    private allocateId(): number {
        const id = this.nextId;
        this.nextId = (this.nextId + 1) & 0xFF;
        if (this.nextId === 0) {
            this.nextId = 1;
        }
        return id;
    }

    private async sendReport(report: Uint8Array): Promise<void> {
        if (!this.device || !this.device.opened) {
            throw new Error("Device is not connected");
        }
        await this.device.sendReport(0, report as BufferSource);
    }

    private isConfigChangedEvent(buf: Uint8Array): boolean {
        return buf[0] === PacketCode.PacketCodeEvent &&
            buf[1] === PacketEventFlag.PacketEventConfigChanged;
    }

    private handleConfigChangedEvent(): void {
        this.cancelActiveSession("Device requested a configuration reload");
        this.scheduleReload();
    }

    private isSupportedFirmwareVersion(): boolean {
        return this.firmware_version.major === 0 && this.firmware_version.minor === 1;
    }

    private cancelActiveSession(reason: string): void {
        const session = this.activeSession;
        if (!session || session.isCancelled()) {
            return;
        }
        session.cancel(reason);
        for (const [id, pending] of this.pendingTransactions) {
            if (pending.session === session) {
                window.clearTimeout(pending.timer);
                this.pendingTransactions.delete(id);
                pending.reject(new SessionCancelledError(session.name, reason));
            }
        }
    }

    private scheduleReload(): void {
        if (this.isReloading) {
            this.refreshAgain = true;
            return;
        }
        if (this.reloadTimer !== null) {
            window.clearTimeout(this.reloadTimer);
        }
        this.reloadTimer = window.setTimeout(() => {
            this.reloadTimer = null;
            void this.runReload();
        }, this.reloadDebounceMs);
    }

    private async runReload(): Promise<void> {
        if (this.isReloading) {
            this.refreshAgain = true;
            return;
        }
        if (this.reloadTimer !== null) {
            window.clearTimeout(this.reloadTimer);
            this.reloadTimer = null;
        }

        this.isReloading = true;
        this.dispatchEvent(new Event('updateDataStart'));
        try {
            do {
                this.refreshAgain = false;
                await this.read_data();
            } while (this.refreshAgain);
        } catch (e) {
            if (e instanceof SessionCancelledError) {
                console.warn(`Configuration reload was interrupted: ${e.message}`);
            } else {
                console.error("Error loading config:", e);
                this.dispatchEvent(new CustomEvent('updateDataError', {
                    detail: { error: e },
                }));
            }
        } finally {
            this.isReloading = false;
            this.profileSwitchReloadPending = false;
            if (this.refreshAgain) {
                this.refreshAgain = false;
                this.scheduleReload();
            }
            this.dispatchEvent(new Event('updateDataEnd'));
        }
    }

    private shouldSkipDebugRequest(): boolean {
        return this.isReloading || this.reloadTimer !== null || this.profileSwitchReloadPending;
    }

    write(buf: Uint8Array): number {
        try {
            const packet = new Uint8Array(buf);
            void this.requestQueue.add(() => this.sendReport(packet))
                .catch((e) => console.error("Failed to write packet", e));
        } catch (e) {
            console.error("Failed to write packet", e);
        }
        return buf.byteLength;
    }
    read(buf: Uint8Array): number {
        throw new Error('Method not implemented.');
    }
    read_timeout(buf: Uint8Array, timeout: number): number {
        throw new Error('Method not implemented.');
    }
    
    async connect(device: HIDDevice): Promise<boolean> {
        this.device = device;
        var result : boolean = false;
        if (! this.device.opened) {
            result = (await this.device.open()) == undefined
        } else {
            result = true;
        }
        if (result) {
            this.device.addEventListener("inputreport", this.handleInputReport);
            navigator.hid.addEventListener('disconnect', this.handleDeviceDisconnect);
            this.request();
        }
        return result;
    }
    disconnect(): void {
        if (this.device) {
            // 移除所有的事件监听
            this.device.removeEventListener("inputreport", this.handleInputReport);
            navigator.hid.removeEventListener('disconnect', this.handleDeviceDisconnect);
            
            // 关闭设备
            if (this.device.opened) {
                this.device.close();
            }
            this.device = undefined;
        }

        // 【新增】如果有正在等待底层返回的请求，立刻拒绝掉，防止队列卡死
        for (const pending of this.pendingTransactions.values()) {
            window.clearTimeout(pending.timer);
            pending.reject(new Error("Device disconnected abruptly"));
        }
        this.pendingTransactions.clear();

        if (this.activeSession) {
            this.activeSession.cancel("Device disconnected abruptly");
            this.activeSession = undefined;
        }

        if (this.reloadTimer !== null) {
            window.clearTimeout(this.reloadTimer);
            this.reloadTimer = null;
        }
        this.isReloading = false;
        this.refreshAgain = false;
        this.profileSwitchReloadPending = false;

        this.requestQueue.clear(new Error("Device disconnected abruptly"));
    }

    private async _set_large_data(dataType: number, data: Uint8Array, session?: TransactionSession): Promise<void> {
        const totalSize = data.length;
        // 载荷包头部: Code(1)+Id(1)+Type(1)+Sub(1)+Offset(4)+Len(2) = 10
        const maxPayloadSize = REPORT_SIZE - LARGE_PAYLOAD_BASE;

        // 1. 发送 START 包
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeLargeSet;
        this.txBuffer[2] = dataType;
        this.txBuffer[3] = LargeDataCmd.Start;
        
        const view = new DataView(this.txBuffer.buffer);
        view.setUint32(4, totalSize, true); // Total Size (Little Endian)
        // view.setUint32(8, checksum, true); // 如果需要校验和

        console.log(`[LargeData] Upload Start. Type: ${dataType}, Size: ${totalSize}`);
        
        // 这里的 timeout 稍微设长一点，因为下位机可能要擦除 Flash
        await this.enqueueCommand(this.txBuffer, 2000, undefined, session); 

        // 2. 循环发送 PAYLOAD
        let offset = 0;
        while (offset < totalSize) {
            const chunkSize = Math.min(maxPayloadSize, totalSize - offset);
            const chunk = data.subarray(offset, offset + chunkSize);

            this.txBuffer.fill(0);
            this.txBuffer[0] = PacketCode.PacketCodeLargeSet;
            this.txBuffer[2] = dataType;
            this.txBuffer[3] = LargeDataCmd.Payload;

            const payloadView = new DataView(this.txBuffer.buffer);
            payloadView.setUint32(4, offset, true); // Offset
            payloadView.setUint16(8, chunkSize, true); // Length
            this.txBuffer.set(chunk, LARGE_PAYLOAD_BASE); // Data

            // 发送数据包
            await this.enqueueCommand(this.txBuffer, 500, undefined, session); // 500ms 超时足够了
            
            offset += chunkSize;
        }

        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeLargeSet;
        this.txBuffer[2] = dataType;
        this.txBuffer[3] = LargeDataCmd.End;
        await this.enqueueCommand(this.txBuffer, 200, undefined, session);
       
        console.log(`[LargeData] Upload Complete.`);
    }

    // ==========================================
    // 通用长数据接收逻辑 (Device -> Host)
    // ==========================================
    private async _get_large_data(dataType: number, session?: TransactionSession): Promise<Uint8Array | null> {
        // 1. 发送 START 包查询大小
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeLargeGet;
        this.txBuffer[2] = dataType;
        this.txBuffer[3] = LargeDataCmd.Start;
        
        // 发送查询并等待回复
        // 回包被事务处理器解析，避免响应逃逸到调用方
        const startState = { totalSize: 0, checksum: 0 };
        await this.enqueueCommand(this.txBuffer, 1000, (packet) => {
            const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
            // PacketLargeData: Code(0), Id(1), Type(2), Sub(3), TotalSize(4-7), Checksum(8-11)
            startState.totalSize = view.getUint32(4, true);
            startState.checksum = view.getUint32(8, true);
        }, session);

        console.log(`[LargeData] Download Start. Type: ${dataType}, Size: ${startState.totalSize}`);

        if (startState.totalSize === 0) {
            return new Uint8Array(0);
        }

        const resultBuffer = new Uint8Array(startState.totalSize);
        let receivedSize = 0;
        const maxPayloadSize = REPORT_SIZE - LARGE_PAYLOAD_BASE;

        // 2. 循环拉取 PAYLOAD
        while (receivedSize < startState.totalSize) {
            const chunkSize = Math.min(maxPayloadSize, startState.totalSize - receivedSize);

            this.txBuffer.fill(0);
            this.txBuffer[0] = PacketCode.PacketCodeLargeGet;
            this.txBuffer[2] = dataType;
            this.txBuffer[3] = LargeDataCmd.Payload;
            
            const reqView = new DataView(this.txBuffer.buffer);
            reqView.setUint32(4, receivedSize, true); // Offset
            reqView.setUint16(8, chunkSize, true);    // Length to read

            // 发送请求并等待数据，响应在事务处理器内解析并暂存
            const chunkState = { actualLen: 0, actualOffset: 0 };
            await this.enqueueCommand(this.txBuffer, 500, (packet) => {
                const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
                // Payload: Sub(3), Offset(4-7), Length(8-9), Data(10...)
                chunkState.actualLen = view.getUint16(8, true);
                chunkState.actualOffset = view.getUint32(4, true);
                if (chunkState.actualOffset === receivedSize && chunkState.actualLen > 0) {
                    resultBuffer.set(packet.subarray(LARGE_PAYLOAD_BASE, LARGE_PAYLOAD_BASE + chunkState.actualLen), receivedSize);
                }
            }, session);

            // 安全检查
            if (chunkState.actualOffset !== receivedSize) {
                console.error(`[LargeData] Offset mismatch! Expected ${receivedSize}, got ${chunkState.actualOffset}`);
                throw new Error("Large Data Transfer Offset Mismatch");
            }
            
            if (chunkState.actualLen === 0) {
                 console.warn("[LargeData] Received 0 bytes, aborting.");
                 break;
            }

            receivedSize += chunkState.actualLen;
        }

        // 3. 校验 (可选)
        // const calcChecksum = crc32(resultBuffer);
        // if (calcChecksum !== checksum) { ... }
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeLargeGet;
        this.txBuffer[2] = dataType;
        this.txBuffer[3] = LargeDataCmd.End;
        await this.enqueueCommand(this.txBuffer, 200, undefined, session);

        console.log(`[LargeData] Download Complete.`);
        return resultBuffer;
    }

    
    packet_process(buf: Uint8Array)
    {
        switch (buf[0])
        {
        case PacketCode.PacketCodeGet:
        case PacketCode.PacketCodeSet:
            switch (buf[2])
            {
            case PacketData.PacketDataAdvancedKey:
                this.packet_process_advanced_key(buf);
                break;
            case PacketData.PacketDataKeymap:
                this.packet_process_keymap(buf);
                break;
            case PacketData.PacketDataRgbBaseConfig:
                this.packet_process_rgb_base_config(buf);
                break;
            case PacketData.PacketDataRgbConfig:
                this.packet_process_rgb_config(buf);
                break;
            case PacketData.PacketDataDynamicKey:
                this.packet_process_dynamic_key(buf);
                break;
            case PacketData.PacketDataProfileIndex:
                this.packet_process_profile_index(buf);
                break;
            case PacketData.PacketDataConfig:
                this.packet_process_config(buf);
                break;
            case PacketData.PacketDataMacro:
                this.packet_process_macro(buf);
                break;
            case PacketData.PacketDataVersion:
                this.packet_process_version(buf);
                break;
            case PacketData.PacketDataFeature:
                this.packet_process_feature(buf);
                break;
            default:
                break;
            }
            break;
        case PacketCode.PacketCodeDebug:
            this.packet_process_debug(buf);
            break;
        default:
            break;
        }
    }

    packet_process_advanced_key(buf : Uint8Array)
    {   
        let dataView = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);  
        if (buf[0] == PacketCode.PacketCodeGet) {
            const key_index = dataView.getUint16(3, true);
            const config = this.advanced_keys[key_index].config;
            config.mode = buf[5];
            config.calibration_mode = buf[6];
            config.activation_value = dataView.getUint16(7 + 2 * 0, true)/65535;
            config.deactivation_value = dataView.getUint16(7 + 2 * 1, true)/65535;
            config.trigger_distance = dataView.getUint16(7 + 2 * 2, true)/65535;
            config.release_distance = dataView.getUint16(7 + 2 * 3, true)/65535;
            config.trigger_speed = dataView.getUint16(7 + 2 * 4, true)/65535;
            config.release_speed = dataView.getUint16(7 + 2 * 5, true)/65535;
            config.upper_deadzone = dataView.getUint16(7 + 2 * 6, true)/65535;
            config.lower_deadzone = dataView.getUint16(7 + 2 * 7, true)/65535;
            config.upper_bound = dataView.getUint16(7 + 2 * 8, true);
            config.lower_bound = dataView.getUint16(7 + 2 * 9, true);
            console.log(this.advanced_keys[key_index]);
        }
        else (buf[0] == PacketCode.PacketCodeSet)
        {
            const key_index = dataView.getUint16(3, true);
            const config = this.advanced_keys[key_index].config;
            buf[5] = config.mode;
            buf[6] = config.calibration_mode;
            dataView.setUint16(7 + 2 * 0, config.activation_value*65535, true);
            dataView.setUint16(7 + 2 * 1, config.deactivation_value*65535, true);
            dataView.setUint16(7 + 2 * 2, config.trigger_distance*65535, true);
            dataView.setUint16(7 + 2 * 3, config.release_distance*65535, true);
            dataView.setUint16(7 + 2 * 4, config.trigger_speed*65535, true);
            dataView.setUint16(7 + 2 * 5, config.release_speed*65535, true);
            dataView.setUint16(7 + 2 * 6, config.upper_deadzone*65535, true);
            dataView.setUint16(7 + 2 * 7, config.lower_deadzone*65535, true);
            dataView.setUint16(7 + 2 * 8, config.upper_bound, true);
            dataView.setUint16(7 + 2 * 9, config.lower_bound, true);
        }
    }   

    packet_process_rgb_base_config(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);  
      if (buf[0] == PacketCode.PacketCodeGet) {
            this.rgb_base_config.mode = buf[3];
            this.rgb_base_config.rgb.red = buf[4];
            this.rgb_base_config.rgb.green = buf[5];
            this.rgb_base_config.rgb.blue = buf[6];
            this.rgb_base_config.secondary_rgb.red = buf[7];
            this.rgb_base_config.secondary_rgb.green = buf[8];
            this.rgb_base_config.secondary_rgb.blue = buf[9];
            this.rgb_base_config.speed = dataView.getUint16(10, true);
            this.rgb_base_config.direction = dataView.getUint16(12, true);
            this.rgb_base_config.density = buf[14];
            this.rgb_base_config.brightness = buf[15];
      }
      else (buf[0] == PacketCode.PacketCodeSet)
      {
            buf[3] = this.rgb_base_config.mode;
            buf[4] = this.rgb_base_config.rgb.red;
            buf[5] = this.rgb_base_config.rgb.green;
            buf[6] = this.rgb_base_config.rgb.blue;
            buf[7] = this.rgb_base_config.secondary_rgb.red;
            buf[8] = this.rgb_base_config.secondary_rgb.green;
            buf[9] = this.rgb_base_config.secondary_rgb.blue;
            dataView.setUint16(10,this.rgb_base_config.speed,true);
            dataView.setUint16(12,this.rgb_base_config.direction % 65536,true);
            buf[14] = this.rgb_base_config.density % 256;
            buf[15] = this.rgb_base_config.brightness % 256;
      }
    }

    packet_process_rgb_config(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);  
      if (buf[0] == PacketCode.PacketCodeGet) {
            const dataLength = buf[3];
            for (var i = 0; i < dataLength; i++)
            {
                const key_index = dataView.getUint16(4 + 0 + 8 * i, true);
                if (key_index<this.rgb_configs.length)
                {
                    this.rgb_configs[key_index].mode  = buf[4 + 8 * i + 2];
                    this.rgb_configs[key_index].rgb.red = buf[4 + 8 * i + 3];
                    this.rgb_configs[key_index].rgb.green = buf[4 + 8 * i + 4];
                    this.rgb_configs[key_index].rgb.blue = buf[4 + 8 * i + 5];
                    this.rgb_configs[key_index].speed = dataView.getUint16(4 + 8 * i + 6, true);
                }
            }
      }
      else if (buf[0] == PacketCode.PacketCodeSet)
      {
            const dataLength = buf[3];
            for (var i = 0; i < dataLength; i++)
            {
                const key_index = dataView.getUint16(4 + 0 + 8 * i,true);
                if (key_index<this.rgb_configs.length)
                {
                  buf[4 + 2 + 8 * i] = this.rgb_configs[key_index].mode;
                  buf[4 + 3 + 8 * i] = this.rgb_configs[key_index].rgb.red;
                  buf[4 + 4 + 8 * i] = this.rgb_configs[key_index].rgb.green;
                  buf[4 + 5 + 8 * i] = this.rgb_configs[key_index].rgb.blue;
                  dataView.setUint16(4 + 6 + 8 * i,this.rgb_configs[key_index].speed,true);
                }
            }
      }
    }

    packet_process_keymap(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);  
      if (buf[0] == PacketCode.PacketCodeGet) {
            const layer_index = buf[3];
            const layer_page_start = dataView.getUint16(4, true);
            const layer_page_length = buf[6];
            if (layer_index < this.keymap.length && layer_page_start + layer_page_length <= this.keymap[layer_index].length) 
            {
                for (let i = 0; i < layer_page_length; i++) {
                    this.keymap[layer_index][layer_page_start + i] = dataView.getUint16(7 + i*2, true);
                }
            }
      }
      else (buf[0] == PacketCode.PacketCodeSet)
      {
            const layer_index = buf[3];
            const layer = this.keymap[layer_index];
            const layer_page_start = dataView.getUint16(4, true);
            const layer_page_length = buf[6];
            var layer_seg;
            if (layer_page_start + layer_page_length > layer.length) {
                layer_seg = layer.slice(layer_page_start,layer.length); 
            }
            else
            {
                layer_seg = layer.slice(layer_page_start,layer_page_start+layer_page_length); 
            }
            dataView.setUint16(4,layer_page_start,true);
            buf[6] = layer_seg.length;
            layer_seg.forEach((value,k) => {
                dataView.setUint16(7 + k * 2,value,true);
            });
      }
    }

    packet_process_dynamic_key(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);  
      if (buf[0] == PacketCode.PacketCodeGet) {
            const dynamic_key_index = buf[3];
            var dynamic_key : IDynamicKey;
            const dynamic_key_type = dataView.getUint32(5,true);
            switch (dynamic_key_type) {
                case DynamicKeyType.DynamicKeyStroke:
                    var dynamic_key_stroke = new DynamicKeyStroke4x4();
                    dynamic_key_stroke.type = dataView.getUint32(5,true);
                    dynamic_key_stroke.bindings[0] = dataView.getUint16(5+4+0,true);
                    dynamic_key_stroke.bindings[1] = dataView.getUint16(5+4+2,true);
                    dynamic_key_stroke.bindings[2] = dataView.getUint16(5+4+4,true);
                    dynamic_key_stroke.bindings[3] = dataView.getUint16(5+4+6,true);
                    dynamic_key_stroke.key_control[0] = dataView.getUint8(5+12+0);
                    dynamic_key_stroke.key_control[1] = dataView.getUint8(5+12+1);
                    dynamic_key_stroke.key_control[2] = dataView.getUint8(5+12+2);
                    dynamic_key_stroke.key_control[3] = dataView.getUint8(5+12+3);
                    dynamic_key_stroke.press_begin_distance = dataView.getUint16(5+16,true)/65535;
                    dynamic_key_stroke.press_fully_distance = dataView.getUint16(5+18,true)/65535;
                    dynamic_key_stroke.release_begin_distance = dataView.getUint16(5+20,true)/65535;
                    dynamic_key_stroke.release_fully_distance = dataView.getUint16(5+22,true)/65535;
                    dynamic_key = dynamic_key_stroke;
                    break;
                case DynamicKeyType.DynamicKeyModTap:
                    var dynamic_key_mt = new DynamicKeyModTap();
                    dynamic_key_mt.type = dataView.getUint32(5,true);
                    dynamic_key_mt.bindings[0] = dataView.getUint16(5+4+0,true);
                    dynamic_key_mt.bindings[1] = dataView.getUint16(5+4+2,true);
                    dynamic_key_mt.duration = dataView.getUint32(5+8,true);
                    dynamic_key = dynamic_key_mt;
                    break;
                case DynamicKeyType.DynamicKeyToggleKey:
                    var dynamic_key_tk = new DynamicKeyToggleKey();
                    dynamic_key_tk.type = dataView.getUint32(5,true);
                    dynamic_key_tk.bindings[0] = dataView.getUint16(5+4+0,true);
                    dynamic_key = dynamic_key_tk;
                    break;
                case DynamicKeyType.DynamicKeyMutex:
                    var dynamic_key_m = new DynamicKeyMutex();
                    dynamic_key_m.type  = dataView.getUint32(5,true);
                    dynamic_key_m.bindings[0]  = dataView.getUint16(5+4+0,true);
                    dynamic_key_m.bindings[1]  = dataView.getUint16(5+4+2,true);
                    dynamic_key_m.mode  = dataView.getUint8(5+12);
                    dynamic_key = dynamic_key_m;
                    break;
                default:
                    dynamic_key = new DynamicKey();
                    break;
            }
            this.dynamic_keys[dynamic_key_index] = dynamic_key;
      }
      else (buf[0] == PacketCode.PacketCodeSet)
      {
            const index = buf[3];
            const item = this.dynamic_keys[index];
            console.debug(item);
            switch (item.type) {
                case DynamicKeyType.DynamicKeyStroke:
                    const dynamic_key_stroke = item as DynamicKeyStroke4x4;
                    dataView.setUint32(5,dynamic_key_stroke.type,true);
                    dataView.setUint16(5+4+0,dynamic_key_stroke.bindings[0],true);
                    dataView.setUint16(5+4+2,dynamic_key_stroke.bindings[1],true);
                    dataView.setUint16(5+4+4,dynamic_key_stroke.bindings[2],true);
                    dataView.setUint16(5+4+6,dynamic_key_stroke.bindings[3],true);
                    dataView.setUint8(5+12+0,dynamic_key_stroke.key_control[0]);
                    dataView.setUint8(5+12+1,dynamic_key_stroke.key_control[1]);
                    dataView.setUint8(5+12+2,dynamic_key_stroke.key_control[2]);
                    dataView.setUint8(5+12+3,dynamic_key_stroke.key_control[3]);
                    dataView.setUint16(5+16,dynamic_key_stroke.press_begin_distance*65535,true);
                    dataView.setUint16(5+18,dynamic_key_stroke.press_fully_distance*65535,true);
                    dataView.setUint16(5+20,dynamic_key_stroke.release_begin_distance*65535,true);
                    dataView.setUint16(5+22,dynamic_key_stroke.release_fully_distance*65535,true);
                    dataView.setUint16(5+24,dynamic_key_stroke.target_keys_location[0].id,true);
                    break;
                case DynamicKeyType.DynamicKeyModTap:
                    const dynamic_key_mt = item as DynamicKeyModTap;
                    dataView.setUint32(5,dynamic_key_mt.type,true);
                    dataView.setUint16(5+4+0,dynamic_key_mt.bindings[0],true);
                    dataView.setUint16(5+4+2,dynamic_key_mt.bindings[1],true);
                    dataView.setUint32(5+8,dynamic_key_mt.duration,true);
                    dataView.setUint16(5+12,dynamic_key_mt.target_keys_location[0].id,true);
                    break;
                case DynamicKeyType.DynamicKeyToggleKey:
                    const dynamic_key_tk = item as DynamicKeyToggleKey;
                    dataView.setUint32(5,dynamic_key_tk.type,true);
                    dataView.setUint16(5+4+0,dynamic_key_tk.bindings[0],true);
                    dataView.setUint16(5+6+0,dynamic_key_tk.target_keys_location[0].id,true);
                    break;
                case DynamicKeyType.DynamicKeyMutex:
                    const dynamic_key_m = item as DynamicKeyMutex;
                    dataView.setUint32(5,dynamic_key_m.type,true);
                    dataView.setUint16(5+4+0,dynamic_key_m.bindings[0],true);
                    dataView.setUint16(5+4+2,dynamic_key_m.bindings[1],true);
                    dataView.setUint16(5+8+0,dynamic_key_m.target_keys_location[0].id,true);
                    dataView.setUint16(5+8+2,dynamic_key_m.target_keys_location[1].id,true);
                    dataView.setUint8(5+12,dynamic_key_m.mode);
                default:
                    break;
            }
      }
    }

    packet_process_profile_index(buf : Uint8Array)
    {
      if (buf[0] == PacketCode.PacketCodeGet) {
        this.profile_index = buf[3];
      }
    }

    packet_process_config(buf : Uint8Array)
    {
        if (buf[0] === PacketCode.PacketCodeGet) {
            // GET: 接收来自下位机的数据并更新本地 config
            const length = buf[3];
            for (let i = 0; i < length; i++) {
                const index = buf[5 + i * 2];
                const value = buf[6 + i * 2] > 0;
                
                switch (index) {
                    case KeyboardConfigCode.KeyboardConfigDebug:
                        this.config.debug = value;
                        break;
                    case KeyboardConfigCode.KeyboardConfigNkro:
                        this.config.nkro = value;
                        break;
                    case KeyboardConfigCode.KeyboardConfigWinlock:
                        this.config.winlock = value;
                        break;
                    case KeyboardConfigCode.KeyboardConfigContinousPoll:
                        this.config.continuous_poll = value;
                        break;
                    case KeyboardConfigCode.KeyboardConfigEnableReport:
                        this.config.enable_report = value;
                        break;
                    case KeyboardConfigCode.KeyboardConfigConsole:
                        this.config.console = value;
                        break;
                }
            }
        }
        else if (buf[0] === PacketCode.PacketCodeSet) {
            // SET: 根据本地 config 填充即将发送给下位机的 Buffer
            const length = buf[3];
            for (let i = 0; i < length; i++) {
                const index = buf[5 + i * 2];
                let value = false;
                
                switch (index) {
                    case KeyboardConfigCode.KeyboardConfigDebug:
                        value = this.config.debug;
                        break;
                    case KeyboardConfigCode.KeyboardConfigNkro:
                        value = this.config.nkro;
                        break;
                    case KeyboardConfigCode.KeyboardConfigWinlock:
                        value = this.config.winlock;
                        break;
                    case KeyboardConfigCode.KeyboardConfigContinousPoll:
                        value = this.config.continuous_poll;
                        break;
                    case KeyboardConfigCode.KeyboardConfigEnableReport:
                        value = this.config.enable_report;
                        break;
                    case KeyboardConfigCode.KeyboardConfigConsole:
                        value = this.config.console;
                        break;
                }
                // 写入 boolean 对应的 0 或 1
                buf[6 + i * 2] = value ? 1 : 0;
            }
        }
        console.log(this.config);
    }

    private applyDebugPacket(buf : Uint8Array): { tick: number; updated_keys: number[] } | null
    {
      let dataView = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);  
      if (buf[0] == PacketCode.PacketCodeDebug) {
        const dataLength = buf[1];
        const tick = dataView.getUint32(2, true);
        const updated_keys: number[] = [];
        for (var i = 0; i < dataLength; i++)
        {
            const base = DEBUG_PACKET_HEADER_SIZE + DEBUG_ITEM_SIZE * i;
            const key_index = dataView.getUint16(base, true);
            updated_keys.push(key_index);
            if (key_index<this.advanced_keys.length)
            {
                this.advanced_keys[key_index].state = buf[base + 2] > 0;
                this.advanced_keys[key_index].report_state = buf[base + 3] > 0;
                this.advanced_keys[key_index].raw = dataView.getUint16(base + 4, true);
                this.advanced_keys[key_index].filtered_raw = dataView.getUint16(base + 6, true);
                this.advanced_keys[key_index].value = dataView.getUint16(base + 8, true)/65535;
            }
        }
        return {
            tick: tick,
            updated_keys: updated_keys,
        };
      }
      return null;
    }

    private dispatchDebugData(tick: number, updated_keys: number[]): void {
        this.dispatchEvent(new CustomEvent('updateDebugData', {
            detail: {
                tick: tick,
                updated_keys: updated_keys,
            }
        }));
    }

    private processDebugResults(results: Uint8Array[]): void {
        let tick = 0;
        const updated_keys: number[] = [];
        const seen = new Set<number>();
        results.forEach(res => {
            if (!res) {
                return;
            }
            const update = this.applyDebugPacket(res);
            if (!update) {
                return;
            }
            tick = update.tick;
            update.updated_keys.forEach(id => {
                if (!seen.has(id)) {
                    seen.add(id);
                    updated_keys.push(id);
                }
            });
        });
        if (updated_keys.length > 0) {
            this.dispatchDebugData(tick, updated_keys);
        }
    }

    private warnDebugRequestDisrupted(error: any): void {
        const now = Date.now();
        if (now - this.lastDebugTimeoutWarningAt < 2000) {
            return;
        }
        this.lastDebugTimeoutWarningAt = now;
        console.warn("Debug request disrupted, skipping current frame:", error);
    }

    packet_process_debug(buf : Uint8Array)
    {
      const update = this.applyDebugPacket(buf);
      if (update) {
        this.dispatchDebugData(update.tick, update.updated_keys);
      }
    }
    packet_process_version(buf: Uint8Array): boolean {
        let dataView = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        if (buf[0] == PacketCode.PacketCodeGet) {
            // Offset 3: info_length (uint16) - 暂时没用到，直接读后面的
            this.firmware_version.major = dataView.getUint32(5, true);
            this.firmware_version.minor = dataView.getUint32(9, true);
            this.firmware_version.patch = dataView.getUint32(13, true);
            
            const infoLen = dataView.getUint16(3, true);
            // 提取字符串，注意偏移量是 17
            const infoBytes = buf.slice(17, 17 + infoLen);
            const decoder = new TextDecoder('utf-8');
            this.firmware_version.info = decoder.decode(infoBytes).replace(/\0/g, ''); // 去除可能的空字符
            
            console.log("Firmware Version:", this.firmware_version);
            return true;
        }
        return false;
    }
    packet_process_feature(buf: Uint8Array) {
        let dataView = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        if (buf[0] == PacketCode.PacketCodeGet) {
            let features = dataView.getUint32(3, true);
            let rgb_features = dataView.getUint32(7, true);
            let script_support = dataView.getUint8(11);
        }
    }
    packet_process_macro(buf: Uint8Array) {
        const dataView = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        const code = buf[0];
        const macro_index = buf[3];
        const count = dataView.getUint16(4, true);

        // 确保本地数据结构存在 (仅在 GET 时或 SET 检查时需要)
        if (!this.macros[macro_index]) {
            this.macros[macro_index] = [];
        }

        let offset = 6; // Header 长度 (Code+Id+Type+Index+Length)
        const ACTION_SIZE = 12; // 结构体大小

        for (let i = 0; i < count; i++) {
            // Action 的 Index 字段偏移量是 offset + 4
            
            if (code === PacketCode.PacketCodeGet) {
                // === 接收逻辑 (反序列化) ===
                const delay = dataView.getUint32(offset, true);
                const idx = dataView.getUint16(offset + 4, true);
                const key_id = dataView.getUint16(offset + 6, true);
                const is_virtual = dataView.getUint8(offset + 8) > 0;
                const event = dataView.getUint8(offset + 9);
                const keycode = dataView.getUint16(offset + 10, true);

                this.macros[macro_index][idx] = {
                    delay : delay,
                    event : {
                        key_id : key_id,
                        is_virtual : is_virtual,
                        event : event,
                        keycode : keycode
                    }
                }
            } 
            else if (code === PacketCode.PacketCodeSet) {
                // === 发送逻辑 (序列化) ===
                // 对于 SET 包，调用者 (send_macros) 必须已经预先在 Buffer 中填好了
                // 它想要发送的 Action Index (位于 offset+4)。
                // 我们根据这个 Index 去 this.macros 里拿数据填入 Buffer 的其他字段。
                
                const idx = dataView.getUint16(offset + 4, true);
                const action = this.macros[macro_index][idx];

                if (action) {
                    dataView.setUint32(offset, action.delay, true);
                    // offset+4 (idx) 已经被调用者填好了，不需要重写，或者重写一遍也无妨
                    dataView.setUint16(offset + 6, action.event.key_id, true);
                    dataView.setUint8(offset + 8, action.event.is_virtual ? 1 : 0);
                    dataView.setUint8(offset + 9, action.event.event);
                    dataView.setUint16(offset + 10, action.event.keycode, true);
                } else {
                    // 如果本地没有这个 Action (越界或空)，填充 0 或默认值
                    // 通常建议填充 MacroEnd (0)
                    dataView.setUint32(offset, 0, true);
                    dataView.setUint16(offset + 6, 0, true);
                    dataView.setUint8(offset + 8, 0);
                    dataView.setUint8(offset + 9, 0);
                    dataView.setUint16(offset + 10, 0, true);
                }
            }

            offset += ACTION_SIZE;
        }
        
        if (code === PacketCode.PacketCodeGet) {
            console.log(`Processed Macro ${macro_index} (GET), count: ${count}`);
        }
    }
    get_connection_state(): boolean {
        return this.device != undefined;
    }

    fetch(): void {
        throw new Error('Method not implemented.');
    }

    async save() {
        console.log("Starting save config...");
        const session = new TransactionSession('save');
        this.activeSession = session;
        try {
            await this.write_config(session);
            await this.write_advanced_keys(session);
            await this.write_rgb_configs(session);
            await this.write_keymap(session);
            await this.write_dynamic_keys(session);
            await this.write_macros(session);
            if (this.feature.script_level != ScriptLevel.Disable) {
                await this.write_script_source(this.script_source, session);
                if (this.feature.script_level == ScriptLevel.AOT) {
                    await this.write_script_bytecode(this.script_bytecode, session);
                }
            }
        } catch (e) {
            if (session.isCancelled()) {
                throw new SessionCancelledError(session.name, session.getReason() ?? "session cancelled");
            }
            throw e;
        } finally {
            if (this.activeSession === session) {
                this.activeSession = undefined;
            }
        }
    }
    flash(): void {
        const send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[2] = 0x03;
        send_buf[3] = Keycode.KeyboardOperation;
        send_buf[4] = KeyboardKeycode.KeyboardSave;
        send_buf[7] = 1;
        this.write(send_buf);
    }

    calibrate(): void {
        const send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[2] = 0x01;
        send_buf[3] = Keycode.KeyboardOperation;
        send_buf[4] = KeyboardKeycode.KeyboardCalibrate;
        send_buf[7] = 1;
        this.write(send_buf);
    }
    system_reset(): void {
        const send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[2] = 0x03;
        send_buf[3] = Keycode.KeyboardOperation;
        send_buf[4] = KeyboardKeycode.KeyboardReboot;
        send_buf[7] = 1;
        this.write(send_buf);
    }
    factory_reset(): void {
        const send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[2] = 0x03;
        send_buf[3] = Keycode.KeyboardOperation;
        send_buf[4] = KeyboardKeycode.KeyboardFactoryReset;
        send_buf[7] = 1;
        this.write(send_buf);
    }
    enter_bootloader(): void {
        const send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[2] = 0x03;
        send_buf[3] = Keycode.KeyboardOperation;
        send_buf[4] = KeyboardKeycode.KeyboardBootloader;
        send_buf[7] = 1;
        this.write(send_buf);
    }
    async read_data(): Promise<void> {
        const session = new TransactionSession('read_data');
        this.activeSession = session;
        try {
            await this.read_config(session);
            if (this.feature.advanced_key_flag) {
                await this.read_advanced_keys(session);
            }
            if (this.feature.rgb_flag) {
                await this.read_rgb_configs(session);
            }
            await this.read_keymap(session);
            if (this.dynamic_keys.length > 0) {
                await this.read_dynamic_keys(session);
            }
            if (this.macros.length > 0) {
                await this.read_macros(session);
            }
            if (this.profile_number > 1) {
                await this.read_config_index(session);
            }
            if (this.feature.script_level != ScriptLevel.Disable) {
                await this.read_script_source(session);
                await this.read_script_bytecode(session);
            }
        } catch (e) {
            if (session.isCancelled()) {
                throw new SessionCancelledError(session.name, session.getReason() ?? "session cancelled");
            }
            throw e;
        } finally {
            if (this.activeSession === session) {
                this.activeSession = undefined;
            }
        }
        console.log("Config loaded successfully");
        this.dispatchEvent(new Event('updateData'));
    }
    async request(): Promise<void> {
      try {
          const version = await this.request_version();
          if (version && this.isSupportedFirmwareVersion()) {
              await this.runReload();
          }
      } catch (e) {
          console.error("Error loading config:", e);
      }
    }
    private async sendDebugPacket(length: number, ids: number[]): Promise<void> {
        if (this.shouldSkipDebugRequest()) {
            return;
        }
        const send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeDebug;
        send_buf[1] = length;
        const dataView = new DataView(send_buf.buffer);
        ids.forEach((keyIndex, j) => {
            dataView.setUint16(DEBUG_SUBSCRIBE_BASE + j * DEBUG_ITEM_SIZE, keyIndex, true);
        });
        try {
            await this.requestQueue.add(() => this.sendReport(send_buf));
        } catch (e) {
            this.warnDebugRequestDisrupted(e);
        }
    }

    async request_debug(): Promise<void> {
        // length=0：清空订阅窗口，固件自主轮换推流整个键盘
        await this.sendDebugPacket(0, []);
    }

    async request_debug_at(ids: number[]): Promise<void> {
        if (this.shouldSkipDebugRequest()) {
            return;
        }
        // 如果传入的数组为空，直接返回，避免发送无用数据包
        if (!ids || ids.length === 0) {
            return;
        }
        // 定点订阅（如示波器）：固件订阅窗口只有 5 个槽位且为覆盖式，一包即可
        const subscribe = ids.slice(0, DEBUG_KEYS_PER_PACKET);
        await this.sendDebugPacket(subscribe.length, subscribe);
    }
    start_debug(): void {
        const send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[2] = 0x03;
        send_buf[3] = Keycode.KeyboardOperation;
        send_buf[4] = 32 | (1<<6);
        send_buf[7] = 1;
        this.write(send_buf);
    }
    stop_debug(): void {
        const send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[2] = 0x03;
        send_buf[3] = Keycode.KeyboardOperation;
        send_buf[4] = 32 | (0<<6);
        send_buf[7] = 1;
        this.write(send_buf);
    }

    async send_advanced_key_packet(index: number, advanced_key: IAdvancedKey, session?: TransactionSession): Promise<void> {
        const send_buf = new Uint8Array(64);
        const dataView = new DataView(send_buf.buffer);
        const config = advanced_key.config;

        send_buf[0] = PacketCode.PacketCodeSet;
        send_buf[2] = PacketData.PacketDataAdvancedKey;
        dataView.setUint16(3, index, true);
        send_buf[5] = config.mode;
        send_buf[6] = config.calibration_mode;
        dataView.setUint16(7, config.activation_value * 65535, true);
        dataView.setUint16(9, config.deactivation_value * 65535, true);
        dataView.setUint16(11, config.trigger_distance * 65535, true);
        dataView.setUint16(13, config.release_distance * 65535, true);
        dataView.setUint16(15, config.trigger_speed * 65535, true);
        dataView.setUint16(17, config.release_speed * 65535, true);
        dataView.setUint16(19, config.upper_deadzone * 65535, true);
        dataView.setUint16(21, config.lower_deadzone * 65535, true);
        dataView.setUint16(23, config.upper_bound, true);
        dataView.setUint16(25, config.lower_bound, true);

        await this.enqueueCommand(send_buf, 200, undefined, session);
    }

    async send_keymap_packet(layer: number, start: number, length: number, keymap: number[], session?: TransactionSession): Promise<void> {
        const maxKeycodesPerPacket = Math.floor((REPORT_SIZE - 7) / 2);
        if (!Number.isInteger(length) || length < 0 || length > maxKeycodesPerPacket) {
            throw new RangeError(`Keymap packet length must be between 0 and ${maxKeycodesPerPacket}`);
        }
        if (keymap.length !== length) {
            throw new RangeError(`Keymap packet length ${length} does not match ${keymap.length} keycodes`);
        }

        const send_buf = new Uint8Array(64);
        const dataView = new DataView(send_buf.buffer);
        send_buf[0] = PacketCode.PacketCodeSet;
        send_buf[2] = PacketData.PacketDataKeymap;
        send_buf[3] = layer;
        dataView.setUint16(4, start, true);
        send_buf[6] = length;
        keymap.forEach((keycode, offset) => {
            dataView.setUint16(7 + offset * 2, keycode, true);
        });

        await this.enqueueCommand(send_buf, 200, undefined, session);
    }

    async send_dynamic_key_packet(index: number, dynamic_key: IDynamicKey, session?: TransactionSession): Promise<void> {
        const send_buf = new Uint8Array(64);
        const dataView = new DataView(send_buf.buffer);
        const targetKeyId = (targetIndex: number): number => {
            const target = dynamic_key.target_keys_location[targetIndex];
            if (!target) {
                throw new Error(`Dynamic key ${index} is missing target key ${targetIndex}`);
            }
            return target.id;
        };

        send_buf[0] = PacketCode.PacketCodeSet;
        send_buf[2] = PacketData.PacketDataDynamicKey;
        send_buf[3] = index;
        dataView.setUint32(5, dynamic_key.type, true);

        switch (dynamic_key.type) {
            case DynamicKeyType.DynamicKeyStroke: {
                const item = dynamic_key as DynamicKeyStroke4x4;
                dataView.setUint16(9, item.bindings[0], true);
                dataView.setUint16(11, item.bindings[1], true);
                dataView.setUint16(13, item.bindings[2], true);
                dataView.setUint16(15, item.bindings[3], true);
                dataView.setUint8(17, item.key_control[0]);
                dataView.setUint8(18, item.key_control[1]);
                dataView.setUint8(19, item.key_control[2]);
                dataView.setUint8(20, item.key_control[3]);
                dataView.setUint16(21, item.press_begin_distance * 65535, true);
                dataView.setUint16(23, item.press_fully_distance * 65535, true);
                dataView.setUint16(25, item.release_begin_distance * 65535, true);
                dataView.setUint16(27, item.release_fully_distance * 65535, true);
                dataView.setUint16(29, targetKeyId(0), true);
                break;
            }
            case DynamicKeyType.DynamicKeyModTap: {
                const item = dynamic_key as DynamicKeyModTap;
                dataView.setUint16(9, item.bindings[0], true);
                dataView.setUint16(11, item.bindings[1], true);
                dataView.setUint32(13, item.duration, true);
                dataView.setUint16(17, targetKeyId(0), true);
                break;
            }
            case DynamicKeyType.DynamicKeyToggleKey: {
                const item = dynamic_key as DynamicKeyToggleKey;
                dataView.setUint16(9, item.bindings[0], true);
                dataView.setUint16(11, targetKeyId(0), true);
                break;
            }
            case DynamicKeyType.DynamicKeyMutex: {
                const item = dynamic_key as DynamicKeyMutex;
                dataView.setUint16(9, item.bindings[0], true);
                dataView.setUint16(11, item.bindings[1], true);
                dataView.setUint16(13, targetKeyId(0), true);
                dataView.setUint16(15, targetKeyId(1), true);
                dataView.setUint8(17, item.mode);
                break;
            }
        }

        await this.enqueueCommand(send_buf, 200, undefined, session);
    }

    async send_rgb_base_packet(rgb_base_config: IRGBBaseConfig, session?: TransactionSession): Promise<void> {
        const send_buf = new Uint8Array(64);
        const dataView = new DataView(send_buf.buffer);
        send_buf[0] = PacketCode.PacketCodeSet;
        send_buf[2] = PacketData.PacketDataRgbBaseConfig;
        send_buf[3] = rgb_base_config.mode;
        send_buf[4] = rgb_base_config.rgb.red;
        send_buf[5] = rgb_base_config.rgb.green;
        send_buf[6] = rgb_base_config.rgb.blue;
        send_buf[7] = rgb_base_config.secondary_rgb.red;
        send_buf[8] = rgb_base_config.secondary_rgb.green;
        send_buf[9] = rgb_base_config.secondary_rgb.blue;
        dataView.setUint16(10, rgb_base_config.speed, true);
        dataView.setUint16(12, rgb_base_config.direction % 65536, true);
        send_buf[14] = rgb_base_config.density % 256;
        send_buf[15] = rgb_base_config.brightness % 256;

        await this.enqueueCommand(send_buf, 200, undefined, session);
    }

    async send_rgb_packet(index: number, rgb_config: IRGBConfig, session?: TransactionSession): Promise<void> {
        const send_buf = new Uint8Array(64);
        const dataView = new DataView(send_buf.buffer);
        send_buf[0] = PacketCode.PacketCodeSet;
        send_buf[2] = PacketData.PacketDataRgbConfig;
        send_buf[3] = 1;
        dataView.setUint16(4, index, true);
        send_buf[6] = rgb_config.mode;
        send_buf[7] = rgb_config.rgb.red;
        send_buf[8] = rgb_config.rgb.green;
        send_buf[9] = rgb_config.rgb.blue;
        dataView.setUint16(10, rgb_config.speed, true);

        await this.enqueueCommand(send_buf);
    }
    
    async write_advanced_keys(session: TransactionSession) {
        for(let index = 0; index < this.advanced_keys.length; index++) {
            await this.send_advanced_key_packet(index, this.advanced_keys[index], session);
        }
    }

    async read_advanced_keys(session: TransactionSession) {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeGet;
        this.txBuffer[2] = PacketData.PacketDataAdvancedKey;
        const dataView = new DataView(this.txBuffer.buffer);
        for (let index = 0; index < this.advanced_keys.length; index++) {
            dataView.setUint16(3, index, true);
            await this.enqueueCommand(this.txBuffer, 200, (packet) => {
                this.packet_process_advanced_key(packet);
            }, session);
            console.debug(`Read Advanced Key: ${index}`);
        }
    }
    async write_rgb_configs(session: TransactionSession) {
        await this.send_rgb_base_packet(this.rgb_base_config, session);
        const rgb_page_num = Math.ceil(this.rgb_configs.length / 7);
        for (let i = 0; i < rgb_page_num; i++) {
            this.txBuffer.fill(0);
            this.txBuffer[0] = PacketCode.PacketCodeSet;
            this.txBuffer[2] = PacketData.PacketDataRgbConfig;

            let page_length = (i + 1) * 7 > this.rgb_configs.length ? this.rgb_configs.length % 7 : 7;
            this.txBuffer[3] = page_length;
            
            let dataView = new DataView(this.txBuffer.buffer);

            for (let j = 0; j < page_length; j++) {
                let rgb_index = i * 7 + j;
                dataView.setUint16(4 + 8 * j, rgb_index, true); 
            }
            this.packet_process(this.txBuffer);

            await this.enqueueCommand(this.txBuffer, 200, undefined, session);
        }
    }

    async read_rgb_configs(session: TransactionSession) {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeGet;
        this.txBuffer[2] = PacketData.PacketDataRgbBaseConfig;
        
        await this.enqueueCommand(this.txBuffer, 200, (packet) => {
            this.packet_process(packet);
        }, session);

        const rgb_page_num = Math.ceil(this.rgb_configs.length / 7);
        for (let rgb_page_index = 0; rgb_page_index < rgb_page_num; rgb_page_index++) {
            this.txBuffer.fill(0);
            this.txBuffer[0] = PacketCode.PacketCodeGet;
            this.txBuffer[2] = PacketData.PacketDataRgbConfig;
            
            let page_length = (rgb_page_index + 1) * 7 > this.rgb_configs.length ? this.rgb_configs.length % 7 : 7;
            this.txBuffer[3] = page_length;
            
            const dataView = new DataView(this.txBuffer.buffer);
            for (let j = 0; j < page_length; j++) {
                let rgb_index = rgb_page_index * 7 + j;
                if (rgb_index < this.rgb_configs.length) {
                    dataView.setUint16(4 + 0 + 8 * j, rgb_index, true);
                }
            }

            await this.enqueueCommand(this.txBuffer, 200, (packet) => {
                this.packet_process(packet);
            }, session);
            console.debug(`Read RGB Page: ${rgb_page_index}`);
        }
    }
    async write_keymap(session: TransactionSession) {const layer_page_length = 16;
        for (let i = 0; i < this.keymap.length; i++) {
            const layer = this.keymap[i];
            for (let index = 0; index < layer.length; index += layer_page_length) {
                const layer_segment = layer.slice(index, index + layer_page_length);
                await this.send_keymap_packet(i, index, layer_segment.length, layer_segment, session);
            }
        }
        console.debug("Sent Keymap");
    }

    async read_keymap(session: TransactionSession) {
        const layer_page_length = 16;
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeGet;
        this.txBuffer[2] = PacketData.PacketDataKeymap;
        const dataView = new DataView(this.txBuffer.buffer);

        for (let i = 0; i < this.keymap.length; i++) {
            const layer = this.keymap[i];
            for (let index = 0; index < layer.length; index += layer_page_length) {
                let layer_seg_len = (index + layer_page_length > layer.length) ? (layer.length - index) : layer_page_length;
                
                this.txBuffer[3] = i; // layer index
                dataView.setUint16(4, index, true); // start index
                this.txBuffer[6] = layer_seg_len; // length

                await this.enqueueCommand(this.txBuffer, 200, (packet) => {
                    this.packet_process_keymap(packet);
                }, session);
            }
        }
    }

    async write_dynamic_keys(session: TransactionSession) {
        for (let i = 0; i < this.dynamic_keys.length; i++) {
            await this.send_dynamic_key_packet(i, this.dynamic_keys[i], session);
        }
        console.debug("Sent Dynamic Keys");
    }

    async read_dynamic_keys(session: TransactionSession) {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeGet;
        this.txBuffer[2] = PacketData.PacketDataDynamicKey;
        
        for (let i = 0; i < this.dynamic_keys.length; i++) {
            this.txBuffer[3] = i; // index
            await this.enqueueCommand(this.txBuffer, 200, (packet) => {
                this.packet_process(packet);
            }, session);
        }
    }

    async read_config_index(session: TransactionSession) {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeGet;
        this.txBuffer[2] = PacketData.PacketDataProfileIndex;
        await this.enqueueCommand(this.txBuffer, 200, (packet) => {
            this.packet_process(packet);
        }, session);
    }

    async write_macros(session: TransactionSession) {
        const MAX_ACTIONS_PER_PACKET = 4; // (64-6)/12 = 4.8
        const ACTION_SIZE = 12;

        for (let macro_idx = 0; macro_idx < this.macros.length; macro_idx++) {
            const macro_actions = this.macros[macro_idx];
            // 即使是空宏，可能也需要发一个包去清空，视固件逻辑而定
            // 这里假设如果不为空才发
            if (!macro_actions || macro_actions.length === 0) continue;

            const page_count = Math.ceil(macro_actions.length / MAX_ACTIONS_PER_PACKET);

            for (let page = 0; page < page_count; page++) {
                // 1. 准备 Header
                this.txBuffer.fill(0);
                this.txBuffer[0] = PacketCode.PacketCodeSet;
                this.txBuffer[2] = PacketData.PacketDataMacro;
                this.txBuffer[3] = macro_idx;

                const start_idx = page * MAX_ACTIONS_PER_PACKET;
                const end_idx = Math.min(start_idx + MAX_ACTIONS_PER_PACKET, macro_actions.length);
                const current_count = end_idx - start_idx;

                const dataView = new DataView(this.txBuffer.buffer);
                dataView.setUint16(4, current_count, true); // Length

                // 2. 预填充 Index 字段
                // 我们告诉 packet_process_macro: "我要发送第 X, Y, Z 号 Action，请把数据填进来"
                let offset = 6;
                for (let i = 0; i < current_count; i++) {
                    const abs_index = start_idx + i;
                    // 在 struct 的 offset+4 处写入 index
                    dataView.setUint16(offset + 4, abs_index, true);
                    offset += ACTION_SIZE;
                }

                // 3. 【核心】调用统一处理函数进行数据填充
                // 这一步会读取 this.macros 并填入 txBuffer
                this.packet_process_macro(this.txBuffer); 

                // 4. 发送
                await this.enqueueCommand(this.txBuffer, 200, undefined, session);
            }
        }
        console.debug("Sent Macros");
    }

    async read_macros(session: TransactionSession) {
        const ACTIONS_PER_PACKET = 4;
        const ACTION_SIZE = 12;


        for (let m = 0; m < this.macros.length; m++) {
            const MACRO_MAX_ACTIONS = this.macros[0].length; 
            const page_count = Math.ceil(MACRO_MAX_ACTIONS / ACTIONS_PER_PACKET);

            for (let page = 0; page < page_count; page++) {
                // 1. 准备 Header
                this.txBuffer.fill(0);
                this.txBuffer[0] = PacketCode.PacketCodeGet;
                this.txBuffer[2] = PacketData.PacketDataMacro;
                this.txBuffer[3] = m; // macro_index

                const start_idx = page * ACTIONS_PER_PACKET;
                const count = Math.min(ACTIONS_PER_PACKET, MACRO_MAX_ACTIONS - start_idx);
                
                const dataView = new DataView(this.txBuffer.buffer);
                dataView.setUint16(4, count, true); // length

                // 2. 填充请求的 Index
                let offset = 6;
                for (let i = 0; i < count; i++) {
                    dataView.setUint16(offset + 4, start_idx + i, true);
                    offset += ACTION_SIZE;
                }

                // 3. 发送请求并处理回包
                // 回包是一个 GET 类型的包，packet_process_macro 会自动将其写入 this.macros
                await this.enqueueCommand(this.txBuffer, 200, (packet) => {
                    this.packet_process_macro(packet);
                }, session);
            }
        }
        console.log("Macros read complete");
    }

    async write_config(session: TransactionSession) {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeSet;
        this.txBuffer[2] = PacketData.PacketDataConfig;
        
        // 我们要写入的配置数量
        const numConfigs = KeyboardConfigCode.KeyboardConfigNum; 
        this.txBuffer[3] = numConfigs;
        this.txBuffer[4] = 0; // reserved

        // 预填充 Index
        for (let i = 0; i < numConfigs; i++) {
            this.txBuffer[5 + i * 2] = i; 
        }

        // 调用刚才写好的处理函数，它会根据上面填入的 index 将对应的数据值填入 Buffer
        this.packet_process_config(this.txBuffer);

        await this.enqueueCommand(this.txBuffer, 200, undefined, session);
        console.debug("Sent Keyboard Config");
    }

    async read_config(session: TransactionSession) {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeGet;
        this.txBuffer[2] = PacketData.PacketDataConfig;
        
        const numConfigs = KeyboardConfigCode.KeyboardConfigNum;
        this.txBuffer[3] = numConfigs;
        this.txBuffer[4] = 0; // reserved

        // 告诉下位机我们要查询哪几个 Index 的配置
        for (let i = 0; i < numConfigs; i++) {
            this.txBuffer[5 + i * 2] = i; 
        }

        await this.enqueueCommand(this.txBuffer, 200, (packet) => {
            this.packet_process_config(packet);
        }, session);
        console.debug("Read Keyboard Config");
    }
    get_profile_num(): number {
        return this.profile_number;
    }

    get_profile_index(): number {
        return this.profile_index;
    }

    async set_profile_index(index: number) {
        this.profile_index = index;
        this.profileSwitchReloadPending = true;
        const commandId = this.profile_index + 0x10;

        // 1. 准备指令 (Event 包：code, flag, event, keycode(2), id(2), is_virtual)
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeEvent;
        this.txBuffer[2] = 0x03;
        this.txBuffer[3] = Keycode.KeyboardOperation;
        this.txBuffer[4] = commandId;
        this.txBuffer[7] = 1;
        console.log(`Commanding switch to config ${index}...`);

        try {
            // Event 包无回显，固件切换 profile 后会主动发送 ConfigChanged 事件，
            // 此处同时保留防抖重读作为兜底。
            await this.requestQueue.add(() => this.sendReport(new Uint8Array(this.txBuffer)));
            console.log("Config switch command sent. Requesting data...");
            this.scheduleReload();
        } catch (e) {
            this.profileSwitchReloadPending = false;
            console.error("Config switch failed:", e);
        }
    }

    async request_version() {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeGet;
        this.txBuffer[2] = PacketData.PacketDataVersion;
        
        try {
            // 使用队列发送并等待回复，回包在事务处理器内解析
            const version: { ok: boolean } = { ok: false };
            await this.enqueueCommand(this.txBuffer, 200, (packet) => {
                version.ok = this.packet_process_version(packet);
            });
            if (!version.ok) {
                return null;
            }
            // 返回快照，避免调用方持有共享的可变缓存对象
            return { ...this.firmware_version };
        } catch (e) {
            console.error("Failed to get firmware version", e);
            return null;
        }
    }
    
    get_firmware_version() {
        return this.firmware_version;
    }

    get_macros(): IMacroAction[][] {
        return this.macros;
    }
    set_macros(macros: IMacroAction[][]): void {
        this.macros = macros;
    }

    get_readme_markdown(): string {
        return "Powered by libamp";
    }
    
    get_feature(): IFeature {
        return this.feature;
    }

    async write_script_source(sourceCode: string, session?: TransactionSession): Promise<void> {
        // 将字符串编码为 UTF-8 字节流
        const encoder = new TextEncoder();
        const data = encoder.encode(sourceCode);
        const dataWithNull = new Uint8Array(data.length + 1);
        dataWithNull.set(data);
        console.log("script source",dataWithNull);
        
        // 假设 PacketData.PacketDataScriptSource = 0x0C
        await this._set_large_data(0x0C, dataWithNull, session); 
    }

    // 获取脚本源码
    async read_script_source(session?: TransactionSession) {
        // 假设 PacketData.PacketDataScriptSource = 0x0C
        const data = await this._get_large_data(0x0C, session);
        console.log(data);
        
        if (!data)
        {
            this.script_source = "";
            return;
        };
        let validLength = data.length;
        for (let i = 0; i < data.length; i++) {
            if (data[i] === 0x00 || data[i] === 0xFF) {
                validLength = i;
                break;
            }
        }
        
        // 只提取有效长度的字节进行解码
        const validData = data.subarray(0, validLength);
        
        const decoder = new TextDecoder();
        this.script_source = decoder.decode(validData);
        console.log(this.script_source);
    }
    // 设置脚本字节码
    async write_script_bytecode(bytecode: Uint8Array, session?: TransactionSession): Promise<void> {
        await this._set_large_data(0x0D, bytecode, session);
    }

    // 获取脚本字节码
    async read_script_bytecode(session?: TransactionSession){
        var bytecode = await this._get_large_data(0x0D, session);
        console.log(bytecode);
        if (bytecode)
        {
            this.script_bytecode = bytecode;
        }
    }

    get_script_source(): string {
        return this.script_source;
    }
    set_script_source(script: string): void {
        this.script_source = script;
    }
    get_script_bytecode(): Uint8Array {
        return this.script_bytecode;
    }
    set_script_bytecode(bytecode: Uint8Array): void {
        this.script_bytecode = bytecode;
    }

    async emit(event : KeyboardKeyEvent, use_keymap: boolean) {
        const send_buf = new Uint8Array(64);
        const dataView = new DataView(send_buf.buffer);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[2] = event.event;
        dataView.setUint16(3, event.keycode ,true);
        dataView.setUint16(5, event.key_id ,true);
        send_buf[7] = event.is_virtual ? 1 : 0;
        send_buf[8] = use_keymap ? 1 : 0;

        try {
            await this.requestQueue.add(() => this.sendReport(send_buf));
        } catch (e) {
            console.error("emit failed:", e);
        }
    }
}
