<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { ArrowRight } from 'lucide-svelte';
  import type { ComponentType } from 'svelte';
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
  } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';

  interface KeyMode {
    id: string;
    name: string;
    description: string;
    icon: ComponentType;
    features: string[];
  }

  interface Props {
    onSelectMode: (modeId: string) => void;
    keyModes: KeyMode[];
  }

  let { onSelectMode, keyModes }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<header class="mb-6">
  <h2 class="text-3xl font-bold tracking-tight">
    {t('advancedkey.title', currentLanguage)}
  </h2>
  <p class="text-muted-foreground mt-2">
    {t('advancedkey.subtitle', currentLanguage)}
  </p>
</header>

<!-- Getting Started -->
<Card
  class="mb-4 glassmorphism-card border-primary-500/20"
  style="background: color-mix(in srgb, var(--theme-color-primary) 5%, transparent);"
>
  <CardHeader>
    <CardTitle class="text-lg">
      {t('advancedkey.gettingStarted', currentLanguage)}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
      {#each [1, 2, 3] as step}
        <div class="flex items-start gap-3">
          <Badge
            variant="default"
            class="size-6 rounded-full p-0 flex items-center justify-center text-xs font-bold bg-primary-500 hover:bg-primary-500 text-white"
          >
            {step}
          </Badge>
          <div>
            <div class="font-medium">
              {t(`advancedkey.step${step}Title`, currentLanguage)}
            </div>
            <div class="text-muted-foreground">
              {t(`advancedkey.step${step}Desc`, currentLanguage)}
            </div>
          </div>
        </div>
      {/each}
    </div>
  </CardContent>
</Card>

<!-- Mode grid -->
<div class="grid grid-cols-4 gap-6">
  {#each keyModes as mode}
    {@const Icon = mode.icon}
    <Card
      role="button"
      tabindex={0}
      onclick={() => onSelectMode(mode.id)}
      onkeydown={e => (e.key === 'Enter' || e.key === ' ') && onSelectMode(mode.id)}
      class="group relative cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary-500/60 border-2 glassmorphism-card"
    >
      <CardHeader>
        <div class="flex items-center gap-4">
          <div class="size-10 flex items-center justify-center">
            <Icon class="size-8 text-primary-500" />
          </div>
          <div class="flex-1">
            <CardTitle class="text-xl group-hover:text-primary-500 transition-colors">
              {mode.name}
            </CardTitle>
            <CardDescription class="mt-1">
              {mode.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul class="space-y-2">
          {#each mode.features as feature}
            <li class="flex items-center gap-2 text-sm text-foreground/80">
              <span class="size-1.5 rounded-full bg-primary-500"></span>
              <span>{feature}</span>
            </li>
          {/each}
        </ul>
      </CardContent>
      <ArrowRight
        class="absolute top-6 right-6 size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary-500"
      />
    </Card>
  {/each}
</div>

<p class="mt-4 text-center text-sm text-muted-foreground">
  {t('advancedkey.infoDesc', currentLanguage)}
</p>
