import { useT, type TranslationKey } from '../../../lib/i18n';

interface FeatureGroup {
  readonly titleKey: TranslationKey;
  readonly itemKeys: readonly TranslationKey[];
}

const GROUPS: readonly FeatureGroup[] = [
  {
    titleKey: 'about.performance',
    itemKeys: ['about.adjustableActuation', 'about.rapidTrigger', 'about.realtimeMonitoring'],
  },
  {
    titleKey: 'about.advancedKeys',
    itemKeys: ['about.tapHold', 'about.toggleModes', 'about.dynamicKeystroke', 'about.nullBind'],
  },
  {
    titleKey: 'about.customization',
    itemKeys: [
      'about.rgbLighting',
      'about.keyRemapping',
      'about.multipleThemes',
      'about.darkLightMode',
    ],
  },
  {
    titleKey: 'about.technical',
    itemKeys: [
      'about.crossPlatform',
      'about.hardwareCalibration',
      'about.debugTools',
      'about.profileImportExport',
    ],
  },
];

/** The four feature cards (port of `about/FeatureGrid.svelte`). */
export function FeatureGrid() {
  const t = useT();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {GROUPS.map(group => (
        <div
          key={group.titleKey}
          className="glassmorphism-card rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300"
        >
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t(group.titleKey)}
          </h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            {group.itemKeys.map(itemKey => (
              <li key={itemKey} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
                {t(itemKey)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
