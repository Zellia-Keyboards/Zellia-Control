import { useState } from 'react';
import { ConfirmationModal } from '../../../components/ui';
import { useT, type TranslationKey } from '../../../lib/i18n';
import type { MacroAction } from '../../device';
import { editMacro } from '../commands';
import { useMacroRecorder, type MacroRecorder } from '../hooks/use-macro-recorder';
import { hasRoom, removeAction, replaceAction, sortByTime, withKeyPress } from '../model';
import { ActionTable } from './ActionTable';
import { AddKeyForm } from './AddKeyForm';
import { MacroSlots } from './MacroSlots';
import { PRIMARY_BUTTON, SECONDARY_BUTTON, STOP_BUTTON } from './styles';

type Translate = (key: TranslationKey, ...args: string[]) => string;

/** The recorder's line: recording, or how the last recording ended, and the keys it skipped. */
function recorderMessage(t: Translate, recorder: MacroRecorder): string {
  const parts: string[] = [];
  if (recorder.recording) parts.push(t('macros.recording'));
  else if (recorder.full) parts.push(t('macros.full'));
  if (recorder.skipped === 1) parts.push(t('macros.skippedOne'));
  else if (recorder.skipped > 1) parts.push(t('macros.skipped', String(recorder.skipped)));
  return parts.join(' ');
}

export interface MacroEditorProps {
  readonly macros: readonly (readonly MacroAction[])[];
  readonly pollingRate: number;
  /** The most actions a slot holds (the slot's last entry is the end marker). */
  readonly limit: number;
}

/** The slots, the chosen slot's tools and its actions. Every edit is staged. */
export function MacroEditor({ macros, pollingRate, limit }: MacroEditorProps) {
  const t = useT();
  const [slot, setSlot] = useState(0);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const recorder = useMacroRecorder(slot, pollingRate, limit);
  const actions = macros[slot] ?? [];
  const { recording } = recorder;
  // A press and its release.
  const roomForKey = hasRoom(actions, 2, limit);

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <MacroSlots macros={macros} selected={slot} disabled={recording} onSelect={setSlot} />
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('macros.limit', String(actions.length), String(limit))}
        </p>
        <div className="flex-1" />
        {/* Clicks on Stop are neither recorded nor suppressed (see use-macro-recorder). */}
        {recording ? (
          <button
            type="button"
            data-macro-recorder-stop
            className={STOP_BUTTON}
            onClick={recorder.stop}
          >
            {t('macros.stop')}
          </button>
        ) : (
          <button
            type="button"
            className={PRIMARY_BUTTON}
            disabled={!roomForKey}
            onClick={recorder.start}
          >
            {t('macros.record')}
          </button>
        )}
        <button
          type="button"
          className={SECONDARY_BUTTON}
          disabled={recording || actions.length < 2}
          onClick={() => {
            editMacro(slot, sortByTime);
          }}
        >
          {t('macros.sort')}
        </button>
        <button
          type="button"
          className={SECONDARY_BUTTON}
          disabled={recording || actions.length === 0}
          onClick={() => {
            setConfirmingClear(true);
          }}
        >
          {t('macros.clear')}
        </button>
      </div>
      <p
        role="status"
        className={`min-h-5 text-sm ${recording ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}
      >
        {recorderMessage(t, recorder)}
      </p>
      <AddKeyForm
        pollingRate={pollingRate}
        room={roomForKey}
        disabled={recording}
        onAdd={(keycode, reference, delay, duration) => {
          editMacro(slot, current => withKeyPress(current, keycode, reference, delay, duration));
        }}
      />
      <ActionTable
        name={t('macros.slot', String(slot + 1))}
        actions={actions}
        pollingRate={pollingRate}
        disabled={recording}
        onChange={(index, patch) => {
          editMacro(slot, current => replaceAction(current, index, patch));
        }}
        onDelete={index => {
          editMacro(slot, current => removeAction(current, index));
        }}
      />
      <ConfirmationModal
        open={confirmingClear}
        title={t('macros.clearTitle', String(slot + 1))}
        message={t('macros.clearConfirm')}
        confirmText={t('macros.clear')}
        cancelText={t('common.cancel')}
        confirmColor="red"
        onConfirm={() => {
          editMacro(slot, () => []);
          setConfirmingClear(false);
        }}
        onCancel={() => {
          setConfirmingClear(false);
        }}
      />
    </div>
  );
}
