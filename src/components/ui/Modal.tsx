import type { ReactNode } from 'react';
import { Transition, fade } from '../../lib/transitions';
import { useModalDismiss } from './use-modal-dismiss';

export type ModalMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '3xl';

export interface ModalProps {
  /**
   * Replaces the parent's `{#if}` around the Svelte modal: keep the modal rendered and toggle
   * `open`, so it fades in when opened and out when closed.
   */
  open: boolean;
  onClose: () => void;
  maxWidth?: ModalMaxWidth;
  className?: string;
  children: ReactNode;
  /** Id of the element that names the dialog (usually its title). */
  labelledBy?: string;
  /** Id of the element that describes the dialog. */
  describedBy?: string;
}

const maxWidthClasses: Record<ModalMaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '3xl': 'max-w-3xl',
};

/**
 * Shared modal overlay (port of `ui/Modal.svelte`). Escape anywhere and backdrop clicks call
 * `onClose`; focus returns to the previously focused element when the modal closes.
 */
export function Modal({
  open,
  onClose,
  maxWidth = 'md',
  className = '',
  children,
  labelledBy,
  describedBy,
}: ModalProps) {
  useModalDismiss(open, onClose);

  return (
    <Transition show={open} transition={[fade, { duration: 150 }]}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- backdrop click is a mouse shortcut; Escape closes from the keyboard */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={() => {
          onClose();
        }}
      >
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- only stops clicks from reaching the backdrop */}
        <div
          className={`border border-gray-700 rounded-xl shadow-2xl ${maxWidthClasses[maxWidth]} w-full p-6 glassmorphism-card ${className}`}
          onClick={event => {
            event.stopPropagation();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          tabIndex={-1}
        >
          {children}
        </div>
      </div>
    </Transition>
  );
}
