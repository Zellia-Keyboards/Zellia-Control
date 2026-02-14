import {
  Keycode,
  KeyMode,
  KeyModifier,
  MouseKeycode,
  KeyboardKeycode,
  RGBMode,
  Srgb,
  LayerControlKeycode,
  DynamicKeyType,
  IDynamicKey,
  IDynamicKeyMutex,
  DynamicKeyMutex,
  ConsumerKeycode,
  SystemRawKeycode,
  JoystickKeycode,
  MIDIKeycode,
  KeyboardConfig,
  MacroKeycode,
} from 'emi-keyboard-controller';

export const keyCodeToKeyName: { [key in Keycode]: string } = {
  [Keycode.NoEvent]: 'No Event',
  [Keycode.ErrorOverflow]: 'Error Overflow',
  [Keycode.PostFail]: 'Post Fail',
  [Keycode.ErrorUndefined]: 'Error Undefined',

  [Keycode.A]: 'A',
  [Keycode.B]: 'B',
  [Keycode.C]: 'C',
  [Keycode.D]: 'D',
  [Keycode.E]: 'E',
  [Keycode.F]: 'F',
  [Keycode.G]: 'G',
  [Keycode.H]: 'H',
  [Keycode.I]: 'I',
  [Keycode.J]: 'J',
  [Keycode.K]: 'K',
  [Keycode.L]: 'L',
  [Keycode.M]: 'M',
  [Keycode.N]: 'N',
  [Keycode.O]: 'O',
  [Keycode.P]: 'P',
  [Keycode.Q]: 'Q',
  [Keycode.R]: 'R',
  [Keycode.S]: 'S',
  [Keycode.T]: 'T',
  [Keycode.U]: 'U',
  [Keycode.V]: 'V',
  [Keycode.W]: 'W',
  [Keycode.X]: 'X',
  [Keycode.Y]: 'Y',
  [Keycode.Z]: 'Z',

  [Keycode.Key1]: '1',
  [Keycode.Key2]: '2',
  [Keycode.Key3]: '3',
  [Keycode.Key4]: '4',
  [Keycode.Key5]: '5',
  [Keycode.Key6]: '6',
  [Keycode.Key7]: '7',
  [Keycode.Key8]: '8',
  [Keycode.Key9]: '9',
  [Keycode.Key0]: '0',

  [Keycode.Enter]: 'Enter',
  [Keycode.Escape]: 'Escape',
  [Keycode.Backspace]: 'Backspace',
  [Keycode.Tab]: 'Tab',

  [Keycode.Spacebar]: 'Spacebar',
  [Keycode.Minus]: '-',
  [Keycode.Equal]: '=',
  [Keycode.LeftBrace]: '[',
  [Keycode.RightBrace]: ']',
  [Keycode.Backslash]: '\\',
  [Keycode.NonUsHash]: '#',
  [Keycode.Semicolon]: ';',
  [Keycode.Apostrophe]: "'",
  [Keycode.Grave]: '`',
  [Keycode.Comma]: ',',
  [Keycode.Dot]: '.',
  [Keycode.Slash]: '/',

  [Keycode.CapsLock]: 'Caps Lock',
  [Keycode.F1]: 'F1',
  [Keycode.F2]: 'F2',
  [Keycode.F3]: 'F3',
  [Keycode.F4]: 'F4',
  [Keycode.F5]: 'F5',
  [Keycode.F6]: 'F6',
  [Keycode.F7]: 'F7',
  [Keycode.F8]: 'F8',
  [Keycode.F9]: 'F9',
  [Keycode.F10]: 'F10',
  [Keycode.F11]: 'F11',
  [Keycode.F12]: 'F12',
  [Keycode.PrintScreen]: 'Print Screen',
  [Keycode.ScrollLock]: 'Scroll Lock',
  [Keycode.Pause]: 'Pause',

  [Keycode.Insert]: 'Insert',
  [Keycode.Home]: 'Home',
  [Keycode.PageUp]: 'Page Up',
  [Keycode.Delete]: 'Delete',
  [Keycode.End]: 'End',
  [Keycode.PageDown]: 'Page Down',
  [Keycode.RightArrow]: '→',
  [Keycode.LeftArrow]: '←',
  [Keycode.DownArrow]: '↓',
  [Keycode.UpArrow]: '↑',

  [Keycode.NumLock]: 'Num Lock',
  [Keycode.KeypadDivide]: 'Keypad /',
  [Keycode.KeypadMultiply]: 'Keypad *',
  [Keycode.KeypadMinus]: 'Keypad -',
  [Keycode.KeypadPlus]: 'Keypad +',
  [Keycode.KeypadEnter]: 'Keypad Enter',
  [Keycode.Keypad1]: 'Keypad 1',
  [Keycode.Keypad2]: 'Keypad 2',
  [Keycode.Keypad3]: 'Keypad 3',
  [Keycode.Keypad4]: 'Keypad 4',
  [Keycode.Keypad5]: 'Keypad 5',
  [Keycode.Keypad6]: 'Keypad 6',
  [Keycode.Keypad7]: 'Keypad 7',
  [Keycode.Keypad8]: 'Keypad 8',
  [Keycode.Keypad9]: 'Keypad 9',
  [Keycode.Keypad0]: 'Keypad 0',
  [Keycode.KeypadDot]: 'Keypad .',

  [Keycode.NonUsBackslash]: 'Non US Backslash',
  [Keycode.Application]: 'Application',
  [Keycode.Power]: 'Power',
  [Keycode.KeypadEqual]: 'Keypad =',

  [Keycode.F13]: 'F13',
  [Keycode.F14]: 'F14',
  [Keycode.F15]: 'F15',
  [Keycode.F16]: 'F16',
  [Keycode.F17]: 'F17',
  [Keycode.F18]: 'F18',
  [Keycode.F19]: 'F19',
  [Keycode.F20]: 'F20',
  [Keycode.F21]: 'F21',
  [Keycode.F22]: 'F22',
  [Keycode.F23]: 'F23',
  [Keycode.F24]: 'F24',

  [Keycode.Execute]: 'Execute',
  [Keycode.Help]: 'Help',
  [Keycode.Menu]: 'Menu',
  [Keycode.Select]: 'Select',
  [Keycode.Stop]: 'Stop',
  [Keycode.Again]: 'Again',
  [Keycode.Undo]: 'Undo',
  [Keycode.Cut]: 'Cut',
  [Keycode.Copy]: 'Copy',
  [Keycode.Paste]: 'Paste',
  [Keycode.Find]: 'Find',
  [Keycode.Mute]: 'Mute',
  [Keycode.VolumeUp]: 'Volume Up',
  [Keycode.VolumeDown]: 'Volume Down',

  [Keycode.LockingCapsLock]: 'Locking Caps Lock',
  [Keycode.LockingNumLock]: 'Locking Num Lock',
  [Keycode.LockingScrollLock]: 'Locking Scroll Lock',

  [Keycode.KeypadComma]: 'Keypad ,',
  [Keycode.KeypadEqualSign]: 'Keypad =',
  [Keycode.Intl1]: 'Intl1',
  [Keycode.Intl2]: 'Intl2',
  [Keycode.Intl3]: 'Intl3',
  [Keycode.Intl4]: 'Intl4',
  [Keycode.Intl5]: 'Intl5',
  [Keycode.Intl6]: 'Intl6',
  [Keycode.Intl7]: 'Intl7',
  [Keycode.Intl8]: 'Intl8',
  [Keycode.Intl9]: 'Intl9',
  [Keycode.Lang1]: 'Lang1',
  [Keycode.Lang2]: 'Lang2',
  [Keycode.Lang3]: 'Lang3',
  [Keycode.Lang4]: 'Lang4',
  [Keycode.Lang5]: 'Lang5',
  [Keycode.Lang6]: 'Lang6',
  [Keycode.Lang7]: 'Lang7',
  [Keycode.Lang8]: 'Lang8',
  [Keycode.Lang9]: 'Lang9',

  [Keycode.AlternateErase]: 'Alternate Erase',
  [Keycode.SysReqAttention]: 'SysReq Attention',
  [Keycode.Cancel]: 'Cancel',
  [Keycode.Clear]: 'Clear',
  [Keycode.Prior]: 'Prior',
  [Keycode.Return]: 'Return',
  [Keycode.Separator]: 'Separator',
  [Keycode.Out]: 'Out',
  [Keycode.Oper]: 'Oper',
  [Keycode.ClearAgain]: 'Clear Again',
  [Keycode.CrSelProps]: 'CrSel Props',
  [Keycode.ExSel]: 'ExSel',
  [Keycode.MouseCollection]: 'Mouse',
  [Keycode.LayerControl]: 'Layer Ctrl',
  [Keycode.DynamicKey]: 'Dynamic Key',
  [Keycode.ConsumerCollection]: 'Consumer',
  [Keycode.SystemCollection]: 'System',
  [Keycode.JoystickCollection]: 'Joystick',
  [Keycode.MIDICollection]: 'MIDI',
  [Keycode.MIDINote]: 'MIDI Note',
  [Keycode.KeyUser]: 'User',
  [Keycode.KeyboardOperation]: 'Keyboard',
  [Keycode.KeyTransparent]: '∇',
};

