import { REMAP_PALETTES } from '../../keycodes';
import { KeySlots, type PaletteTabProps } from './KeySlots';

/**
 * Mouse, joystick, keyboard operation and special keys (port of `remap/Extension.svelte`).
 */
export function ExtensionTab({ keyslot }: PaletteTabProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <KeySlots keys={REMAP_PALETTES.extension} keyslot={keyslot} />
    </div>
  );
}
