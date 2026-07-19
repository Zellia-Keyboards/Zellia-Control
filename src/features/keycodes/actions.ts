/**
 * Keycode catalog of the advanced-key pickers (tap-hold, toggle, DKS bindings): the Svelte
 * `keyActions` list with its names, categories and order, but every action carries its full
 * encoded keycode. The Svelte picker emitted only the low byte, so modifiers became unrelated
 * HID keys and every layer, consumer and mouse action collapsed onto one keycode (spec D15).
 */
import {
  ConsumerKeycode,
  Keycode as EmiKeycode,
  KeyModifier,
  LayerControlKeycode,
  MouseKeycode,
} from 'emi-keyboard-controller';
import type { Keycode } from '../device/model/types';
import { kc } from './codec';

export type ActionCategoryName = 'Basic' | 'Layer' | 'System' | 'Mouse';

export interface Action {
  readonly name: string;
  readonly keycode: Keycode;
}

export interface ActionCategory {
  readonly name: ActionCategoryName;
  readonly actions: readonly Action[];
}

const key = (name: string, code: EmiKeycode): Action => ({ name, keycode: kc.key(code) });
const modifier = (name: string, mask: KeyModifier): Action => ({
  name,
  keycode: kc.modifier(mask),
});
const layer = (name: string, op: LayerControlKeycode, n: number): Action => ({
  name,
  keycode: kc.layer(op, n),
});
const consumer = (name: string, sub: ConsumerKeycode): Action => ({
  name,
  keycode: kc.consumer(sub),
});
const mouse = (name: string, sub: MouseKeycode): Action => ({ name, keycode: kc.mouse(sub) });

const { LayerMomentary, LayerTurnOn, LayerToggle } = LayerControlKeycode;

