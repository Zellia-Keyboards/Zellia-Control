/**
 * The header row the four Svelte mode headers share (`TapHoldHeader`, `ToggleHeader`,
 * `NullBindHeader`, `DKSHeader`): back button, title and subtitle, and the mode's buttons.
 */
import type { ReactNode } from 'react';
import { useT, type TranslationKey } from '../../../../lib/i18n';

export interface EditorHeaderProps {
  readonly titleKey: TranslationKey;
  readonly subtitleKey: TranslationKey;
  readonly onBack: () => void;
  /** The buttons on the right. */
  readonly children: ReactNode;
}

export function EditorHeader({ titleKey, subtitleKey, onBack, children }: EditorHeaderProps) {
  const t = useT();
  return (
    <div className="border-b px-6 py-4 -mx-8 -mt-8 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            onClick={onBack}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t('advancedkey.backToAdvanced')}
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t(titleKey)}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t(subtitleKey)}</p>
          </div>
        </div>
        <div className="flex gap-3">{children}</div>
      </div>
    </div>
  );
}
