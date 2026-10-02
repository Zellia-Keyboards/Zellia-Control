import { useId } from 'react';
import { ThemedSlider } from '../../../components/ui';
import { useT } from '../../../lib/i18n';
import type { RgbBaseConfig } from '../../device';
import { hexToRgb, rgbToHex } from '../model';
import { DirectionSelector } from './DirectionSelector';
import { BASE_MODES, modeOption } from './modes';
import { PANEL_HEADER_STYLE } from './panel-header';
import styles from './RGBPanel.module.css';

export interface RGBPanelProps {
  /** The app's copy of the base lighting, staged until Save (PL-047). */
  config: RgbBaseConfig;
  /** Called with the changed field on every input. */
  onEdit: (patch: Partial<RgbBaseConfig>) => void;
  title?: string;
}

const COLOR_INPUT_CLASS =
  'w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 p-0 cursor-pointer overflow-hidden transition-colors hover:border-primary/50';

/** The keyboard-wide lighting settings (port of RGBPanel.svelte, edited in place: PL-047). */
export function RGBPanel({ config, onEdit, title }: RGBPanelProps) {
  const t = useT();
  const titleId = useId();
  const color = rgbToHex(config.color);
  const subColor = rgbToHex(config.secondaryColor);
  const pressed = modeOption(BASE_MODES, config.mode);

  return (
    <div
      className="rounded-2xl shadow bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col glassmorphism-card overflow-hidden"
      role="region"
      aria-labelledby={titleId}
    >
      {/* Header */}
      <div
        className="px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"
        style={PANEL_HEADER_STYLE}
      >
        <h3
          id={titleId}
          className="font-bold text-black dark:text-white"
          style={{ fontSize: 'calc(1.1rem * var(--ui-scale, 1))' }}
        >
          {title || t('lighting.baseConfigTitle')}
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Mode & Color Section */}
        <div
          className="border-b border-gray-200 dark:border-gray-700"
          style={{ padding: 'calc(1rem * var(--ui-scale, 1))' }}
        >
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {`${t('lighting.mode')} & ${t('lighting.color')}`}
          </h4>

          {/* Mode buttons */}
          <div className="grid grid-cols-4 gap-2 mb-2">
            {BASE_MODES.map(mode => {
              const isSelected = config.mode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={isSelected}
                  title={t(mode.description)}
                  className={`px-3 py-2 min-h-[38px] rounded-lg border text-center transition-all duration-200 relative overflow-hidden ${
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

          {/* Mode explanation (PL-049) */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {pressed ? t(pressed.description) : null}
          </p>

          {/* Color pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs text-gray-600 dark:text-gray-300 mb-2"
                style={{ marginBottom: 'calc(0.5rem * var(--ui-scale, 1))' }}
              >
                {`${t('lighting.color')} `}
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
                    value={color}
                    onChange={event => {
                      onEdit({ color: hexToRgb(event.currentTarget.value) });
                    }}
                    className={`${COLOR_INPUT_CLASS} ${styles['color-input'] ?? ''}`}
                  />
                  <span className="text-sm font-mono text-gray-700 dark:text-gray-300 uppercase">
                    {color}
                  </span>
                </div>
              </label>
            </div>
            <div>
              <label
                className="block text-xs text-gray-600 dark:text-gray-300 mb-2"
                style={{ marginBottom: 'calc(0.5rem * var(--ui-scale, 1))' }}
              >
                {`${t('lighting.secondaryColor')} `}
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
                    value={subColor}
                    onChange={event => {
                      onEdit({ secondaryColor: hexToRgb(event.currentTarget.value) });
                    }}
                    className={`${COLOR_INPUT_CLASS} ${styles['color-input'] ?? ''}`}
                  />
                  <span className="text-sm font-mono text-gray-700 dark:text-gray-300 uppercase">
                    {subColor}
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
              <span className="font-semibold">{`${config.speed}%`}</span>
            </div>
            <ThemedSlider
              min={1}
              max={100}
              value={config.speed}
              onChange={event => {
                onEdit({ speed: Math.round(Number(event.currentTarget.value)) });
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
                direction={config.direction}
                onDirectionChange={direction => {
                  // Whole degrees, as the keyboard stores them.
                  onEdit({ direction: Math.trunc(direction) });
                }}
                ariaLabel={t('lighting.direction')}
              />
            </div>

            {/* Density */}
            <div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
                <span>{t('lighting.density')}</span>
                <span className="font-semibold">{config.density}</span>
              </div>
              <ThemedSlider
                min={0}
                max={255}
                value={config.density}
                onChange={event => {
                  onEdit({ density: Number(event.currentTarget.value) });
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
            <span className="font-semibold">{config.brightness}</span>
          </div>
          <ThemedSlider
            min={0}
            max={255}
            value={config.brightness}
            onChange={event => {
              onEdit({ brightness: Number(event.currentTarget.value) });
            }}
            aria-label={t('lighting.brightness')}
          />
        </div>
      </div>
    </div>
  );
}
