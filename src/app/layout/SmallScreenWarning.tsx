import { useT } from '../../lib/i18n';

/** Covers the app below the `xl` breakpoint (port of `SmallScreenWarning.svelte`). */
export function SmallScreenWarning() {
  const t = useT();

  return (
    <div className="xl:hidden fixed inset-0 flex items-center justify-center z-50 bg-primary-50 dark:bg-black">
      <div className="max-w-2xl mx-4">
        <div className="rounded-xl shadow-lg border p-8 text-center bg-white dark:bg-black border-primary-200 dark:border-primary-700 text-gray-800 dark:text-white glassmorphism-card">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-primary-100 dark:bg-primary-800">
              <svg
                className="w-8 h-8 text-primary-600 dark:text-primary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Display Too Small
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            Zellia Control requires a larger display for the optimal keyboard configuration
            experience. Please use a desktop or laptop computer, or expand your browser window.
          </p>

          <div className="border rounded-lg p-4 mb-6 bg-primary-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700 glassmorphism-card">
            <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm font-medium">Minimum recommended width: 1280px</div>
            </div>
          </div>

          <div className="text-left space-y-3 mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-4">
              {t('ui.featuresRequiringLargerDisplay')}
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                <span>{t('ui.keyboardLayoutVisualization')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                <span>{t('ui.advancedKeyConfigPanels')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                <span>Performance tuning controls</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                <span>Lighting configuration interface</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
