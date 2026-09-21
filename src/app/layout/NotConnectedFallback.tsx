import { useNavigate } from 'react-router';
import { liquidGlassBackground, liquidGlassGlow, useLiquidGlass } from './liquid-glass';

/** Shown instead of a page while no keyboard is connected (port of `NotConnectedFallback.svelte`). */
export function NotConnectedFallback() {
  const navigate = useNavigate();
  const glass = useLiquidGlass();

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
            <path strokeLinecap="round" strokeWidth="1.5" d="M8 12h8" />
          </svg>
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
          No Keyboard Connected
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
          Please connect a keyboard or go to the home page to start.
        </p>
        <button
          type="button"
          onMouseMove={glass.onMouseMove}
          className="group relative px-8 py-3 bg-primary-600/80 backdrop-blur-xl text-white rounded-full font-medium text-sm overflow-hidden transition-all duration-200 hover:scale-105 hover:shadow-lg border border-white/20"
          style={{
            background: liquidGlassBackground(100, glass.x, glass.y),
            // Names no keyframes: the Svelte component's `shimmer` keyframes were scoped (and
            // never used), so the button does not animate.
            animation: 'shimmer 3s linear infinite',
          }}
          onClick={() => {
            void navigate('/');
          }}
        >
          {/* Liquid Glass Glow */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: liquidGlassGlow(120, glass.x, glass.y),
              transition: 'background 0.1s ease-out',
            }}
          ></div>{' '}
          {/* Button Content */}
          <span className="relative z-10">Go to Home</span>
        </button>
      </div>
    </div>
  );
}
