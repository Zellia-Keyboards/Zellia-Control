import { useCallback, useEffect, useRef, useState } from 'react';
import { deviceSession, subscribeDebugSamples, useIsReady } from '../../device';
import { fractionToMm } from '../../device/model/units';
import { keySelection, useSelectedKeys } from '../../keyboard';
import { getLanguage, translate, useT } from '../../../lib/i18n';
import { TravelChart } from '../chart/travel-chart';
import { KeyboardSelector } from './KeyboardSelector';
import './KeyTracking.module.css';

/** What Start/Stop last decided for one selection; a new selection starts tracking again. */
interface RunControl {
  readonly selection: readonly number[];
  readonly running: boolean;
}

/**
 * Live travel of one key (port of `debug/KeyTracking.svelte`, D16). Tracking follows the key
 * selection: exactly one selected key is streamed from the keyboard (`startDebug`) and its
 * samples are appended to the chart in millimetres; any other selection stops it (`stopDebug`),
 * as do Stop, Clear and leaving the tab.
 */
export function KeyTracking() {
  const t = useT();
  const ready = useIsReady();
  const selected = useSelectedKeys();
  const trackedKey = selected.length === 1 ? (selected[0] ?? null) : null;
  const selectedKeyName = trackedKey === null ? '' : `Key ${trackedKey}`;
  const [modalOpen, setModalOpen] = useState(false);
  const [control, setControl] = useState<RunControl | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<TravelChart | null>(null);

  const current = control?.selection === selected ? control : null;
  const tracking = ready && trackedKey !== null && (current?.running ?? true);
  /** Identity of the current recording: a new selection or Start begins a new one. */
  const recording = current ?? selected;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Labels are fixed when the chart is created, as in Svelte; only the unit is read live.
    const language = getLanguage();
    const chart = new TravelChart(canvas, {
      dataset: translate('debug.keyDistance', language),
      time: translate('debug.timeLabel', language),
      distance: translate('debug.distanceLabel', language),
      unit: () => translate('units.mm', getLanguage()),
    });
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!tracking) {
      deviceSession.stopDebug();
      return;
    }
    chartRef.current?.restart();
    deviceSession.startDebug(trackedKey);
    const startTime = Date.now();
    return subscribeDebugSamples(sample => {
      if (sample.keyId !== trackedKey) return;
      chartRef.current?.append({ x: Date.now() - startTime, y: fractionToMm(sample.value) });
    });
  }, [tracking, trackedKey, recording]);

  useEffect(
    () => () => {
      deviceSession.stopDebug();
    },
    []
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const start = () => {
    setControl({ selection: selected, running: true });
  };

  const stop = () => {
    // Stop at once: no sample of this recording may arrive after the click.
    deviceSession.stopDebug();
    setControl({ selection: selected, running: false });
  };

  const clear = () => {
    deviceSession.stopDebug();
    chartRef.current?.clear();
    keySelection.deselectAll();
  };

  return (
    <>
      {/* Key Tracking Section */}
      <div className="flex gap-5 h-full min-h-0">
        {/* Left Sidebar - Info panel and controls */}
        <div className="w-[280px] shrink-0 flex flex-col gap-4">
          {/* Info Panel */}
          <div className="glassmorphism-card p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-primary-500"></div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">About This Tool</h3>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed space-y-3">
              <p>Track the pressing distance of a key in real time and visualize it in a chart.</p>

              <p>
                The keyboard cannot distinguish &apos;normal pressing&apos; from conditions like
                hand movement or force changes after bottom-out.
              </p>

              <p className="text-amber-600 dark:text-amber-400">
                <strong>Tip:</strong> Zoom with mouse scroll to observe trigger/reset changes
                closely.
              </p>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="glassmorphism-card p-4 rounded-xl flex flex-col gap-3">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Controls
            </h4>

            <button
              type="button"
              onClick={() => {
                setModalOpen(true);
              }}
              className={`w-full px-4 py-3 glassmorphism-button rounded-lg text-sm font-medium text-left flex items-center justify-between gap-2 transition-all duration-200 hover:shadow-md ${!ready ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!ready}
            >
              <span className="truncate">{selectedKeyName || 'Select Key...'}</span>
              <svg
                className="w-4 h-4 text-gray-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Start/Stop and Clear buttons row */}
            <div className="flex gap-2">
              {!tracking ? (
                <button
                  type="button"
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${!selectedKeyName ? 'opacity-50 cursor-not-allowed glassmorphism-button' : 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 hover:shadow-xl active:scale-95'}`}
                  disabled={!selectedKeyName}
                  onClick={start}
                >
                  Start
                </button>
              ) : (
                <button
                  type="button"
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-xl transition-all duration-200 active:scale-95"
                  onClick={stop}
                >
                  Stop
                </button>
              )}

              <button
                type="button"
                className="flex-1 px-4 py-2.5 glassmorphism-button rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md"
                onClick={clear}
              >
                Clear
              </button>
            </div>

            {/* Zoom buttons row */}
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 px-3 py-2.5 glassmorphism-button rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md"
                onClick={() => {
                  chartRef.current?.resetZoom();
                }}
              >
                Reset Zoom
              </button>

              <button
                type="button"
                className="flex-1 px-3 py-2.5 glassmorphism-button rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md"
                onClick={() => {
                  chartRef.current?.zoomToBottom();
                }}
              >
                Zoom 0.1mm
              </button>
            </div>
          </div>

          {/* Status Indicator */}
          {tracking && (
            <div className="glassmorphism-card p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50"></div>
                <div>
                  <p className="text-sm font-semibold text-green-400">Recording</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedKeyName}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Chart Area */}
        <div className="flex-1 min-w-0">
          {/* Chart Container */}
          <div className="h-full glassmorphism-card rounded-xl p-4">
            <div className="w-full h-full max-h-[600px]">
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                role="img"
                aria-label={t('debug.keyDistance')}
              ></canvas>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Selector Modal */}
      <KeyboardSelector open={modalOpen} onClose={closeModal} />
    </>
  );
}
