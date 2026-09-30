import { useEffect, useRef, useState } from 'react';
import {
  INITIAL_KEY_TEST_LOG,
  clearEvents,
  keyName,
  recordKeyDown,
  recordKeyUp,
  startListening,
  stopListening,
} from '../model/key-test-log';

/**
 * Browser key event logger for any keyboard (port of `debug/KeyTest.svelte`). While listening,
 * every key event on the window is logged and its default action prevented.
 */
export function KeyTest() {
  const [log, setLog] = useState(INITIAL_KEY_TEST_LOG);
  /** Read by the window listeners, which must decide synchronously whether to prevent. */
  const listening = useRef(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!listening.current) return;
      // Prevent default for most keys to avoid browser shortcuts.
      event.preventDefault();
      const key = keyName(event);
      const now = performance.now();
      setLog(current => recordKeyDown(current, key, now));
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!listening.current) return;
      event.preventDefault();
      const key = keyName(event);
      const now = performance.now();
      setLog(current => recordKeyUp(current, key, now));
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      listening.current = false;
    };
  }, []);

  const start = () => {
    listening.current = true;
    setLog(startListening);
  };

  const stop = () => {
    listening.current = false;
    setLog(stopListening);
  };

  return (
    <div className="flex gap-5 h-full min-h-[500px]">
      {/* Left Panel - Info */}
      <div className="w-[280px] flex flex-col gap-4 shrink-0 overflow-visible">
        {/* Info Card */}
        <div className="glassmorphism-card p-5 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-primary-500"></div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">About Key Test</h3>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-3">
            <p>This tool is for general-purpose key testing and works with any keyboard.</p>

            <p className="text-amber-600 dark:text-amber-400">
              <strong>Note:</strong> Due to browser limitations, some keys cannot be tested and
              timing may not be perfectly accurate.
            </p>
          </div>
        </div>

        {/* Control Card */}
        <div className="glassmorphism-card p-5 rounded-xl">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Controls
          </h4>
          <div className="flex flex-col gap-3">
            {/* Keyed: a new element each time, like Svelte's {#if}/{:else}, so the focus of the
                clicked button is not carried over to the other one. */}
            {!log.listening ? (
              <button
                key="start"
                type="button"
                className="w-full px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 hover:shadow-xl active:scale-95"
                onClick={start}
              >
                Start Listening
              </button>
            ) : (
              <button
                key="stop"
                type="button"
                className="w-full px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-xl active:scale-95"
                onClick={stop}
              >
                Stop Listening
              </button>
            )}

            <button
              type="button"
              className="w-full px-6 py-2.5 glassmorphism-button rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md"
              onClick={() => {
                setLog(clearEvents);
              }}
            >
              Clear Events
            </button>
          </div>

          {log.listening && (
            <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50"></div>
                <div>
                  <p className="text-sm font-semibold text-green-400">Listening Active</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Press any key to record...
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Event Table */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 rounded-xl glassmorphism-card min-h-0 overflow-hidden flex flex-col">
          {/* Table Header */}
          <div className="grid grid-cols-4 gap-4 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Time
            </div>
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Type
            </div>
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Key
            </div>
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Delta (ms)
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto">
            {log.events.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 py-12">
                <svg
                  className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  />
                </svg>
                {log.listening ? (
                  <p className="text-sm font-medium">Press any key to start recording...</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">
                      Click &quot;Start Listening&quot; to begin
                    </p>
                    <p className="text-xs mt-1 text-gray-400">Events will appear here</p>
                  </>
                )}
              </div>
            ) : (
              log.events.map((event, index) => (
                <div
                  // Keyed by index, as in Svelte: the log only grows or is cleared.
                  key={index}
                  className={`grid grid-cols-4 gap-4 px-5 py-3 border-b border-gray-100 dark:border-gray-800/50 text-sm transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/30 ${event.type === 'Press' ? 'bg-green-50/30 dark:bg-green-900/10' : 'bg-orange-50/30 dark:bg-orange-900/10'}`}
                >
                  <div className="text-gray-600 dark:text-gray-300 font-mono">{event.time}</div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${event.type === 'Press' ? 'bg-green-500' : 'bg-orange-500'}`}
                    ></div>
                    <span
                      className={`${event.type === 'Press' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'} font-semibold`}
                    >
                      {event.type}
                    </span>
                  </div>
                  <div className="font-mono font-bold text-gray-900 dark:text-white">
                    {event.key}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 font-mono">{event.delta}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
