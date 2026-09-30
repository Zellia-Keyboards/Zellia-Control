/**
 * Port of `advancedkey/toggle/ToggleConfiguredKeys.svelte`: the keyboard's toggle keys (spec D5,
 * PL-009); trigger and state are the remembered UI-only fields.
 */
import { useT } from '../../../../lib/i18n';
import { locationKey, type ConfiguredKey } from '../../model/configured-keys';
import { TOGGLE_DRAFT } from '../../model/editor-drafts';
import { actionNameOrHex, keyIndexName } from '../../model/key-names';
import { useUiFields } from '../../store/ui-fields';
import styles from './ToggleConfiguredKeys.module.css';

export interface ToggleConfiguredKeysProps {
  readonly configuredKeys: readonly ConfiguredKey<'toggle'>[];
  /** {@link locationKey}s of keys fading out before their delete. */
  readonly deletingKeys: ReadonlySet<string>;
  readonly newlyAddedKeys: ReadonlySet<string>;
  readonly onDeleteKey: (entry: ConfiguredKey<'toggle'>) => void;
}

export function ToggleConfiguredKeys({
  configuredKeys,
  deletingKeys,
  newlyAddedKeys,
  onDeleteKey,
}: ToggleConfiguredKeysProps) {
  const t = useT();
  const fields = useUiFields(state => state.toggle);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-6 bg-white dark:bg-gray-900 glassmorphism-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('advancedkey.configuredToggle')}
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {configuredKeys.length}{' '}
          {configuredKeys.length !== 1
            ? t('advancedkey.keysCountPlural')
            : t('advancedkey.keysCount')}
        </span>
      </div>
      <div className="space-y-3 mb-6">
        {configuredKeys.map(entry => {
          const keyId = locationKey(entry.target);
          const trigger = fields[keyId]?.trigger ?? TOGGLE_DRAFT.trigger;
          const toggleState = fields[keyId]?.state ?? TOGGLE_DRAFT.state;
          const isDeleting = deletingKeys.has(keyId);
          const isNewlyAdded = newlyAddedKeys.has(keyId);
          return (
            <div
              key={keyId}
              className={`p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 transform transition-all duration-500 ease-out glassmorphism-card ${
                isDeleting ? (styles['animate-fade-out'] ?? '') : ''
              } ${isNewlyAdded ? (styles['animate-fade-in'] ?? '') : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">
                  {keyIndexName(entry.target.id)}
                </span>
                <button
                  type="button"
                  className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-colors glassmorphism-button"
                  onClick={() => {
                    onDeleteKey(entry);
                  }}
                  title={t('common.delete')}
                  aria-label={t('common.delete')}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('advancedkey.actions')}:
                  </span>
                  <span className="font-medium text-primary-600">
                    {actionNameOrHex(entry.dynamicKey.binding)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('advancedkey.trigger')}:
                  </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {trigger === 'press' ? t('advancedkey.onPress') : t('advancedkey.onRelease')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('advancedkey.state')}:
                  </span>
                  <div className="flex items-center gap-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        toggleState ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    ></div>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
