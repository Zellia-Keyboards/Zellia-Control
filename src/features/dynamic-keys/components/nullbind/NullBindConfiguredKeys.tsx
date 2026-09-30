/**
 * Port of `advancedkey/nullbind/NullBindConfiguredKeys.svelte`: the keyboard's mutexes, one card
 * per pair (spec D5, PL-009). Behavior and bottom-out come from the device's mode byte (D13), the
 * rest from the pair's remembered fields.
 */
import { useT } from '../../../../lib/i18n';
import { locationKey, type ConfiguredMutex } from '../../model/configured-keys';
import { mutexBottomOutMm, mutexFields } from '../../model/editor-drafts';
import { mutexModeToBehavior } from '../../model/null-bind';
import { useUiFields } from '../../store/ui-fields';
import { PairArrow, type KeyLabel } from './NullBindParts';
import styles from './NullBindConfiguredKeys.module.css';

export interface NullBindConfiguredKeysProps {
  readonly configuredPairs: readonly ConfiguredMutex[];
  /** {@link locationKey}s of the pairs' first keys. */
  readonly deletingPairs: ReadonlySet<string>;
  readonly newlyAddedPairs: ReadonlySet<string>;
  readonly onDeletePair: (pair: ConfiguredMutex) => void;
  readonly getKeyLabel: KeyLabel;
  readonly getBehaviorName: (behavior: number) => string;
}

export function NullBindConfiguredKeys({
  configuredPairs,
  deletingPairs,
  newlyAddedPairs,
  onDeletePair,
  getKeyLabel,
  getBehaviorName,
}: NullBindConfiguredKeysProps) {
  const t = useT();
  const fields = useUiFields(state => state.nullBind);

  return (
    <div className="border-t p-6 bg-primary-100 dark:bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('advancedkey.configuredNullBindKeys')}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {configuredPairs.length}{' '}
              {configuredPairs.length === 1 ? t('advancedkey.pair') : t('advancedkey.pairs')}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {configuredPairs.map(pair => {
            const pairId = locationKey(pair.targets[0]);
            const bottomOutPoint = mutexBottomOutMm(pair.dynamicKey, fields[pairId]);
            const { rtDown, actuationMm } = mutexFields(pair.dynamicKey, fields[pairId]);
            const isDeleting = deletingPairs.has(pairId);
            const isNewlyAdded = newlyAddedPairs.has(pairId);
            return (
              <div
                key={pairId}
                className={`group relative overflow-hidden rounded-xl border border-primary-600 bg-gradient-to-br from-primary-800 to-primary-900 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-primary/10 ${
                  isDeleting
                    ? 'opacity-0 scale-95 pointer-events-none'
                    : isNewlyAdded
                      ? `opacity-100 scale-100 ${styles['animate-fade-in'] ?? ''}`
                      : 'opacity-100 scale-100 hover:scale-[1.02] hover:-translate-y-1'
                }`}
              >
                <div className="p-4 border-b border-primary-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center justify-center gap-3 flex-1">
                      <div className="px-3 py-1.5 bg-primary-500 text-white rounded-lg font-mono font-bold text-sm glassmorphism-button">
                        {getKeyLabel(pair.targets[0].id)}
                      </div>
                      <PairArrow />
                      <div className="px-3 py-1.5 bg-primary-500 text-white rounded-lg font-mono font-bold text-sm glassmorphism-button">
                        {getKeyLabel(pair.targets[1].id)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-colors ml-3 glassmorphism-button"
                      onClick={() => {
                        onDeletePair(pair);
                      }}
                      title={t('advancedkey.deletePair')}
                      aria-label={t('advancedkey.deletePair')}
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
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {t('advancedkey.behavior')}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-primary-500">
                      {getBehaviorName(mutexModeToBehavior(pair.dynamicKey.mode))}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full flex items-center justify-center ${
                          bottomOutPoint > 0 ? 'bg-primary-500' : 'bg-gray-500'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {t('advancedkey.bottomOut')}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            bottomOutPoint > 0
                              ? 'text-primary-500'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {bottomOutPoint > 0 ? t('advancedkey.on') : t('advancedkey.off')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full flex items-center justify-center ${
                          rtDown > 0 ? 'bg-primary-500' : 'bg-gray-500'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {t('advancedkey.rapidTrigger')}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            rtDown > 0 ? 'text-primary-500' : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {rtDown > 0 ? t('advancedkey.on') : t('advancedkey.off')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-primary-700 dark:border-gray-300 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Actuation</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {actuationMm.toFixed(1)}
                        {t('units.mm')}
                      </span>
                    </div>
                    {bottomOutPoint > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Bottom Out</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {bottomOutPoint.toFixed(1)}
                          {t('units.mm')}
                        </span>
                      </div>
                    )}
                    {rtDown > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">RT Sensitivity</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {rtDown.toFixed(2)}
                          {t('units.mm')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-primary-500/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
