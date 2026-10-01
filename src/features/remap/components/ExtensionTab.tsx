import { useId } from 'react';
import { useT } from '../../../lib/i18n';
import { useFeatureFlags, useSupportsMacros, useSupportsScripts } from '../../device';
import {
  REMAP_PALETTES,
  SCRIPT_PALETTE,
  macroPalette,
  type GroupPaletteKey,
  type PaletteKey,
} from '../../keycodes';
import { KeySlots, type PaletteTabProps } from './KeySlots';

const GROUP_HEADING = 'text-sm font-semibold text-gray-600 dark:text-gray-300 mt-6 mb-2';

/**
 * Mouse, joystick, keyboard operation and special keys (port of `remap/Extension.svelte`), then
 * the Macro and Script groups on keyboards whose controller declares them (macros and scripts
 * spec). Without them the tab is the Svelte one.
 */
export function ExtensionTab({ keyslot }: PaletteTabProps) {
  const t = useT();
  const feature = useFeatureFlags();
  const macros = useSupportsMacros();
  const scripts = useSupportsScripts();
  const macroId = useId();
  const scriptId = useId();
  const translated = (key: GroupPaletteKey): PaletteKey => ({
    label: t(key.label),
    keycode: key.keycode,
  });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <KeySlots keys={REMAP_PALETTES.extension} keyslot={keyslot} />
      </div>

      {macros && feature && (
        <div role="region" aria-labelledby={macroId}>
          <h3 id={macroId} className={GROUP_HEADING}>
            {t('remap.macroGroup')}
          </h3>
          <div className="space-y-2">
            {macroPalette(feature.macroSlots).map((row, slot) => {
              const name = t('macros.slot', String(slot + 1));
              return (
                <div key={slot} role="group" aria-label={name} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-sm text-gray-500 dark:text-gray-400">
                    {name}
                  </span>
                  <div className="flex flex-wrap gap-2 *:w-20">
                    <KeySlots keys={row.map(translated)} keyslot={keyslot} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {scripts && (
        <div role="region" aria-labelledby={scriptId}>
          <h3 id={scriptId} className={GROUP_HEADING}>
            {t('remap.scriptGroup')}
          </h3>
          <div className="flex flex-wrap gap-2 *:w-20">
            <KeySlots keys={SCRIPT_PALETTE.map(translated)} keyslot={keyslot} />
          </div>
        </div>
      )}
    </>
  );
}
