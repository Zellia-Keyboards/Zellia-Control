<script lang="ts">
  import { Palette, ChevronDown } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import {
    selectedThemeColor,
    themeColors,
    type ThemeColorName,
  } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Tooltip, TooltipTrigger, TooltipContent } from '$lib/components/ui/tooltip';
  import { cn } from '$lib/utils.js';

  let showThemeSelector = $state(false);
  let currentTheme = $state<ThemeColorName | null>(null);
  let currentLanguage = $derived($language);

  selectedThemeColor.subscribe(value => {
    currentTheme = value;
  });

  function setTheme(colorName: ThemeColorName) {
    if (currentTheme === colorName) {
      selectedThemeColor.set(null);
    } else {
      selectedThemeColor.set(colorName);
    }
  }
</script>

<div class="p-3">
  <Button
    variant="secondary"
    class="w-full justify-between gap-3 glassmorphism-button"
    onclick={() => (showThemeSelector = !showThemeSelector)}
  >
    <span class="flex items-center gap-3">
      <Palette class="size-4" />
      <span>{t('ui.themeColors', currentLanguage)}</span>
    </span>
    <ChevronDown
      class={cn('size-4 transition-transform', showThemeSelector && 'rotate-180')}
    />
  </Button>

  {#if showThemeSelector}
    <div class="grid grid-cols-4 gap-2 mt-2" transition:slide={{ duration: 300, axis: 'y' }}>
      {#each Object.entries(themeColors) as [name, color] (name)}
        {@const active = currentTheme === name}
        <Tooltip>
          <TooltipTrigger>
            {#snippet child({ props })}
              <button
                {...props}
                aria-label={name}
                class={cn(
                  'w-full h-7 rounded border transition-all duration-150',
                  active
                    ? 'border-foreground ring-2 ring-ring'
                    : 'border-border hover:border-muted-foreground'
                )}
                style="background-color: {color};"
                onclick={() => setTheme(name as ThemeColorName)}
              ></button>
            {/snippet}
          </TooltipTrigger>
          <TooltipContent side="top">
            {name.charAt(0).toUpperCase() + name.slice(1)}{active ? ' (click to deselect)' : ''}
          </TooltipContent>
        </Tooltip>
      {/each}
    </div>
  {/if}
</div>
