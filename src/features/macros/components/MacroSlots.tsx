import { useT } from '../../../lib/i18n';
import type { MacroAction } from '../../device';

export interface MacroSlotsProps {
  readonly macros: readonly (readonly MacroAction[])[];
  readonly selected: number;
  readonly disabled: boolean;
  readonly onSelect: (slot: number) => void;
}

/** One button per slot ("Macro 1" …) with its action count. */
export function MacroSlots({ macros, selected, disabled, onSelect }: MacroSlotsProps) {
  const t = useT();
  return (
    <div role="group" aria-label={t('macros.slots')} className="flex flex-wrap gap-2">
      {macros.map((actions, slot) => {
        const active = slot === selected;
        return (
          <button
            key={slot}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            className={`min-w-28 px-4 py-2 rounded-lg border text-left transition-colors glassmorphism-button disabled:opacity-50 disabled:cursor-not-allowed ${
              active
                ? 'bg-primary-500 border-primary-500 text-white ring-2 ring-primary-400'
                : 'border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'
            }`}
            onClick={() => {
              onSelect(slot);
            }}
          >
            <span className="block text-sm font-medium">{t('macros.slot', String(slot + 1))}</span>{' '}
            <span className="block text-xs opacity-80">
              {actions.length === 1
                ? t('macros.oneAction')
                : t('macros.actionCount', String(actions.length))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