export const keyModifierToKeyName: { [key in KeyModifier]: string } = {
  [KeyModifier.KeyNoModifier]: 'No Modifier',
  [KeyModifier.KeyLeftCtrl]: 'Left Ctrl',
  [KeyModifier.KeyLeftShift]: 'Left Shift',
  [KeyModifier.KeyLeftAlt]: 'Left Alt',
  [KeyModifier.KeyLeftGui]: 'Left GUI',
  [KeyModifier.KeyRightCtrl]: 'Right Ctrl',
  [KeyModifier.KeyRightShift]: 'Right Shift',
  [KeyModifier.KeyRightAlt]: 'Right Alt',
  [KeyModifier.KeyRightGui]: 'Right GUI',
};

export const MouseKeycodeToKeyName: { [key in MouseKeycode]: string } = {
  [MouseKeycode.MouseLButton]: 'Mouse Left Button',
  [MouseKeycode.MouseRButton]: 'Mouse Right Button',
  [MouseKeycode.MouseMButton]: 'Mouse Middle Button',
  [MouseKeycode.MouseForward]: 'Mouse Forward',
  [MouseKeycode.MouseBack]: 'Mouse Back',
  [MouseKeycode.MouseWheelUp]: 'Mouse Wheel Up',
  [MouseKeycode.MouseWheelDown]: 'Mouse Wheel Down',
  [MouseKeycode.MouseWheelLeft]: 'Mouse Wheel Left',
  [MouseKeycode.MouseWheelRight]: 'Mouse Wheel Right',
  [MouseKeycode.MouseMoveUp]: 'Mouse Move Up',
  [MouseKeycode.MouseMoveDown]: 'Mouse Move Down',
  [MouseKeycode.MouseMoveLeft]: 'Mouse Move Left',
  [MouseKeycode.MouseMoveRight]: 'Mouse Move Right',
};

