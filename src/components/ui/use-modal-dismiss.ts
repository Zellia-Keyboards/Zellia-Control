import { useEffect } from 'react';

/**
 * Dialog behavior shared by modals whose markup differs: while `open`, Escape anywhere calls
 * `onClose`, and when the dialog closes (or unmounts) focus returns to the element that had it
 * when the dialog opened.
 */
export function useModalDismiss(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    return () => {
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open]);
}
