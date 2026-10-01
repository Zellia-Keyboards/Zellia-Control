import { Copy, Download, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react';

/** Holding Delete for this long deletes the profile. */
const HOLD_DURATION = 1500;
/** Progress updates while holding (~60 fps). */
const UPDATE_INTERVAL = 16;

export interface ProfileMenuPosition {
  readonly top: number;
  readonly right: number;
}

export interface ProfileMenuProps {
  /** Viewport offsets of the menu (below its menu button, right-aligned). */
  readonly position: ProfileMenuPosition;
  readonly isActive: boolean;
  readonly canDelete: boolean;
  readonly onExport: () => void;
  readonly onDuplicate: () => void;
  readonly onRestore: () => void;
  readonly onDelete: () => void;
  /** Escape or Tab in the menu: the page closes it and returns the focus to its menu button. */
  readonly onClose: () => void;
  /** Root element, for the page's slide transition and focus handling. */
  readonly ref?: Ref<HTMLDivElement>;
}

const itemClass =
  'w-full px-4 py-2.5 text-left text-sm hover:bg-primary-800/50 flex items-center gap-3 text-gray-200 dark:text-gray-200 transition-colors';

function isActivationKey(event: KeyboardEvent): boolean {
  return event.key === 'Enter' || event.key === ' ';
}

/** Index of the item that the arrow keys, Home or End move to, or `null` for other keys. */
function targetItem(key: string, current: number, count: number): number | null {
  switch (key) {
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowUp':
      return current < 0 ? count - 1 : (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/**
 * A profile card's menu (port of `profiles/ProfileMenu.svelte`): Export, Duplicate, Restore
 * Default and, for inactive additional profiles, hold-to-delete (1.5 s).
 *
 * Keyboard (not in the Svelte menu, which the keyboard could not open): the arrow keys, Home and
 * End move between the items, Escape and Tab close the menu (`onClose`).
 */
export function ProfileMenu({
  position,
  isActive,
  canDelete,
  onExport,
  onDuplicate,
  onRestore,
  onDelete,
  onClose,
  ref,
}: ProfileMenuProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const latestOnDelete = useRef(onDelete);

  useLayoutEffect(() => {
    latestOnDelete.current = onDelete;
  });

  const startHold = () => {
    setIsHolding(true);
    setHoldProgress(0);
  };

  const cancelHold = () => {
    setIsHolding(false);
    setHoldProgress(0);
  };

  // While holding, progress advances every 16 ms; at 100 % the profile is deleted.
  useEffect(() => {
    if (!isHolding) return;
    let progress = 0;
    const timer = setInterval(() => {
      progress += (UPDATE_INTERVAL / HOLD_DURATION) * 100;
      if (progress < 100) {
        setHoldProgress(progress);
        return;
      }
      // The page closes the menu, which keeps its last frame while it slides out: the Svelte
      // menu reset its state too, but a closing Svelte block no longer updates.
      clearInterval(timer);
      latestOnDelete.current();
    }, UPDATE_INTERVAL);
    return () => {
      clearInterval(timer);
    };
  }, [isHolding]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Keys stay in the menu, as in Svelte.
    event.stopPropagation();
    if (event.key === 'Escape' || event.key === 'Tab') {
      // Tab keeps its default: it moves on from the menu button, which has the focus by then.
      onClose();
      return;
    }
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')
    );
    const current = items.findIndex(item => item === document.activeElement);
    const target = targetItem(event.key, current, items.length);
    if (target === null) return;
    event.preventDefault();
    items[target]?.focus({ preventScroll: true });
  };

  return (
    <div
      ref={ref}
      className="fixed border rounded-lg shadow-2xl z-[9999] w-48 overflow-hidden backdrop-blur-2xl glassmorphism-card border-primary-500/30"
      style={{ top: `${position.top}px`, right: `${position.right}px` }}
      onClick={event => {
        event.stopPropagation();
      }}
      onKeyDown={handleKeyDown}
      role="menu"
      tabIndex={-1}
    >
      <button type="button" role="menuitem" tabIndex={-1} className={itemClass} onClick={onExport}>
        <Download className="w-4 h-4" />
        Export
      </button>

      <button
        type="button"
        role="menuitem"
        tabIndex={-1}
        className={itemClass}
        onClick={onDuplicate}
      >
        <Copy className="w-4 h-4" />
        Duplicate
      </button>

      <button type="button" role="menuitem" tabIndex={-1} className={itemClass} onClick={onRestore}>
        <RotateCcw className="w-4 h-4" />
        Restore Default
      </button>

      {canDelete && !isActive && (
        <>
          <div className="border-t border-primary-700/50" />
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 text-red-400 transition-all relative overflow-hidden ${
              isHolding ? 'bg-red-900/30' : 'hover:bg-red-900/20'
            }`}
            onMouseDown={event => {
              event.preventDefault();
              startHold();
            }}
            onTouchStart={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchEnd={cancelHold}
            onKeyDown={event => {
              if (!isActivationKey(event) || event.repeat) return;
              event.preventDefault();
              startHold();
            }}
            onKeyUp={event => {
              if (isActivationKey(event)) cancelHold();
            }}
            onBlur={cancelHold}
          >
            {/* Progress bar background */}
            <div
              className="absolute inset-0 bg-red-900/40 transition-none"
              style={{ width: `${holdProgress}%` }}
            />

            {/* Content */}
            <span className="relative z-10 flex items-center gap-3 w-full">
              {isHolding ? (
                <>
                  <div className="w-4 h-4 relative">
                    {/* Circular progress spinner */}
                    <svg className="w-4 h-4 rotate-[-90deg]" viewBox="0 0 16 16">
                      <circle
                        cx="8"
                        cy="8"
                        r="6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="opacity-30"
                      />
                      <circle
                        cx="8"
                        cy="8"
                        r="6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray={holdProgress * 0.377}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <span className="flex-1">
                    {holdProgress >= 100 ? 'Deleted!' : `Deleting... ${Math.floor(holdProgress)}%`}
                  </span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Hold to Delete (1.5s)</span>
                </>
              )}
            </span>
          </button>
        </>
      )}
    </div>
  );
}
