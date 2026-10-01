export interface UnsupportedFeatureProps {
  /** "This keyboard does not support …" */
  readonly message: string;
}

/**
 * Shown instead of a page whose feature the connected keyboard lacks (Macros, Scripts), in the
 * style of the not-connected fallback.
 */
export function UnsupportedFeature({ message }: UnsupportedFeatureProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="mb-6">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
            <path strokeLinecap="round" strokeWidth="1.5" d="M5.64 5.64l12.72 12.72" />
          </svg>
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{message}</h3>
      </div>
    </div>
  );
}
