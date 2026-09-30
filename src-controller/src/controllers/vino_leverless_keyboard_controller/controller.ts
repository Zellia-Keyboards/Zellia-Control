import { LibampKeyboardController } from '../libamp_keyboard_controller/controller';
import { IAdvancedKey, IKeyboardController, IRGBConfig, KeyMode, CalibrationMode, RGBMode, Keycode, KeyModifier, AdvancedKey, KeyboardKeycode, LayerControlKeycode, KeyboardController, DynamicKey, DynamicKeyType, DynamicKeyStroke4x4, DynamicKeyModTap, DynamicKeyToggleKey, DynamicKeyMutex, IDynamicKey, IDynamicKeyStroke4x4, IDynamicKeyModTap, IDynamicKeyToggleKey, IDynamicKeyMutex, RGBBaseConfig, detectHIDDevice, GamepadKeycode } from '../../interface';

import layout from './keyboard_layout.json?raw';
import { detectUSBDevice } from '../../dfu/web-dfu';
import { USBDevice } from '../../dfu/webusb-types';
export class VinoLeverlessKeyboardController extends LibampKeyboardController {
    ADVANCED_KEY_NUM: number = 16;
    profile_number:number = 4;

    constructor() {
        super();
        this.device = undefined;
        this.reset_to_default();
        this.feature.rgb_flag = false;
    }

    async detect(silent: boolean = false): Promise<HIDDevice[]> {
        return detectHIDDevice({
            vendorId: 0xFEED,
            productId: 22319,
            usagePage: 0xFF60,
            }, silent, "Vino LeverlessKeyboard");
    }

    async detect_bootloader(silent: boolean = false): Promise<USBDevice[]> {
        return detectUSBDevice({ vendorId: 0x0483, productId: 0xDF11 }, silent);
    }

    get_layout_json(): string {
        return layout;
    }
    
    reset_to_default(): void {
        this.advanced_keys = Array(this.ADVANCED_KEY_NUM).fill(null).map(() => new AdvancedKey({
            mode: KeyMode.KeyAnalogNormalMode,
            calibration_mode: CalibrationMode.KeyAutoCalibrationUndefined,
            activation_value: 0.5,
            deactivation_value: 0.49,
            trigger_distance: 0.08,
            release_distance: 0.08,
            trigger_speed: 0.01,
            release_speed: 0.01,
            upper_deadzone: 0.00,
            lower_deadzone: 0.2,
            upper_bound: 2600.0,
            lower_bound: 140.0,
        }));
        this.rgb_base_config = new RGBBaseConfig();
        this.rgb_configs = [];
        this.keymap = [
                [
                    Keycode.I,
                    Keycode.O,
                    Keycode.Y,
                    Keycode.D,
                    Keycode.F,
                    Keycode.S,
                    Keycode.A,
                    Keycode.U,
                    Keycode.J,
                    Keycode.K,
                    Keycode.L,
                    Keycode.H,
                    Keycode.Tab,
                    Keycode.W,
                    Keycode.P,
                    Keycode.Escape
                ],
                Array(16).fill(Keycode.KeyTransparent),
                Array(16).fill(Keycode.KeyTransparent),
                Array(16).fill(Keycode.KeyTransparent),
                Array(16).fill(Keycode.KeyTransparent),
        ];
        this.dynamic_keys = Array(8).fill(null).map(() => (new DynamicKey()));;
    }
}