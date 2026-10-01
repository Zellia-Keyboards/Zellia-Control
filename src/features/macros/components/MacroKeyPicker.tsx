import { useId } from 'react';
import { KeycodePicker, Modal } from '../../../components/ui';
import { useT } from '../../../lib/i18n';
import type { Keycode } from '../../device';
import { MACRO_KEY_CATEGORIES } from '../model';
import { SECONDARY_BUTTON } from './styles';

export interface MacroKeyPickerProps {
  readonly open: boolean;
  /** The key the edited action plays, if one is edited. */
  readonly selected: Keycode | null;
  readonly onPick: (keycode: Keycode) => void;
  readonly onClose: () => void;
}

/** The Dynamic Keys action picker in a dialog, without "None" (keycode 0 ends a macro). */
export function MacroKeyPicker({ open, selected, onPick, onClose }: MacroKeyPickerProps) {
  const t = useT();
  const titleId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="3xl"
      labelledBy={titleId}
      className="max-h-[90vh] overflow-y-auto"
    >
      <h3 id={titleId} className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        {t('macros.chooseKey')}
      </h3>
      <KeycodePicker
        categories={MACRO_KEY_CATEGORIES}
        selectedAction={selected}
        onActionSelect={onPick}
      />
      <div className="flex justify-end mt-4">
        <button type="button" className={SECONDARY_BUTTON} onClick={onClose}>
          {t('common.cancel')}
        </button>
      </div>
    </Modal>
  );
}
