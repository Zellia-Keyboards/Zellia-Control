import { REMAP_PALETTES } from '../../keycodes';
import { KeySlots, type PaletteTabProps } from './KeySlots';

/**
 * Profile keys (port of `remap/Profile.svelte`): PF(0)–PF(3) switch the keyboard profile; the
 * other four stay visible but assign nothing (D8).
 */
export function ProfileTab({ keyslot }: PaletteTabProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <KeySlots keys={REMAP_PALETTES.profile} keyslot={keyslot} />
    </div>
  );
}
