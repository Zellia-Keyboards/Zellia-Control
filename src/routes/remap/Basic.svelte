<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Keycode } from '../../../src-controller/src/interface';

  // Map display text to keycode values
  type KeyInfo = {
    label: string;
    keycode: Keycode;
  };

  const KeyboardSlotContent: KeyInfo[][] = [
    [
      { label: 'Esc', keycode: Keycode.Escape },
      { label: 'F1', keycode: Keycode.F1 },
      { label: 'F2', keycode: Keycode.F2 },
      { label: 'F3', keycode: Keycode.F3 },
      { label: 'F4', keycode: Keycode.F4 },
      { label: 'F5', keycode: Keycode.F5 },
      { label: 'F6', keycode: Keycode.F6 },
      { label: 'F7', keycode: Keycode.F7 },
      { label: 'F8', keycode: Keycode.F8 },
      { label: 'F9', keycode: Keycode.F9 },
      { label: 'F10', keycode: Keycode.F10 },
      { label: 'F11', keycode: Keycode.F11 },
      { label: 'F12', keycode: Keycode.F12 },
      { label: 'None', keycode: Keycode.NoEvent },
      { label: 'Print\nScreen', keycode: Keycode.PrintScreen },
      { label: 'Scroll\nLock', keycode: Keycode.ScrollLock },
      { label: 'Pause\nBreak', keycode: Keycode.Pause },
    ],
    [
      { label: '~', keycode: Keycode.Grave },
      { label: '1', keycode: Keycode.Key1 },
      { label: '2', keycode: Keycode.Key2 },
      { label: '3', keycode: Keycode.Key3 },
      { label: '4', keycode: Keycode.Key4 },
      { label: '5', keycode: Keycode.Key5 },
      { label: '6', keycode: Keycode.Key6 },
      { label: '7', keycode: Keycode.Key7 },
      { label: '8', keycode: Keycode.Key8 },
      { label: '9', keycode: Keycode.Key9 },
      { label: '0', keycode: Keycode.Key0 },
      { label: '-', keycode: Keycode.Minus },
      { label: '=', keycode: Keycode.Equal },
      { label: 'Backspace', keycode: Keycode.Backspace },
      { label: 'Insert', keycode: Keycode.Insert },
      { label: 'Home', keycode: Keycode.Home },
      { label: 'PgUp', keycode: Keycode.PageUp },
    ],
    [
      { label: 'Tab', keycode: Keycode.Tab },
      { label: 'Q', keycode: Keycode.Q },
      { label: 'W', keycode: Keycode.W },
      { label: 'E', keycode: Keycode.E },
      { label: 'R', keycode: Keycode.R },
      { label: 'T', keycode: Keycode.T },
      { label: 'Y', keycode: Keycode.Y },
      { label: 'U', keycode: Keycode.U },
      { label: 'I', keycode: Keycode.I },
      { label: 'O', keycode: Keycode.O },
      { label: 'P', keycode: Keycode.P },
      { label: '[', keycode: Keycode.LeftBrace },
      { label: ']', keycode: Keycode.RightBrace },
      { label: '\\', keycode: Keycode.Backslash },
      { label: 'Delete', keycode: Keycode.Delete },
      { label: 'End', keycode: Keycode.End },
      { label: 'PgDn', keycode: Keycode.PageDown },
    ],
    [
      { label: 'Caps Lock', keycode: Keycode.CapsLock },
      { label: 'A', keycode: Keycode.A },
      { label: 'S', keycode: Keycode.S },
      { label: 'D', keycode: Keycode.D },
      { label: 'F', keycode: Keycode.F },
      { label: 'G', keycode: Keycode.G },
      { label: 'H', keycode: Keycode.H },
      { label: 'J', keycode: Keycode.J },
      { label: 'K', keycode: Keycode.K },
      { label: 'L', keycode: Keycode.L },
      { label: ';', keycode: Keycode.Semicolon },
      { label: "'", keycode: Keycode.Apostrophe },
      { label: 'Enter', keycode: Keycode.Enter },
    ],
    [
      { label: 'Shift', keycode: Keycode.KeyTransparent }, // Modifier handled separately
      { label: 'Z', keycode: Keycode.Z },
      { label: 'X', keycode: Keycode.X },
      { label: 'C', keycode: Keycode.C },
      { label: 'V', keycode: Keycode.V },
      { label: 'B', keycode: Keycode.B },
      { label: 'N', keycode: Keycode.N },
      { label: 'M', keycode: Keycode.M },
      { label: ',', keycode: Keycode.Comma },
      { label: '.', keycode: Keycode.Dot },
      { label: '/', keycode: Keycode.Slash },
      { label: 'Shift', keycode: Keycode.KeyTransparent }, // Modifier handled separately
      { label: '↑', keycode: Keycode.UpArrow },
    ],
    [
      { label: 'Ctrl', keycode: Keycode.KeyTransparent }, // Modifier handled separately
      { label: 'Win', keycode: Keycode.KeyTransparent }, // Modifier handled separately
      { label: 'Alt', keycode: Keycode.KeyTransparent }, // Modifier handled separately
      { label: 'Space', keycode: Keycode.Spacebar },
      { label: 'Alt', keycode: Keycode.KeyTransparent }, // Modifier handled separately
      { label: 'Fn', keycode: Keycode.KeyTransparent }, // Function layer key
      { label: 'Menu', keycode: Keycode.Application },
      { label: 'Ctrl', keycode: Keycode.KeyTransparent }, // Modifier handled separately
      { label: '←', keycode: Keycode.LeftArrow },
      { label: '↓', keycode: Keycode.DownArrow },
      { label: '→', keycode: Keycode.RightArrow },
    ],
    [
      { label: 'Num Lock', keycode: Keycode.NumLock },
      { label: '/', keycode: Keycode.KeypadDivide },
      { label: '*', keycode: Keycode.KeypadMultiply },
      { label: '-', keycode: Keycode.KeypadMinus },
      { label: '=', keycode: Keycode.KeypadEqual },
      { label: '7\nHome', keycode: Keycode.Keypad7 },
      { label: '↑\n8', keycode: Keycode.Keypad8 },
      { label: '9\nPgUp', keycode: Keycode.Keypad9 },
      { label: '+', keycode: Keycode.KeypadPlus },
      { label: '4 ←', keycode: Keycode.Keypad4 },
      { label: '5', keycode: Keycode.Keypad5 },
      { label: '→ 6', keycode: Keycode.Keypad6 },
      { label: '1\nEnd', keycode: Keycode.Keypad1 },
      { label: '2\n↓', keycode: Keycode.Keypad2 },
      { label: '3\nPgDn', keycode: Keycode.Keypad3 },
      { label: 'Enter', keycode: Keycode.KeypadEnter },
      { label: '0\nIns', keycode: Keycode.Keypad0 },
      { label: '.\nDel', keycode: Keycode.KeypadDot },
    ],
    [
      { label: 'Non-US =~', keycode: Keycode.KeypadEqual },
      { label: 'Non-US \\:', keycode: Keycode.NonUsHash },
      { label: '\\', keycode: Keycode.NonUsBackslash },
      { label: '|', keycode: Keycode.Backslash },
      { label: '.', keycode: Keycode.Dot },
      { label: '無変換', keycode: Keycode.Intl5 }, // No conversion
      { label: '変換', keycode: Keycode.Intl4 }, // Conversion
      { label: 'カタカナひらがな', keycode: Keycode.Intl2 }, // Katakana Hiragana
      { label: 'ImeOn', keycode: Keycode.Lang1 },
      { label: 'ImeOff', keycode: Keycode.Lang2 },
    ],
    [
      { label: 'F13', keycode: Keycode.F13 },
      { label: 'F14', keycode: Keycode.F14 },
      { label: 'F15', keycode: Keycode.F15 },
      { label: 'F16', keycode: Keycode.F16 },
      { label: 'F17', keycode: Keycode.F17 },
      { label: 'F18', keycode: Keycode.F18 },
      { label: 'F19', keycode: Keycode.F19 },
      { label: 'F20', keycode: Keycode.F20 },
      { label: 'F21', keycode: Keycode.F21 },
      { label: 'F22', keycode: Keycode.F22 },
      { label: 'F23', keycode: Keycode.F23 },
      { label: 'F24', keycode: Keycode.F24 },
    ],
  ];

  interface Props {
    keyslot: Snippet<[KeyInfo]>;
  }

  let { keyslot }: Props = $props();
