/**
 * Toggle editor parts (ports of `advancedkey/toggle/*.svelte`): header, selected key, trigger
 * mode, state switch, preview and "how it works" panel. The configured list is in
 * `ToggleConfiguredKeys`.
 */
import type { Keycode } from '../../../device';
import { useT, useTRich } from '../../../../lib/i18n';
import { actionName } from '../../model/key-names';
import type { ToggleTrigger } from '../../model/ui-fields';
import { EditorHeader } from '../shared/EditorHeader';

/** Port of `ToggleHeader.svelte`. */
interface ToggleHeaderProps {
  readonly onBack: () => void;
  readonly onApply: () => void;
  readonly onResetAll: () => void;
  readonly canApply: boolean;
}

export function ToggleHeader({ onBack, onApply, onResetAll, canApply }: ToggleHeaderProps) {
  const t = useT();
  return (
    <EditorHeader
      titleKey="advancedkey.toggleTitle"
      subtitleKey="advancedkey.toggleSubtitle"
      onBack={onBack}
    >
      <button
        type="button"
        className="px-4 py-2 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 bg-primary-600 hover:bg-primary-700 disabled:hover:bg-primary-600 glassmorphism-button"
        onClick={onApply}
        disabled={!canApply}
      >
        {t('advancedkey.applyConfiguration')}
      </button>
      <button
        type="button"
        className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-md transition-colors text-sm font-medium glassmorphism-button"
        onClick={onResetAll}
      >
        {t('advancedkey.resetAllToggle')}
      </button>
    </EditorHeader>
  );
}

/** Port of `ToggleSelectedKeyInfo.svelte`. */
interface ToggleSelectedKeyInfoProps {
  readonly currentKeyName: string;
  readonly currentSelectedIndex: number;
  readonly toggleState: boolean;
}

export function ToggleSelectedKeyInfo({
  currentKeyName,
  currentSelectedIndex,
  toggleState,
}: ToggleSelectedKeyInfoProps) {
  const t = useT();
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 sm:p-6 mb-6 bg-white dark:bg-gray-900 glassmorphism-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center border-2 border-primary-500 bg-primary-50 dark:bg-primary-900 glassmorphism-button">
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {currentKeyName}
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Selected Key</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Key Index: {currentSelectedIndex}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('advancedkey.toggleState')}:
          </span>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${toggleState ? 'bg-green-500' : 'bg-gray-400'}`}
            ></div>
            <span
              className={`text-sm font-medium ${
                toggleState ? 'text-green-700' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {toggleState ? t('advancedkey.enabled') : t('advancedkey.disabled')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Port of `ToggleModeSelector.svelte`. */
interface ToggleModeSelectorProps {
  readonly toggleMode: ToggleTrigger;
  readonly onModeSelect: (mode: ToggleTrigger) => void;
}

const TRIGGER_LABELS = {
  press: 'advancedkey.onPress',
  release: 'advancedkey.onRelease',
} as const;

export function ToggleModeSelector({ toggleMode, onModeSelect }: ToggleModeSelectorProps) {
  const t = useT();
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 sm:p-6 bg-white dark:bg-gray-900 glassmorphism-card">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {t('advancedkey.toggleMode')}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['press', 'release'] as const).map(mode => {
          const selected = toggleMode === mode;
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={selected}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selected
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900'
                  : 'border-gray-300 dark:border-gray-600 bg-transparent hover:border-gray-400 dark:hover:border-gray-500'
              } glassmorphism-button`}
              onClick={() => {
                onModeSelect(mode);
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    selected
                      ? 'border-primary-600 bg-primary-600'
                      : 'border-gray-400 dark:border-gray-500 bg-transparent'
                  }`}
                >
                  {selected && (
                    <div className="w-2 h-2 bg-white dark:bg-black rounded-full m-0.5"></div>
                  )}
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {t(TRIGGER_LABELS[mode])}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('advancedkey.toggleModeDesc')}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Port of `ToggleStateControl.svelte`. */
interface ToggleStateControlProps {
  readonly toggleState: boolean;
  readonly onStateToggle: () => void;
}

export function ToggleStateControl({ toggleState, onStateToggle }: ToggleStateControlProps) {
  const t = useT();
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 sm:p-6 bg-white dark:bg-gray-900 glassmorphism-card">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {t('advancedkey.toggleState')}
      </h3>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 glassmorphism-button">
        <div className="flex-1">
          <div className="font-medium text-gray-900 dark:text-white">
            {t('advancedkey.toggleState')}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('advancedkey.toggleStateDesc')}
          </div>
        </div>
        <div className="flex-shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={toggleState}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              toggleState ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
            } glassmorphism-button`}
            onClick={onStateToggle}
            aria-label={toggleState ? 'Set toggle state to inactive' : 'Set toggle state to active'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                toggleState ? 'translate-x-6' : 'translate-x-1'
              }`}
            ></span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Port of `TogglePreview.svelte`. */
interface TogglePreviewProps {
  readonly currentKeyName: string;
  readonly selectedToggleAction: Keycode;
  readonly toggleMode: ToggleTrigger;
  readonly toggleState: boolean;
}

export function TogglePreview({
  currentKeyName,
  selectedToggleAction,
  toggleMode,
  toggleState,
}: TogglePreviewProps) {
  const t = useT();
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 sm:p-6 bg-white dark:bg-gray-900 glassmorphism-card">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Preview</h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600">
          <span className="text-sm text-gray-600 dark:text-gray-400">Key</span>
          <span className="font-mono font-medium text-gray-900 dark:text-white">
            {currentKeyName}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600">
          <span className="text-sm text-gray-600 dark:text-gray-400">Action</span>
          <span className="font-medium text-primary-600">{actionName(selectedToggleAction)}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600">
          <span className="text-sm text-gray-600 dark:text-gray-400">Trigger</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {t(TRIGGER_LABELS[toggleMode])}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('advancedkey.toggleState')}
          </span>
          <span
            className={`font-medium ${
              toggleState ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {toggleState ? t('advancedkey.enabled') : t('advancedkey.disabled')}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Port of `ToggleInfoPanel.svelte` (its `{@html}` placeholder is a React node here). */
interface ToggleInfoPanelProps {
  readonly selectedToggleAction: Keycode;
  readonly toggleMode: ToggleTrigger;
}

export function ToggleInfoPanel({ selectedToggleAction, toggleMode }: ToggleInfoPanelProps) {
  const t = useT();
  const tRich = useTRich();
  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 bg-primary-50 dark:bg-primary-900 glassmorphism-card">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {t('advancedkey.howItWorks')}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {tRich(
          'advancedkey.toggleDescription',
          <strong className="text-primary-600">{actionName(selectedToggleAction)}</strong>,
          toggleMode === 'press' ? t('advancedkey.whenPressed') : t('advancedkey.whenReleased')
        )}
      </p>
    </div>
  );
}
