import { Check } from 'lucide-react';
import { useEffect, useState, type MouseEvent } from 'react';
import { Link } from 'react-router';
import { useT } from '../../lib/i18n';
import { Transition, slide } from '../../lib/transitions';
import { profileActions, useProfileState } from './store/profile-store';

/**
 * The toolbar's profile switcher (port of `components/ProfileDropdown.svelte`). Choosing a
 * profile activates it like the Profiles page does (D7).
 */
export function ProfileDropdown() {
  const t = useT();
  const { profiles, activeProfileId } = useProfileState();
  const activeProfile = profiles.find(profile => profile?.id === activeProfileId);
  const [showDropdown, setShowDropdown] = useState(false);

  // Get non-null profiles
  const availableProfiles = profiles.filter(profile => profile !== null);

  // Any click that reaches the window closes the dropdown (its own clicks stop there).
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowDropdown(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const selectProfile = (profileId: number) => {
    profileActions.activate(profileId);
    setShowDropdown(false);
  };

  const toggleDropdown = (event: MouseEvent) => {
    event.stopPropagation();
    setShowDropdown(show => !show);
  };

  return (
    <div className="relative">
      {/* Dropdown Button */}
      <button
        type="button"
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 glassmorphism-button hover:shadow-md active:scale-95"
        onClick={toggleDropdown}
        title="Switch profiles"
        aria-expanded={showDropdown}
      >
        <div className="flex flex-col items-start">
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('ui.profiles')}</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {activeProfile?.name || t('profiles.noProfile')}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <Transition show={showDropdown} transition={[slide, { duration: 200, axis: 'y' }]}>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- only keeps clicks inside from closing the dropdown */}
        <div
          className="absolute top-full mt-2 right-0 w-72 glassmorphism-card border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden backdrop-blur-xl"
          onClick={event => {
            event.stopPropagation();
          }}
        >
          <div className="max-h-80 overflow-y-auto">
            {availableProfiles.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('ui.noProfilesAvailable')}
              </div>
            ) : (
              availableProfiles.map(profile => (
                <button
                  key={profile.id}
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center justify-between group"
                  onClick={() => {
                    selectProfile(profile.id);
                  }}
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {profile.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t('profiles.slot')} {profile.id}
                    </div>
                  </div>

                  {profile.id === activeProfileId && <Check className="w-4 h-4 text-primary-500" />}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700">
            {/* Navigates inside the app, so the keyboard stays connected (PL-030: the Svelte
                panel's stopPropagation hid the click from SvelteKit's router, and its link
                reloaded the page). */}
            <Link
              to="/profiles/"
              className="block px-4 py-3 text-sm font-semibold text-center text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => {
                setShowDropdown(false);
              }}
            >
              {t('profiles.manageAll')}
            </Link>
          </div>
        </div>
      </Transition>
    </div>
  );
}