</script>

<!-- FIXME: standardize spacing -->
<div class="space-y-2">
  <div
    class="flex *:not-first:ml-2
                [&>*:nth-child(2)]:ml-8 [&>*:nth-child(6)]:ml-8
                [&>*:nth-child(10)]:ml-8 [&>*:nth-child(15)]:ml-8"
  >
    {#each KeyboardSlotContent[0] as key}
      {@render keyslot(key)}
    {/each}
  </div>
  <div
    class="flex *:not-first:ml-2 mt-2
                [&>*:nth-child(14)]:w-32 [&>*:nth-child(15)]:ml-8"
  >
    {#each KeyboardSlotContent[1] as key}
      {@render keyslot(key)}
    {/each}
  </div>
  <div
    class="flex *:not-first:ml-2 mt-2
                *:first:w-21 [&>*:nth-child(14)]:w-25 [&>*:nth-child(15)]:ml-8"
  >
    {#each KeyboardSlotContent[2] as key}
      {@render keyslot(key)}
    {/each}
  </div>
  <div
    class="flex *:not-first:ml-2 mt-2
                *:first:w-25 *:last:w-37"
  >
    {#each KeyboardSlotContent[3] as key}
      {@render keyslot(key)}
    {/each}
  </div>
  <div
    class="flex *:not-first:ml-2 mt-2
                *:first:w-35 [&>*:nth-last-child(2)]:w-43 *:last:ml-24"
  >
    {#each KeyboardSlotContent[4] as key}
      {@render keyslot(key)}
    {/each}
  </div>
  <div
    class="flex *:w-18 *:not-first:ml-2 mt-2
                [&>*:nth-child(4)]:w-100 [&>*:nth-last-child(-n+3)]:w-14
                [&>*:nth-last-child(3)]:ml-8"
  >
    {#each KeyboardSlotContent[5] as key}
      {@render keyslot(key)}
    {/each}
  </div>
</div>

<!-- TODO: Fix text wrapping -->
<div class="flex mt-8 gap-12">
  <div
    class="grid grid-cols-5 grid-rows-5 gap-2 **:tracking-wide *:nth-[n+8]:nth-last-[7n+3]:row-span-2 *:nth-[n+8]:nth-last-[7n+3]:h-full *:nth-[n+8]:nth-last-[7n+3]:w-full *:nth-[17]:col-span-2 *:nth-[17]:h-full *:nth-[17]:w-full *:nth-[n+10]:nth-last-[n+7]:row-start-3 *:nth-[n+13]:nth-last-[n+3]:row-start-4 *:nth-last-[-n+3]:row-start-5"
  >
    {#each KeyboardSlotContent[6] as key}
      {@render keyslot(key)}
    {/each}
  </div>

  <div
    class="grid grid-cols-13 grid-rows-4 gap-2 align-top *:col-span-2 *:nth-[n+3]:nth-last-[n+6]:col-span-1 *:nth-[n+3]:nth-last-[n+6]:w-14 *:w-full"
  >
    {#each KeyboardSlotContent[7] as key}
      {@render keyslot(key)}
    {/each}
  </div>
</div>

<div class="flex gap-2 mt-8 *:nth-[4n+5]:ml-8 *:size-14">
  {#each KeyboardSlotContent[8] as key}
    {@render keyslot(key)}
  {/each}
</div>
