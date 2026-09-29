import { GitHubMark } from './GitHubMark';

export interface LibrarySectionProps {
  readonly onGitHubClick?: () => void;
}

const LIBRARY_FEATURES = [
  'HID Communication Protocol for Hall Effect keyboards',
  'Analog key data processing and calibration',
  'Rapid Trigger and advanced key mode implementations',
  'Cross-platform support (Windows, macOS, Linux)',
] as const;

const CONTRIBUTIONS = [
  { title: 'Contribute Code', text: 'Submit PRs, report bugs, suggest features' },
  { title: 'Performance', text: 'Help improve performance and efficiency' },
  { title: 'Integration', text: 'Build your own keyboard with zellia_libamp' },
] as const;

/** The open-source library card (port of `about/LibrarySection.svelte`; copy stays English). */
export function LibrarySection({ onGitHubClick }: LibrarySectionProps) {
  return (
    <div className="glassmorphism-card rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300">
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-black">
            <GitHubMark className="w-8 h-8 text-gray-900 dark:text-white" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            Open Source Library - zellia_libamp
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            While Zellia Control is proprietary software, our core library{' '}
            <strong>zellia_libamp</strong> is fully open source. The library powers keyboard
            communication protocols and is available for developers to use.
          </p>

          {/* GitHub Button */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              type="button"
              className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 text-white dark:text-gray-900 shadow-sm hover:shadow-md"
              onClick={onGitHubClick}
            >
              <GitHubMark className="w-5 h-5" />
              <span>View zellia_libamp on GitHub</span>
            </button>
          </div>

          {/* Library Features */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Library Features:</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              {LIBRARY_FEATURES.map(feature => (
                <li key={feature} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Contribution Info */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {CONTRIBUTIONS.map(({ title, text }) => (
                <div key={title} className="text-center">
                  <div className="font-medium text-gray-900 dark:text-white mb-1">{title}</div>
                  <div className="text-gray-500 dark:text-gray-400">{text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
