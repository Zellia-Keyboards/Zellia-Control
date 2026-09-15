import { MoreVertical } from 'lucide-react';
import { useId, type KeyboardEvent, type MouseEvent } from 'react';
import type { Profile } from '../model/profiles';

export interface ProfileCardProps {
  readonly profile: Profile | null;
  /** Position in the grid; names a profile without a name ("Profile <index + 1>"). */
  readonly index: number;
  readonly isActive: boolean;
  /** Whether this card's menu is open. */
  readonly menuOpen: boolean;
  readonly onActivate: () => void;
  readonly onMenuClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

/** One profile tile of the Profiles page (port of `profiles/ProfileCard.svelte`). */
export function ProfileCard({
  profile,
  index,
  isActive,
  menuOpen,
  onActivate,
  onMenuClick,
}: ProfileCardProps) {
  const nameId = useId();

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Keys pressed on the menu button inside operate that button, not the card.
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!isActive) onActivate();
    }
  };

  return (
    <div
      className={`relative rounded-lg border transition-all duration-200 p-6 ${
        isActive
          ? 'border-green-500/50 cursor-default'
          : 'border-gray-700 cursor-pointer hover:border-gray-600'
      } glassmorphism-card`}
      onClick={() => {
        if (!isActive) onActivate();
      }}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-labelledby={nameId}
    >
      {/* Profile Name */}
      <h3 id={nameId} className="text-base font-semibold text-gray-900 dark:text-white pr-12">
        {profile?.name || `Profile ${index + 1}`}
      </h3>

      {/* Active Badge */}
      {isActive && (
        <div className="absolute top-4 right-12 px-2 py-1 rounded-md bg-gray-700 text-white text-xs font-medium">
          Active
        </div>
      )}

      {/* Menu Button */}
      {profile && (
        <button
          type="button"
          className="absolute top-4 right-4 p-1 rounded hover:bg-gray-800 transition-colors z-10"
          onClick={onMenuClick}
          aria-label="Menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <MoreVertical className="w-5 h-5 text-gray-400" />
        </button>
      )}
    </div>
  );
}
