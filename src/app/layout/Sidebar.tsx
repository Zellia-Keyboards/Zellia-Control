import { LogOut, Save } from 'lucide-react';
import { useId } from 'react';
import { Link, useLocation } from 'react-router';
import { deviceSession, useDeviceName, useDeviceStore, useIsReady } from '../../features/device';
import { useLanguage, useT } from '../../lib/i18n';
import { Transition, slide, type SlideParams } from '../../lib/transitions';
import { NAVIGATE, isActivePage } from '../navigation';
import { preloadPage } from '../pages';
import { DarkModeToggle } from './DarkModeToggle';
import { LanguageSwitch } from './LanguageSwitch';
import { ThemeSelector } from './ThemeSelector';
import styles from './Sidebar.module.css';

/** `in:slide|global` of the Save and Disconnect buttons (quadratic ease-out). */
const BUTTON_SLIDE: SlideParams = { duration: 350, easing: t => t * (2 - t), axis: 'y' };

interface SidebarProps {
  /** Ends the keyboard session and returns to the connection screen. */
  onDisconnect: () => void;
}

/**
 * The sidebar (port of `Sidebar.svelte`): connection status, Profiles, Save and Disconnect while
 * connected, page navigation and the appearance settings.
 */
export function Sidebar({ onDisconnect }: SidebarProps) {
  const t = useT();
  const { language } = useLanguage();
  // Svelte's `shouldShowConfigurator` also ended the loading overlay: while the configuration
  // loads, the sidebar keeps waiting under the overlay, as it did while connecting (PL-003).
  const ready = useIsReady();
  const deviceName = useDeviceName();
  const { pathname } = useLocation();
  // Edits the keyboard does not store yet (lighting edits are not even on it before Save).
  const unsaved = useDeviceStore(state => state.unsaved);
  const unsavedId = useId();

  return (
    <div
      className={`sidebar ${styles.sidebar ?? ''} flex flex-col dark:bg-black dark:border-gray-600 bg-white border-gray-200 glassmorphism-sidebar shadow-xl h-full overflow-y-auto overflow-x-hidden border-r isolate`}
      style={{ width: 'var(--sidebar-width, 13rem)' }}
    >
      {/* Header */}
      <div className="p-4">
        <h1 className="font-black text-xl dark:text-white text-gray-900 text-center">
          <span className="italic">{language === 'en' ? 'ZELLIA' : 'ZELLIA'}</span>
          {/* One text node with its leading space, as Svelte renders it. */}
          {` ${language === 'en' ? 'Control' : '控制'}`}
        </h1>

        {/* Connection Status */}
        <div className="mt-3 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            {ready ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>
                  <i>{deviceName || 'Connected'}</i>
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>
                  <i>Waiting to connect</i>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="px-3 pb-3 space-y-2">
        <Link
          to="/profiles/"
          onMouseEnter={() => {
            preloadPage('/profiles/');
          }}
          onFocus={() => {
            preloadPage('/profiles/');
          }}
          className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-md hover:shadow-lg glassmorphism-button"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
              />
            </svg>
            <span>
              <i>{t('ui.profiles')}</i>
            </span>
          </div>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Save Button */}
        <Transition show={ready} in={[slide, BUTTON_SLIDE]} appear>
          <div>
            <button
              type="button"
              className="w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 text-white shadow-lg hover:shadow-xl glassmorphism-button grid place-items-center active:scale-95 hover:animate-none"
              onClick={() => {
                void deviceSession.save();
              }}
              title="Save configuration"
              aria-describedby={unsaved ? unsavedId : undefined}
            >
              <div className="flex items-center justify-center gap-1 col-start-1 row-start-1">
                <Save className="w-3 h-3" />
                <i>{t('ui.save')}</i>
              </div>
              {/* PL-050: unsaved changes. The dot shares the label's grid cell, so the button
                  stays unpositioned: a positioned Save button changes how Chrome draws the
                  Disconnect button below it. The margins cancel the padding: 6 px from the
                  corner, as before. */}
              {unsaved && (
                <span
                  aria-hidden="true"
                  className="col-start-1 row-start-1 self-start justify-self-end -mt-1 -mr-1.5 w-2 h-2 rounded-full bg-amber-400"
                />
              )}
            </button>
            <span id={unsavedId} hidden>
              {t('ui.unsavedChanges')}
            </span>
          </div>
        </Transition>

        {/* Disconnect Button */}
        <Transition show={ready} in={[slide, BUTTON_SLIDE]} appear>
          <div>
            <button
              type="button"
              className="w-full px-3 py-2 text-xs font-medium border rounded-md transition-colors duration-200 text-red-600 dark:text-red-400 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 glassmorphism-button"
              onClick={onDisconnect}
            >
              <div className="flex items-center justify-center gap-1">
                <LogOut className="w-3 h-3" />
                <i>{t('ui.disconnect')}</i>
              </div>
            </button>
          </div>
        </Transition>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-3">
        <nav className="space-y-1">
          {NAVIGATE.map(([href, name]) => {
            const active = isActivePage(pathname, href);
            return (
              <Link
                key={href}
                to={`${href}/`}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg relative overflow-hidden text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900 data-[active=true]:bg-primary-500 data-[active=true]:text-white data-[active=true]:shadow-sm transition-all duration-200 ease-in glassmorphism-nav-item"
                data-active={active}
                aria-current={active ? 'page' : undefined}
                onMouseEnter={() => {
                  preloadPage(href);
                }}
                onFocus={() => {
                  preloadPage(href);
                }}
              >
                <span className="relative z-10">
                  <i>{t(name)}</i>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Theme Selector */}
      <ThemeSelector />

      {/* Language Selector */}
      <LanguageSwitch />

      {/* Dark Mode Toggle */}
      <DarkModeToggle />
    </div>
  );
}
