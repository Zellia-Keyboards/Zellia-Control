import { UnsupportedFeature } from '../../components/ui';
import { useT } from '../../lib/i18n';
import { useDeviceLoads, useDeviceStore, useFeatureFlags } from '../device';
import { macroActionLimit, supportsMacros } from '../device/model/capabilities';
import { MacroEditor } from './components/MacroEditor';

/**
 * Macros route (macros and scripts spec): the keyboard's macro slots, edited in place, added to
 * key by key or recorded from this computer's keyboard, and sent to the keyboard by Save. Shown
 * in the sidebar only for keyboards whose controller declares macros.
 */
export function MacrosPage() {
  const t = useT();
  const feature = useFeatureFlags();
  const macros = useDeviceStore(state => state.config?.macros);
  // Each configuration the keyboard loads (profile switch, reset) starts the editor over on it.
  const loads = useDeviceLoads();

  if (!feature || !macros) return null;
  if (!supportsMacros(feature)) {
    return <UnsupportedFeature message={t('macros.unsupported')} />;
  }

  return (
    <div
      className="rounded-2xl shadow mt-2 mb-4 grow bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col glassmorphism-card"
      style={{ padding: 'calc(2rem * var(--ui-scale, 1))' }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-4"
        style={{ marginBottom: 'calc(1rem * var(--ui-scale, 1))' }}
      >
        <h2
          className="font-bold text-black dark:text-white"
          style={{ fontSize: 'calc(1.5rem * var(--ui-scale, 1))' }}
        >
          {t('macros.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('macros.saveHint')}</p>
      </div>
      <MacroEditor
        key={loads}
        macros={macros}
        pollingRate={feature.pollingRate}
        limit={macroActionLimit(feature)}
      />
    </div>
  );
}
