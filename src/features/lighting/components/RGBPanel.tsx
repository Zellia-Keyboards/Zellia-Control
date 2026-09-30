import { RGBBaseMode } from 'emi-keyboard-controller';
import { useId, useState } from 'react';
import { ThemedSlider } from '../../../components/ui';
import { useT, type TranslationKey } from '../../../lib/i18n';
import type { RgbBaseConfig } from '../../device';
import { hexToRgb, rgbToHex } from '../model';
import { DirectionSelector } from './DirectionSelector';
import styles from './RGBPanel.module.css';

export interface RGBPanelProps {
  baseConfig: RgbBaseConfig;
  onConfigChange: (config: RgbBaseConfig) => void;
  title?: string;
}

// Base mode options
const BASE_MODES = [
  { value: RGBBaseMode.RgbBaseModeOff, label: 'rgb_base_mode_off' },
  { value: RGBBaseMode.RgbBaseModeBlank, label: 'rgb_base_mode_blank' },
  { value: RGBBaseMode.RgbBaseModeRainbow, label: 'rgb_base_mode_rainbow' },
  { value: RGBBaseMode.RgbBaseModeWave, label: 'rgb_base_mode_wave' },
] as const satisfies readonly { value: RGBBaseMode; label: TranslationKey }[];

/** Edits waiting for Apply ("local state for deferred apply"). */
interface BaseDraft {
  readonly color: string;
  readonly subColor: string;
  /** Integer device value, shown as `{n}%` (D11). */
  readonly speed: number;
  readonly direction: number;
  readonly density: number;
  readonly brightness: number;
}

function draftFrom(config: RgbBaseConfig): BaseDraft {
  return {
    color: rgbToHex(config.color),
    subColor: rgbToHex(config.secondaryColor),
    speed: config.speed,
    direction: config.direction,
    density: config.density,
    brightness: config.brightness,
  };
}

const COLOR_INPUT_CLASS =
  'w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 p-0 cursor-pointer overflow-hidden transition-colors hover:border-primary/50';

