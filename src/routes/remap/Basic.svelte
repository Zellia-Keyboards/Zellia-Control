<script lang="ts">
  const KeyboardSlotContent = [
    [
      'Esc',
      'F1',
      'F2',
      'F3',
      'F4',
      'F5',
      'F6',
      'F7',
      'F8',
      'F9',
      'F10',
      'F11',
      'F12',
      'None',
      'Print\nScreen',
      'Scroll\nLock',
      'Pause\nBreak',
    ],
    [
      '~',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '0',
      '-',
      '=',
      'Backspace',
      'Insert',
      'Home',
      'PgUp',
    ],
    [
      'Tab',
      'Q',
      'W',
      'E',
      'R',
      'T',
      'Y',
      'U',
      'I',
      'O',
      'P',
      '[',
      ']',
      '\\',
      'Delete',
      'End',
      'PgDn',
    ],
    [
      'Caps Lock',
      'A',
      'S',
      'D',
      'F',
      'G',
      'H',
      'J',
      'K',
      'L',
      ';',
      "'", // ' is a single quote
      'Enter',
    ],
    [
      // Shift keys
      'Shift',
      'Z',
      'X',
      'C',
      'V',
      'B',
      'N',
      'M',
      ',',
      '.]',
      '/',
      'Shift',
      '↑',
    ],
    [
      // Control keys
      'Ctrl',
      'Win',
      'Alt',
      'Space',
      'Alt',
      'Fn',
      'Menu',
      'Ctrl',
      '←',
      '↓',
      '→',
    ],
    [
      // Numpad keys
      'Num Lock',
      '/',
      '*',
      '-',
      '=',
      '7\nHome',
      '↑\n8',
      '9\nPgUp',
      '+',
      '4 ←',
      '5',
      '→ 6',
      '1\nEnd',
      '2\n↓',
      '3\nPgDn',
      'Enter',
      '0\nIns',
      '.\nDel',
    ],
    [
      // Additional keys
      'Non-US =~',
      'Non-US \\:',
      '\\',
      '|',
      '.',
      '無変換', // No conversion
      '変換', // Conversion
      'カタカナひらがな', // Katakana Hiragana
      'ImeOn', // IME On
      'ImeOff', // IME Off
    ],
    [
      // Function keys
      'F13',
      'F14',
      'F15',
      'F16',
      'F17',
      'F18',
      'F19',
      'F20',
      'F21',
      'F22',
      'F23',
      'F24',
    ],
  ];
</script>

{#snippet keyslot(content: string)}
  <button class="size-14 text-wrap text-sm border whitespace-pre-line rounded-lg">
    {content}
  </button>
{/snippet}

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
                *:first:w-32 [&>*:nth-last-child(2)]:w-46 *:last:ml-24"
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
<div class="flex mt-8 gap-32">
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

<div class="flex gap-2 mt-8 *:nth-[4n+5]:ml-8 *:size-14 *:border-2 *:border-white">
  {#each KeyboardSlotContent[8] as key}
    {@render keyslot(key)}
  {/each}
</div>
