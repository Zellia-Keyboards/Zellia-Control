/**
 * Tap-hold editor parts (ports of `advancedkey/tap-hold/*.svelte`): header, selected key, timing,
 * preview and "how it works" panel. The configured list is in `TapHoldConfiguredKeys`.
 */
import { ThemedSlider } from '../../../../components/ui';
import type { Keycode } from '../../../device';
import { useT } from '../../../../lib/i18n';
import { actionName } from '../../model/key-names';
import { EditorHeader } from '../shared/EditorHeader';

/** Port of `TapHoldHeader.svelte`. */
interface TapHoldHeaderProps {
  readonly currentSelectedIndex: number | null;
  readonly onBack: () => void;
  readonly onApply: () => void;
  readonly onResetAll: () => void;
}

export function TapHoldHeader({
  currentSelectedIndex,
  onBack,
  onApply,
  onResetAll,
}: TapHoldHeaderProps) {
  const t = useT();
  return (
    <EditorHeader
      titleKey="advancedkey.tapHoldTitle"
      subtitleKey="advancedkey.tapHoldSubtitle"
      onBack={onBack}
    >
      {/* Glassmorphism is always on, so the Svelte class chose `glassmorphism-button`. */}
      <button
        type="button"
        className="px-4 py-2 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 glassmorphism-button"
        onClick={onApply}
        disabled={currentSelectedIndex === null}
      >
        {t('advancedkey.applyConfiguration')}
      </button>
      <button
        type="button"
        className="px-4 py-2 glassmorphism-button bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-md transition-colors text-sm font-medium"
        onClick={onResetAll}
      >
        {t('advancedkey.resetAllTapHold')}
      </button>
    </EditorHeader>
  );
}

/** Port of `TapHoldSelectedKeyInfo.svelte`. */
interface TapHoldSelectedKeyInfoProps {
  readonly currentKeyName: string;
  readonly currentSelectedIndex: number;
}

export function TapHoldSelectedKeyInfo({
  currentKeyName,
  currentSelectedIndex,
}: TapHoldSelectedKeyInfoProps) {
  const t = useT();
  return (
    <div className="rounded-lg border p-4 sm:p-6 mb-6 glassmorphism-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center border-2 glassmorphism-button">
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {currentKeyName}
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {t('advancedkey.selectedKey')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {`Key Index: ${currentSelectedIndex}`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {`${t('advancedkey.mode')}:`}
          </span>
          <span className="px-3 py-1 rounded-full text-sm font-medium text-white glassmorphism-button">
            {t('advancedkey.tapHold')}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Port of `TapHoldTimingConfig.svelte`. The Svelte slider bindings never propagated (its
 * `ThemedSlider` does not write `value` back), so the labels did not follow the sliders.
 */
interface TapHoldTimingConfigProps {
  readonly holdDelay: number;
  readonly tapTimeout: number;
  readonly onHoldDelayChange: (value: number) => void;
  readonly onTapTimeoutChange: (value: number) => void;
}

export function TapHoldTimingConfig({
  holdDelay,
  tapTimeout,
  onHoldDelayChange,
  onTapTimeoutChange,
}: TapHoldTimingConfigProps) {
  const t = useT();
  return (
    <div className="rounded-lg border p-4 sm:p-6 glassmorphism-card">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {`${t('advancedkey.tapAction')} & ${t('advancedkey.holdAction')} ${t('advancedkey.actionCategories')}`}
      </h3>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor="hold-delay-slider"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Hold Delay
            </label>
            <span className="text-sm text-gray-500 dark:text-gray-400">{`${holdDelay}ms`}</span>
          </div>
          <ThemedSlider
            id="hold-delay-slider"
            min={100}
            max={1000}
            step={50}
            value={holdDelay}
            onChange={event => {
              onHoldDelayChange(Number(event.currentTarget.value));
            }}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Time before hold action triggers
          </p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor="tap-timeout-slider"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Tap Timeout
            </label>
            <span className="text-sm text-gray-500 dark:text-gray-400">{`${tapTimeout}ms`}</span>
          </div>
          <ThemedSlider
            id="tap-timeout-slider"
            min={50}
            max={500}
            step={25}
            value={tapTimeout}
            onChange={event => {
              onTapTimeoutChange(Number(event.currentTarget.value));
            }}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Maximum time for a tap to register
          </p>
        </div>
      </div>
    </div>
  );
}

/** Port of `TapHoldPreview.svelte`. */
interface TapHoldPreviewProps {
  readonly currentKeyName: string;
  readonly tapAction: Keycode;
  readonly holdAction: Keycode;
  readonly holdDelay: number;
}

export function TapHoldPreview({
  currentKeyName,
  tapAction,
  holdAction,
  holdDelay,
}: TapHoldPreviewProps) {
  return (
    <div className="rounded-lg border p-4 sm:p-6 glassmorphism-card">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Preview</h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-gray-100 dark:border-gray-700 border-b">
          <span className="text-sm text-gray-600 dark:text-gray-400">Key</span>
          <span className="font-mono font-medium text-gray-900 dark:text-white">
            {currentKeyName}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-gray-100 dark:border-gray-700 border-b">
          <span className="text-sm text-gray-600 dark:text-gray-400">Tap</span>
          <span className="font-medium text-primary-500">{actionName(tapAction)}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-gray-100 dark:border-gray-700 border-b">
          <span className="text-sm text-gray-600 dark:text-gray-400">Hold</span>
          <span className="font-medium text-green-500">{actionName(holdAction)}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Delay</span>
          <span className="font-medium text-gray-900 dark:text-white">{`${holdDelay}ms`}</span>
        </div>
      </div>
    </div>
  );
}

/** Port of `TapHoldInfoPanel.svelte`. */
interface TapHoldInfoPanelProps {
  readonly tapAction: Keycode;
  readonly holdAction: Keycode;
  readonly tapTimeout: number;
  readonly holdDelay: number;
}

export function TapHoldInfoPanel({
  tapAction,
  holdAction,
  tapTimeout,
  holdDelay,
}: TapHoldInfoPanelProps) {
  const t = useT();
  return (
    <div className="border rounded-lg p-4 sm:p-6 glassmorphism-card">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {t('advancedkey.howItWorks')}
      </h3>
      <div className="text-sm text-gray-800 dark:text-gray-300 space-y-2">
        <p>
          {`• ${t('advancedkey.quickTap', tapTimeout.toString())}: `}
          <strong>{actionName(tapAction)}</strong>
        </p>
        <p>
          {`• ${t('advancedkey.holdOver', holdDelay.toString())}: `}
          <strong>{actionName(holdAction)}</strong>
        </p>
        <p className="mt-3 text-xs">{t('advancedkey.tapHoldDescription')}</p>
      </div>
    </div>
  );
}
