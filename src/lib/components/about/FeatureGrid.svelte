<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  let currentLanguage = $derived($language);
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
  <!-- Performance Features -->
  <div
    class="glassmorphism-card rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300"
  >
    <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
      {t('about.performance', currentLanguage)}
    </h4>
    <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
      <li class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
        {t('about.adjustableActuation', currentLanguage)}
      </li>
      <li class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
        {t('about.rapidTrigger', currentLanguage)}
      </li>
      <li class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
        {t('about.realtimeMonitoring', currentLanguage)}
      </li>
    </ul>
  </div>

  <!-- Advanced Features -->
  <div
    class="glassmorphism-card rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300"
  >
    <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
      {t('about.advancedKeys', currentLanguage)}
    </h4>
    <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
      <li class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
        {t('about.tapHold', currentLanguage)}
      </li>
      <li class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
        {t('about.toggleModes', currentLanguage)}
      </li>
      <li class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
        {t('about.dynamicKeystroke', currentLanguage)}
      </li>
      <li class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
        {t('about.nullBind', currentLanguage)}
      </li>
    </ul>
  </div>

  <!-- Customization -->
  <div
    class="glassmorphism-card rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300"
  >
    <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
      {t('about.customization', currentLanguage)}
    </h4>
    <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
      <li class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
        {t('about.rgbLighting', currentLanguage)}
      </li>
      <li class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
        {t('about.keyRemapping', currentLanguage)}
      </li>
      <li class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
        {t('about.multipleThemes', currentLanguage)}
      </li>
      <li class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
        {t('about.darkLightMode', currentLanguage)}
      </li>
    </ul>
  </div>

  <!-- Technical -->
  <div
    class="glassmorphism-card rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300"
  >
    <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
      {t('about.technical', currentLanguage)}
    </h4>
    <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
      <li class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
        {t('about.crossPlatform', currentLanguage)}
      </li>
      <li class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
        {t('about.hardwareCalibration', currentLanguage)}
      </li>
      <li class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
        {t('about.debugTools', currentLanguage)}
      </li>
      <li class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
        {t('about.profileImportExport', currentLanguage)}
      </li>
    </ul>
  </div>
</div>
