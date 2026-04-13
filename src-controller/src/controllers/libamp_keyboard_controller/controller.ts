import { DynamicKey, DynamicKeyModTap, DynamicKeyMutex, DynamicKeyStroke4x4, DynamicKeyToggleKey, DynamicKeyType, IDynamicKey, KeyboardController, getEMIPathIdentifier, KeyboardKeycode, IAdvancedKey, IRGBBaseConfig, IRGBConfig, CalibrationMode} from "./../../interface";

enum PacketCode {
  PacketCodeEvent = 0x00,
  PacketCodeSet = 0x01,
  PacketCodeGet = 0x02,
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
  PacketDataDebug = 0x08,
};

export class LibampKeyboardController extends KeyboardController {
    device: HIDDevice | undefined;
    private handleInputReport: (event: HIDInputReportEvent) => void;
    private handleDeviceDisconnect: (event: any) => void;
    config_file_number: number = 4;

    private pendingRequest: {
        resolve: (data: Uint8Array) => void;
        reject: (error: Error) => void;
        expectedCode: number;
        timer: number;
    } | null = null;
    private commandQueue: Array<() => Promise<void>> = [];
    private isProcessingQueue: boolean = false;
    private txBuffer: Uint8Array = new Uint8Array(64);

    constructor() {
        super();
        this.device = undefined;
        this.handleInputReport = (event: HIDInputReportEvent) => {
            const data = new Uint8Array(event.data.buffer);
            const packetCode = data[0];

            // If there's a pending request that matches, resolve it
            if (this.pendingRequest && packetCode === this.pendingRequest.expectedCode) {
                window.clearTimeout(this.pendingRequest.timer);
                this.pendingRequest.resolve(data);
                this.pendingRequest = null;
                return;
            }

            // Otherwise process normally (e.g. unsolicited debug/event packets)
            this.packet_process(data);
        };
        this.handleDeviceDisconnect = (event: any) => {
            if (this.device && event.device === this.device) {
                console.warn("[Controller] Device physically disconnected.");
                if (this.pendingRequest) {
                    window.clearTimeout(this.pendingRequest.timer);
                    this.pendingRequest.reject(new Error('Device disconnected'));
                    this.pendingRequest = null;
                }
                this.commandQueue = [];
                this.isProcessingQueue = false;
                this.device = undefined;
                this.dispatchEvent(new Event('deviceDisconnected'));
            }
        };
    }

    write(buf: Uint8Array): number {
        this.device?.sendReport(0, buf as BufferSource);
        return (buf.byteLength + 1);
    }

    private async sendAndWait(buf: Uint8Array, timeout: number = 500): Promise<Uint8Array> {
        const expectedCode = buf[0];
        return new Promise<Uint8Array>((resolve, reject) => {
            const timer = window.setTimeout(() => {
                if (this.pendingRequest) {
                    this.pendingRequest = null;
                    reject(new Error(`Timeout waiting for response (code=0x${expectedCode.toString(16)})`));
                }
            }, timeout);

            this.pendingRequest = { resolve, reject, expectedCode, timer };

            try {
                this.write(buf);
            } catch (error) {
                window.clearTimeout(timer);
                this.pendingRequest = null;
                reject(error);
            }
        });
    }

    private async enqueueCommand(buf: Uint8Array, timeout: number = 500): Promise<Uint8Array> {
        const packetCopy = new Uint8Array(buf);
        return new Promise<Uint8Array>((resolve, reject) => {
            this.commandQueue.push(async () => {
                try {
                    const result = await this.sendAndWait(packetCopy, timeout);
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            });
            this.processQueue();
        });
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue) return;
        this.isProcessingQueue = true;
        while (this.commandQueue.length > 0) {
            const task = this.commandQueue.shift()!;
            try {
                await task();
            } catch (e) {
                console.error('[Controller] Command queue error:', e);
            }
        }
        this.isProcessingQueue = false;
    }

    read(buf: Uint8Array): number {
        throw new Error('Method not implemented.');
    }
    read_timeout(buf: Uint8Array, timeout: number): number {
        throw new Error('Method not implemented.');
    }

    async connect(device: HIDDevice): Promise<boolean> {
        this.device = device;
        var result: boolean = false;
        if (!this.device.opened) {
            result = (await this.device.open()) == undefined;
        }
        if (result) {
            this.device.addEventListener("inputreport", this.handleInputReport);
            (navigator as any).hid?.addEventListener('disconnect', this.handleDeviceDisconnect);
            try {
                await this.read_data();
            } catch (e) {
                console.error('[Controller] Failed to read initial data:', e);
            }
            this.dispatchEvent(new Event('updateData'));
        }
        return result;
    }

