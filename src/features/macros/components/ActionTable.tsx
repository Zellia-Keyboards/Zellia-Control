import { TrashIcon } from 'lucide-react';
import { useState } from 'react';
import { Toggle } from '../../../components/ui';
import { useT } from '../../../lib/i18n';
import type { MacroAction } from '../../device';
import { macroKeyName } from '../model';
import { MacroKeyPicker } from './MacroKeyPicker';
import { MsInput } from './MsInput';
import { FIELD } from './styles';

const HEADER = 'text-left py-3 px-4 font-medium text-gray-900 dark:text-white';

export interface ActionTableProps {
  /** The table's accessible name (the slot's name). */
  readonly name: string;
  readonly actions: readonly MacroAction[];
  readonly pollingRate: number;
  readonly disabled: boolean;
  readonly onChange: (index: number, patch: Partial<MacroAction>) => void;
  readonly onDelete: (index: number) => void;
}

/**
 * One row per action in the order the keyboard plays them: the time (ms from the start of the
 * macro), the key, the event and Virtual are edited in place; the key ID is shown.
 */
export function ActionTable({
  name,
  actions,
  pollingRate,
  disabled,
  onChange,
  onDelete,
}: ActionTableProps) {
  const t = useT();
  // The row whose key is being picked.
  const [picking, setPicking] = useState<number | null>(null);

  if (actions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-600 dark:text-gray-400">
        {t('macros.empty')}
      </p>
    );
  }

  const pickingAction = picking === null ? undefined : actions[picking];
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full" aria-label={name}>
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className={HEADER}>{t('macros.time')}</th>
            <th className={HEADER}>{t('macros.key')}</th>
            <th className={HEADER}>{t('macros.event')}</th>
            <th className={HEADER}>{t('macros.virtual')}</th>
            <th className={HEADER}>{t('macros.keyId')}</th>
            <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
              {t('common.actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {actions.map((action, index) => {
            const number = String(index + 1);
            return (
              <tr
                key={index}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <td className="py-2 px-4">
                  <MsInput
                    ticks={action.delay}
                    pollingRate={pollingRate}
                    label={t('macros.timeOf', number)}
                    disabled={disabled}
                    onCommit={delay => {
                      onChange(index, { delay });
                    }}
                  />
                </td>
                <td className="py-2 px-4">
                  <button
                    type="button"
                    className="px-3 py-1 text-sm rounded-md border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white glassmorphism-button disabled:opacity-50"
                    title={t('macros.changeKey')}
                    disabled={disabled}
                    onClick={() => {
                      setPicking(index);
                    }}
                  >
                    {macroKeyName(action.keycode)}
                  </button>
                </td>
                <td className="py-2 px-4">
                  <select
                    aria-label={t('macros.eventOf', number)}
                    value={action.event}
                    disabled={disabled}
                    className={FIELD}
                    onChange={event => {
                      onChange(index, {
                        event: event.currentTarget.value === 'up' ? 'up' : 'down',
                      });
                    }}
                  >
                    <option value="down">{t('macros.press')}</option>
                    <option value="up">{t('macros.release')}</option>
                  </select>
                </td>
                <td className="py-2 px-4">
                  <Toggle
                    size="sm"
                    checked={action.isVirtual}
                    disabled={disabled}
                    ariaLabel={t('macros.virtualOf', number)}
                    onToggle={isVirtual => {
                      onChange(index, { isVirtual });
                    }}
                  />
                </td>
                <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-400">
                  {action.keyId}
                </td>
                <td className="py-2 px-4 text-center">
                  <button
                    type="button"
                    className="p-1.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    aria-label={t('macros.deleteAction', number)}
                    title={t('macros.deleteAction', number)}
                    disabled={disabled}
                    onClick={() => {
                      onDelete(index);
                    }}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <MacroKeyPicker
        open={pickingAction !== undefined}
        selected={pickingAction?.keycode ?? null}
        onPick={keycode => {
          if (picking !== null) onChange(picking, { keycode });
          setPicking(null);
        }}
        onClose={() => {
          setPicking(null);
        }}
      />
    </div>
  );
}
