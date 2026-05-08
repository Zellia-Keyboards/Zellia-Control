<script lang="ts">
  import { keyboardConnectionState } from '$lib/api/keyboardAPI.svelte';
  import { RotateCcw, Download, Trash2, AlertTriangle } from 'lucide-svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
  } from '$lib/components/ui/card';
  import { cn } from '$lib/utils.js';

  let currentLanguage = $derived($language);

  const settingsOptions = [
    {
      id: 'restart',
      nameKey: 'settings.restart',
      descriptionKey: 'settings.restartDesc',
      icon: RotateCcw,
      color: 'blue',
      action: () => keyboardConnectionState.controller?.system_reset(),
    },
    {
      id: 'bootloader',
      nameKey: 'settings.bootloader',
      descriptionKey: 'settings.bootloaderDesc',
      icon: Download,
      color: 'violet',
      action: () => keyboardConnectionState.controller?.enter_bootloader(),
    },
    {
      id: 'factory-reset',
      nameKey: 'settings.factoryReset',
      descriptionKey: 'settings.factoryResetDesc',
      icon: Trash2,
      color: 'red',
      action: () => keyboardConnectionState.controller?.factory_reset(),
    },
  ] as const;

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 hover:border-blue-500/60 group-hover:shadow-blue-500/30',
    violet:
      'from-primary-500 to-primary-700 hover:border-primary-500/60 group-hover:shadow-primary-500/30',
    red: 'from-destructive to-red-700 hover:border-destructive/60 group-hover:shadow-destructive/30',
  };
</script>

<div class="settings-container max-w-5xl mx-auto p-8 animate-fade-in">
  <header class="mb-12">
    <h1 class="text-4xl font-bold tracking-tight">
      {t('settings.title', currentLanguage)}
    </h1>
    <p class="mt-2 text-muted-foreground">
      {t('settings.subtitle', currentLanguage)}
    </p>
    <div class="mt-4 h-0.5 w-16 rounded-full bg-gradient-to-r from-primary-500 to-transparent"></div>
  </header>

  <div class="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))] mb-8">
    {#each settingsOptions as option, index}
      {@const Icon = option.icon}
      <Card
        role="button"
        tabindex={0}
        onclick={option.action}
        onkeydown={e => (e.key === 'Enter' || e.key === ' ') && option.action()}
        class={cn(
          'group cursor-pointer glassmorphism-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border',
          colorClasses[option.color].split(' ').slice(2).join(' ')
        )}
        style="animation-delay: {index * 100}ms;"
      >
        <CardHeader class="flex-row gap-4 items-start">
          <div
            class={cn(
              'flex size-12 items-center justify-center rounded-xl bg-gradient-to-br transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-lg',
              colorClasses[option.color].split(' ').slice(0, 2).join(' ')
            )}
          >
            <Icon class="size-5 text-white drop-shadow" />
          </div>
          <div class="flex-1 min-w-0">
            <CardTitle class="text-base">
              {t(option.nameKey, currentLanguage)}
            </CardTitle>
            <CardDescription class="mt-1">
              {t(option.descriptionKey, currentLanguage)}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    {/each}
  </div>

  <Card class="glassmorphism-card">
    <CardContent class="flex items-center gap-3 py-4">
      <AlertTriangle class="size-5 text-amber-500 flex-shrink-0" />
      <p class="text-sm text-muted-foreground">
        These actions affect your keyboard's firmware and settings. Use with caution.
      </p>
    </CardContent>
  </Card>
</div>

<style>
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 400ms ease-out;
  }
</style>
