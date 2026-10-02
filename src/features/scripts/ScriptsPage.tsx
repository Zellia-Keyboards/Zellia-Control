import { ScriptLevel } from 'emi-keyboard-controller';
import { UnsupportedFeature } from '../../components/ui';
import { useT } from '../../lib/i18n';
import { useDeviceLoads, useDeviceStore, useFeatureFlags } from '../device';
import { supportsScripts } from '../device/model/capabilities';
import { ScriptWorkspace } from './components/ScriptWorkspace';
import type { Compile } from './model';
import { compileScript } from './model/compiler-browser';

export interface ScriptsPageProps {
  /** The compiler; by default the app's (vendor/mqjs, loaded on the first compile). */
  readonly compile?: Compile;
}

/**
 * Scripts route (macros and scripts spec): the keyboard's JavaScript in CodeMirror, compiled for
 * AOT keyboards with libamp's compiler and sent to the keyboard by Save. Shown in the sidebar
 * only for keyboards whose controller declares scripts.
 */
export function ScriptsPage({ compile = compileScript }: ScriptsPageProps) {
  const t = useT();
  const feature = useFeatureFlags();
  const script = useDeviceStore(state => state.config?.script);
  // Each configuration the keyboard loads (profile switch, reset) starts the editor over on it.
  const loads = useDeviceLoads();

  if (!feature || script === undefined) return null;
  if (!supportsScripts(feature) || !script) {
    return <UnsupportedFeature message={t('scripts.unsupported')} />;
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
          {t('scripts.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('scripts.saveHint')}</p>
      </div>
      <ScriptWorkspace
        key={loads}
        initialSource={script.source}
        bytecode={script.bytecode}
        aot={feature.scriptLevel === ScriptLevel.AOT}
        compile={compile}
      />
    </div>
  );
}
