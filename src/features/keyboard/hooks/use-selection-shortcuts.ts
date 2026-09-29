import { useEffect } from 'react';
import { keySelection } from '../store/key-selection';

/**
 * Ctrl/⌘+A toggles select-all and Ctrl/⌘+Escape deselects while the calling page is mounted
 * (Performance and Lighting; Remap has its own Ctrl+A / Escape rules, as in Svelte).
 */
export function useSelectionShortcuts(): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const ctrl = event.ctrlKey || event.metaKey;
      // Ctrl+A behavior
      if (ctrl && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        keySelection.toggleSelectAll();
        return;
      }

      // Ctrl+Escape => deselect all
      if (ctrl && event.key === 'Escape') {
        event.preventDefault();
        keySelection.deselectAll();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