    disconnect(): void {
        if (this.pendingRequest) {
            window.clearTimeout(this.pendingRequest.timer);
            this.pendingRequest.reject(new Error('Disconnected'));
            this.pendingRequest = null;
        }
        this.commandQueue = [];
        this.isProcessingQueue = false;
        this.device?.removeEventListener("inputreport", this.handleInputReport);
        (navigator as any).hid?.removeEventListener('disconnect', this.handleDeviceDisconnect);
        this.device?.close();
        this.device = undefined;
    }

    async read_data(): Promise<void> {
        await this.read_advanced_keys();
        await this.read_rgb_configs();
        await this.read_keymap();
        await this.read_dynamic_keys();
    }

    packet_process(buf: Uint8Array)
    {
        switch (buf[0])
        {
        case PacketCode.PacketCodeGet:
        case PacketCode.PacketCodeSet:
            switch (buf[1])
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
                this.packet_process_config_index(buf);
                break;
            case PacketData.PacketDataConfig:
                this.packet_process_config(buf);
                break;
            case PacketData.PacketDataDebug:
                this.packet_process_debug(buf);
                break;
            default:
                break;
            }
            break;
        default:
            break;
        }
    }

    packet_process_advanced_key(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer);
      if (buf[0] == PacketCode.PacketCodeGet) {
          const key_index = dataView.getUint16(2, true);
          if (key_index < this.advanced_keys.length) {
              this.advanced_keys[key_index].mode = buf[4];
              this.advanced_keys[key_index].calibration_mode = buf[5];
              this.advanced_keys[key_index].activation_value = dataView.getUint16(6 + 2 * 0, true) / 65535;
              this.advanced_keys[key_index].deactivation_value = dataView.getUint16(6 + 2 * 1, true) / 65535;
              this.advanced_keys[key_index].trigger_distance = dataView.getUint16(6 + 2 * 2, true) / 65535;
              this.advanced_keys[key_index].release_distance = dataView.getUint16(6 + 2 * 3, true) / 65535;
              this.advanced_keys[key_index].trigger_speed = dataView.getUint16(6 + 2 * 4, true) / 65535;
              this.advanced_keys[key_index].release_speed = dataView.getUint16(6 + 2 * 5, true) / 65535;
              this.advanced_keys[key_index].upper_deadzone = dataView.getUint16(6 + 2 * 6, true) / 65535;
              this.advanced_keys[key_index].lower_deadzone = dataView.getUint16(6 + 2 * 7, true) / 65535;
              this.advanced_keys[key_index].upper_bound = dataView.getUint16(6 + 2 * 8, true);
              this.advanced_keys[key_index].lower_bound = dataView.getUint16(6 + 2 * 9, true);
          }
      }
      else if (buf[0] == PacketCode.PacketCodeSet)
      {
          const key_index = dataView.getUint16(2, true);
          if (key_index < this.advanced_keys.length) {
              const ak = this.advanced_keys[key_index];
              buf[4] = ak.mode;
              buf[5] = ak.calibration_mode;
              dataView.setUint16(6 + 2 * 0, Math.round(ak.activation_value * 65535), true);
              dataView.setUint16(6 + 2 * 1, Math.round(ak.deactivation_value * 65535), true);
              dataView.setUint16(6 + 2 * 2, Math.round(ak.trigger_distance * 65535), true);
              dataView.setUint16(6 + 2 * 3, Math.round(ak.release_distance * 65535), true);
              dataView.setUint16(6 + 2 * 4, Math.round(ak.trigger_speed * 65535), true);
              dataView.setUint16(6 + 2 * 5, Math.round(ak.release_speed * 65535), true);
              dataView.setUint16(6 + 2 * 6, Math.round(ak.upper_deadzone * 65535), true);
              dataView.setUint16(6 + 2 * 7, Math.round(ak.lower_deadzone * 65535), true);
              dataView.setUint16(6 + 2 * 8, Math.round(ak.upper_bound), true);
              dataView.setUint16(6 + 2 * 9, Math.round(ak.lower_bound), true);
          }
      }
    }

    packet_process_rgb_base_config(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer);
      if (buf[0] == PacketCode.PacketCodeGet) {
            this.rgb_base_config.mode = buf[2];
            this.rgb_base_config.rgb.red = buf[3];
            this.rgb_base_config.rgb.green = buf[4];
            this.rgb_base_config.rgb.blue = buf[5];
            this.rgb_base_config.secondary_rgb.red = buf[6];
            this.rgb_base_config.secondary_rgb.green = buf[7];
            this.rgb_base_config.secondary_rgb.blue = buf[8];
            this.rgb_base_config.speed = dataView.getUint16(9, true);
            this.rgb_base_config.direction = dataView.getUint16(11, true);
            this.rgb_base_config.density = buf[13];
            this.rgb_base_config.brightness = buf[14];
      }
      else if (buf[0] == PacketCode.PacketCodeSet)
      {
            buf[2] = this.rgb_base_config.mode;
            buf[3] = this.rgb_base_config.rgb.red;
            buf[4] = this.rgb_base_config.rgb.green;
            buf[5] = this.rgb_base_config.rgb.blue;
            buf[6] = this.rgb_base_config.secondary_rgb.red;
            buf[7] = this.rgb_base_config.secondary_rgb.green;
            buf[8] = this.rgb_base_config.secondary_rgb.blue;
            dataView.setUint16(9, Math.round(this.rgb_base_config.speed) % 65536, true);
            dataView.setUint16(11, this.rgb_base_config.direction % 65536, true);
            buf[13] = this.rgb_base_config.density % 256;
            buf[14] = this.rgb_base_config.brightness % 256;
      }
    }

    packet_process_rgb_config(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer);
      if (buf[0] == PacketCode.PacketCodeGet) {
            const dataLength = buf[2];
            for (var i = 0; i < dataLength; i++)
            {
                const key_index = dataView.getUint16(3 + 0 + 8 * i, true);
                if (key_index < this.rgb_configs.length)
                {
                    this.rgb_configs[key_index].mode  = buf[3 + 8 * i + 2];
                    this.rgb_configs[key_index].rgb.red = buf[3 + 8 * i + 3];
                    this.rgb_configs[key_index].rgb.green = buf[3 + 8 * i + 4];
                    this.rgb_configs[key_index].rgb.blue = buf[3 + 8 * i + 5];
                    this.rgb_configs[key_index].speed = dataView.getUint16(3 + 8 * i + 6, true);
                }
            }
      }
      else if (buf[0] == PacketCode.PacketCodeSet)
      {
            const dataLength = buf[2];
            for (var i = 0; i < dataLength; i++)
            {
                const key_index = dataView.getUint16(3 + 0 + 8 * i, true);
                if (key_index < this.rgb_configs.length)
                {
                  buf[3 + 2 + 8 * i] = this.rgb_configs[key_index].mode;
                  buf[3 + 3 + 8 * i] = this.rgb_configs[key_index].rgb.red;
                  buf[3 + 4 + 8 * i] = this.rgb_configs[key_index].rgb.green;
                  buf[3 + 5 + 8 * i] = this.rgb_configs[key_index].rgb.blue;
                  dataView.setUint16(3 + 6 + 8 * i, Math.round(this.rgb_configs[key_index].speed), true);
                }
            }
      }
    }

    packet_process_keymap(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer);
      if (buf[0] == PacketCode.PacketCodeGet) {
            const layer_index = buf[2];
            const layer_page_start = dataView.getUint16(3, true);
            const layer_page_length = buf[5];
            if (layer_index < this.keymap.length && layer_page_start + layer_page_length <= this.keymap[layer_index].length)
            {
                for (let i = 0; i < layer_page_length; i++) {
                    this.keymap[layer_index][layer_page_start + i] = dataView.getUint16(6 + i*2, true);
                }
            }
      }
      else if (buf[0] == PacketCode.PacketCodeSet)
      {
            const layer_index = buf[2];
            const layer = this.keymap[layer_index];
            const layer_page_start = dataView.getUint16(3, true);
            const layer_page_length = buf[5];
            var layer_seg;
            if (layer_page_start + layer_page_length > layer.length) {
                layer_seg = layer.slice(layer_page_start,layer.length);
            }
            else
            {
                layer_seg = layer.slice(layer_page_start,layer_page_start+layer_page_length);
            }
            dataView.setUint16(3,layer_page_start,true);
            buf[5] = layer_seg.length;
            layer_seg.forEach((value,k) => {
                dataView.setUint16(6 + k * 2,value,true);
            });
      }
    }

    packet_process_dynamic_key(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer);
      if (buf[0] == PacketCode.PacketCodeGet) {
            const dynamic_key_index = buf[2];
            var dynamic_key : IDynamicKey;
            const dynamic_key_type = dataView.getUint32(4,true);
            switch (dynamic_key_type) {
                case DynamicKeyType.DynamicKeyStroke:
                    var dynamic_key_stroke = new DynamicKeyStroke4x4();
                    dynamic_key_stroke.type = dataView.getUint32(4,true);
                    dynamic_key_stroke.bindings[0] = dataView.getUint16(4+4+0,true);
                    dynamic_key_stroke.bindings[1] = dataView.getUint16(4+4+2,true);
                    dynamic_key_stroke.bindings[2] = dataView.getUint16(4+4+4,true);
                    dynamic_key_stroke.bindings[3] = dataView.getUint16(4+4+6,true);
                    dynamic_key_stroke.key_control[0] = dataView.getUint8(4+12+0);
                    dynamic_key_stroke.key_control[1] = dataView.getUint8(4+12+1);
                    dynamic_key_stroke.key_control[2] = dataView.getUint8(4+12+2);
                    dynamic_key_stroke.key_control[3] = dataView.getUint8(4+12+3);
                    dynamic_key_stroke.press_begin_distance = dataView.getFloat32(4+16,true);
                    dynamic_key_stroke.press_fully_distance = dataView.getFloat32(4+20,true);
                    dynamic_key_stroke.release_begin_distance = dataView.getFloat32(4+24,true);
                    dynamic_key_stroke.release_fully_distance = dataView.getFloat32(4+28,true);
                    dynamic_key = dynamic_key_stroke;
                    break;
                case DynamicKeyType.DynamicKeyModTap:
                    var dynamic_key_mt = new DynamicKeyModTap();
                    dynamic_key_mt.type = dataView.getUint32(4,true);
                    dynamic_key_mt.bindings[0] = dataView.getUint16(4+4+0,true);
                    dynamic_key_mt.bindings[1] = dataView.getUint16(4+4+2,true);
                    dynamic_key_mt.duration = dataView.getUint32(4+8,true);
                    dynamic_key = dynamic_key_mt;
                    break;
                case DynamicKeyType.DynamicKeyToggleKey:
                    var dynamic_key_tk = new DynamicKeyToggleKey();
                    dynamic_key_tk.type = dataView.getUint32(4,true);
                    dynamic_key_tk.bindings[0] = dataView.getUint16(4+4+0,true);
                    dynamic_key = dynamic_key_tk;
                    break;
                case DynamicKeyType.DynamicKeyMutex:
                    var dynamic_key_m = new DynamicKeyMutex();
                    dynamic_key_m.type  = dataView.getUint32(4,true);
                    dynamic_key_m.bindings[0]  = dataView.getUint16(4+4+0,true);
                    dynamic_key_m.bindings[1]  = dataView.getUint16(4+4+2,true);
                    dynamic_key_m.mode  = dataView.getUint8(4+12);
                    dynamic_key = dynamic_key_m;
                    break;
                default:
                    dynamic_key = new DynamicKey();
                    break;
            }
            this.dynamic_keys[dynamic_key_index] = dynamic_key;
      }
      else if (buf[0] == PacketCode.PacketCodeSet)
      {
            const index = buf[2];
            const item = this.dynamic_keys[index];
            console.debug(item);
            switch (item.type) {
                case DynamicKeyType.DynamicKeyStroke:
                    const dynamic_key_stroke = item as DynamicKeyStroke4x4;
                    dataView.setUint32(4,dynamic_key_stroke.type,true);
                    dataView.setUint16(4+4+0,dynamic_key_stroke.bindings[0],true);
                    dataView.setUint16(4+4+2,dynamic_key_stroke.bindings[1],true);
                    dataView.setUint16(4+4+4,dynamic_key_stroke.bindings[2],true);
                    dataView.setUint16(4+4+6,dynamic_key_stroke.bindings[3],true);
                    dataView.setUint8(4+12+0,dynamic_key_stroke.key_control[0]);
                    dataView.setUint8(4+12+1,dynamic_key_stroke.key_control[1]);
                    dataView.setUint8(4+12+2,dynamic_key_stroke.key_control[2]);
                    dataView.setUint8(4+12+3,dynamic_key_stroke.key_control[3]);
                    dataView.setFloat32(4+16,dynamic_key_stroke.press_begin_distance,true);
                    dataView.setFloat32(4+20,dynamic_key_stroke.press_fully_distance,true);
                    dataView.setFloat32(4+24,dynamic_key_stroke.release_begin_distance,true);
                    dataView.setFloat32(4+28,dynamic_key_stroke.release_fully_distance,true);
                    dataView.setUint16(4+32,dynamic_key_stroke.target_keys_location[0].id,true);
                    break;
                case DynamicKeyType.DynamicKeyModTap:
                    const dynamic_key_mt = item as DynamicKeyModTap;
                    dataView.setUint32(4,dynamic_key_mt.type,true);
                    dataView.setUint16(4+4+0,dynamic_key_mt.bindings[0],true);
                    dataView.setUint16(4+4+2,dynamic_key_mt.bindings[1],true);
                    dataView.setUint32(4+8,dynamic_key_mt.duration,true);
                    dataView.setUint16(4+12,dynamic_key_mt.target_keys_location[0].id,true);
                    break;
                case DynamicKeyType.DynamicKeyToggleKey:
                    const dynamic_key_tk = item as DynamicKeyToggleKey;
                    dataView.setUint32(4,dynamic_key_tk.type,true);
                    dataView.setUint16(4+4+0,dynamic_key_tk.bindings[0],true);
                    dataView.setUint16(4+6+0,dynamic_key_tk.target_keys_location[0].id,true);
                    break;
                case DynamicKeyType.DynamicKeyMutex:
                    const dynamic_key_m = item as DynamicKeyMutex;
                    dataView.setUint32(4,dynamic_key_m.type,true);
                    dataView.setUint16(4+4+0,dynamic_key_m.bindings[0],true);
                    dataView.setUint16(4+4+2,dynamic_key_m.bindings[1],true);
                    dataView.setUint16(4+8+0,dynamic_key_m.target_keys_location[0].id,true);
                    dataView.setUint16(4+8+2,dynamic_key_m.target_keys_location[1].id,true);
                    dataView.setUint8(4+12,dynamic_key_m.mode);
                default:
                    break;
            }
      }
    }

    packet_process_config_index(buf : Uint8Array)
    {
    }

    packet_process_config(buf : Uint8Array)
    {
    }

    packet_process_debug(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer);
      if (buf[0] == PacketCode.PacketCodeGet) {
        const dataLength = buf[2];
        for (var i = 0; i < dataLength; i++)
        {
            const key_index = dataView.getUint16(3 + 0 + 8 * i, true);
            if (key_index < this.advanced_keys.length)
            {
                this.advanced_keys[key_index].state  = buf[3 + 8 * i + 2] > 0;
                this.advanced_keys[key_index].report_state = buf[3 + 8 * i + 3] > 0;
                this.advanced_keys[key_index].raw = dataView.getUint16(3 + 8 * i + 4, true) / 65535;
                this.advanced_keys[key_index].value = dataView.getUint16(3 + 8 * i + 6, true) / 65535;
            }
        }
        this.dispatchEvent(new Event('updateData'));
      }
    }

    get_connection_state(): boolean {
        return this.device != undefined;
    }

    fetch_config(): void {
        throw new Error('Method not implemented.');
    }
    save_config(): void {
        this.send_advanced_keys();
        this.send_rgb_configs();
        this.send_keymap();
        this.send_dynamic_keys();
    }
    flash_config(): void {
        let send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[1] = KeyboardKeycode.KeyboardSave;
        let res = this.write(send_buf);
        console.debug("Wrote Save Command: {:?} byte(s)", res);
    }
    system_reset(): void {
        let send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[1] = KeyboardKeycode.KeyboardReboot;
        let res = this.write(send_buf);
        console.debug("Wrote System Reset Command: {:?} byte(s)", res);
    }
    factory_reset(): void {
        let send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[1] = KeyboardKeycode.KeyboardFactoryReset;
        let res = this.write(send_buf);
        console.debug("Wrote Factory Reset Command: {:?} byte(s)", res);
    }
    enter_bootloader(): void {
        let send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[1] = KeyboardKeycode.KeyboardBootloader;
        let res = this.write(send_buf);
        console.debug("Wrote Enter Bootloader Command: {:?} byte(s)", res);
    }
    async request_config(): Promise<void> {
        await this.read_data();
        this.dispatchEvent(new Event('updateData'));
    }
    request_debug(): void {
        let send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeGet;
        send_buf[1] = PacketData.PacketDataDebug;
        const advanced_keys_page_num = Math.ceil(this.advanced_keys.length / 7);
        for (var key_page_index = 0; key_page_index < advanced_keys_page_num; key_page_index += 1){
            let page_length = (key_page_index + 1) * 7 > this.advanced_keys.length ? this.advanced_keys.length % 7 : 7;
            send_buf[2] = page_length;
            let dataView = new DataView(send_buf.buffer);
            for (var j = 0; j < page_length; j += 1){
                let key_index = key_page_index * 7 + j;
                if (key_index < this.advanced_keys.length){
                    dataView.setUint16(3 + 0 + 8 * j, key_index, true);
                }
            }
            let res = this.write(send_buf);
        }
    }
    start_debug(): void {
        let send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[1] = 0xFE | (((1<<6) | (0x20 + 0)) << 8);
        this.write(send_buf);
    }
    stop_debug(): void {
        let send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[1] = 0xFE | (((0<<6) | (0x20 + 0)) << 8);
        this.write(send_buf);
    }
    async send_advanced_keys() {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeSet;
        this.txBuffer[1] = PacketData.PacketDataAdvancedKey;
        let dataView = new DataView(this.txBuffer.buffer);
        for (let index = 0; index < this.advanced_keys.length; index++) {
            dataView.setUint16(2, index, true);
            this.packet_process_advanced_key(this.txBuffer);
            try {
                await this.enqueueCommand(this.txBuffer);
            } catch (e) {
                console.error(`Failed to send advanced key ${index}:`, e);
            }
        }
    }

    async read_advanced_keys() {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeGet;
        this.txBuffer[1] = PacketData.PacketDataAdvancedKey;
        let dataView = new DataView(this.txBuffer.buffer);
        for (let index = 0; index < this.advanced_keys.length; index++) {
            dataView.setUint16(2, index, true);
            try {
                let res = await this.enqueueCommand(this.txBuffer);
                this.packet_process(res);
            } catch (e) {
                console.error(`Failed to read advanced key ${index}:`, e);
            }
        }
    }

    async send_rgb_configs() {
        // Send RGB base config
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeSet;
        this.txBuffer[1] = PacketData.PacketDataRgbBaseConfig;
        this.packet_process_rgb_base_config(this.txBuffer);
        try {
            await this.enqueueCommand(this.txBuffer);
        } catch (e) {
            console.error('Failed to send rgb base config:', e);
        }

        // Send RGB per-key configs (7 items per page, 8 bytes each)
        const rgb_page_size = 7;
        const rgb_page_num = Math.ceil(this.rgb_configs.length / rgb_page_size);
        for (var rgb_page_index = 0; rgb_page_index < rgb_page_num; rgb_page_index += 1) {
            this.txBuffer.fill(0);
            this.txBuffer[0] = PacketCode.PacketCodeSet;
            this.txBuffer[1] = PacketData.PacketDataRgbConfig;
            let page_length = (rgb_page_index + 1) * rgb_page_size > this.rgb_configs.length ? this.rgb_configs.length % rgb_page_size : rgb_page_size;
            this.txBuffer[2] = page_length;
            let dataView = new DataView(this.txBuffer.buffer);
            for (var j = 0; j < page_length; j += 1) {
                let rgb_index = rgb_page_index * rgb_page_size + j;
                if (rgb_index < this.rgb_configs.length) {
                    dataView.setUint16(3 + 0 + 8 * j, rgb_index, true);
                }
            }
            this.packet_process_rgb_config(this.txBuffer);
            try {
                await this.enqueueCommand(this.txBuffer);
            } catch (e) {
                console.error(`Failed to send rgb config page ${rgb_page_index}:`, e);
            }
        }
    }

    async read_rgb_configs() {
        // Read RGB base config
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeGet;
        this.txBuffer[1] = PacketData.PacketDataRgbBaseConfig;
        try {
            let res = await this.enqueueCommand(this.txBuffer);
            this.packet_process(res);
        } catch (e) {
            console.error('Failed to read rgb base config:', e);
        }

        // Read RGB per-key configs (7 items per page, 8 bytes each)
        const rgb_page_size = 7;
        const rgb_page_num = Math.ceil(this.rgb_configs.length / rgb_page_size);
        for (var rgb_page_index = 0; rgb_page_index < rgb_page_num; rgb_page_index += 1) {
            this.txBuffer.fill(0);
            this.txBuffer[0] = PacketCode.PacketCodeGet;
            this.txBuffer[1] = PacketData.PacketDataRgbConfig;
            let page_length = (rgb_page_index + 1) * rgb_page_size > this.rgb_configs.length ? this.rgb_configs.length % rgb_page_size : rgb_page_size;
            this.txBuffer[2] = page_length;
            let dataView = new DataView(this.txBuffer.buffer);
            for (var j = 0; j < page_length; j += 1) {
                let rgb_index = rgb_page_index * rgb_page_size + j;
                if (rgb_index < this.rgb_configs.length) {
                    dataView.setUint16(3 + 0 + 8 * j, rgb_index, true);
                }
            }
            try {
                let res = await this.enqueueCommand(this.txBuffer);
                this.packet_process(res);
            } catch (e) {
                console.error(`Failed to read rgb config page ${rgb_page_index}:`, e);
            }
        }
    }

    async send_keymap() {
        const layer_page_length = 16;
        for (let i = 0; i < this.keymap.length; i++) {
            const layer = this.keymap[i];
            for (var index = 0; index < layer.length; index += layer_page_length) {
                this.txBuffer.fill(0);
                this.txBuffer[0] = PacketCode.PacketCodeSet;
                this.txBuffer[1] = PacketData.PacketDataKeymap;
                this.txBuffer[2] = i; // layer_index
                let dataView = new DataView(this.txBuffer.buffer);
                var layer_seg;
                if (index + layer_page_length > layer.length) {
                    layer_seg = layer.length - index;
                } else {
                    layer_seg = layer_page_length;
                }
                dataView.setUint16(3, index, true);
                this.txBuffer[5] = layer_seg;
                this.packet_process_keymap(this.txBuffer);
                try {
                    await this.enqueueCommand(this.txBuffer);
                } catch (e) {
                    console.error(`Failed to send keymap layer ${i} page ${index}:`, e);
                }
            }
        }
    }

    async read_keymap() {
        const layer_page_length = 16;
        for (let i = 0; i < this.keymap.length; i++) {
            const layer = this.keymap[i];
            for (var index = 0; index < layer.length; index += layer_page_length) {
                this.txBuffer.fill(0);
                this.txBuffer[0] = PacketCode.PacketCodeGet;
                this.txBuffer[1] = PacketData.PacketDataKeymap;
                this.txBuffer[2] = i; // layer_index
                let dataView = new DataView(this.txBuffer.buffer);
                var layer_seg;
                if (index + layer_page_length > layer.length) {
                    layer_seg = layer.length - index;
                } else {
                    layer_seg = layer_page_length;
                }
                dataView.setUint16(3, index, true);
                this.txBuffer[5] = layer_seg;
                try {
                    let res = await this.enqueueCommand(this.txBuffer);
                    this.packet_process(res);
                } catch (e) {
                    console.error(`Failed to read keymap layer ${i} page ${index}:`, e);
                }
            }
        }
    }

    async send_dynamic_keys() {
        for (let i = 0; i < this.dynamic_keys.length; i++) {
            this.txBuffer.fill(0);
            this.txBuffer[0] = PacketCode.PacketCodeSet;
            this.txBuffer[1] = PacketData.PacketDataDynamicKey;
            this.txBuffer[2] = i;
            this.packet_process_dynamic_key(this.txBuffer);
            try {
                await this.enqueueCommand(this.txBuffer);
            } catch (e) {
                console.error(`Failed to send dynamic key ${i}:`, e);
            }
        }
    }

    async read_dynamic_keys() {
        for (let i = 0; i < this.dynamic_keys.length; i++) {
            this.txBuffer.fill(0);
            this.txBuffer[0] = PacketCode.PacketCodeGet;
            this.txBuffer[1] = PacketData.PacketDataDynamicKey;
            this.txBuffer[2] = i;
            try {
                let res = await this.enqueueCommand(this.txBuffer);
                this.packet_process(res);
            } catch (e) {
                console.error(`Failed to read dynamic key ${i}:`, e);
            }
        }
    }

    get_config_file_num(): number {
        return this.config_file_number;
    }

    get_config_file_index(): number {
        return this.config_file_number;
    }

    set_config_file_index(index: number) : void {
        this.config_file_number = index;
        let send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[1] = this.config_file_number + 0x10;
        let res = this.write(send_buf);
        this.request_config();
    }

    send_advanced_key_packet(indexs: number[], advanced_key: IAdvancedKey): void {
        indexs.forEach((index) => {
            let send_buf = new Uint8Array(64);
            send_buf[0] = PacketCode.PacketCodeSet;
            send_buf[1] = PacketData.PacketDataAdvancedKey;
            let dataView = new DataView(send_buf.buffer);
            dataView.setUint16(2, index, true);
            send_buf[4] = advanced_key.mode;
            send_buf[5] = advanced_key.calibration_mode;
            dataView.setUint16(6 + 2 * 0, Math.round(advanced_key.activation_value * 65535), true);
            dataView.setUint16(6 + 2 * 1, Math.round(advanced_key.deactivation_value * 65535), true);
            dataView.setUint16(6 + 2 * 2, Math.round(advanced_key.trigger_distance * 65535), true);
            dataView.setUint16(6 + 2 * 3, Math.round(advanced_key.release_distance * 65535), true);
            dataView.setUint16(6 + 2 * 4, Math.round(advanced_key.trigger_speed * 65535), true);
            dataView.setUint16(6 + 2 * 5, Math.round(advanced_key.release_speed * 65535), true);
            dataView.setUint16(6 + 2 * 6, Math.round(advanced_key.upper_deadzone * 65535), true);
            dataView.setUint16(6 + 2 * 7, Math.round(advanced_key.lower_deadzone * 65535), true);
            dataView.setUint16(6 + 2 * 8, Math.round(advanced_key.upper_bound), true);
            dataView.setUint16(6 + 2 * 9, Math.round(advanced_key.lower_bound), true);
            let res = this.write(send_buf);
            console.debug("Wrote Advanced Key: {:?} byte(s)", res);
        });
        this.flash_config();
    }
    send_keymap_packet(indexs: number[], layer : number, keymap: number): void {
        indexs.forEach((index) => {
            let send_buf = new Uint8Array(64);
            let dataView = new DataView(send_buf.buffer);
            send_buf[0] = PacketCode.PacketCodeSet;
            send_buf[1] = PacketData.PacketDataKeymap;
            send_buf[2] = layer; // layer_index
            dataView.setUint16(3, index, true);
            send_buf[5] = 1;
            dataView.setUint16(6, keymap, true);
            let res = this.write(send_buf);
            console.debug("Wrote Keymap: {:?} byte(s)", res);
        });
        this.flash_config();
    }
    send_dynamic_key_packet(index: number, dynamic_key: IDynamicKey): void {
        this.send_dynamic_keys();
        this.flash_config();
    }
    send_rgb_base_packet(rgb_base_config: IRGBBaseConfig): void {
        let send_buf = new Uint8Array(64);
        let dataView = new DataView(send_buf.buffer);
        send_buf[0] = PacketCode.PacketCodeSet;
        send_buf[1] = PacketData.PacketDataRgbBaseConfig;
        send_buf[2] = rgb_base_config.mode;
        send_buf[3] = rgb_base_config.rgb.red;
        send_buf[4] = rgb_base_config.rgb.green;
        send_buf[5] = rgb_base_config.rgb.blue;
        send_buf[6] = rgb_base_config.secondary_rgb.red;
        send_buf[7] = rgb_base_config.secondary_rgb.green;
        send_buf[8] = rgb_base_config.secondary_rgb.blue;
        dataView.setUint16(9, Math.round(rgb_base_config.speed) % 65536, true);
        dataView.setUint16(11, rgb_base_config.direction % 65536, true);
        send_buf[13] = rgb_base_config.density % 256;
        send_buf[14] = rgb_base_config.brightness % 256;
        let res = this.write(send_buf);
        console.debug("Rgb base config: {:?} byte(s)", res);
        this.flash_config();
    }
    send_rgb_packet(indexs: number[], rgb_config: IRGBConfig): void {
        indexs.forEach((index) => {
            let send_buf = new Uint8Array(64);
            let dataView = new DataView(send_buf.buffer);
            send_buf[0] = PacketCode.PacketCodeSet;
            send_buf[1] = PacketData.PacketDataRgbConfig;
            send_buf[2] = 1;
            dataView.setUint16(3, index, true);
            send_buf[3 + 2] = rgb_config.mode;
            send_buf[3 + 3] = rgb_config.rgb.red;
            send_buf[3 + 4] = rgb_config.rgb.green;
            send_buf[3 + 5] = rgb_config.rgb.blue;
            dataView.setUint16(3 + 6, Math.round(rgb_config.speed), true);
            let res = this.write(send_buf);
            console.debug("Wrote rgb: {:?} byte(s)", res);
        });
        this.flash_config();
    }

    request_debug_at(indexs: number[]) : void {
        let send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeGet;
        send_buf[1] = PacketData.PacketDataDebug;
        const advanced_keys_page_num = Math.ceil(indexs.length / 7);
        for (var key_page_index = 0; key_page_index < advanced_keys_page_num; key_page_index += 1){
            let page_length = (key_page_index + 1) * 7 > indexs.length ? indexs.length % 7 : 7;
            send_buf[2] = page_length;
            let dataView = new DataView(send_buf.buffer);
            for (var j = 0; j < page_length; j += 1){
                let key_index = indexs[key_page_index * 7 + j];
                if (key_index < this.advanced_keys.length){
                    dataView.setUint16(3 + 0 + 8 * j, key_index, true);
                }
            }
            let res = this.write(send_buf);
        }
    }
};
