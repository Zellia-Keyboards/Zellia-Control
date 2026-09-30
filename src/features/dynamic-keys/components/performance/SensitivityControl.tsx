/**
 * Port of `components/performance/SensitivityControl.svelte` for the null-bind performance tab
 * (props as in Svelte, values in mm). The Performance page owns its own port.
 */
import { ThemedSlider, Toggle } from '../../../../components/ui';
import { useT } from '../../../../lib/i18n';

export interface SensitivityControlProps {
  readonly separateSensitivity: boolean;
  readonly sensitivityValue: number;
  readonly pressSensitivity: number;
  readonly releaseSensitivity: number;
  readonly onToggleSeparate: (value: boolean) => void;
  readonly onSensitivityChange: (value: number) => void;
  readonly onPressChange: (value: number) => void;
  readonly onReleaseChange: (value: number) => void;
}

export function SensitivityControl({
  separateSensitivity,
  sensitivityValue,
  pressSensitivity,
  releaseSensitivity,
  onToggleSeparate,
  onSensitivityChange,
  onPressChange,
  onReleaseChange,
}: SensitivityControlProps) {
  const t = useT();
  return (
    <div className="flex-1 min-w-[260px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('performance.rapidTriggerSensitivity')}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Separate Press/Release</span>
          <Toggle
            checked={separateSensitivity}
            onToggle={value => {
              onToggleSeparate(value);
            }}
            ariaLabel="Separate Sensitivity Toggle"
          />
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
        {t('performance.adjustSensitivity')}
      </p>
      <div className="flex-1">
        {separateSensitivity ? (
          <>
            <div className="mb-4">
              <div className="flex justify-between text-sm dark:text-gray-400 text-gray-500 mb-1">
                <div>↓ {t('performance.pressSensitivityLabel')}</div>
                <div>{pressSensitivity.toFixed(2)} mm</div>
              </div>
              <ThemedSlider
                aria-label={t('performance.pressSensitivityLabel')}
                min={0.01}
                max={2}
                step={0.01}
                value={pressSensitivity}
                onChange={event => {
                  onPressChange(Number(event.currentTarget.value));
                }}
              />
              <div className="flex justify-between text-sm dark:text-gray-400 text-gray-500 mt-1">
                <div>{t('performance.high')}</div>
                <div>{t('performance.low')}</div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm dark:text-gray-400 text-gray-500 mb-1">
                <div>↑ {t('performance.releaseSensitivityLabel')}</div>
                <div>{releaseSensitivity.toFixed(2)} mm</div>
              </div>
              <ThemedSlider
                aria-label={t('performance.releaseSensitivityLabel')}
                min={0.01}
                max={2}
                step={0.01}
                value={releaseSensitivity}
                onChange={event => {
                  onReleaseChange(Number(event.currentTarget.value));
                }}
              />
              <div className="flex justify-between text-sm dark:text-gray-400 text-gray-500 mt-1">
                <div>{t('performance.high')}</div>
                <div>{t('performance.low')}</div>
              </div>
            </div>
          </>
        ) : (
          <div>
            <div className="flex justify-between text-sm dark:text-gray-400 text-gray-500 mb-1">
              <div>⇅ {t('performance.sensitivityLabel')}</div>
              <div>{sensitivityValue.toFixed(2)} mm</div>
            </div>
            <ThemedSlider
              aria-label={t('performance.sensitivityLabel')}
              min={0.01}
              max={2}
              step={0.01}
              value={sensitivityValue}
              onChange={event => {
                onSensitivityChange(Number(event.currentTarget.value));
              }}
            />
            <div className="flex justify-between text-sm dark:text-gray-400 text-gray-500 mt-1">
              <div>{t('performance.high')}</div>
              <div>{t('performance.low')}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
