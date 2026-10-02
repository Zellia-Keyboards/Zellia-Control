import { REMAP_PALETTES } from '../../keycodes';
import { KeySlots, type PaletteTabProps } from './KeySlots';

/** Layer control keys (port of `remap/Layer.svelte`). */
export function LayerTab({ keyslot }: PaletteTabProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <KeySlots keys={REMAP_PALETTES.layer} keyslot={keyslot} />
    </div>
  );
}
