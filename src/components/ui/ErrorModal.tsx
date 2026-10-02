import { AlertCircle } from 'lucide-react';
import { useId } from 'react';
import { Modal } from './Modal';

export interface ErrorModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

/** "Notice" dialog for errors (port of `profiles/ErrorModal.svelte`). */
export function ErrorModal({ open, message, onClose }: ErrorModalProps) {
  const titleId = useId();
  const messageId = useId();
  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} describedBy={messageId}>
      <div className="flex items-start gap-3 mb-4">
        <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 id={titleId} className="text-xl font-bold text-white mb-2">
            Notice
          </h3>
          <p id={messageId} className="text-sm text-gray-400">
            {message}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="px-4 py-2.5 rounded-lg font-medium transition-colors glassmorphism-button bg-gray-700/80 border border-gray-600/50 text-white hover:bg-gray-700"
          onClick={onClose}
        >
          OK
        </button>
      </div>
    </Modal>
  );
}
