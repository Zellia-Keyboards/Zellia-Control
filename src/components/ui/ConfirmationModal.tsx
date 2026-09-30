import { useId, type ReactNode } from 'react';
import { Modal } from './Modal';

type ConfirmColor = 'blue' | 'orange' | 'red';

export interface ConfirmationModalProps {
  open: boolean;
  title: string;
  /**
   * The Svelte component rendered an HTML string with `{@html}` (e.g. a `<strong>` profile
   * name); pass that markup as React nodes instead, so user text is never parsed as HTML.
   */
  message: ReactNode;
  confirmText: string;
  confirmColor?: ConfirmColor;
  onConfirm: () => void;
  onCancel: () => void;
}

const colorClasses: Record<ConfirmColor, string> = {
  blue: 'glassmorphism-button bg-blue-600/80 border border-blue-500/50 text-white hover:bg-blue-600',
  orange:
    'glassmorphism-button bg-orange-600/80 border border-orange-500/50 text-white hover:bg-orange-600',
  red: 'glassmorphism-button bg-red-600/80 border border-red-500/50 text-white hover:bg-red-600',
};

/** Confirm/cancel dialog (port of `profiles/ConfirmationModal.svelte`). */
export function ConfirmationModal({
  open,
  title,
  message,
  confirmText,
  confirmColor = 'blue',
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const titleId = useId();
  const messageId = useId();
  return (
    <Modal open={open} onClose={onCancel} labelledBy={titleId} describedBy={messageId}>
      <h3 id={titleId} className="text-xl font-bold text-white mb-3">
        {title}
      </h3>
      <p id={messageId} className="text-sm text-gray-400 mb-6">
        {message}
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          className="flex-1 px-4 py-2.5 rounded-lg border font-medium transition-colors glassmorphism-button border-gray-600 text-gray-300"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${colorClasses[confirmColor]}`}
          onClick={onConfirm}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
