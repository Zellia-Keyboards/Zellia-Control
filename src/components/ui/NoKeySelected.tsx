import { useT, type TranslationKey } from '../../lib/i18n';

export interface NoKeySelectedProps {
  tipKey?: TranslationKey;
  className?: string;
}

/** Shared "No Key Selected" empty state (port of `ui/NoKeySelected.svelte`). */
export function NoKeySelected({ tipKey, className = '' }: NoKeySelectedProps) {
  const t = useT();
  return (
    <div className={`flex-1 flex items-center justify-center ${className}`}>
      <div className="text-center max-w-md mx-auto">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100 dark:bg-gray-800 glassmorphism-card">
          <svg
            className="w-12 h-12 text-primary-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 9l4-4 4 4m0 6l-4 4-4-4"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {t('advancedkey.noKeySelected')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t('advancedkey.selectKeyToConfig')}
        </p>
        {tipKey && (
          <div className="border rounded-lg p-4 text-sm bg-primary-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700 text-primary-800 dark:text-primary-200 glassmorphism-card">
            {/* One text node per run, as Svelte renders it: Chrome shapes text nodes separately. */}
            <strong>{`${t('advancedkey.tip')}:`}</strong>
            {` ${t(tipKey)}`}
          </div>
        )}
      </div>
    </div>
  );
}
