<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { Keyboard, Heart } from 'lucide-svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import DonationSection from '$lib/components/about/DonationSection.svelte';
  import LibrarySection from '$lib/components/about/LibrarySection.svelte';
  import FeatureGrid from '$lib/components/about/FeatureGrid.svelte';

  let currentLanguage = $derived($language);

  function openLibraryGitHub() {
    window.open('https://github.com/Zellia-Keyboards/zellia_libamp', '_blank');
  }
</script>

<div class="flex-1 w-full p-6">
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white">
          {t('about.title', currentLanguage)}
        </h2>
        <p class="text-gray-600 dark:text-gray-300 mt-2">
          {t('about.subtitle', currentLanguage)}
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="space-y-8">
      <!-- App Info Section -->
      <div
        class="{$glassmorphismMode
          ? 'glassmorphism-card'
          : 'bg-white dark:bg-black'} rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300"
      >
        <div class="flex items-start gap-6">
          <div class="flex-shrink-0">
            <div
              class="w-16 h-16 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-black"
            >
              <Keyboard class="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">
              {t('about.appName', currentLanguage)}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {t('about.appDescription', currentLanguage)}
            </p>
            <div class="flex items-center gap-4 text-sm">
              <div class="flex items-center gap-2 text-primary-600">
                <div class="w-2 h-2 rounded-full bg-primary-600"></div>
                <span>{t('about.version', currentLanguage)}</span>
              </div>
              <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <div class="w-2 h-2 rounded-full bg-gray-400 dark:bg-black"></div>
                <span>{t('about.builtWith', currentLanguage)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Features Grid -->
      <FeatureGrid />

      <!-- Open Source Library Section -->
      <LibrarySection onGitHubClick={openLibraryGitHub} />

      <DonationSection />

      <!-- Contact/Links -->
      <div
        class="{$glassmorphismMode
          ? 'glassmorphism-card'
          : 'bg-white dark:bg-black'} rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center transition-all duration-300"
      >
        <h3
          class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-2"
        >
          Made with <Heart class="w-5 h-5 text-gray-900 dark:text-white" /> for the Hall Effect keyboard community
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          © 2025 Zellia Control. All rights reserved
        </p>
      </div>
    </div>
  </div>
</div>
