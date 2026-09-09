/**
 * Port of `advancedkey/tap-hold/TapHoldConfiguredKeys.svelte`: the keyboard's mod-tap keys
 * (spec D5, PL-009) with their fade-in/fade-out animations.
 */
import type { ConfiguredKey } from '../../model/configured-keys';
import { locationKey } from '../../model/configured-keys';
import { TAP_HOLD_DEFAULTS } from '../../model/defaults';
import { actionNameOrHex, keyIndexName } from '../../model/key-names';
import { useUiFields } from '../../store/ui-fields';
import { useT } from '../../../../lib/i18n';
import styles from './TapHoldConfiguredKeys.module.css';

export interface TapHoldConfiguredKeysProps {
  readonly configuredKeys: readonly ConfiguredKey<'modTap'>[];
  /** {@link locationKey}s of keys fading out before their delete. */
  readonly deletingKeys: ReadonlySet<string>;
  readonly newlyAddedKeys: ReadonlySet<string>;
  readonly onDeleteKey: (entry: ConfiguredKey<'modTap'>) => void;
}

export function TapHoldConfiguredKeys({
  configuredKeys,
  deletingKeys,
  newlyAddedKeys,
  onDeleteKey,
}: TapHoldConfiguredKeysProps) {
  const t = useT();
  const fields = useUiFields(state => state.tapHold);
  if (configuredKeys.length === 0) return null;

  return (
    <div
      className={`rounded-lg border p-4 sm:p-6 glassmorphism-card ${styles['animate-section-fade-in'] ?? ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('advancedkey.configuredTapHold')}
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {configuredKeys.length}{' '}
          {configuredKeys.length !== 1
            ? t('advancedkey.keysCountPlural')
            : t('advancedkey.keysCount')}
        </span>
      </div>
      <div className="space-y-3 mb-3">
        {configuredKeys.map(entry => {
          const keyId = locationKey(entry.target);
          const { tap, hold } = entry.dynamicKey;
          const holdDelay = fields[keyId]?.holdDelayMs ?? TAP_HOLD_DEFAULTS.holdDelayMs;
          const isDeleting = deletingKeys.has(keyId);
          const isNewlyAdded = newlyAddedKeys.has(keyId);
          return (
            <div
              key={keyId}
              className={`p-3 rounded-lg border transform transition-all duration-500 ease-out glassmorphism-card ${
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
                  <span className="text-gray-600 dark:text-gray-400">{t('advancedkey.tap')}:</span>
                  <span className="font-medium text-primary-500">{actionNameOrHex(tap)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('advancedkey.hold')}:</span>
                  <span className="font-medium text-green-500">{actionNameOrHex(hold)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('advancedkey.holdDelay')}:
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {holdDelay}
                    {t('advancedkey.milliseconds')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
