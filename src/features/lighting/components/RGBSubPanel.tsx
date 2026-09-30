import { RGBMode } from 'emi-keyboard-controller';
import { useId, useState } from 'react';
import { ThemedSlider } from '../../../components/ui';
import { useT, type TranslationKey } from '../../../lib/i18n';
import type { RgbKeyConfig } from '../../device';
import type { LayoutKey } from '../../keyboard/model';
import { hexToRgb, rainbowColors, rgbToHex } from '../model';
import { DirectionSelector } from './DirectionSelector';
import styles from './RGBSubPanel.module.css';

export interface KeyConfigEntry {
  readonly keyId: number;
  readonly config: RgbKeyConfig;
}

export interface RGBSubPanelProps {
  config: RgbKeyConfig;
  /** Apply: one configuration for the keys the page picks (selected, or all). */
  onConfigChange: (config: RgbKeyConfig) => void;
  /** Rainbow preset: a configuration per key. */
  onKeyConfigsChange: (entries: readonly KeyConfigEntry[]) => void;
  /** Keys the rainbow preset colours, with their layout geometry. */
  keyboardKeys?: readonly LayoutKey[];
  /** The keyboard's per-key configurations (keys without one are not coloured). */
  rgbConfigs?: readonly RgbKeyConfig[];
  title?: string;
}

// Mode options
const MODES = [
  { value: RGBMode.RgbModeFixed, label: 'rgb_mode_fixed' },
  { value: RGBMode.RgbModeStatic, label: 'rgb_mode_static' },
  { value: RGBMode.RgbModeCycle, label: 'rgb_mode_cycle' },
  { value: RGBMode.RgbModeLinear, label: 'rgb_mode_linear' },
  { value: RGBMode.RgbModeTrigger, label: 'rgb_mode_trigger' },
  { value: RGBMode.RgbModeString, label: 'rgb_mode_string' },
  { value: RGBMode.RgbModeFadingString, label: 'rgb_mode_fading_string' },
  { value: RGBMode.RgbModeDiamondRipple, label: 'rgb_mode_diamond_ripple' },
  { value: RGBMode.RgbModeFadingDiamondRipple, label: 'rgb_mode_fading_diamond_ripple' },
  { value: RGBMode.RgbModeJelly, label: 'rgb_mode_jelly' },
  { value: RGBMode.RgbModeBubble, label: 'rgb_mode_bubble' },
] as const satisfies readonly { value: RGBMode; label: TranslationKey }[];

const NO_KEYS: readonly LayoutKey[] = [];
const NO_CONFIGS: readonly RgbKeyConfig[] = [];