export const KeyboardOperationToKeyName: { [key in KeyboardKeycode]: string } = {
  [KeyboardKeycode.KeyboardReboot]: 'Reboot',
  [KeyboardKeycode.KeyboardFactoryReset]: 'Factory Reset',
  [KeyboardKeycode.KeyboardSave]: 'Save to flash',
  [KeyboardKeycode.KeyboardBootloader]: 'Jump to Bootloader',
  [KeyboardKeycode.KeyboardResetToDefault]: 'Reset to Default',
  [KeyboardKeycode.KeyboardRgbBrightnessUp]: 'Brightness Up',
  [KeyboardKeycode.KeyboardRgbBrightnessDown]: 'Brightness Down',
  [KeyboardKeycode.KeyboardConfig0]: 'Config 0',
  [KeyboardKeycode.KeyboardConfig1]: 'Config 1',
  [KeyboardKeycode.KeyboardConfig2]: 'Config 2',
  [KeyboardKeycode.KeyboardConfig3]: 'Config 3',
  [KeyboardKeycode.KeyboardConfigBase]: 'Config Base',
};

export const KeyboardConfigToKeyName: { [key in KeyboardConfig]: string } = {
  [KeyboardConfig.KeyboardConfigDebug]: 'Debug',
  [KeyboardConfig.KeyboardConfigNkro]: 'NKRO',
  [KeyboardConfig.KeyboardConfigWinlock]: 'Winlock',
  [KeyboardConfig.KeyboardConfigContinousPoll]: 'Continous poll',
  [KeyboardConfig.KeyboardConfigNum]: 'Num',
};

