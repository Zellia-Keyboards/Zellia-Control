import { useId, useState } from 'react';
import { ThemedSlider } from '../../../components/ui';
import { useT } from '../../../lib/i18n';
import type { RgbKeyConfig } from '../../device';
import { MIXED, hexToRgb, rgbToHex, type SharedKeyValues } from '../model';
import { DirectionSelector } from './DirectionSelector';
import { KEY_MODES, modeOption } from './modes';
import { PANEL_HEADER_STYLE } from './panel-header';
import styles from './RGBSubPanel.module.css';

export interface RGBSubPanelProps {
  /** The targets' shared values, `MIXED` where they differ (PL-048). */
  values: SharedKeyValues;
  /** How many keys an edit changes, or `'all'` while no key is selected. */
  targetCount: number | 'all';
  /** Called with the changed field on every input; the page applies it to every target. */
  onEdit: (patch: Partial<RgbKeyConfig>) => void;
  /** The rainbow preset: colours the targets from `referenceHex` along `direction` (D11). */
  onRainbow: (referenceHex: string, direction: number, density: number) => void;
  title?: string;
}

/**
 * Per-key lighting of the selected keys (all keys while none is selected) and the rainbow preset
 * (port of RGBSubPanel.svelte, edited in place: PL-047, PL-048).
 */
export function RGBSubPanel({ values, targetCount, onEdit, onRainbow, title }: RGBSubPanelProps) {
  const t = useT();
  const titleId = useId();

  // Local state for rainbow preset (not part of base config)
  const [showRainbowPreset, setShowRainbowPreset] = useState(false);
  const [rainbowDirection, setRainbowDirection] = useState(0);
  const [rainbowDensity, setRainbowDensity] = useState(10);

  // Where a field is mixed, its control shows the first target's value.
  const color = rgbToHex(values.color === MIXED ? values.first.color : values.color);
  const speed = values.speed === MIXED ? values.first.speed : values.speed;
  const pressed = values.mode === MIXED ? undefined : modeOption(KEY_MODES, values.mode);

  let targets: string;
  if (targetCount === 'all') targets = t('lighting.allKeys');
  else if (targetCount === 1) targets = t('lighting.oneKey');
  else targets = t('lighting.keyCount', String(targetCount));

  let modeText: string | null = null;
  if (values.mode === MIXED) modeText = t('lighting.mixedModes');
  else if (pressed) modeText = t(pressed.description);

  return (
    <div
      className="rounded-2xl shadow bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col glassmorphism-card overflow-hidden"
      role="region"
      aria-labelledby={titleId}
    >
      {/* Header with the keys the edits change */}
      <div
        className="px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"
        style={PANEL_HEADER_STYLE}
      >
        <h3
          id={titleId}
          className="font-bold text-black dark:text-white"
          style={{ fontSize: 'calc(1.1rem * var(--ui-scale, 1))' }}
        >
          {title || t('lighting.subConfigTitle')}
        </h3>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{targets}</span>
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
            {KEY_MODES.map(mode => {
              const isSelected = values.mode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={isSelected}
                  title={t(mode.description)}
                  className={`h-12 min-h-[48px] rounded-lg border text-center transition-all duration-200 px-2 flex items-center justify-center ${
                    isSelected
                      ? 'border-primary bg-primary/20 dark:bg-primary/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary/50 glassmorphism-button'
                  }`}
                  onClick={() => {
                    onEdit({ mode: mode.value });
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
          {/* Mode explanation, or the mixed modes (PL-048, PL-049) */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{modeText}</p>
        </div>

        {/* Color Section */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('lighting.color')}
          </h4>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={event => {
                onEdit({ color: hexToRgb(event.currentTarget.value) });
              }}
              className={`w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 p-0 cursor-pointer overflow-hidden transition-colors hover:border-primary/50 ${styles['color-input'] ?? ''}`}
              aria-label={t('lighting.color')}
            />
            <span
              className={`text-sm text-gray-700 dark:text-gray-300 ${
                values.color === MIXED ? '' : 'font-mono uppercase'
              }`}
            >
              {values.color === MIXED ? t('lighting.mixed') : color}
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
            <span className="font-semibold">
              {values.speed === MIXED ? t('lighting.mixed') : `${speed}%`}
            </span>
          </div>
          <ThemedSlider
            min={1}
            max={100}
            value={speed}
            onChange={event => {
              onEdit({ speed: Math.round(Number(event.currentTarget.value)) });
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
                onClick={() => {
                  onRainbow(color, rainbowDirection, rainbowDensity);
                }}
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
