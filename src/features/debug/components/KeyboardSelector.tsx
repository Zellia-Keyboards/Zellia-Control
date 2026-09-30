import { useEffect, useId, type MouseEvent } from 'react';
import { KeyboardRender, keySelection, useLayoutKeys } from '../../keyboard';
import styles from './KeyboardSelector.module.css';

export interface KeyboardSelectorProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

/**
 * Modal keyboard to pick the key to track (port of `debug/KeyboardSelector.svelte`). Picking a
 * key selects only that key and closes the modal. Escape and backdrop clicks close it; focus
 * returns to the element that opened it.
 */
export function KeyboardSelector({ open, onClose }: KeyboardSelectorProps) {
  const layout = useLayoutKeys();
  const keys = layout?.all ?? [];
  const titleId = useId();

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

  if (!open) return null;

  const handleKeySelect = (keyId: number) => {
    keySelection.setSelected([keyId]);
    onClose();
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click is a mouse shortcut; Escape closes from the keyboard
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 ${styles['animate-fade-in'] ?? ''}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <div
        className={`dark glassmorphism relative w-auto mx-4 max-h-[90vh] flex flex-col ${styles['animate-scale-in'] ?? ''}`}
      >
        {/* Modal content */}
        <div
          className="rounded-2xl overflow-hidden border border-white/10"
          style={{
            background: 'color-mix(in srgb, var(--theme-color-primary) 8%, rgb(17, 24, 39))',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 id={titleId} className="text-lg font-semibold text-white">
              Select Key to Track
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Keyboard render container */}
          <div className="overflow-auto max-h-[calc(90vh-10rem)] p-6">
            {keys.length > 0 ? (
              <div className="flex justify-center">
                <KeyboardRender keys={keys} onSelect={handleKeySelect} />
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">No keyboard layout available</p>
                <p className="text-sm mt-2 text-gray-500">Please connect a keyboard first</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