export const LayerControlToKeyName: { [key in LayerControlKeycode]: string } = {
  [LayerControlKeycode.LayerMomentary]: 'Temporarily switch to',
  [LayerControlKeycode.LayerTurnOn]: 'Turn on',
  [LayerControlKeycode.LayerTurnOff]: 'Turn off',
  [LayerControlKeycode.LayerToggle]: 'Toggle',
};

export const JoystickKeycodeToKeyName: { [key in JoystickKeycode]: string } = {
  [JoystickKeycode.JoystickButton]: 'Joystick Button',
  [JoystickKeycode.JoystickPositive]: 'Positive',
  [JoystickKeycode.JoystickNegative]: 'Negative',
  [JoystickKeycode.JoystickWhole]: 'Whole',
  [JoystickKeycode.JoystickWholeInvert]: 'Whole Invert',
};

export const DynamicKeyToKeyName: { [key in DynamicKeyType]: string } = {
  [DynamicKeyType.DynamicKeyNone]: 'None',
  [DynamicKeyType.DynamicKeyStroke]: 'Dynamic Key Stroke',
  [DynamicKeyType.DynamicKeyModTap]: 'Mod Tap',
  [DynamicKeyType.DynamicKeyToggleKey]: 'Toggle Key',
  [DynamicKeyType.DynamicKeyMutex]: 'Mutex',
  [DynamicKeyType.DynamicKeyTypeNum]: '',
};

