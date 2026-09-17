import { Globe } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useLanguage, useT, type Language } from '../../lib/i18n';
import { THEME_COLORS, useThemeColor } from '../../lib/theme';
import styles from './LanguageSwitch.module.css';

const OPTIONS: readonly (readonly [Language, string])[] = [
  ['en', 'EN'],
  ['zh', '中文'],
];

/** The slider under the selected language, tinted with the theme color when one is chosen. */
function sliderStyle(language: Language, themeColor: string | null): CSSProperties {
  const position: CSSProperties = {
    left: language === 'en' ? '4px' : 'calc(50% + 0px)',
    transform: 'translateZ(0)',
  };
  if (themeColor === null) return position;
  return {
    ...position,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    background: `linear-gradient(135deg, ${themeColor}CC, ${themeColor}99)`,
    boxShadow:
      `0 8px 16px -4px ${themeColor}40, 0 4px 8px -2px ${themeColor}30, ` +
      'inset 0 1px 0 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 0 rgba(0, 0, 0, 0.1)',
    border: `1px solid ${themeColor}33`,
  };
}

/** Sidebar EN / 中文 switch (port of `LanguageSwitch.svelte`). */
export function LanguageSwitch() {
  const t = useT();
  const { language, setLanguage } = useLanguage();
  const { color } = useThemeColor();

  return (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {t('ui.language')}
        </span>
      </div>

      <div className="relative inline-flex w-full rounded-lg p-1 glassmorphism-card">
        <div
          className={`${styles['language-switch-slider'] ?? ''} absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md transition-all duration-300 ease-out shadow-lg ${styles['language-slider-bg'] ?? ''}`}
          style={sliderStyle(language, color === null ? null : THEME_COLORS[color])}
        ></div>

        {OPTIONS.map(([option, label]) => (
          <button
            key={option}
            type="button"
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 relative z-10 ${
              language === option
                ? 'text-white font-semibold'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
            aria-pressed={language === option}
            onClick={() => {
              setLanguage(option);
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
