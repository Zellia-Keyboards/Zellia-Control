import { RGBMode } from 'emi-keyboard-controller';
import { useEffect, useMemo } from 'react';
import { useT } from '../../lib/i18n';
import {
  deviceSession,
  deviceStore,
  useDeviceLoads,
  useDeviceStore,
  type RgbBaseConfig,
  type RgbKeyConfig,
} from '../device';
import {
  keySelection,
  keySelectionStore,
  useLayoutKeys,
  useSelectedKeys,
  useSelectionShortcuts,
} from '../keyboard';
import { RGBPanel } from './components/RGBPanel';
import { RGBSubPanel } from './components/RGBSubPanel';
import {
  editKeys,
  lightingTargets,
  rainbowColors,
  recolorKeys,
  sharedKeyValues,
  type SharedKeyValues,
} from './model';

/** emi-keyboard-controller `RGBConfig` defaults: the key panel without keys to edit. */
const DEFAULT_KEY_CONFIG: RgbKeyConfig = {
  mode: RGBMode.RgbModeLinear,
  color: { red: 163, green: 55, blue: 252 },
  speed: 20,
};
const NO_TARGET_VALUES: SharedKeyValues = { ...DEFAULT_KEY_CONFIG, first: DEFAULT_KEY_CONFIG };

/** The keys an edit changes, from the selection at the time of the edit. */
function currentTargets(rgbKeys: readonly RgbKeyConfig[]): number[] {
  return lightingTargets(keySelectionStore.getState().selected, rgbKeys.length);
}

/**
 * Lighting route (port of `routes/lighting/+page.svelte`): the keyboard-wide base lighting and the
 * per-key lighting of the selected keys (all keys while none is selected), edited in place and
 * sent to the keyboard by Save (PL-047). The global keyboard above it belongs to the shell.
 */
export function LightingPage() {
  const t = useT();
  const rgbBase = useDeviceStore(state => state.config?.rgbBase);
  const rgbKeys = useDeviceStore(state => state.config?.rgbKeys);
  const selected = useSelectedKeys();
  const layout = useLayoutKeys();
  // Each configuration the keyboard loads (profile switch, reset) opens both panels again on it,
  // with the rainbow preset closed.
  const loads = useDeviceLoads();

  // Always allow key selection on lighting page
  useEffect(() => {
    keySelection.setAllowSelection(true);
  }, []);
  useSelectionShortcuts();

  const keyCount = rgbKeys?.length ?? 0;
  const targets = useMemo(() => lightingTargets(selected, keyCount), [selected, keyCount]);
  const values = useMemo(
    () => (rgbKeys && sharedKeyValues(rgbKeys, targets)) ?? NO_TARGET_VALUES,
    [rgbKeys, targets]
  );

  if (!rgbBase || !rgbKeys) return null;

  // Edits read the latest configuration: two inputs can arrive before the next render.
  const editBase = (patch: Partial<RgbBaseConfig>) => {
    const config = deviceStore.getState().config;
    if (config) deviceSession.setRgbBase({ ...config.rgbBase, ...patch });
  };

  const editTargets = (patch: Partial<RgbKeyConfig>) => {
    const config = deviceStore.getState().config;
    if (config) {
      deviceSession.setRgbKeys(editKeys(config.rgbKeys, currentTargets(config.rgbKeys), patch));
    }
  };

  // The rainbow preset colours the targets the layout shows; modes and speeds stay (PL-007).
  const applyRainbow = (referenceHex: string, direction: number, density: number) => {
    const config = deviceStore.getState().config;
    if (!config || !layout) return;
    const targetIds = new Set(currentTargets(config.rgbKeys));
    const keys = layout.visible.filter(key => targetIds.has(key.id));
    deviceSession.setRgbKeys(
      recolorKeys(config.rgbKeys, rainbowColors(keys, referenceHex, direction, density))
    );
  };

  return (
    <div
      className="rounded-2xl shadow mt-2 mb-4 grow bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col glassmorphism-card"
      style={{ padding: 'calc(2rem * var(--ui-scale, 1))' }}
    >
      <div
        className="flex items-center justify-between -mt-4"
        style={{ marginBottom: 'calc(0.5rem * var(--ui-scale, 1))' }}
      >
        <h2
          className="font-bold text-black dark:text-white"
          style={{ fontSize: 'calc(1.5rem * var(--ui-scale, 1))' }}
        >
          {t('lighting.title')}
        </h2>
        {/* PL-047: lighting edits wait for Save */}
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('lighting.saveHint')}</p>
      </div>

      <div
        className="rounded-xl shadow flex flex-col lg:flex-row flex-1 gap-4"
        style={{ gap: 'calc(1rem * var(--ui-scale, 1))' }}
      >
        {/* Base Configuration Panel */}
        <div className="flex-1 min-w-0">
          <RGBPanel
            key={loads}
            config={rgbBase}
            onEdit={editBase}
            title={t('lighting.baseConfigTitle')}
          />
        </div>

        {/* Sub Configuration Panel */}
        <div className="flex-1 min-w-0">
          <RGBSubPanel
            key={loads}
            values={values}
            targetCount={selected.length === 0 ? 'all' : targets.length}
            onEdit={editTargets}
            onRainbow={applyRainbow}
            title={t('lighting.subConfigTitle')}
          />
        </div>
      </div>
    </div>
  );
}
