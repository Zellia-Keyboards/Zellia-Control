<script lang="ts">
  import { Globe } from 'lucide-svelte';
  import { language, t, type Language } from '$lib/stores/LanguageStore.svelte';
  import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';

  let currentLanguage = $derived($language);

  function handleChange(value: string) {
    language.set(value as Language);
  }
</script>

<div class="p-3 space-y-2">
  <div class="flex items-center gap-2">
    <Globe class="size-4 text-muted-foreground" />
    <span class="text-sm font-medium">
      {t('ui.language', currentLanguage)}
    </span>
  </div>

  <Tabs value={currentLanguage} onValueChange={handleChange} class="w-full">
    <TabsList class="grid w-full grid-cols-2 glassmorphism-card">
      <TabsTrigger
        value="en"
        class="data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:shadow-md"
      >
        EN
      </TabsTrigger>
      <TabsTrigger
        value="zh"
        class="data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:shadow-md"
      >
        中文
      </TabsTrigger>
    </TabsList>
  </Tabs>
</div>
