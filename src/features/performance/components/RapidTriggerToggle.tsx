import { Toggle } from '../../../components/ui';
import { useT } from '../../../lib/i18n';

export interface RapidTriggerToggleProps {
  rapidTriggerEnabled: boolean;
  onToggle: (value: boolean) => void;
}

/** Rapid trigger heading, switch and description (port of RapidTriggerToggle.svelte). */
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
