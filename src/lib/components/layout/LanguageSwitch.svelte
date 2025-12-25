<script lang="ts">
  import { Globe } from 'lucide-svelte';
  import { language, t, type Language } from '$lib/stores/LanguageStore.svelte';
  import {
    selectedThemeColor,
    themeColors,
  } from '$lib/stores/DarkModeStore.svelte';

  let currentLanguage = $derived($language);
  let currentTheme = $state($selectedThemeColor);

  selectedThemeColor.subscribe(value => {
    currentTheme = value;
  });

  function setLanguage(lang: Language) {
    language.set(lang);
  }
</script>

<div class="p-3">
  <div class="flex items-center gap-2 mb-2">
    <Globe class="w-4 h-4 text-gray-600 dark:text-gray-400" />
    <span class="text-sm font-medium text-gray-900 dark:text-white"
      >{t('ui.language', currentLanguage)}</span
    >
  </div>

  <div
    class="relative inline-flex w-full rounded-lg p-1 glassmorphism-card"
  >
    <div
      class="language-switch-slider absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md transition-all duration-300 ease-out shadow-lg language-slider-bg"
      style="left: {currentLanguage === 'en' ? '4px' : 'calc(50% + 0px)'}; transform: translateZ(0); {currentTheme ? `
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        background: linear-gradient(135deg,
          ${themeColors[currentTheme]}CC,
          ${themeColors[currentTheme]}99
        );
        box-shadow:
          0 8px 16px -4px ${themeColors[currentTheme]}40,
          0 4px 8px -2px ${themeColors[currentTheme]}30,
          inset 0 1px 0 0 rgba(255, 255, 255, 0.15),
          inset 0 -1px 0 0 rgba(0, 0, 0, 0.1);
        border: 1px solid ${themeColors[currentTheme]}33;
      ` : ''}"
    ></div>

    <button
      class="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 relative z-10 {currentLanguage === 'en' ? 'text-white font-semibold' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}"
      onclick={() => setLanguage('en')}
    >
      EN
    </button>
    <button
      class="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 relative z-10 {currentLanguage === 'zh' ? 'text-white font-semibold' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}"
      onclick={() => setLanguage('zh')}
    >
      中文
    </button>
  </div>
</div>

<style lang="postcss">
  /* Language switch slider */
  .language-switch-slider {
    will-change: left;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Glassmorphism default styling for language slider (no theme) */
  .language-slider-bg:not(.bg-gray-900):not(.bg-white):not(.bg-primary-500) {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    background: linear-gradient(135deg, rgba(17, 24, 39, 0.85), rgba(17, 24, 39, 0.7));
    box-shadow:
      0 8px 16px -4px rgba(0, 0, 0, 0.25),
      0 4px 8px -2px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.15),
      inset 0 -1px 0 0 rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(0, 0, 0, 0.2);
  }

  /* Dark mode: use white glassmorphism when no theme is selected */
  :global(.dark) .language-slider-bg:not(.bg-gray-900):not(.bg-white):not(.bg-primary-500) {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.7));
    box-shadow:
      0 8px 16px -4px rgba(255, 255, 255, 0.25),
      0 4px 8px -2px rgba(255, 255, 255, 0.2),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
      inset 0 -1px 0 0 rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
</style>
