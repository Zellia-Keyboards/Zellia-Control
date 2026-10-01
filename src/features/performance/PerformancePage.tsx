import { useEffect, useState } from 'react';
import { cx } from '../../lib/class-names';
import { useT } from '../../lib/i18n';
import { keySelection, useSelectedKeys } from '../keyboard';
import { ActuationPointControl } from './components/ActuationPointControl';
import { DeadzoneControl } from './components/DeadzoneControl';
import { MaxTravelDistanceControl } from './components/MaxTravelDistanceControl';
import { RapidTriggerToggle } from './components/RapidTriggerToggle';
import { SensitivityControl } from './components/SensitivityControl';
import { usePerformanceBrush } from './hooks/use-performance-brush';
import { useSelectionShortcuts } from './hooks/use-selection-shortcuts';
import { DEFAULT_MAX_TRAVEL_DISTANCE, clampToMaxTravel } from './model/settings';
import styles from './PerformancePage.module.css';

const SELECT_ALL_HOVER_COLOR = 'color-mix(in srgb, var(--theme-color-primary) 85%, black)';

/**
 * Performance route (port of `routes/performance/+page.svelte`): actuation, rapid trigger,
 * deadzones and sensitivity of the selected keys. The global keyboard above it belongs to the
 * shell.
 */
export function PerformancePage() {
  const t = useT();
  const keysSelected = useSelectedKeys().length;
  const [settings, updateSettings] = usePerformanceBrush();
  // Maximum travel distance for the switch (default 4mm); bounds the sliders only.
  const [maxTravelDistance, setMaxTravelDistance] = useState(DEFAULT_MAX_TRAVEL_DISTANCE);
  const { rapidTriggerEnabled } = settings;

  // Always allow key selection on performance page
  useEffect(() => {
    keySelection.setAllowSelection(true);
  }, []);
  useSelectionShortcuts();

  return (
    <div
      className="rounded-2xl shadow mt-2 mb-4 grow bg-primary-100 dark:bg-black border border-transparent dark:border-gray-600 text-black dark:text-white h-full flex flex-col glassmorphism-card"
      style={{ padding: 'calc(2rem * var(--ui-scale, 1))' }}
    >
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 'calc(1rem * var(--ui-scale, 1))' }}
      >
        <div className="flex items-center gap-4">
          <h2
            className="font-bold text-gray-900 dark:text-white"
            style={{ fontSize: 'calc(1.5rem * var(--ui-scale, 1))' }}
          >
            {t('performance.title')}
          </h2>
          {/* Switch Travel Distance Component */}
          <MaxTravelDistanceControl
            maxTravelDistance={maxTravelDistance}
            onMaxTravelChange={setMaxTravelDistance}
            onClampValues={maxDistance => {
              updateSettings(current => clampToMaxTravel(current, maxDistance));
            }}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-5 py-2 text-sm rounded-full mr-1 transition-all duration-200 text-white font-medium shadow-sm hover:shadow-md glassmorphism-button"
            style={{ backgroundColor: 'var(--theme-color-primary)' }}
            // eslint-disable-next-line jsx-a11y/mouse-events-have-key-events -- hover-only tint, as in Svelte (a11y_mouse_events_have_key_events ignored there)
            onMouseOver={event => {
              event.currentTarget.style.backgroundColor = SELECT_ALL_HOVER_COLOR;
            }}
            // eslint-disable-next-line jsx-a11y/mouse-events-have-key-events -- see onMouseOver
            onMouseOut={event => {
              event.currentTarget.style.backgroundColor = 'var(--theme-color-primary)';
            }}
            onClick={() => {
              keySelection.toggleSelectAll();
            }}
          >
            {t('performance.selectAllKeys')}
          </button>
          <button
            type="button"
            className="bg-gray-200 hover:bg-gray-300 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white dark:border dark:border-white/20 px-5 py-2 text-sm rounded-full transition-all duration-200 font-medium shadow-sm hover:shadow-md glassmorphism-button"
            onClick={() => {
              keySelection.deselectAll();
            }}
          >
            {t('performance.discardSelection')}
          </button>
        </div>
      </div>
      <div
        className="rounded-xl shadow flex flex-col md:flex-row flex-1 glassmorphism-card"
        style={{
          padding: 'calc(1.25rem * var(--ui-scale, 1))',
          gap: 'calc(1.25rem * var(--ui-scale, 1))',
        }}
      >
        {/* 1st Box: Actuation Point (with slide-out animation) */}
        <div
          className={cx(
            styles['actuation-point-container'],
            rapidTriggerEnabled && styles['slide-out']
          )}
        >
          <ActuationPointControl
            actuationPoint={settings.actuationPoint}
            deactivationPoint={settings.deactivationPoint}
            keysSelected={keysSelected}
            maxTravelDistance={maxTravelDistance}
            onActuationChange={value => {
              updateSettings(current => ({ ...current, actuationPoint: value }));
            }}
            onDeactivationChange={value => {
              updateSettings(current => ({ ...current, deactivationPoint: value }));
            }}
          />
        </div>

        {/* Divider for desktop (with animation) */}
        <div
          className={cx(styles['divider-container'], rapidTriggerEnabled && styles['slide-out'])}
        >
          <div className="hidden md:block w-px bg-gray-200 dark:bg-white mx-2"></div>
        </div>

        {/* 2nd Box: Rapid Trigger Toggle */}
        <div className="flex-1 min-w-[260px] flex flex-col">
          <RapidTriggerToggle
            rapidTriggerEnabled={rapidTriggerEnabled}
            onToggle={value => {
              updateSettings(current => ({ ...current, rapidTriggerEnabled: value }));
            }}
          />
          <div className="flex-1">
            {rapidTriggerEnabled && (
              <div className={styles['rapid-trigger-content']}>
                <DeadzoneControl
                  upperDeadzone={settings.upperDeadzone}
                  lowerDeadzone={settings.lowerDeadzone}
                  maxTravelDistance={maxTravelDistance}
                  onUpperChange={value => {
                    updateSettings(current => ({ ...current, upperDeadzone: value }));
                  }}
                  onLowerChange={value => {
                    updateSettings(current => ({ ...current, lowerDeadzone: value }));
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Divider for desktop */}
        {rapidTriggerEnabled && (
          <div className="hidden md:block w-px bg-gray-200 dark:bg-white mx-2"></div>
        )}

        {/* 3rd Box: Sensitivity Slider & Toggle (only shown when Rapid Trigger is enabled) */}
        {rapidTriggerEnabled && (
          <div className={cx('flex-1 min-w-[260px]', styles['rapid-trigger-content'])}>
            <SensitivityControl
              separateSensitivity={settings.separateSensitivity}
              sensitivityValue={settings.sensitivityValue}
              pressSensitivity={settings.pressSensitivity}
              releaseSensitivity={settings.releaseSensitivity}
              onToggleSeparate={value => {
                updateSettings(current => ({ ...current, separateSensitivity: value }));
              }}
              onSensitivityChange={value => {
                updateSettings(current => ({ ...current, sensitivityValue: value }));
              }}
              onPressChange={value => {
                updateSettings(current => ({ ...current, pressSensitivity: value }));
              }}
              onReleaseChange={value => {
                updateSettings(current => ({ ...current, releaseSensitivity: value }));
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
