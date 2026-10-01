import { RGBMode } from 'emi-keyboard-controller';
import { useEffect, useState } from 'react';
import { useT } from '../../lib/i18n';
import {
  deviceSession,
  deviceStore,
  useDeviceStore,
  type RgbBaseConfig,
  type RgbKeyConfig,
} from '../device';
import { keySelection, keySelectionStore, useLayoutKeys } from '../keyboard';
import { RGBPanel } from './components/RGBPanel';
import { RGBSubPanel, type KeyConfigEntry } from './components/RGBSubPanel';
import { useDeviceLoads } from './hooks/use-device-loads';
import { useSelectionShortcuts } from './hooks/use-selection-shortcuts';

/** emi-keyboard-controller `RGBConfig` defaults, for a keyboard without per-key lighting. */
const DEFAULT_KEY_CONFIG: RgbKeyConfig = {
  mode: RGBMode.RgbModeLinear,
  color: { red: 163, green: 55, blue: 252 },
  speed: 20,
};

/**
 * The key panel's configuration: a fresh copy of the first key's (Svelte `subConfig`), so the
 * panel re-reads its colour and speed every time it is refreshed.
 */
function firstKeyConfig(rgbKeys: readonly RgbKeyConfig[] | undefined): RgbKeyConfig {
  return { ...(rgbKeys?.[0] ?? DEFAULT_KEY_CONFIG) };
}

/**
 * Lighting route (port of `routes/lighting/+page.svelte`): the keyboard-wide base lighting and the
 * per-key lighting of the selected keys (all keys while none is selected). The global keyboard
 * above it belongs to the shell.
 */
export function LightingPage() {
  const t = useT();
  const rgbBase = useDeviceStore(state => state.config?.rgbBase);
  const rgbKeys = useDeviceStore(state => state.config?.rgbKeys);
  const layout = useLayoutKeys();
  // Each configuration the keyboard loads (profile switch, reset) opens both panels again on it:
  // their modes and unapplied edits start over.
  const loads = useDeviceLoads();

  // Always allow key selection on lighting page
  useEffect(() => {
    keySelection.setAllowSelection(true);
  }, []);
  useSelectionShortcuts();

  // Refreshed from the first key whenever the per-key configurations change (the Svelte store
  // subscription) and after every apply.
  const [subConfig, setSubConfig] = useState(() => firstKeyConfig(rgbKeys));
  const [subConfigSource, setSubConfigSource] = useState(rgbKeys);
  if (subConfigSource !== rgbKeys) {
    setSubConfigSource(rgbKeys);
    setSubConfig(firstKeyConfig(rgbKeys));
  }

  if (!rgbBase || !rgbKeys) return null;

  const handleBaseConfigChange = (config: RgbBaseConfig) => {
    deviceSession.setRgbBase(config);
  };

  /** Applies to the selected keys, or to every given key when none is selected. */
  const applyKeyConfigs = (entries: readonly KeyConfigEntry[]) => {
    const { selected } = keySelectionStore.getState();
    const targets =
      selected.length > 0 ? entries.filter(({ keyId }) => selected.includes(keyId)) : entries;
    deviceSession.setRgbKeys(targets);
    setSubConfig(firstKeyConfig(deviceStore.getState().config?.rgbKeys));
  };

  const handleSubConfigChange = (config: RgbKeyConfig) => {
    applyKeyConfigs(rgbKeys.map((_, keyId) => ({ keyId, config })));
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
      </div>

      <div
        className="rounded-xl shadow flex flex-col lg:flex-row flex-1 gap-4"
        style={{ gap: 'calc(1rem * var(--ui-scale, 1))' }}
      >
        {/* Base Configuration Panel */}
        <div className="flex-1 min-w-0">
          <RGBPanel
            key={loads}
            baseConfig={rgbBase}
            onConfigChange={handleBaseConfigChange}
            title={t('lighting.baseConfigTitle')}
          />
        </div>

        {/* Sub Configuration Panel */}
        <div className="flex-1 min-w-0">
          <RGBSubPanel
            key={loads}
            config={subConfig}
            onConfigChange={handleSubConfigChange}
            onKeyConfigsChange={applyKeyConfigs}
            keyboardKeys={layout?.visible ?? []}
            rgbConfigs={rgbKeys}
            title={t('lighting.subConfigTitle')}
          />
        </div>
      </div>
    </div>
  );
}