/** The keyboard-wide lighting settings (port of RGBPanel.svelte). */
export function RGBPanel({ baseConfig, onConfigChange, title }: RGBPanelProps) {
  const t = useT();
  const titleId = useId();

  // Mode: initialized from the configuration, never synced back from it, so a click shows at once.
  const [selectedMode, setSelectedMode] = useState(baseConfig.mode);
  const [draft, setDraft] = useState(() => draftFrom(baseConfig));
  // Re-read the other fields whenever the configuration changes (the Svelte `$effect`).
  const [draftSource, setDraftSource] = useState(baseConfig);
  if (draftSource !== baseConfig) {
    setDraftSource(baseConfig);
    setDraft(draftFrom(baseConfig));
  }

  const edit = (patch: Partial<BaseDraft>) => {
    setDraft(current => ({ ...current, ...patch }));
  };

  // Apply all changes at once
  function applyChanges() {
    onConfigChange({
      mode: selectedMode,
      speed: Number.isNaN(draft.speed) ? 0 : Math.round(draft.speed),
      // Whole degrees, as the keyboard stores them (a typed fraction was truncated on the wire).
      direction: Math.trunc(draft.direction),
      density: draft.density,
      brightness: draft.brightness,
      color: hexToRgb(draft.color),
      secondaryColor: hexToRgb(draft.subColor),
    });
  }

  return (
    <div
      className="rounded-2xl shadow bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col glassmorphism-card overflow-hidden"
      role="region"
      aria-labelledby={titleId}
    >
      {/* Header with Apply button */}
      <div
        className="px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"
        style={{ padding: 'calc(1.25rem * var(--ui-scale, 1))' }}
      >
        <h3
          id={titleId}
          className="font-bold text-black dark:text-white"
          style={{ fontSize: 'calc(1.1rem * var(--ui-scale, 1))' }}
        >
          {title || t('lighting.baseConfigTitle')}
        </h3>
        <button
          type="button"
          onClick={applyChanges}
          className="px-4 py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors glassmorphism-button"
        >
          {t('lighting.apply')}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Mode & Color Section */}
        <div
          className="border-b border-gray-200 dark:border-gray-700"
          style={{ padding: 'calc(1rem * var(--ui-scale, 1))' }}
        >
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('lighting.mode')} &amp; {t('lighting.color')}
          </h4>

          {/* Mode buttons */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {BASE_MODES.map(mode => {
              const isSelected = selectedMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={isSelected}
                  className={`px-3 py-2 min-h-[38px] rounded-lg border text-center transition-all duration-200 relative overflow-hidden ${
                    isSelected
                      ? 'border-primary bg-primary/20 dark:bg-primary/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary/50 glassmorphism-button'
                  }`}
                  onClick={() => {
                    setSelectedMode(mode.value);
                  }}
                >
                  <div
                    className={`text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis ${
                      isSelected
                        ? 'text-primary-700 dark:text-primary-200'
                        : 'text-black dark:text-white'
                    }`}
                  >
                    {t(mode.label)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Color pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs text-gray-600 dark:text-gray-300 mb-2"
                style={{ marginBottom: 'calc(0.5rem * var(--ui-scale, 1))' }}
              >
                {t('lighting.color')}
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
                    value={draft.color}
                    onChange={event => {
                      edit({ color: event.currentTarget.value });
                    }}
                    className={`${COLOR_INPUT_CLASS} ${styles['color-input'] ?? ''}`}
                  />
                  <span className="text-sm font-mono text-gray-700 dark:text-gray-300 uppercase">
                    {draft.color}
                  </span>
                </div>
              </label>
            </div>
            <div>
              <label
                className="block text-xs text-gray-600 dark:text-gray-300 mb-2"
                style={{ marginBottom: 'calc(0.5rem * var(--ui-scale, 1))' }}
              >
                {t('lighting.secondaryColor')}
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
                    value={draft.subColor}
                    onChange={event => {
                      edit({ subColor: event.currentTarget.value });
                    }}
                    className={`${COLOR_INPUT_CLASS} ${styles['color-input'] ?? ''}`}
                  />
                  <span className="text-sm font-mono text-gray-700 dark:text-gray-300 uppercase">
                    {draft.subColor}
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Animation Section */}
        <div
          className="border-b border-gray-200 dark:border-gray-700"
          style={{ padding: 'calc(1rem * var(--ui-scale, 1))' }}
        >
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('lighting.animation') || 'Animation'}
          </h4>

          {/* Speed slider */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
              <span>{t('lighting.speed')}</span>
              <span className="font-semibold">{draft.speed}%</span>
            </div>
            <ThemedSlider
              min={1}
              max={100}
              value={draft.speed}
              onChange={event => {
                edit({ speed: Number(event.currentTarget.value) });
              }}
              aria-label={t('lighting.speed')}
            />
          </div>

          {/* Direction and Density */}
          <div className="grid grid-cols-2 gap-4">
            {/* Direction */}
            <div>
              <span className="block text-xs text-gray-600 dark:text-gray-300 mb-1.5">
                {t('lighting.direction')}
              </span>
              <DirectionSelector
                direction={draft.direction}
                onDirectionChange={direction => {
                  edit({ direction });
                }}
                ariaLabel={t('lighting.direction')}
              />
            </div>

            {/* Density */}
            <div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
                <span>{t('lighting.density')}</span>
                <span className="font-semibold">{draft.density}</span>
              </div>
              <ThemedSlider
                min={0}
                max={255}
                value={draft.density}
                onChange={event => {
                  edit({ density: Number(event.currentTarget.value) });
                }}
                aria-label={t('lighting.density')}
              />
            </div>
          </div>
        </div>

        {/* Brightness Section */}
        <div style={{ padding: 'calc(1rem * var(--ui-scale, 1))' }}>
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('lighting.brightness')}
          </h4>

          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
            <span>{t('lighting.level') || 'Level'}</span>
            <span className="font-semibold">{draft.brightness}</span>
          </div>
          <ThemedSlider
            min={0}
            max={255}
            value={draft.brightness}
            onChange={event => {
              edit({ brightness: Number(event.currentTarget.value) });
            }}
            aria-label={t('lighting.brightness')}
          />
        </div>
      </div>
    </div>
  );
}
