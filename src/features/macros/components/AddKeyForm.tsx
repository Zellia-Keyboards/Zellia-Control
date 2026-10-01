import { useState } from 'react';
import { useT, type TranslationKey } from '../../../lib/i18n';
import type { Keycode } from '../../device';
import { msToTicks, type DelayReference } from '../model';
import { MacroKeyPicker } from './MacroKeyPicker';
import { FIELD, PRIMARY_BUTTON } from './styles';

const LABEL = 'flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400';

/** Upstream's delay references, in its order. */
const REFERENCES: readonly (readonly [DelayReference, TranslationKey])[] = [
  ['start', 'macros.fromStart'],
  ['first', 'macros.fromFirst'],
  ['last', 'macros.fromLast'],
];

function isDelayReference(value: string): value is DelayReference {
  return REFERENCES.some(([reference]) => reference === value);
}

export interface AddKeyFormProps {
  readonly pollingRate: number;
  /** Room for a press and its release. */
  readonly room: boolean;
  readonly disabled: boolean;
  /** `delay` and `duration` in ticks. */
  readonly onAdd: (
    keycode: Keycode,
    reference: DelayReference,
    delay: number,
    duration: number
  ) => void;
}

/**
 * "Add key" (upstream's "Add macro action"): a press of a chosen key `Delay` ms after the delay
 * reference — the macro's start, its first or its last action — released `Duration` ms later.
 * Without room for both, the form says so.
 */
export function AddKeyForm({ pollingRate, room, disabled, onAdd }: AddKeyFormProps) {
  const t = useT();
  const [reference, setReference] = useState<DelayReference>('last');
  const [delay, setDelay] = useState('50');
  const [duration, setDuration] = useState('20');
  const [picking, setPicking] = useState(false);
  const off = disabled || !room;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <label className={LABEL}>
          {t('macros.reference')}
          <select
            value={reference}
            disabled={off}
            className={FIELD}
            onChange={event => {
              const { value } = event.currentTarget;
              if (isDelayReference(value)) setReference(value);
            }}
          >
            {REFERENCES.map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          {t('macros.delay')}
          <input
            type="number"
            min="0"
            step="any"
            value={delay}
            disabled={off}
            onChange={event => {
              setDelay(event.currentTarget.value);
            }}
            className={`w-24 ${FIELD}`}
          />
        </label>
        <label className={LABEL}>
          {t('macros.duration')}
          <input
            type="number"
            min="0"
            step="any"
            value={duration}
            disabled={off}
            onChange={event => {
              setDuration(event.currentTarget.value);
            }}
            className={`w-24 ${FIELD}`}
          />
        </label>
        <button
          type="button"
          className={PRIMARY_BUTTON}
          disabled={off}
          onClick={() => {
            setPicking(true);
          }}
        >
          {t('macros.addKey')}
        </button>
      </div>
      {!room && <p className="text-sm text-amber-600 dark:text-amber-400">{t('macros.noRoom')}</p>}
      <MacroKeyPicker
        open={picking}
        selected={null}
        onPick={keycode => {
          setPicking(false);
          onAdd(
            keycode,
            reference,
            msToTicks(Number(delay), pollingRate),
            msToTicks(Number(duration), pollingRate)
          );
        }}
        onClose={() => {
          setPicking(false);
        }}
      />
    </div>
  );
}
