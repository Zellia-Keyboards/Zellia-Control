import { Settings } from 'lucide-react';
import { useEffect, useState, type Ref } from 'react';
import { setLayoutOptions, useLayoutOptions } from '../../features/keyboard';
import { Transition, slide } from '../../lib/transitions';

const OPTION_LABEL =
  'flex items-center px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-150';
const RADIO = 'w-4 h-4 mr-3 text-primary-500 accent-primary-500 cursor-pointer';
const CHECKBOX = 'w-4 h-4 mr-3 text-primary-500 accent-primary-500 cursor-pointer rounded';

interface SplitSpacebarOptionProps {
  /** Key sizes of the split spacebar under this bottom row. */
  readonly sizes: string;
  /** The root element, animated by the enclosing `Transition`. */
  readonly ref?: Ref<HTMLDivElement>;
}

/** The split-spacebar option shown under the selected bottom row. */
function SplitSpacebarOption({ sizes, ref }: SplitSpacebarOptionProps) {
  const { splitSpacebar } = useLayoutOptions();
  return (
    <div ref={ref} className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
      <label className={OPTION_LABEL}>
        <input
          type="checkbox"
          checked={splitSpacebar}
          onChange={event => {
            setLayoutOptions({ splitSpacebar: event.currentTarget.checked });
          }}
          className={CHECKBOX}
        />
        <span className="text-gray-900 dark:text-white font-medium flex-1">Split spacebar</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{sizes}</span>
      </label>
    </div>
  );
}

/**
 * Toolbar "Layout" dropdown (port of `LayoutConfigDropdown.svelte`): the physical layout
 * variants, persisted in the layout-options store. Any click outside the menu closes it.
 */
export function LayoutConfigDropdown() {
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const { bottomRowConfig, rightShiftSplit, splitBackspace } = useLayoutOptions();

  useEffect(() => {
    const close = () => {
      setShowLayoutMenu(false);
    };
    window.addEventListener('click', close);
    return () => {
      window.removeEventListener('click', close);
    };
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 glassmorphism-button hover:shadow-md active:scale-95"
        onClick={event => {
          event.stopPropagation();
          setShowLayoutMenu(shown => !shown);
        }}
        title="Configure keyboard layout"
        aria-expanded={showLayoutMenu}
      >
        <Settings className="w-4 h-4 text-primary-500" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">Layout</span>
        <svg
          className={`w-4 h-4 transition-transform duration-300 text-gray-600 dark:text-gray-400 ${showLayoutMenu ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Transition show={showLayoutMenu} transition={[slide, { duration: 250, axis: 'y' }]}>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- keeps clicks inside the menu from reaching the window's close handler; the menu's controls are its inputs */}
        <div
          className="absolute right-0 top-14 w-80 glassmorphism-card border border-gray-300 dark:border-gray-600 rounded-xl shadow-xl z-50 p-5 backdrop-blu"
          onClick={event => {
            event.stopPropagation();
          }}
        >
          {/* Header */}
          <div className="mb-5 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-500"></div>
              Layout Configuration
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Customize your keyboard layout
            </p>
          </div>

          {/* Bottom Row Configuration */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
              Bottom Row
            </h4>
            <div className="space-y-2">
              <label className={OPTION_LABEL}>
                <input
                  type="radio"
                  name="layout-bottom-row"
                  checked={bottomRowConfig === '6.25u'}
                  onChange={() => {
                    setLayoutOptions({ bottomRowConfig: '6.25u' });
                  }}
                  value="6.25u"
                  className={RADIO}
                />
                <span className="text-gray-900 dark:text-white font-medium flex-1">
                  6.25u (Standard)
                </span>
              </label>
              <label className={OPTION_LABEL}>
                <input
                  type="radio"
                  name="layout-bottom-row"
                  checked={bottomRowConfig === '7u'}
                  onChange={() => {
                    setLayoutOptions({ bottomRowConfig: '7u' });
                  }}
                  value="7u"
                  className={RADIO}
                />
                <span className="text-gray-900 dark:text-white font-medium flex-1">
                  7u (Tsangan)
                </span>
              </label>
            </div>
          </div>

          {/* Split Spacebar (only if 6.25u is selected) */}
          <Transition show={bottomRowConfig === '6.25u'} transition={[slide, { duration: 200 }]}>
            <SplitSpacebarOption sizes="(2.25u + 1.25u + 2.75u)" />
          </Transition>

          {/* Split Spacebar (only if 7u is selected) */}
          <Transition show={bottomRowConfig === '7u'} transition={[slide, { duration: 200 }]}>
            <SplitSpacebarOption sizes="(3u+1u+3u)" />
          </Transition>

          {/* Other Split Options */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
              Split Keys
            </h4>
            <div className="space-y-2">
              <label className={OPTION_LABEL}>
                <input
                  type="checkbox"
                  checked={rightShiftSplit}
                  onChange={event => {
                    setLayoutOptions({ rightShiftSplit: event.currentTarget.checked });
                  }}
                  className={CHECKBOX}
                />
                <span className="text-gray-900 dark:text-white font-medium">Right shift split</span>
              </label>

              <label className={OPTION_LABEL}>
                <input
                  type="checkbox"
                  checked={splitBackspace}
                  onChange={event => {
                    setLayoutOptions({ splitBackspace: event.currentTarget.checked });
                  }}
                  className={CHECKBOX}
                />
                <span className="text-gray-900 dark:text-white font-medium">Split backspace</span>
              </label>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  );
}
