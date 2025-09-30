import { AdvancedKeyToBytes, DynamicKey, DynamicKeyModTap, DynamicKeyMutex, DynamicKeyStroke4x4, DynamicKeyToggleKey, DynamicKeyType, IDynamicKey, KeyboardController, getEMIPathIdentifier, KeyboardKeycode, IAdvancedKey, IRGBBaseConfig, IRGBConfig} from "./../../interface";

enum PacketCode {
  PacketCodeAction = 0x00,
  PacketCodeSet = 0x01,
  PacketCodeGet = 0x02,
  PacketCodeUser = 0xFF,
};

enum PacketData {
  PacketDataAdvancedKey = 0x00,
  PacketDataKeymap = 0x01,
  PacketDataRgbBaseConfig = 0x02,
  PacketDataRgbConfig = 0x03,
  PacketDataDynamicKey = 0x04,
  PacketDataConfigIndex = 0x05,
  PacketDataConfig = 0x06,
  PacketDataDebug = 0x07,
};

export class LibampKeyboardController extends KeyboardController {
    device: HIDDevice | undefined;
    private handleInputReport: (event: HIDInputReportEvent) => void;
    config_file_number:number = 4;

    constructor() {
        super();
        this.device = undefined;
        this.handleInputReport = (event: HIDInputReportEvent) => {
            const { data } = event;
            this.packet_process(new Uint8Array(data.buffer));
        };

    }
    write(buf: Uint8Array): number {
        this.device?.sendReport(0, buf as BufferSource);
        return (buf.byteLength + 1);
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
        }
        if (result) {
            this.request_config();
            this.device.addEventListener("inputreport", this.handleInputReport);
        }
        return result;
    }
    disconnect(): void {
        this.device?.close();
        this.device?.removeEventListener("inputreport",this.handleInputReport);
    }
    prase_buffer(buf: Uint8Array): void {
        switch (buf[0]) {
            case 1 : {
                break;
            }
            case 0xFE : {

                let dataLength = buf[1];
                for (var i = 0;i<dataLength;i++) {
                    let dataView = new DataView(buf.buffer);  
                    let key_index = dataView.getUint16(2 + 11 * i, true);
                    if (key_index >= this.advanced_keys.length) {
                        continue;
                    }
                    this.advanced_keys[key_index].state = buf[2 + 2 + 11 * i] > 0;
                    this.advanced_keys[key_index].raw = dataView.getFloat32(2 + 3 + 11*i,true);
                    this.advanced_keys[key_index].value = dataView.getFloat32(2 + 7 + 11*i,true);
                }
                this.dispatchEvent(new Event('updateData'));
                break;
            }
            case 0xFF : {
                this.unload_cargo(buf);
                break
            }
            default: {
                break
            }
        }
    }
    unload_cargo(buf: Uint8Array) {
        let dataView = new DataView(buf.buffer);  
        switch (buf[1])
        {
        case 0: // Advanced Key
            const key_index = dataView.getUint16(2, true);
            this.advanced_keys[key_index].mode = buf[4];
            this.advanced_keys[key_index].activation_value = dataView.getFloat32(8 + 4 * 0, true);
            this.advanced_keys[key_index].deactivation_value = dataView.getFloat32(8 + 4 * 1, true);
            this.advanced_keys[key_index].trigger_distance = dataView.getFloat32(8 + 4 * 2, true);
            this.advanced_keys[key_index].release_distance = dataView.getFloat32(8 + 4 * 3, true);
            this.advanced_keys[key_index].trigger_speed = dataView.getFloat32(8 + 4 * 4, true);
            this.advanced_keys[key_index].release_speed = dataView.getFloat32(8 + 4 * 5, true);
            this.advanced_keys[key_index].upper_deadzone = dataView.getFloat32(8 + 4 * 6, true);
            this.advanced_keys[key_index].lower_deadzone = dataView.getFloat32(8 + 4 * 7, true);
            //g_keyboard_advanced_keys[command_advanced_key_mapping[buf[1]]].upper_bound = fill_in_float(&buf[2 + 4 * 8]);
            //g_keyboard_advanced_keys[command_advanced_key_mapping[buf[1]]].lower_bound = fill_in_float(&buf[2 + 4 * 9]);
            break;
        case 1: // Global LED
            this.rgb_base_config.mode = buf[2];
            this.rgb_base_config.rgb.red = buf[3];
            this.rgb_base_config.rgb.green = buf[4];
            this.rgb_base_config.rgb.blue = buf[5];
            this.rgb_base_config.secondary_rgb.red = buf[6];
            this.rgb_base_config.secondary_rgb.green = buf[7];
            this.rgb_base_config.secondary_rgb.blue = buf[8];
            this.rgb_base_config.speed = dataView.getFloat32(9, true);
            this.rgb_base_config.direction = dataView.getUint16(13, true);
            this.rgb_base_config.density = buf[15];
            this.rgb_base_config.brightness = buf[16];
            break;
        case 2: // LED
            const dataLength = buf[2];
            for (var i = 0; i < dataLength; i++)
            {
                const key_index = buf[3+10*i];
                if (key_index<this.rgb_configs.length)
                {
                    this.rgb_configs[key_index].mode  = buf[3 + 10 * i + 2];
                    this.rgb_configs[key_index].rgb.red = buf[3 + 10 * i + 3];
                    this.rgb_configs[key_index].rgb.green = buf[3 + 10 * i + 4];
                    this.rgb_configs[key_index].rgb.blue = buf[3 + 10 * i + 5];
                    this.rgb_configs[key_index].speed = dataView.getFloat32(3 + 10 * i + 6, true);
                    
                    //rgb_to_hsv(&g_rgb_configs[g_rgb_mapping[buf[1]+i]].hsv, &g_rgb_configs[g_rgb_mapping[buf[1]+i]].rgb);
                }
            }
            break;
        case 3: // Keymap
            const layer_index = buf[2];
            const layer_page_start = dataView.getUint16(3, true);
            const layer_page_length = buf[5];
            if (layer_index < this.keymap.length && layer_page_start + layer_page_length <= this.keymap[layer_index].length) 
            {
                for (let i = 0; i < layer_page_length; i++) {
                    this.keymap[layer_index][layer_page_start + i] = dataView.getUint16(6 + i*2, true);
                }
            }
            break;
        case 4:   
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
                    dynamic_key_mt.duration = dataView.getUint32(3+8,true);
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
                    dynamic_key_m.key_id[0] = dataView.getUint16(4+8+0,true);
                    dynamic_key_m.key_id[1] = dataView.getUint16(4+8+2,true);
                    dynamic_key_m.mode  = dataView.getUint8(4+12);
                    dynamic_key = dynamic_key_m;
                    break;
                default:
                    dynamic_key = new DynamicKey();
                    break;
            }
            this.dynamic_keys[dynamic_key_index] = dynamic_key;
            break;
        case 0x80: 
            this.config_index = buf[1];
            this.dispatchEvent(new Event('updateData'));
            break;
        default:
            break;
        }
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
            case PacketData.PacketDataConfigIndex:
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
          this.advanced_keys[key_index].mode = buf[4];
          this.advanced_keys[key_index].activation_value = dataView.getFloat32(8 + 4 * 0, true);
          this.advanced_keys[key_index].deactivation_value = dataView.getFloat32(8 + 4 * 1, true);
          this.advanced_keys[key_index].trigger_distance = dataView.getFloat32(8 + 4 * 2, true);
          this.advanced_keys[key_index].release_distance = dataView.getFloat32(8 + 4 * 3, true);
          this.advanced_keys[key_index].trigger_speed = dataView.getFloat32(8 + 4 * 4, true);
          this.advanced_keys[key_index].release_speed = dataView.getFloat32(8 + 4 * 5, true);
          this.advanced_keys[key_index].upper_deadzone = dataView.getFloat32(8 + 4 * 6, true);
          this.advanced_keys[key_index].lower_deadzone = dataView.getFloat32(8 + 4 * 7, true);
      }
      else (buf[0] == PacketCode.PacketCodeSet)
      {
          const key_index = dataView.getUint16(2, true);
          dataView.setUint16(2,key_index,true);
          let key_bytes = AdvancedKeyToBytes(this.advanced_keys[key_index]);
          buf.set(key_bytes,4);
      }
    }

    packet_process_rgb_base_config(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer);  
      if (buf[0] == PacketCode.PacketCodeGet) {
          const key_index = dataView.getUint16(2, true);
            this.rgb_base_config.mode = buf[2];
            this.rgb_base_config.rgb.red = buf[3];
            this.rgb_base_config.rgb.green = buf[4];
            this.rgb_base_config.rgb.blue = buf[5];
            this.rgb_base_config.secondary_rgb.red = buf[6];
            this.rgb_base_config.secondary_rgb.green = buf[7];
            this.rgb_base_config.secondary_rgb.blue = buf[8];
            this.rgb_base_config.speed = dataView.getFloat32(9, true);
            this.rgb_base_config.direction = dataView.getUint16(13, true);
            this.rgb_base_config.density = buf[15];
            this.rgb_base_config.brightness = buf[16];
      }
      else (buf[0] == PacketCode.PacketCodeSet)
      {
            buf[2] = this.rgb_base_config.mode;
            buf[3] = this.rgb_base_config.rgb.red;
            buf[4] = this.rgb_base_config.rgb.green;
            buf[5] = this.rgb_base_config.rgb.blue;
            buf[6] = this.rgb_base_config.secondary_rgb.red;
            buf[7] = this.rgb_base_config.secondary_rgb.green;
            buf[8] = this.rgb_base_config.secondary_rgb.blue;
            dataView.setFloat32(9,this.rgb_base_config.speed,true);
            dataView.setUint16(13,this.rgb_base_config.direction % 65536,true);
            buf[15] = this.rgb_base_config.density % 256;
            buf[16] = this.rgb_base_config.brightness % 256;
      }
    }

    packet_process_rgb_config(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer);  
      if (buf[0] == PacketCode.PacketCodeGet) {
            const dataLength = buf[2];
            for (var i = 0; i < dataLength; i++)
            {
                const key_index = dataView.getUint16(3 + 0 + 10 * i, true);
                if (key_index<this.rgb_configs.length)
                {
                    this.rgb_configs[key_index].mode  = buf[3 + 10 * i + 2];
                    this.rgb_configs[key_index].rgb.red = buf[3 + 10 * i + 3];
                    this.rgb_configs[key_index].rgb.green = buf[3 + 10 * i + 4];
                    this.rgb_configs[key_index].rgb.blue = buf[3 + 10 * i + 5];
                    this.rgb_configs[key_index].speed = dataView.getFloat32(3 + 10 * i + 6, true);
                    
                    //rgb_to_hsv(&g_rgb_configs[g_rgb_mapping[buf[1]+i]].hsv, &g_rgb_configs[g_rgb_mapping[buf[1]+i]].rgb);
                }
            }
      }
      else (buf[0] == PacketCode.PacketCodeSet)
      {
            const dataLength = buf[2];
            for (var i = 0; i < dataLength; i++)
            {
                const key_index = dataView.getUint16(3 + 0 + 10 * i,true);
                if (key_index<this.rgb_configs.length)
                {
                  buf[3 + 2 + 10 * i] = this.rgb_configs[key_index].mode;
                  buf[3 + 3 + 10 * i] = this.rgb_configs[key_index].rgb.red;
                  buf[3 + 4 + 10 * i] = this.rgb_configs[key_index].rgb.green;
                  buf[3 + 5 + 10 * i] = this.rgb_configs[key_index].rgb.blue;
                  dataView.setFloat32(3 + 6 + 10 * i,this.rgb_configs[key_index].speed,true);
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
      else (buf[0] == PacketCode.PacketCodeSet)
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
                    dynamic_key_mt.duration = dataView.getUint32(3+8,true);
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
                    dynamic_key_m.key_id[0] = dataView.getUint16(4+8+0,true);
                    dynamic_key_m.key_id[1] = dataView.getUint16(4+8+2,true);
                    dynamic_key_m.mode  = dataView.getUint8(4+12);
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
                    break;
                case DynamicKeyType.DynamicKeyModTap:
                    const dynamic_key_mt = item as DynamicKeyModTap;
                    dataView.setUint32(4,dynamic_key_mt.type,true);
                    dataView.setUint16(4+4+0,dynamic_key_mt.bindings[0],true);
                    dataView.setUint16(4+4+2,dynamic_key_mt.bindings[1],true);
                    dataView.setUint32(4+8,dynamic_key_mt.duration,true);
                    break;
                case DynamicKeyType.DynamicKeyToggleKey:
                    const dynamic_key_tk = item as DynamicKeyToggleKey;
                    dataView.setUint32(4,dynamic_key_tk.type,true);
                    dataView.setUint16(4+4+0,dynamic_key_tk.bindings[0],true);
                    break;
                case DynamicKeyType.DynamicKeyMutex:
                    const dynamic_key_m = item as DynamicKeyMutex;
                    dataView.setUint32(4,dynamic_key_m.type,true);
                    dataView.setUint16(4+4+0,dynamic_key_m.bindings[0],true);
                    dataView.setUint16(4+4+2,dynamic_key_m.bindings[1],true);
                    dataView.setUint16(4+8+0,dynamic_key_m.key_id[0],true);
                    dataView.setUint16(4+8+2,dynamic_key_m.key_id[1],true);
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
            const key_index = dataView.getUint16(3 + 0 + 12 * i, true);
            if (key_index<this.advanced_keys.length)
            {
                this.advanced_keys[key_index].state  = buf[3 + 12 * i + 2] > 0;
                this.advanced_keys[key_index].report_state = buf[3 + 12 * i + 3] > 0;
                this.advanced_keys[key_index].raw = dataView.getFloat32(3 + 12 * i + 4, true);
                this.advanced_keys[key_index].value = dataView.getFloat32(3 + 12 * i + 8, true);
            }
            if (key_index == 0) {
                console.log(key_index, this.advanced_keys[key_index].raw);
            }
        }
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
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeAction;
        send_buf[1] = KeyboardKeycode.KeyboardSave;
        let res = this.write(send_buf);
        console.debug("Wrote Save Command: {:?} byte(s)", res);
    }
    system_reset(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeAction;
        send_buf[1] = KeyboardKeycode.KeyboardReboot;
        let res = this.write(send_buf);
        console.debug("Wrote System Reset Command: {:?} byte(s)", res);
    }
    factory_reset(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeAction;
        send_buf[1] = KeyboardKeycode.KeyboardFactoryReset;
        let res = this.write(send_buf);
        console.debug("Wrote Factory Reset Command: {:?} byte(s)", res);
    }
    request_config(): void {
      this.read_advanced_keys();
      this.read_rgb_configs();
      this.read_keymap();
      this.read_dynamic_keys();
    }
    request_debug(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeGet;
        send_buf[1] = PacketData.PacketDataDebug;
        const advanced_keys_page_num = Math.ceil(this.advanced_keys.length / 5);
        for (var key_page_index = 0; key_page_index < advanced_keys_page_num; key_page_index+=1){
            let page_length = (key_page_index + 1) * 5 > this.advanced_keys.length ? this.advanced_keys.length % 5 : 5;
            send_buf[2] = page_length;
            for (var j = 0; j < page_length; j += 1){
                let dataView = new DataView(send_buf.buffer);
                let key_index = key_page_index * 5 + j;
                if (key_index < this.advanced_keys.length ){
                    dataView.setUint16(3 + 0 + 12 * j,key_index,true);
                }
                console.log(key_index);
            }
            //console.debug(send_buf);
            let res = this.write(send_buf);
            //console.debug("Wrote RGB Configs: {:?} byte(s)", res);
        }
    }
    start_debug(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeAction;
        send_buf[1] = 0xFE | (((1<<6) | (0x20 + 0)) << 8);
        this.write(send_buf);
    }
    stop_debug(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeAction;
        send_buf[1] = 0xFE | (((0<<6) | (0x20 + 0)) << 8);
        this.write(send_buf);
    }
    send_advanced_keys() {
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeSet;
        send_buf[1] = PacketData.PacketDataAdvancedKey;
        let dataView = new DataView(send_buf.buffer);
        this.advanced_keys.forEach((item, index) =>{
            dataView.setUint16(2,index,true);
            this.packet_process(send_buf)
            let res = this.write(send_buf);
            console.debug("Wrote Advanced Key: {:?} byte(s)", res);
        });
    }

    read_advanced_keys() {
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeGet;
        send_buf[1] = PacketData.PacketDataAdvancedKey;
        let dataView = new DataView(send_buf.buffer);
        this.advanced_keys.forEach((item, index) =>{
            dataView.setUint16(2,index,true);
            let res = this.write(send_buf);
            console.debug("Wrote Advanced Key: {:?} byte(s)", res);
        });
    }


    send_rgb_configs() {
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeSet;
        send_buf[1] = PacketData.PacketDataRgbBaseConfig;
        {
            this.packet_process(send_buf)
            let res = this.write(send_buf);
            console.log("send rgb base config");
            //console.log(send_buf);
            console.debug("Wrote RGB Switch: {:?} byte(s)", res);
        }
        send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeSet;
        send_buf[1] = PacketData.PacketDataRgbConfig;
        const rgb_page_num = Math.ceil(this.rgb_configs.length / 6);
        for (var rgb_page_index = 0; rgb_page_index < rgb_page_num; rgb_page_index+=1){
            let page_length = (rgb_page_index + 1) * 6 > this.rgb_configs.length ? this.rgb_configs.length % 6 : 6;
            send_buf[2] = page_length;
            for (var j = 0; j < page_length; j += 1){
                let dataView = new DataView(send_buf.buffer);
                let rgb_index = rgb_page_index * 6 + j;
                if (rgb_index < this.rgb_configs.length ){
                    dataView.setUint16(3 + 0 + 10 * j,rgb_index,true);
                }
            }
            this.packet_process(send_buf);
            //console.debug(send_buf);
            let res = this.write(send_buf);
            //console.debug("Wrote RGB Configs: {:?} byte(s)", res);
        }
    }

    read_rgb_configs() {
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeGet;
        send_buf[1] = PacketData.PacketDataRgbBaseConfig;
        {
            let res = this.write(send_buf);
            console.log("send rgb base config");
            //console.log(send_buf);
            console.debug("Wrote RGB Switch: {:?} byte(s)", res);
        }
        send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeGet;
        send_buf[1] = PacketData.PacketDataRgbConfig;
        const rgb_page_num = Math.ceil(this.rgb_configs.length / 6);
        for (var rgb_page_index = 0; rgb_page_index < rgb_page_num; rgb_page_index+=1){
            let page_length = (rgb_page_index + 1) * 6 > this.rgb_configs.length ? this.rgb_configs.length % 6 : 6;
            send_buf[2] = page_length;
            for (var j = 0; j < page_length; j += 1){
                let dataView = new DataView(send_buf.buffer);
                let rgb_index = rgb_page_index * 6 + j;
                if (rgb_index < this.rgb_configs.length ){
                    dataView.setUint16(3 + 0 + 10 * j,rgb_index,true);
                }
            }
            //console.debug(send_buf);
            let res = this.write(send_buf);
            //console.debug("Wrote RGB Configs: {:?} byte(s)", res);
        }
    }

    send_keymap() {
        const layer_page_length = 16;
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeSet;
        send_buf[1] = PacketData.PacketDataKeymap;
        let dataView = new DataView(send_buf.buffer);        
        this.keymap.forEach((layer,i) => {
            send_buf[2] = i; //layer_index
            for (var index = 0; index < layer.length; index+=layer_page_length) {
                var layer_seg;
                if (index + layer_page_length > layer.length) {
                    layer_seg = layer.length - index; 
                }
                else
                {
                    layer_seg = layer_page_length; 
                }
                dataView.setUint16(3,index,true);
                send_buf[5] = layer_seg;
                this.packet_process(send_buf);
                console.debug(send_buf);
                let res = this.write(send_buf);
                console.debug("Wrote Keymap: {:?} byte(s)", res);
            }
        });
    }

    read_keymap() {
        const layer_page_length = 16;
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeGet;
        send_buf[1] = PacketData.PacketDataKeymap;
        let dataView = new DataView(send_buf.buffer);        
        this.keymap.forEach((layer,i) => {
            send_buf[2] = i; //layer_index
            for (var index = 0; index < layer.length; index+=layer_page_length) {
                var layer_seg;
                if (index + layer_page_length > layer.length) {
                    layer_seg = layer.length - index; 
                }
                else
                {
                    layer_seg = layer_page_length; 
                }
                dataView.setUint16(3,index,true);
                send_buf[5] = layer_seg;
                console.debug(send_buf);
                let res = this.write(send_buf);
                console.debug("Wrote Keymap: {:?} byte(s)", res);
            }
        });
    }

    send_dynamic_keys() {
        this.dynamic_keys.forEach((item,i) => {
            var send_buf = new Uint8Array(63);
            send_buf[0] = PacketCode.PacketCodeSet;
            send_buf[1] = PacketData.PacketDataDynamicKey;
            send_buf[2] = i;
            this.packet_process(send_buf);
            let res = this.write(send_buf);
            console.debug("Wrote dynamic key: {:?} byte(s)", res);
        });
    }

    read_dynamic_keys() {
        this.dynamic_keys.forEach((item,i) => {
            var send_buf = new Uint8Array(63);
            send_buf[0] = PacketCode.PacketCodeGet;
            send_buf[1] = PacketData.PacketDataDynamicKey;
            send_buf[2] = i;
            let res = this.write(send_buf);
            console.debug("Wrote dynamic key: {:?} byte(s)", res);
        });
    }

    get_config_file_num(): number {
        return this.config_file_number;
    }

    get_config_file_index(): number {
        return this.config_file_number;
    }

    set_config_file_index(index: number) : void {
        this.config_file_number = index;
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeAction;
        send_buf[1] = this.config_file_number + 0x10;
        let res = this.write(send_buf);
        this.request_config();
    }


    send_advanced_key_packet(indexs: number[], advanced_key: IAdvancedKey): void {
        indexs.forEach((index)=>{
            let send_buf = new Uint8Array(63);
            send_buf[0] = PacketCode.PacketCodeSet;
            send_buf[1] = PacketData.PacketDataAdvancedKey;
            let dataView = new DataView(send_buf.buffer);
            dataView.setUint16(2,index,true);
            let key_bytes = AdvancedKeyToBytes(advanced_key);
            send_buf.set(key_bytes,4);
            let res = this.write(send_buf);
            console.debug("Wrote Advanced Key: {:?} byte(s)", res);
        });      
    }
    send_keymap_packet(indexs: number[], layer : number, keymap: number): void {
        indexs.forEach((index)=>{
            let send_buf = new Uint8Array(63);
            let dataView = new DataView(send_buf.buffer);    
            send_buf[0] = PacketCode.PacketCodeSet;
            send_buf[1] = PacketData.PacketDataAdvancedKey;
            send_buf[2] = layer; //layer_index
            dataView.setUint16(3,index,true);
            send_buf[5] = 1;
            dataView.setUint16(6,keymap,true);
            let res = this.write(send_buf);
            console.debug("Wrote Keymap: {:?} byte(s)", res);
        });
        //throw new Error("Method not implemented.");
    }
    send_dynamic_key_packet(indexs: number[], dynamic_keys: IDynamicKey): void {
        //throw new Error("Method not implemented.");
    }
    send_rgb_base_packet(rgb_base_config: IRGBBaseConfig): void {
        let send_buf = new Uint8Array(63);
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
        dataView.setFloat32(9,rgb_base_config.speed,true);
        dataView.setUint16(13,rgb_base_config.direction % 65536,true);
        send_buf[15] = rgb_base_config.density % 256;
        send_buf[16] = rgb_base_config.brightness % 256;
        let res = this.write(send_buf);
        console.debug("Rgb base config: {:?} byte(s)", res);
    }
    send_rgb_packet(indexs: number[], rgb_config: IRGBConfig): void {        
        indexs.forEach((index)=>{
            let send_buf = new Uint8Array(63);
            let dataView = new DataView(send_buf.buffer);
            send_buf[0] = PacketCode.PacketCodeSet;
            send_buf[1] = PacketData.PacketDataRgbConfig;
            send_buf[2] = 1;
            dataView.setUint16(3, index,true);
            send_buf[3 + 2] = this.rgb_configs[index].mode;
            send_buf[3 + 3] = this.rgb_configs[index].rgb.red;
            send_buf[3 + 4] = this.rgb_configs[index].rgb.green;
            send_buf[3 + 5] = this.rgb_configs[index].rgb.blue;
            dataView.setFloat32(3 + 6,this.rgb_configs[index].speed,true);
            let res = this.write(send_buf);
            console.debug("Wrote rgb: {:?} byte(s)", res);
        });
    }
};
