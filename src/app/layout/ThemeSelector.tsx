import { Palette } from 'lucide-react';
import { useState } from 'react';
import { useT } from '../../lib/i18n';
import {
  THEME_COLORS,
  isThemeColorName,
  useThemeColor,
  type ThemeColorName,
} from '../../lib/theme';
import { Transition, slide } from '../../lib/transitions';

const THEME_NAMES: readonly ThemeColorName[] = Object.keys(THEME_COLORS).filter(isThemeColorName);

function capitalized(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Sidebar theme color picker (port of `ThemeSelector.svelte`). */
export function ThemeSelector() {
  const t = useT();
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const { color: currentTheme, setColor } = useThemeColor();

  // Clicking the selected color deselects it (plain white/black).
  const setTheme = (name: ThemeColorName) => {
    setColor(currentTheme === name ? null : name);
  };

  return (
    <div className="p-3">
      <button
        type="button"
        className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 glassmorphism-button"
        onClick={() => {
          setShowThemeSelector(shown => !shown);
        }}
        aria-expanded={showThemeSelector}
      >
        <div className="flex items-center gap-3">
          <Palette className="w-4 h-4" />
          <span>{t('ui.themeColors')}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform duration-200${showThemeSelector ? ' rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Transition show={showThemeSelector} transition={[slide, { duration: 300, axis: 'y' }]}>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {THEME_NAMES.map(name => {
            const selected = currentTheme === name;
            return (
              <button
                key={name}
                type="button"
                title={capitalized(name) + (selected ? ' (Click to deselect)' : '')}
                aria-label={capitalized(name)}
                aria-pressed={selected}
                className={`w-full h-7 rounded border transition-all duration-150 ${
                  selected
                    ? 'border-white dark:border-white ring-2 ring-gray-400 dark:ring-white'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
                }`}
                style={{ backgroundColor: THEME_COLORS[name] }}
                onClick={() => {
                  setTheme(name);
                }}
              ></button>
            );
          })}
        </div>
      </Transition>
    </div>
  );
}