export const ConsumerKeyToKeyName: { [key in ConsumerKeycode]: string } = {
  [ConsumerKeycode.ConsumerSnapshot]: 'Snapshot',
  [ConsumerKeycode.ConsumerBrightnessUp]: 'Brightness Up',
  [ConsumerKeycode.ConsumerBrightnessDown]: 'Brightness Down',
  [ConsumerKeycode.ConsumerTransportRecord]: 'Record',
  [ConsumerKeycode.ConsumerTransportFastForward]: 'Fast Forward',
  [ConsumerKeycode.ConsumerTransportRewind]: 'Rewind',
  [ConsumerKeycode.ConsumerTransportNextTrack]: 'Next Track',
  [ConsumerKeycode.ConsumerTransportPrevTrack]: 'Previous Track',
  [ConsumerKeycode.ConsumerTransportStop]: 'Stop',
  [ConsumerKeycode.ConsumerTransportEject]: 'Eject',
  [ConsumerKeycode.ConsumerTransportRandomPlay]: 'Random Play',
  [ConsumerKeycode.ConsumerTransportStopEject]: 'Stop and Eject',
  [ConsumerKeycode.ConsumerTransportPlayPause]: 'Play/Pause',
  [ConsumerKeycode.ConsumerAudioMute]: 'Mute',
  [ConsumerKeycode.ConsumerAudioVolUp]: 'Volume Up',
  [ConsumerKeycode.ConsumerAudioVolDown]: 'Volume Down',
  [ConsumerKeycode.ConsumerAlCcConfig]: 'Consumer Control Configuration',
  [ConsumerKeycode.ConsumerAlEmail]: 'Email',
  [ConsumerKeycode.ConsumerAlCalculator]: 'Calculator',
  [ConsumerKeycode.ConsumerAlLocalBrowser]: 'Local Browser',
  [ConsumerKeycode.ConsumerAlLock]: 'Lock',
  [ConsumerKeycode.ConsumerAlControlPanel]: 'Control Panel',
  [ConsumerKeycode.ConsumerAlAssistant]: 'Assistant',
  [ConsumerKeycode.ConsumerAlKeyboardLayout]: 'Keyboard Layout',
  [ConsumerKeycode.ConsumerAcNew]: 'New',
  [ConsumerKeycode.ConsumerAcOpen]: 'Open',
  [ConsumerKeycode.ConsumerAcClose]: 'Close',
  [ConsumerKeycode.ConsumerAcExit]: 'Exit',
  [ConsumerKeycode.ConsumerAcMaximize]: 'Maximize',
  [ConsumerKeycode.ConsumerAcMinimize]: 'Minimize',
  [ConsumerKeycode.ConsumerAcSave]: 'Save',
  [ConsumerKeycode.ConsumerAcPrint]: 'Print',
  [ConsumerKeycode.ConsumerAcProperties]: 'Properties',
  [ConsumerKeycode.ConsumerAcUndo]: 'Undo',
  [ConsumerKeycode.ConsumerAcCopy]: 'Copy',
  [ConsumerKeycode.ConsumerAcCut]: 'Cut',
  [ConsumerKeycode.ConsumerAcPaste]: 'Paste',
  [ConsumerKeycode.ConsumerAcSelectAll]: 'Select All',
  [ConsumerKeycode.ConsumerAcFind]: 'Find',
  [ConsumerKeycode.ConsumerAcSearch]: 'Search',
  [ConsumerKeycode.ConsumerAcHome]: 'Home',
  [ConsumerKeycode.ConsumerAcBack]: 'Back',
  [ConsumerKeycode.ConsumerAcForward]: 'Forward',
  [ConsumerKeycode.ConsumerAcStop]: 'Stop',
  [ConsumerKeycode.ConsumerAcRefresh]: 'Refresh',
  [ConsumerKeycode.ConsumerAcBookmarks]: 'Bookmarks',
  [ConsumerKeycode.ConsumerAcNextKeyboardLayoutSelect]: 'Next Keyboard Layout',
  [ConsumerKeycode.ConsumerAcDesktopShowAllWindows]: 'Show All Windows',
  [ConsumerKeycode.ConsumerAcSoftKeyLeft]: 'Soft Key Left',
};

export const SystemKeyToKeyName: { [key in SystemRawKeycode]: string } = {
  [SystemRawKeycode.SystemPowerDown]: 'Power Down',
  [SystemRawKeycode.SystemSleep]: 'Sleep',
  [SystemRawKeycode.SystemWakeUp]: 'Wake Up',
  [SystemRawKeycode.SystemRestart]: 'Restart',
  [SystemRawKeycode.SystemDisplayToggleIntExt]: 'Display Toggle Int Ext',
};

export const MacroKeycodeToKeyName: { [key in MacroKeycode]: string } = {
  [MacroKeycode.MacroEnd]: 'End',
  [MacroKeycode.MacroRecordingStart]: 'Start Recording',
  [MacroKeycode.MacroRecordingStop]: 'Stop Recording',
  [MacroKeycode.MacroRecordingToggle]: 'Toggle Recording',
  [MacroKeycode.MacroPlayingStartOnce]: 'Start Playing Once',
  [MacroKeycode.MacroPlayingStartCircularly]: 'Start Playing Circularly',
  [MacroKeycode.MacroPlayingStartOnceNoGap]: 'Start Playing Once No Gap',
  [MacroKeycode.MacroPlayingStartCircularlyNoGap]: 'Start Playing Circularly No Gap',
  [MacroKeycode.MacroPlayingStop]: 'Stop Playing',
  [MacroKeycode.MacroPlayingPause]: 'Pause Playing',
  [MacroKeycode.MacroBegin]: '',
};

