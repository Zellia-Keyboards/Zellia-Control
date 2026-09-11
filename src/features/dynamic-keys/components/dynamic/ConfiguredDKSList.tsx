/**
 * Port of `advancedkey/dynamic/ConfiguredDKSList.svelte`: the keyboard's DKS keys (spec D5,
 * PL-009). The Svelte list crashed on its first render (it subscribed to `{}` as a store); its
 * key names fell back to "Unknown" and it counted the four bindings of every DKS.
 */
import { useState } from 'react';
import { useT } from '../../../../lib/i18n';
import { useTimeouts } from '../../hooks/use-timeouts';
import { locationKey, type ConfiguredKey } from '../../model/configured-keys';
import { bottomOutMmOf } from '../../model/defaults';
import { UNKNOWN_KEY_NAME } from '../../model/key-names';
import { NO_KEYS, withKey, withoutKey } from '../shared/key-sets';
import styles from './ConfiguredDKSList.module.css';

const DELETE_ANIMATION_MS = 300;

const css = (name: string): string => styles[name] ?? '';

export interface ConfiguredDKSListProps {
  readonly configuredDynamicKeys: readonly ConfiguredKey<'stroke'>[];
  /** {@link locationKey}s of keys that play the fade-in (set by the editor after an apply). */
  readonly newlyAddedKeys: ReadonlySet<string>;
  readonly onDeleteKey: (entry: ConfiguredKey<'stroke'>) => void;
}

export function ConfiguredDKSList({
  configuredDynamicKeys,
  newlyAddedKeys,
  onDeleteKey,
}: ConfiguredDKSListProps) {
  const t = useT();
  const schedule = useTimeouts();
  const [deletingKeys, setDeletingKeys] = useState(NO_KEYS);

  function deleteKey(entry: ConfiguredKey<'stroke'>): void {
    const keyId = locationKey(entry.target);
    setDeletingKeys(keys => withKey(keys, keyId));
    schedule(
      () => {
        onDeleteKey(entry);
        setDeletingKeys(keys => withoutKey(keys, keyId));
      },
      DELETE_ANIMATION_MS,
      { flushOnUnmount: true }
    );
  }

  if (configuredDynamicKeys.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto mt-6">
      <div className="rounded-lg border p-6 glassmorphism-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('advancedkey.configuredDynamicKeys')}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {`${configuredDynamicKeys.length} ${
                configuredDynamicKeys.length !== 1
                  ? t('advancedkey.keysCountPlural')
                  : t('advancedkey.keysCount')
              }`}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configuredDynamicKeys.map((entry, index) => {
            const keyId = locationKey(entry.target);
            const isDeleting = deletingKeys.has(keyId);
            const isNewlyAdded = newlyAddedKeys.has(keyId);
            return (
              // Unkeyed in Svelte: the markup is reused by position.
              <div
                key={index}
                className={`group ${css('group')} relative overflow-hidden transition-all duration-300 ease-out hover:shadow-lg hover:shadow-primary/10 ${
                  isDeleting
                    ? 'opacity-0 scale-95 pointer-events-none'
                    : isNewlyAdded
                      ? `opacity-100 scale-100 ${css('animate-fade-in')}`
                      : 'opacity-100 scale-100 hover:scale-[1.02] hover:-translate-y-1'
                } p-4 rounded-lg border glassmorphism-card`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="font-mono font-bold"
                    style={{ color: 'var(--theme-color-primary)' }}
                  >
                    {UNKNOWN_KEY_NAME}
                  </span>

                  <button
                    type="button"
                    className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-colors glassmorphism-button"
                    onClick={() => {
                      deleteKey(entry);
                    }}
                    title={t('advancedkey.deleteKey')}
                    aria-label={t('advancedkey.deleteKey')}
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
                <div className="text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      {`${t('advancedkey.bindingsLabel')}:`}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {entry.dynamicKey.bindings.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      {`${t('advancedkey.bottomOutLabel')}:`}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {`${bottomOutMmOf(entry.dynamicKey.distances).toFixed(1)}mm`}
                    </span>
                  </div>
                </div>

                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(135deg, color-mix(in srgb, var(--theme-color-primary) 5%, transparent) 0%, color-mix(in srgb, var(--theme-color-primary) 2%, transparent) 100%)',
                  }}
                ></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
