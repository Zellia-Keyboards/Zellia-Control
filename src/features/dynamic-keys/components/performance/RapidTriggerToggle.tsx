/**
 * Port of `components/performance/RapidTriggerToggle.svelte` for the null-bind performance tab.
 * The Performance page owns its own port.
 */
import { Toggle } from '../../../../components/ui';
import { useT } from '../../../../lib/i18n';

export interface RapidTriggerToggleProps {
  readonly rapidTriggerEnabled: boolean;
  readonly onToggle: (value: boolean) => void;
}

export function RapidTriggerToggle({ rapidTriggerEnabled, onToggle }: RapidTriggerToggleProps) {
  const t = useT();
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('performance.enableRapidTrigger')}
        </h3>
        <Toggle
          checked={rapidTriggerEnabled}
          onToggle={value => {
            onToggle(value);
          }}
          ariaLabel="Rapid Trigger Toggle"
        />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
        {t('performance.rapidTriggerDesc')}
      </p>
    </>
  );
}