export const MIDINoteName: string[] = [
  'C', 'C♯', 'D', 'D♯', 'E', 'F',
  'F♯', 'G', 'G♯', 'A', 'A♯', 'B',
];

/**
 * Convert keycode modifier bits to a human-readable string.
 */
export function keyBindingModifierToString(keybinding: number): string {
  let desc = '';
  for (let i = 0; i < 8; i++) {
    if (((keybinding >> 8) & (1 << i)) > 0) {
      desc += keyModifierToKeyName[(1 << i) as KeyModifier] + ' ';
    }
  }
  return desc;
}

/**
 * Convert a numeric keycode to display-friendly main and sub strings.
 * This mirrors EMIKeyboardConfigurator's keyCodeToString logic.
 */
export function keyCodeToString(keycode: number): { mainString: string; subString: string } {
  let mainString = '';
  let subString = '';
  const modifier = (keycode >> 8) & 0xff;
  const code = keycode & 0xff;

  if (code < Keycode.ExSel || code === Keycode.KeyTransparent) {
    mainString = keyCodeToKeyName[code as Keycode] ?? '';
    subString = keyBindingModifierToString(keycode);
  } else {
    switch (code) {
      case Keycode.MouseCollection:
        mainString = MouseKeycodeToKeyName[modifier as MouseKeycode] ?? 'Mouse';
        break;
      case Keycode.LayerControl:
        subString = LayerControlToKeyName[((modifier >> 4) & 0x0f) as LayerControlKeycode] ?? '';
        mainString = 'Layer' + (modifier & 0x0f).toString();
        break;
      case Keycode.KeyboardOperation:
        if ((modifier & 0x3f) < KeyboardKeycode.KeyboardConfigBase) {
          mainString = KeyboardOperationToKeyName[modifier as KeyboardKeycode] ?? 'Keyboard';
        } else {
          switch ((modifier >> 6) & 0x03) {
            case 0:
              subString = 'Turn off';
              break;
            case 1:
              subString = 'Turn on';
              break;
            case 2:
              subString = 'Toggle';
              break;
            default:
              break;
          }
          mainString =
            KeyboardConfigToKeyName[
              ((modifier & 0x3f) - KeyboardKeycode.KeyboardConfigBase) as KeyboardConfig
            ] ?? '';
        }
        break;
      case Keycode.KeyUser:
        mainString = 'User ' + modifier.toString();
        break;
      case Keycode.DynamicKey:
        subString = 'Dynamic Key';
        mainString = modifier.toString();
        break;
      case Keycode.ConsumerCollection:
        mainString = ConsumerKeyToKeyName[modifier as ConsumerKeycode] ?? 'Consumer';
        break;
      case Keycode.SystemCollection:
        mainString = SystemKeyToKeyName[modifier as SystemRawKeycode] ?? 'System';
        break;
      case Keycode.JoystickCollection:
        subString = 'Joystick';
        mainString =
          (JoystickKeycodeToKeyName[((modifier >> 5) & 0x0f) as JoystickKeycode] ?? '') +
          (modifier & 0x1f).toString();
        break;
      case Keycode.MIDICollection:
        subString = 'MIDI';
        mainString = MIDIKeycode[modifier] ?? modifier.toString();
        break;
      case Keycode.MIDINote:
        subString = 'MIDI Note';
        mainString = MIDINoteName[modifier % 12] + ((modifier - (modifier % 12)) / 12).toString();
        break;
      case Keycode.MacroCollection:
        subString = 'Macro';
        mainString =
          (MacroKeycodeToKeyName[((modifier >> 4) & 0x0f) as MacroKeycode] ?? '') +
          (modifier & 0x0f).toString();
        break;
    }
  }
  return { mainString, subString };
}

/**
 * Convert a numeric keycode to a KLE-style labels array.
 * Position 0 = sub string (modifier), position 6 = main string (key name).
 */
export function keyCodeToStringLabels(keycode: number): string[] {
  const label_item = keyCodeToString(keycode);
  return [label_item.subString, '', '', '', '', '', label_item.mainString] as string[];
}
