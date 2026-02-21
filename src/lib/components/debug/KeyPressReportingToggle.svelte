<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Toggle, StatusDot } from '$lib/components/ui';
  import { Radio } from 'lucide-svelte';

  interface Props {
    keyPressReporting: boolean;
    onToggle: (value: boolean) => void;
  }

  let { keyPressReporting, onToggle }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div class="glassmorphism-card rounded-xl p-6 transition-all duration-300">
  <div class="flex items-center justify-between gap-6">
    <!-- Left side - Icon and text -->
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
        <Radio class="w-6 h-6 text-white" />
      </div>
      <div>
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">
          {t('debug.keyPressReporting', currentLanguage)}
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          {t('debug.keyPressReportingDesc', currentLanguage)}
        </p>
      </div>
    </div>
    
    <!-- Right side - Toggle -->
    <Toggle
      checked={keyPressReporting}
      onToggle={val => onToggle(val)}
      size="lg"
      color="amber"
      ariaLabel="Key Press Reporting Toggle"
    />
  </div>
  
  <!-- Status indicator -->
  <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
    <StatusDot
      color={keyPressReporting ? 'green' : 'gray'}
      pulse={keyPressReporting}
      size="md"
      label={keyPressReporting ? 'Reporting enabled' : 'Reporting disabled'}
    />
  </div>
</div>
