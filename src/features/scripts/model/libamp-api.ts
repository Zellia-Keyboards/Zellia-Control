/**
 * The script API of libamp's firmware, which the editor completes: the globals and members of
 * `src/mquickjs/mqjs_libamp_stdlib.c` and `mqjs_stdlib.c`, and the callbacks `src/script.c`
 * calls, at the commit vendor/mqjs is built from (8f9c439). There `keyboard.suspend` is commented
 * out, `emit` is a method of keys and the lighting object is `led`. Building the compiler from
 * another commit means checking this list against that commit.
 */
export type ScriptApiKind = 'variable' | 'class' | 'function' | 'method' | 'property';

export interface ScriptApiEntry {
  /** The name as typed at the top level or after its object. */
  readonly label: string;
  readonly kind: ScriptApiKind;
  /** The parameters, e.g. `(keycode, ms = 100)`; empty for values. */
  readonly detail: string;
  readonly info: string;
}

/** Globals of a script. */
export const SCRIPT_GLOBALS: readonly ScriptApiEntry[] = [
  {
    label: 'keyboard',
    kind: 'variable',
    detail: '',
    info: 'The keyboard: keys, keycodes, layers and commands.',
  },
  { label: 'led', kind: 'variable', detail: '', info: 'The lighting of each key (RGB keyboards).' },
  { label: 'console', kind: 'variable', detail: '', info: "Output to the keyboard's console." },
  { label: 'Key', kind: 'class', detail: '(id)', info: 'The key with this ID: new Key(2).' },
  {
    label: 'setTimeout',
    kind: 'function',
    detail: '(callback, ms)',
    info: 'Calls callback once, ms milliseconds later; returns the timer ID.',
  },
  { label: 'clearTimeout', kind: 'function', detail: '(id)', info: 'Cancels a setTimeout timer.' },
];

/** Functions the firmware calls when a script defines them. */
export const SCRIPT_CALLBACKS: readonly ScriptApiEntry[] = [
  { label: 'loop', kind: 'function', detail: '()', info: 'Runs on every keyboard tick.' },
  { label: 'onKeyDown', kind: 'function', detail: '(key)', info: 'A watched key went down.' },
  { label: 'onKeyUp', kind: 'function', detail: '(key)', info: 'A watched key went up.' },
  { label: 'onExit', kind: 'function', detail: '()', info: 'The script is stopped or restarted.' },
];

/** Members of the global objects. */
export const SCRIPT_MEMBERS: Readonly<
  Record<'keyboard' | 'led' | 'console', readonly ScriptApiEntry[]>
> = {
  keyboard: [
    {
      label: 'watch',
      kind: 'method',
      detail: '(...ids)',
      info: 'Calls onKeyDown and onKeyUp for these keys (IDs or arrays of IDs).',
    },
    { label: 'getKey', kind: 'method', detail: '(id)', info: 'The key with this ID.' },
    {
      label: 'tap',
      kind: 'method',
      detail: '(keycode, ms = 100)',
      info: 'Presses keycode and releases it ms milliseconds later.',
    },
    {
      label: 'press',
      kind: 'method',
      detail: '(keycode)',
      info: 'Presses keycode until release(keycode).',
    },
    { label: 'release', kind: 'method', detail: '(keycode)', info: 'Releases keycode.' },
    { label: 'getLayerIndex', kind: 'method', detail: '()', info: 'The current layer.' },
    { label: 'getTick', kind: 'method', detail: '()', info: 'Ticks since the keyboard started.' },
    {
      label: 'getTime',
      kind: 'method',
      detail: '()',
      info: 'Milliseconds since the keyboard started.',
    },
    { label: 'setProfile', kind: 'method', detail: '(index)', info: 'Switches to profile index.' },
    {
      label: 'command',
      kind: 'method',
      detail: '(code)',
      info: 'Runs a keyboard operation by its code.',
    },
    { label: 'save', kind: 'method', detail: '()', info: 'Saves the configuration.' },
    { label: 'reboot', kind: 'method', detail: '()', info: 'Restarts the keyboard.' },
    {
      label: 'enterBootloader',
      kind: 'method',
      detail: '()',
      info: 'Restarts the keyboard into its bootloader.',
    },
    {
      label: 'resetToDefault',
      kind: 'method',
      detail: '()',
      info: 'Resets the configuration to its defaults.',
    },
    { label: 'factory_reset', kind: 'method', detail: '()', info: 'Erases every setting.' },
  ],
  led: [
    {
      label: 'setRGB',
      kind: 'method',
      detail: '(index, r, g, b)',
      info: 'Sets the colour of LED index.',
    },
    {
      label: 'setHSV',
      kind: 'method',
      detail: '(index, h, s, v)',
      info: 'Sets the colour of LED index from hue, saturation and value.',
    },
    {
      label: 'setMode',
      kind: 'method',
      detail: '(index, mode)',
      info: 'Sets the lighting mode of LED index.',
    },
  ],
  console: [
    {
      label: 'log',
      kind: 'method',
      detail: '(...values)',
      info: "Prints the values to the keyboard's console.",
    },
  ],
};

const ANALOG_PROPERTIES = [
  'value',
  'raw',
  'extremum',
  'difference',
  'mode',
  'calibrationMode',
  'activationValue',
  'deactivationValue',
  'triggerDistance',
  'releaseDistance',
  'triggerSpeed',
  'releaseSpeed',
  'upperDeadzone',
  'lowerDeadzone',
  'upperBound',
  'lowerBound',
] as const;

/** Members of keys: `onKeyDown(key)`, `onKeyUp(key)`, `keyboard.getKey(id)`, `new Key(id)`. */
export const KEY_MEMBERS: readonly ScriptApiEntry[] = [
  { label: 'id', kind: 'property', detail: '', info: 'The key ID.' },
  // The firmware's `state` reads the report state and `reportState` the switch state.
  { label: 'state', kind: 'property', detail: '', info: 'Whether the key is reported pressed.' },
  { label: 'reportState', kind: 'property', detail: '', info: 'Whether the switch is pressed.' },
  {
    label: 'emit',
    kind: 'method',
    detail: '(event = 3, keycode)',
    info: "Sends a key event (3 press, 1 release) with the key's keycode, or keycode.",
  },
  ...ANALOG_PROPERTIES.map((label): ScriptApiEntry => ({
    label,
    kind: 'property',
    detail: '',
    info: 'Analog keys only.',
  })),
];
