<script lang="ts">
  import { goto } from '$app/navigation';
  import { darkMode, glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import NewZellia80He from '$lib/NewZellia80HE.svelte';
  import { Zap, RotateCcw, Settings, Target } from 'lucide-svelte';
  import { language, t } from '$lib/LanguageStore.svelte';

  let currentLanguage = $state($language);

  // Subscribe to language changes
  language.subscribe(value => {
    currentLanguage = value;
  });

  // Add the missing state variable
  let currentSelectedKey = $state<[number, number] | null>(null);
  // Available advanced key modes
  const keyModes = $derived([
    {
      id: 'tap-hold',
      name: t('advancedkey.tapHold', currentLanguage),
      description: t('advancedkey.tapHoldDesc', currentLanguage),
      icon: Zap,
      path: '/advancedkey/routes/tap-hold',
      features: [
        t('advancedkey.tapHoldFeature1', currentLanguage),
        t('advancedkey.tapHoldFeature2', currentLanguage),
        t('advancedkey.tapHoldFeature3', currentLanguage),
        t('advancedkey.tapHoldFeature4', currentLanguage),
      ],
    },
    {
      id: 'toggle',
      name: t('advancedkey.toggle', currentLanguage),
      description: t('advancedkey.toggleDesc', currentLanguage),
      icon: RotateCcw,
      path: '/advancedkey/routes/toggle',
      features: [
        t('advancedkey.toggleFeature1', currentLanguage),
        t('advancedkey.toggleFeature2', currentLanguage),
        t('advancedkey.toggleFeature3', currentLanguage),
        t('advancedkey.toggleFeature4', currentLanguage),
      ],
    },
    {
      id: 'dynamic',
      name: t('advancedkey.dynamic', currentLanguage),
      description: t('advancedkey.dynamicDesc', currentLanguage),
      icon: Settings,
      path: '/advancedkey/routes/dynamic',
      features: [
        t('advancedkey.dynamicFeature1', currentLanguage),
        t('advancedkey.dynamicFeature2', currentLanguage),
        t('advancedkey.dynamicFeature3', currentLanguage),
        t('advancedkey.dynamicFeature4', currentLanguage),
      ],
    },
    {
      id: 'null-bind',
      name: t('advancedkey.nullBind', currentLanguage),
      description: t('advancedkey.nullBindDesc', currentLanguage),
      icon: Target,
      path: '/advancedkey/routes/nullbind',
      features: [
        t('advancedkey.nullBindFeature1', currentLanguage),
        t('advancedkey.nullBindFeature2', currentLanguage),
        t('advancedkey.nullBindFeature3', currentLanguage),
        t('advancedkey.nullBindFeature4', currentLanguage),
      ],
    },
  ]);

  function navigateToMode(path: string): void {
    goto(path);
  }
</script>

<NewZellia80He
  onClick={(x, y, event) => {
    console.log(`Key clicked at (${x}, ${y})`, event);
  }}
  bind:currentSelectedKey
>
  {#snippet body(x, y)}
  <div       class="hover:scale-90 transition-all duration-300 h-14 {$darkMode
        ? 'bg-black border-gray-700'
        : 'bg-gray-50 border-gray-400'} data-[selected=true]:bg-gray-500 data-[selected=true]:border-gray-700 data-[selected=true]:border-4 border rounded-lg flex flex-col items-center justify-center hover:cursor-pointer gap-1 font-sans text-white"
></div>{/snippet}
</NewZellia80He>
<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''} {$darkMode ? 'border border-gray-600 text-white' : 'text-black'} h-full flex flex-col"
  style="background-color: {$darkMode
    ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)`
    : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`};"
