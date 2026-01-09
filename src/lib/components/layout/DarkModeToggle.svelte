<script lang="ts">
  import { Sun, Moon } from 'lucide-svelte';
  import { darkMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  let currentLanguage = $derived($language);
</script>

<div class="p-3 border-transparent">
  <button
    class="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 glassmorphism-button"
    onclick={() => darkMode.toggle()}
  >
    <div class="flex items-center gap-3">
      <Sun class="w-4 h-4 hidden dark:block" />
      <Moon class="w-4 h-4 block dark:hidden" />
      <span class="hidden dark:block">{t('ui.darkMode', currentLanguage)}</span>
      <span class="block dark:hidden">{t('ui.lightMode', currentLanguage)}</span>
    </div>
  </button>
</div>