/** Per-key lighting settings and the rainbow preset (port of RGBSubPanel.svelte). */
export function RGBSubPanel({
  config,
  onConfigChange,
  onKeyConfigsChange,
  keyboardKeys = NO_KEYS,
  rgbConfigs = NO_CONFIGS,
  title,
}: RGBSubPanelProps) {
  const t = useT();
  const titleId = useId();

  // Mode: initialized from the configuration, never synced back from it, so a click shows at once.
  const [selectedMode, setSelectedMode] = useState(config.mode);

  // Local state for deferred apply, re-read whenever the configuration changes (the Svelte
  // `$effect`).
  const [localColor, setLocalColor] = useState(() => rgbToHex(config.color));
  const [localSpeed, setLocalSpeed] = useState(config.speed);
  const [localSource, setLocalSource] = useState(config);
  if (localSource !== config) {
    setLocalSource(config);
    setLocalColor(rgbToHex(config.color));
    setLocalSpeed(config.speed);
  }

  // Local state for rainbow preset (not part of base config)
  const [showRainbowPreset, setShowRainbowPreset] = useState(false);
  const [rainbowDirection, setRainbowDirection] = useState(0);
  const [rainbowDensity, setRainbowDensity] = useState(10);

  const speed = () => (Number.isNaN(localSpeed) ? 0 : Math.round(localSpeed));

  // Apply all changes at once
  function applyChanges() {
    onConfigChange({ mode: selectedMode, speed: speed(), color: hexToRgb(localColor) });
  }

  // Colour every key from its position in the layout (upstream formula, D11)
  function applyRainbowEffect() {
    if (!keyboardKeys.length || !rgbConfigs.length) return;
    const colors = rainbowColors(keyboardKeys, localColor, rainbowDirection, rainbowDensity);
    onKeyConfigsChange(
      [...colors]
        .filter(([keyId]) => keyId < rgbConfigs.length)
        .map(([keyId, color]) => ({ keyId, config: { mode: selectedMode, speed: speed(), color } }))
    );
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
          {title || t('lighting.subConfigTitle')}
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
      <div
        className="flex-1 overflow-y-auto p-4"
        style={{ padding: 'calc(1rem * var(--ui-scale, 1))' }}
      >
        {/* Mode Section */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('lighting.mode')}
          </h4>
          {/* Mode buttons in 2 rows */}
          <div className="grid grid-cols-6 gap-2">
            {MODES.map(mode => {
              const isSelected = selectedMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={isSelected}
                  className={`h-12 min-h-[48px] rounded-lg border text-center transition-all duration-200 px-2 flex items-center justify-center ${
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
        </div>

        {/* Color Section */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('lighting.color')}
          </h4>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={localColor}
              onChange={event => {
                setLocalColor(event.currentTarget.value);
              }}
              className={`w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 p-0 cursor-pointer overflow-hidden transition-colors hover:border-primary/50 ${styles['color-input'] ?? ''}`}
              aria-label={t('lighting.color')}
            />
            <span className="text-sm font-mono text-gray-700 dark:text-gray-300 uppercase">
              {localColor}
            </span>
          </div>
        </div>

        {/* Speed Section */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('lighting.speed')}
          </h4>
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
            <span>{t('lighting.speed')}</span>
            <span className="font-semibold">{localSpeed}%</span>
          </div>
          <ThemedSlider
            min={1}
            max={100}
            value={localSpeed}
            onChange={event => {
              setLocalSpeed(Number(event.currentTarget.value));
            }}
            aria-label={t('lighting.speed')}
          />
        </div>

        {/* Rainbow Preset Collapsible Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <button
            type="button"
            aria-expanded={showRainbowPreset}
            onClick={() => {
              setShowRainbowPreset(!showRainbowPreset);
            }}
            className="w-full flex items-center justify-between text-left mb-3"
          >
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('lighting.rainbowPreset')}
            </h4>
            <span
              aria-hidden="true"
              className={`text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                showRainbowPreset ? 'rotate-180' : ''
              }`}
            >
              ▼
            </span>
          </button>

          {showRainbowPreset && (
            <div className="space-y-4">
              {/* Direction */}
              <div>
                <span className="block text-xs text-gray-600 dark:text-gray-300 mb-2">
                  {t('lighting.rainbowDirection')}
                </span>
                <DirectionSelector
                  direction={rainbowDirection}
                  onDirectionChange={setRainbowDirection}
                  ariaLabel={t('lighting.rainbowDirection')}
                />
              </div>

              {/* Density */}
              <div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
                  <span>{t('lighting.rainbowDensity')}</span>
                  <span className="font-semibold">{rainbowDensity}</span>
                </div>
                <ThemedSlider
                  min={0}
                  max={255}
                  value={rainbowDensity}
                  onChange={event => {
                    setRainbowDensity(Number(event.currentTarget.value));
                  }}
                  aria-label={t('lighting.rainbowDensity')}
                />
              </div>

              {/* Apply Rainbow Button */}
              <button
                type="button"
                onClick={applyRainbowEffect}
                className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-medium text-sm hover:border-primary/50 transition-colors glassmorphism-button"
              >
                {t('lighting.applySettings')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