>
  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="text-3xl font-bold {$darkMode ? 'text-white' : 'text-gray-900'}">
        {t('advancedkey.title', currentLanguage)}
      </h2>
      <p class="{$darkMode ? 'text-gray-300' : 'text-gray-600'} mt-2">
        {t('advancedkey.subtitle', currentLanguage)}
      </p>
    </div>
  </div>
  <!-- Getting Started Section -->
  <div
    class=" rounded-xl p-6 border mb-4"
    style="background: {$darkMode
      ? 'color-mix(in srgb, var(--theme-color-primary) 8%, #111827)'
      : 'color-mix(in srgb, var(--theme-color-primary) 5%, #f9fafb)'};
                    border-color: {$darkMode
      ? 'color-mix(in srgb, var(--theme-color-primary) 15%, #374151)'
      : 'color-mix(in srgb, var(--theme-color-primary) 10%, #e5e7eb)'};"
  >
    <h3 class="text-lg font-semibold {$darkMode ? 'text-white' : 'text-gray-900'} mb-3">
      {t('advancedkey.gettingStarted', currentLanguage)}
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
      <div class="flex items-start gap-3">
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style="background-color: var(--theme-color-primary);"
        >
          1
        </div>
        <div>
          <div class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">
            {t('advancedkey.step1Title', currentLanguage)}
          </div>
          <div class={$darkMode ? 'text-gray-300' : 'text-gray-600'}>
            {t('advancedkey.step1Desc', currentLanguage)}
          </div>
        </div>
      </div>
      <div class="flex items-start gap-3">
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style="background-color: var(--theme-color-primary);"
        >
          2
        </div>
        <div>
          <div class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">
            {t('advancedkey.step2Title', currentLanguage)}
          </div>
          <div class={$darkMode ? 'text-gray-300' : 'text-gray-600'}>
            {t('advancedkey.step2Desc', currentLanguage)}
          </div>
        </div>
      </div>
      <div class="flex items-start gap-3">
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style="background-color: var(--theme-color-primary);"
        >
          3
        </div>
        <div>
          <div class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">
            {t('advancedkey.step3Title', currentLanguage)}
          </div>
          <div class={$darkMode ? 'text-gray-300' : 'text-gray-600'}>
            {t('advancedkey.step3Desc', currentLanguage)}
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="grid grid-cols-4 gap-6">
    {#each keyModes as mode}
      <div class="group relative w-full">
        <button
          class="w-full h-full p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 text-left group-hover:scale-105 flex flex-col {$glassmorphismMode
            ? 'glassmorphism-card'
            : ''}"
          style="background-color: {$darkMode ? 'black' : 'white'}; 
                           border-color: {$darkMode
            ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #374151)'
            : 'color-mix(in srgb, var(--theme-color-primary) 15%, #e5e7eb)'};
                           --hover-border: var(--theme-color-primary);"
          onmouseover={e =>
            ((e.currentTarget as HTMLElement).style.borderColor = 'var(--theme-color-primary)')}
          onmouseout={e =>
            ((e.currentTarget as HTMLElement).style.borderColor = $darkMode
              ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #374151)'
              : 'color-mix(in srgb, var(--theme-color-primary) 15%, #e5e7eb)')}
          onclick={() => navigateToMode(mode.path)}
        >
          <!-- Mode Header -->
          <div class="flex items-center gap-4 mb-4">
            <div class="flex items-center justify-center w-10 h-10">
              <svelte:component
                this={mode.icon}
                class="w-8 h-8"
                style="color: var(--theme-color-primary);"
              />
            </div>
            <div class="flex-1">
              <h3
                class="text-xl font-bold transition-colors"
                style="color: {$darkMode ? 'white' : '#111827'};"
                onmouseover={e =>
                  ((e.currentTarget as HTMLElement).style.color = 'var(--theme-color-primary)')}
                onmouseout={e =>
                  ((e.currentTarget as HTMLElement).style.color = $darkMode ? 'white' : '#111827')}
              >
                {mode.name}
              </h3>
              <p class="text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'} mt-1">
                {mode.description}
              </p>
            </div>
          </div>
          <div class="space-y-2 flex-1">
            {#each mode.features as feature}
              <div
                class="flex items-center gap-2 text-sm {$darkMode
                  ? 'text-gray-300'
                  : 'text-gray-700'}"
              >
                <div
                  class="w-1.5 h-1.5 rounded-full"
                  style="background-color: var(--theme-color-primary);"
                ></div>
                <span>{feature}</span>
              </div>
            {/each}
          </div>
          <!-- Action Arrow -->
          <div
            class="absolute top-6 right-6 text-gray-400 transition-colors"
            style="transition: color 0.3s ease;"
            onmouseover={e =>
              ((e.currentTarget as HTMLElement).style.color = 'var(--theme-color-primary)')}
            onmouseout={e => ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"
              ></path>
            </svg>
          </div>
        </button>
      </div>
    {/each}
  </div>
  <div class="mt-4 text-center {$darkMode ? 'text-gray-300' : 'text-gray-600'}">
    <p class="text-sm">
      {t('advancedkey.infoDesc', currentLanguage)}
    </p>
  </div>
</div>
