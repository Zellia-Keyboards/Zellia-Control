<script lang="ts">
  import { Loader2 } from 'lucide-svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  let currentLanguage = $derived($language);
</script>

<div class="flex items-center justify-center p-8 w-full h-full min-h-[50vh]">
  <div class="flex flex-col items-center gap-4 text-center">
    <Loader2 class="size-12 text-primary-600 dark:text-primary-400 animate-spin" />
    <h3 class="text-xl font-semibold text-foreground animate-pulse">
      {t('welcome.loadingConfigurator', currentLanguage)}
    </h3>
  </div>
</div>
