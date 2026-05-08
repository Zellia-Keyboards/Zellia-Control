<script lang="ts">
  import { Sun, Moon } from 'lucide-svelte';
  import { darkMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Button } from '$lib/components/ui/button';

  let currentLanguage = $derived($language);
</script>

<div class="p-3">
  <Button
    variant="secondary"
    class="w-full justify-start gap-3 glassmorphism-button"
    onclick={() => darkMode.toggle()}
  >
    <Sun class="size-4 hidden dark:block" />
    <Moon class="size-4 block dark:hidden" />
    <span class="hidden dark:block">{t('ui.darkMode', currentLanguage)}</span>
    <span class="block dark:hidden">{t('ui.lightMode', currentLanguage)}</span>
  </Button>
</div>