export const ACTION_CATEGORIES: readonly ActionCategory[] = [
  {
    name: 'Basic',
    actions: [
      // Special keys
      key('Esc', EmiKeycode.Escape),
      key('None', EmiKeycode.NoEvent),
      // Function keys (F1-F24)
      key('F1', EmiKeycode.F1),
      key('F2', EmiKeycode.F2),
      key('F3', EmiKeycode.F3),
      key('F4', EmiKeycode.F4),
      key('F5', EmiKeycode.F5),
      key('F6', EmiKeycode.F6),
      key('F7', EmiKeycode.F7),
      key('F8', EmiKeycode.F8),
      key('F9', EmiKeycode.F9),
      key('F10', EmiKeycode.F10),
      key('F11', EmiKeycode.F11),
      key('F12', EmiKeycode.F12),
      key('F13', EmiKeycode.F13),
      key('F14', EmiKeycode.F14),
      key('F15', EmiKeycode.F15),
      key('F16', EmiKeycode.F16),
      key('F17', EmiKeycode.F17),
      key('F18', EmiKeycode.F18),
      key('F19', EmiKeycode.F19),
      key('F20', EmiKeycode.F20),
      key('F21', EmiKeycode.F21),
      key('F22', EmiKeycode.F22),
      key('F23', EmiKeycode.F23),
      key('F24', EmiKeycode.F24),
      // Numbers
      key('1', EmiKeycode.Key1),
      key('2', EmiKeycode.Key2),
      key('3', EmiKeycode.Key3),
      key('4', EmiKeycode.Key4),
      key('5', EmiKeycode.Key5),
      key('6', EmiKeycode.Key6),
      key('7', EmiKeycode.Key7),
      key('8', EmiKeycode.Key8),
      key('9', EmiKeycode.Key9),
      key('0', EmiKeycode.Key0),
      // Letters
      key('A', EmiKeycode.A),
      key('B', EmiKeycode.B),
      key('C', EmiKeycode.C),
      key('D', EmiKeycode.D),
      key('E', EmiKeycode.E),
      key('F', EmiKeycode.F),
      key('G', EmiKeycode.G),
      key('H', EmiKeycode.H),
      key('I', EmiKeycode.I),
      key('J', EmiKeycode.J),
      key('K', EmiKeycode.K),
      key('L', EmiKeycode.L),
      key('M', EmiKeycode.M),
      key('N', EmiKeycode.N),
      key('O', EmiKeycode.O),
      key('P', EmiKeycode.P),
      key('Q', EmiKeycode.Q),
      key('R', EmiKeycode.R),
      key('S', EmiKeycode.S),
      key('T', EmiKeycode.T),
      key('U', EmiKeycode.U),
      key('V', EmiKeycode.V),
      key('W', EmiKeycode.W),
      key('X', EmiKeycode.X),
      key('Y', EmiKeycode.Y),
      key('Z', EmiKeycode.Z),
      // Symbols & punctuation
      key('~', EmiKeycode.Grave),
      key('-', EmiKeycode.Minus),
      key('=', EmiKeycode.Equal),
      key('[', EmiKeycode.LeftBrace),
      key(']', EmiKeycode.RightBrace),
      key('\\', EmiKeycode.Backslash),
      key(';', EmiKeycode.Semicolon),
      key("'", EmiKeycode.Apostrophe),
      key(',', EmiKeycode.Comma),
      key('.', EmiKeycode.Dot),
      key('/', EmiKeycode.Slash),
      // Navigation & editing
      key('Insert', EmiKeycode.Insert),
      key('Delete', EmiKeycode.Delete),
      key('Home', EmiKeycode.Home),
      key('End', EmiKeycode.End),
      key('PgUp', EmiKeycode.PageUp),
      key('PgDn', EmiKeycode.PageDown),
      key('↑', EmiKeycode.UpArrow),
      key('↓', EmiKeycode.DownArrow),
      key('←', EmiKeycode.LeftArrow),
      key('→', EmiKeycode.RightArrow),
      // Modifiers
      modifier('Left Ctrl', KeyModifier.KeyLeftCtrl),
      modifier('Right Ctrl', KeyModifier.KeyRightCtrl),
      modifier('Left Shift', KeyModifier.KeyLeftShift),
      modifier('Right Shift', KeyModifier.KeyRightShift),
      modifier('Left Alt', KeyModifier.KeyLeftAlt),
      modifier('Right Alt', KeyModifier.KeyRightAlt),
      modifier('Left Win', KeyModifier.KeyLeftGui),
      modifier('Right Win', KeyModifier.KeyRightGui),
      // Control keys
      key('Tab', EmiKeycode.Tab),
      key('Caps Lock', EmiKeycode.CapsLock),
      key('Backspace', EmiKeycode.Backspace),
      key('Enter', EmiKeycode.Enter),
      key('Space', EmiKeycode.Spacebar),
      key('Menu', EmiKeycode.Application),
      key('Print Screen', EmiKeycode.PrintScreen),
      key('Scroll Lock', EmiKeycode.ScrollLock),
      key('Pause', EmiKeycode.Pause),
      // Numpad
      key('Num Lock', EmiKeycode.NumLock),
      key('KP /', EmiKeycode.KeypadDivide),
      key('KP *', EmiKeycode.KeypadMultiply),
      key('KP -', EmiKeycode.KeypadMinus),
      key('KP +', EmiKeycode.KeypadPlus),
      key('KP Enter', EmiKeycode.KeypadEnter),
      key('KP 0', EmiKeycode.Keypad0),
      key('KP 1', EmiKeycode.Keypad1),
      key('KP 2', EmiKeycode.Keypad2),
      key('KP 3', EmiKeycode.Keypad3),
      key('KP 4', EmiKeycode.Keypad4),
      key('KP 5', EmiKeycode.Keypad5),
      key('KP 6', EmiKeycode.Keypad6),
      key('KP 7', EmiKeycode.Keypad7),
      key('KP 8', EmiKeycode.Keypad8),
      key('KP 9', EmiKeycode.Keypad9),
      key('KP .', EmiKeycode.KeypadDot),
      // International
      key('Non-US #', EmiKeycode.NonUsHash),
      key('Non-US \\', EmiKeycode.NonUsBackslash),
      key('無変換', EmiKeycode.Intl5),
      key('変換', EmiKeycode.Intl4),
      key('カタカナひらがな', EmiKeycode.Intl2),
      key('IME On', EmiKeycode.Lang1),
      key('IME Off', EmiKeycode.Lang2),
    ],
  },
  {
    name: 'Layer',
    actions: [
      layer('MO(1)', LayerMomentary, 1),
      layer('MO(2)', LayerMomentary, 2),
      layer('MO(3)', LayerMomentary, 3),
      layer('TO(0)', LayerTurnOn, 0),
      layer('TO(1)', LayerTurnOn, 1),
      layer('TO(2)', LayerTurnOn, 2),
      layer('TO(3)', LayerTurnOn, 3),
      layer('TG(0)', LayerToggle, 0),
      layer('TG(1)', LayerToggle, 1),
      layer('TG(2)', LayerToggle, 2),
      layer('TG(3)', LayerToggle, 3),
    ],
  },
  {
    name: 'System',
    actions: [
      consumer('BRT-', ConsumerKeycode.ConsumerBrightnessDown),
      consumer('BRT+', ConsumerKeycode.ConsumerBrightnessUp),
      consumer('Vol-', ConsumerKeycode.ConsumerAudioVolDown),
      consumer('Vol+', ConsumerKeycode.ConsumerAudioVolUp),
      consumer('Mute', ConsumerKeycode.ConsumerAudioMute),
      consumer('Play/Pause', ConsumerKeycode.ConsumerTransportPlayPause),
      consumer('Stop', ConsumerKeycode.ConsumerTransportStop),
      consumer('Prev', ConsumerKeycode.ConsumerTransportPrevTrack),
      consumer('Next', ConsumerKeycode.ConsumerTransportNextTrack),
      consumer('Email', ConsumerKeycode.ConsumerAlEmail),
      consumer('Calculator', ConsumerKeycode.ConsumerAlCalculator),
      consumer('Explorer', ConsumerKeycode.ConsumerAlLocalBrowser),
      { name: 'Transparent', keycode: kc.transparent },
    ],
  },
  {
    name: 'Mouse',
    actions: [
      mouse('Mouse Left', MouseKeycode.MouseLButton),
      mouse('Mouse Right', MouseKeycode.MouseRButton),
      mouse('Mouse Middle', MouseKeycode.MouseMButton),
      mouse('Mouse Forward', MouseKeycode.MouseForward),
      mouse('Mouse Back', MouseKeycode.MouseBack),
      mouse('Wheel Up', MouseKeycode.MouseWheelUp),
      mouse('Wheel Down', MouseKeycode.MouseWheelDown),
      mouse('Wheel Left', MouseKeycode.MouseWheelLeft),
      mouse('Wheel Right', MouseKeycode.MouseWheelRight),
      mouse('Move Up', MouseKeycode.MouseMoveUp),
      mouse('Move Down', MouseKeycode.MouseMoveDown),
      mouse('Move Left', MouseKeycode.MouseMoveLeft),
      mouse('Move Right', MouseKeycode.MouseMoveRight),
    ],
  },
];

const ACTIONS_BY_KEYCODE: ReadonlyMap<Keycode, Action> = new Map(
  ACTION_CATEGORIES.flatMap(category => category.actions).map(action => [action.keycode, action])
);

/** The picker action for a keycode (e.g. to show a binding's name), if the catalog has one. */
export function findAction(keycode: Keycode): Action | undefined {
  return ACTIONS_BY_KEYCODE.get(keycode);
}
