/**
 * Dynamic Keys page (port of `routes/dynamic/+page.svelte`): the dashboard with the mode list and
 * the configured-keys table, and the four mode editors. The table is derived from the keyboard's
 * dynamic keys (spec D5, PL-009), so its rows, count and deletes are the device's.
 */
import {
  EditIcon,
  LayersIcon,
  LayoutTemplateIcon,
  MoveHorizontalIcon,
  ToggleLeftIcon,
  TrashIcon,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { deviceSession, deviceStore, useDeviceConfig } from '../device';
import { keySelection } from '../keyboard';
import { useT, type TranslationKey } from '../../lib/i18n';
import { DynamicMode } from './components/DynamicMode';
import { NullBindMode } from './components/NullBindMode';
import { TapHoldMode } from './components/TapHoldMode';
import { ToggleMode } from './components/ToggleMode';
import {
  dashboardRows,
  dynamicKeyAt,
  locationKey,
  type ConfiguredDynamicKey,
  type DashboardRow,
} from './model/configured-keys';
import { mutexBottomOutMm } from './model/editor-drafts';
import { UNKNOWN_KEY_NAME } from './model/key-names';
import type { NullBindFields } from './model/ui-fields';
import { uiFields, useUiFields } from './store/ui-fields';

type Mode = 'tap-hold' | 'toggle' | 'dynamic' | 'null-bind';

interface KeyMode {
  readonly id: Mode;
  readonly nameKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
  readonly icon: LucideIcon;
}

const KEY_MODES: readonly KeyMode[] = [
  {
    id: 'tap-hold',
    nameKey: 'advancedkey.tapHold',
    descriptionKey: 'advancedkey.tapHoldDesc',
    icon: LayoutTemplateIcon,
  },
  {
    id: 'toggle',
    nameKey: 'advancedkey.toggle',
    descriptionKey: 'advancedkey.toggleDesc',
    icon: ToggleLeftIcon,
  },
  {
    id: 'dynamic',
    nameKey: 'advancedkey.dynamic',
    descriptionKey: 'advancedkey.dynamicDesc',
    icon: LayersIcon,
  },
  {
    id: 'null-bind',
    nameKey: 'advancedkey.nullBind',
    descriptionKey: 'advancedkey.nullBindDesc',
    icon: MoveHorizontalIcon,
  },
];

const MODE_OF_KIND: Readonly<Record<ConfiguredDynamicKey['kind'], Mode>> = {
  stroke: 'dynamic',
  modTap: 'tap-hold',
  toggle: 'toggle',
  mutex: 'null-bind',
};

/** The Svelte table's (hard-coded English) type labels. */
const TYPE_LABELS: Readonly<Record<ConfiguredDynamicKey['kind'], string>> = {
  stroke: 'Dynamic Key',
  modTap: 'Tap Hold',
  toggle: 'Toggle',
  mutex: 'Null Bind',
};

export function DynamicKeysPage() {
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);

  // Keys can only be picked inside a mode (Svelte `setAllowSelection(selectedMode !== null)`).
  useEffect(() => {
    keySelection.setAllowSelection(selectedMode !== null);
  }, [selectedMode]);
  useEffect(
    () => () => {
      keySelection.setAllowSelection(true);
    },
    []
  );

  function goBackToModeSelection(): void {
    setSelectedMode(null);
    keySelection.deselectAll();
  }

  function createNewKey(mode: Mode): void {
    setSelectedMode(mode);
    keySelection.deselectAll();
  }

  function editConfiguredKey({ dynamicKey, target }: DashboardRow): void {
    keySelection.setLayer(target.layer + 1);
    // A null bind is edited as its pair.
    keySelection.setSelected(
      dynamicKey.kind === 'mutex'
        ? dynamicKey.targets.flatMap(location => (location ? [location.id] : []))
        : [target.id]
    );
    setSelectedMode(MODE_OF_KIND[dynamicKey.kind]);
  }

  return (
    <div
      className={`rounded-2xl shadow p-8 mt-2 mb-4 grow glassmorphism-card text-black bg-primary-100 dark:bg-black dark:text-white border-0 dark:border dark:border-gray-600 ${
        selectedMode ? '' : 'h-full'
      } flex flex-col`}
    >
      {selectedMode === null ? (
        <Dashboard onCreate={createNewKey} onEdit={editConfiguredKey} />
      ) : selectedMode === 'tap-hold' ? (
        <TapHoldMode onBack={goBackToModeSelection} />
      ) : selectedMode === 'toggle' ? (
        <ToggleMode onBack={goBackToModeSelection} />
      ) : selectedMode === 'null-bind' ? (
        <NullBindMode onBack={goBackToModeSelection} />
      ) : (
        <DynamicMode onBack={goBackToModeSelection} />
      )}
    </div>
  );
}

