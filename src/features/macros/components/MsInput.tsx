import { useState } from 'react';
import { formatMs, msToTicks, ticksToMs } from '../model';
import { FIELD } from './styles';

export interface MsInputProps {
  readonly ticks: number;
  readonly pollingRate: number;
  readonly label: string;
  readonly disabled: boolean;
  readonly onCommit: (ticks: number) => void;
}

/**
 * A time in milliseconds, kept as typed while it is edited and committed (in ticks) on Enter or
 * when the field loses focus; Escape restores it, and an empty field changes nothing.
 */
export function MsInput({ ticks, pollingRate, label, disabled, onCommit }: MsInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    const ms = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(ms)) return;
    const next = msToTicks(ms, pollingRate);
    if (next !== ticks) onCommit(next);
  };

  return (
    <input
      type="number"
      min="0"
      step="any"
      aria-label={label}
      disabled={disabled}
      value={draft ?? formatMs(ticksToMs(ticks, pollingRate))}
      onChange={event => {
        setDraft(event.currentTarget.value);
      }}
      onBlur={commit}
      onKeyDown={event => {
        if (event.key === 'Enter') commit();
        else if (event.key === 'Escape') setDraft(null);
      }}
      className={`w-24 ${FIELD}`}
    />
  );
}
