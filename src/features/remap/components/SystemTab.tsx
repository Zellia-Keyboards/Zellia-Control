import { REMAP_PALETTES } from '../../keycodes';
import { KeySlots, type PaletteTabProps } from './KeySlots';

/** Consumer (media, browser, application) keys (port of `remap/System.svelte`). */
export function SystemTab({ keyslot }: PaletteTabProps) {
  return (
    <div className="flex flex-wrap gap-2 *:w-20">
      <KeySlots keys={REMAP_PALETTES.system} keyslot={keyslot} />
    </div>
  );
}
