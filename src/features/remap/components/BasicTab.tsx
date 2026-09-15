import { REMAP_PALETTES } from '../../keycodes';
import { KeySlots, type PaletteTabProps } from './KeySlots';

const [
  functionRow = [],
  numberRow = [],
  tabRow = [],
  capsRow = [],
  shiftRow = [],
  bottomRow = [],
  numpad = [],
  international = [],
  extendedFunctionRow = [],
] = REMAP_PALETTES.basic;

/** The Basic tab: main block, numpad, international keys and F13–F24 (port of `remap/Basic.svelte`). */
export function BasicTab({ keyslot }: PaletteTabProps) {
  return (
    <>
      {/* FIXME: standardize spacing */}
      <div className="space-y-2">
        <div className="flex *:not-first:ml-2 [&>*:nth-child(2)]:ml-8 [&>*:nth-child(6)]:ml-8 [&>*:nth-child(10)]:ml-8 [&>*:nth-child(15)]:ml-8">
          <KeySlots keys={functionRow} keyslot={keyslot} />
        </div>
        <div className="flex *:not-first:ml-2 mt-2 [&>*:nth-child(14)]:w-32 [&>*:nth-child(15)]:ml-8">
          <KeySlots keys={numberRow} keyslot={keyslot} />
        </div>
        <div className="flex *:not-first:ml-2 mt-2 *:first:w-21 [&>*:nth-child(14)]:w-25 [&>*:nth-child(15)]:ml-8">
          <KeySlots keys={tabRow} keyslot={keyslot} />
        </div>
        <div className="flex *:not-first:ml-2 mt-2 *:first:w-25 *:last:w-37">
          <KeySlots keys={capsRow} keyslot={keyslot} />
        </div>
        <div className="flex *:not-first:ml-2 mt-2 *:first:w-35 [&>*:nth-last-child(2)]:w-43 *:last:ml-24">
          <KeySlots keys={shiftRow} keyslot={keyslot} />
        </div>
        <div className="flex *:w-18 *:not-first:ml-2 mt-2 [&>*:nth-child(4)]:w-100 [&>*:nth-last-child(-n+3)]:w-14 [&>*:nth-last-child(3)]:ml-8">
          <KeySlots keys={bottomRow} keyslot={keyslot} />
        </div>
      </div>

      {/* TODO: Fix text wrapping */}
      <div className="flex mt-8 gap-12">
        <div className="grid grid-cols-5 grid-rows-5 gap-2 **:tracking-wide *:nth-[n+8]:nth-last-[7n+3]:row-span-2 *:nth-[n+8]:nth-last-[7n+3]:h-full *:nth-[n+8]:nth-last-[7n+3]:w-full *:nth-[17]:col-span-2 *:nth-[17]:h-full *:nth-[17]:w-full *:nth-[n+10]:nth-last-[n+7]:row-start-3 *:nth-[n+13]:nth-last-[n+3]:row-start-4 *:nth-last-[-n+3]:row-start-5">
          <KeySlots keys={numpad} keyslot={keyslot} />
        </div>

        <div className="grid grid-cols-13 grid-rows-4 gap-2 align-top *:col-span-2 *:nth-[n+3]:nth-last-[n+6]:col-span-1 *:nth-[n+3]:nth-last-[n+6]:w-14 *:w-full">
          <KeySlots keys={international} keyslot={keyslot} />
        </div>
      </div>

      <div className="flex gap-2 mt-8 *:nth-[4n+5]:ml-8 *:size-14">
        <KeySlots keys={extendedFunctionRow} keyslot={keyslot} />
      </div>
    </>
  );
}