function configurationText(
  dynamicKey: ConfiguredDynamicKey,
  nullBind: Readonly<Record<string, NullBindFields>>
): string {
  switch (dynamicKey.kind) {
    case 'stroke':
      return `${dynamicKey.bindings.filter(binding => binding !== 0).length} bindings`;
    case 'modTap':
      return `Tap: ${dynamicKey.tap || 'None'} / Hold: ${dynamicKey.hold || 'None'}`;
    case 'toggle':
      // The Svelte table read a `states` list that no configuration had.
      return '0 states';
    case 'mutex': {
      const [first] = dynamicKey.targets;
      const fields = first ? nullBind[locationKey(first)] : undefined;
      return `Bottom out: ${mutexBottomOutMm(dynamicKey, fields) || 0}mm`;
    }
  }
}

interface DashboardProps {
  readonly onCreate: (mode: Mode) => void;
  readonly onEdit: (row: DashboardRow) => void;
}

function Dashboard({ onCreate, onEdit }: DashboardProps) {
  const t = useT();
  const config = useDeviceConfig();
  const nullBind = useUiFields(state => state.nullBind);
  const configuredKeys = dashboardRows(config?.dynamicKeys ?? [])
    .map(row => ({ ...row, keyName: UNKNOWN_KEY_NAME }))
    .toSorted((a, b) => a.keyName.localeCompare(b.keyName));

  function deleteConfiguredKey(row: DashboardRow): void {
    // Slots move when others are freed: look the key's dynamic key up again.
    const found = dynamicKeyAt(deviceStore.getState().config, row.target);
    if (!found) return;
    deviceSession.removeDynamicKey(found.slot);
    uiFields.forgetDynamicKey(found.dynamicKey);
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {t('advancedkey.title')}
      </h1>
      <div className="flex gap-6 flex-1">
        <div className="w-96 flex-shrink-0">
          <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 glassmorphism-card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('advancedkey.step1Title')}
            </h2>
            <div className="space-y-3">
              {KEY_MODES.map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  className="w-full text-left p-4 rounded-lg border transition-all hover:shadow-md hover:scale-[1.02] glassmorphism-button border-gray-200 dark:border-gray-600"
                  onClick={() => {
                    onCreate(mode.id);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <mode.icon className="w-8 h-8 text-primary-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {t(mode.nameKey)}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {t(mode.descriptionKey)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="rounded-lg border flex-1 flex flex-col bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 glassmorphism-card">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('advancedkey.configuredDynamicKeys')} ({configuredKeys.length})
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('advancedkey.infoDesc')}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {configuredKeys.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center glassmorphism-card">
                      <LayersIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {t('ui.noProfilesAvailable')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {t('advancedkey.step1Desc')} {t('advancedkey.step2Desc')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                          {t('common.key')}
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                          {t('advancedkey.mode')}
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                          {t('advancedkey.configuration')}
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                          {t('common.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {configuredKeys.map(key => (
                        <tr
                          key={key.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                                {key.keyName.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {key.keyName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                              {TYPE_LABELS[key.dynamicKey.kind]}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {configurationText(key.dynamicKey, nullBind)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                className="p-1.5 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                                onClick={() => {
                                  onEdit(key);
                                }}
                                title="Edit configuration"
                                aria-label="Edit configuration"
                              >
                                <EditIcon className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                className="p-1.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                                onClick={() => {
                                  deleteConfiguredKey(key);
                                }}
                                title="Delete configuration"
                                aria-label="Delete configuration"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
