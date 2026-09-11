import { deviceSession, useConnection } from '../../features/device';
import { useT } from '../../lib/i18n';
import { Transition, fade } from '../../lib/transitions';
import { isConnecting } from '../connection';
import { liquidGlassBackground, liquidGlassGlow, useLiquidGlass } from './liquid-glass';
import styles from './ConnectionScreen.module.css';

const fadeInUp = styles['animate-fade-in-up'] ?? '';
const shake = styles['animate-shake'] ?? '';

/**
 * The welcome screen at `/` while no keyboard is connected (port of `ConnectionInterface.svelte`):
 * "Get Started" opens the browser's device picker; a failed attempt shows its message.
 */
export function ConnectionScreen() {
  const t = useT();
  const connection = useConnection();
  const connecting = isConnecting(connection.status);
  const error = connection.status === 'error' ? connection.message : null;
  const glass = useLiquidGlass();

  return (
    <div className="flex-1 flex items-center justify-center p-8 relative overflow-visible">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary-600/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>
      </div>

      <div className="w-full max-w-lg mx-auto relative z-10">
        {/* Big Title */}
        <div className={`text-center mb-12 ${fadeInUp}`}>
          <h1 className=" text-6xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            <i>ZELLIA</i> Control
          </h1>
        </div>

        {/* Animated Button */}
        <div className={`text-center ${fadeInUp}`} style={{ animationDelay: '0.2s' }}>
          <button
            type="button"
            onMouseMove={glass.onMouseMove}
            className="group relative px-12 py-4 bg-primary-600/80 backdrop-blur-xl text-white rounded-full font-medium text-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-white/20"
            style={{ background: liquidGlassBackground(120, glass.x, glass.y) }}
            onClick={() => {
              void deviceSession.connect();
            }}
            disabled={connecting}
          >
            {/* Liquid Glass Glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: liquidGlassGlow(150, glass.x, glass.y),
                transition: 'background 0.1s ease-out',
              }}
            ></div>{' '}
            {/* Button Content */}
            <div className="relative z-10 flex items-center justify-center gap-3">
              {connecting ? (
                <>
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {t('welcome.connecting')}
                </>
              ) : (
                <>
                  {t('welcome.getStarted')}
                  <svg
                    className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Error Display */}
        <Transition show={error !== null} transition={[fade, { duration: 300 }]}>
          <div className={`mt-8 text-center ${shake}`} role="alert">
            <div className="inline-flex items-center gap-2 text-red-500 text-sm">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        </Transition>

        {/* USB Warning - Minimal */}
        <div className={`mt-8 text-center ${fadeInUp}`} style={{ animationDelay: '0.3s' }}>
          <p className="text-xs text-gray-400 dark:text-gray-500">{t('ui.usbHubWarning')}</p>
        </div>
      </div>
    </div>
  );
}
