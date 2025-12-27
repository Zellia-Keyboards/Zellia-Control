<script lang="ts">
  import { keyboardConnectionState } from '$lib/api/keyboardAPI.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { selectedKeys } from '$lib/stores/SelectedKeysStore';
  import * as ekc from 'emi-keyboard-controller';
  import tinycolor from 'tinycolor2';
  import { rgbBaseConfig, rgbConfigs } from '$lib/stores/ControllerStore.svelte';
  import RGBPanel from '$lib/components/lighting/RGBPanel.svelte';
  import RGBSubPanel from '$lib/components/lighting/RGBSubPanel.svelte';

  let currentLanguage = $derived($language);

  // Local state for configs
  let baseConfig = $state(new ekc.RGBBaseConfig());
  let subConfig = $state(new ekc.RGBConfig());
  let keyboardKeys = $state<Array<{ x: number; y: number; width: number; height: number }>>([]);
  let allRgbConfigs = $state<ekc.RGBConfig[]>([]);

  // Convert RGB to hex helper
  function rgbToHex(rgb: { red: number; green: number; blue: number }): string {
    const toHex = (c: number) => ('0' + Math.floor(c).toString(16)).slice(-2);
    return `#${toHex(rgb.red)}${toHex(rgb.green)}${toHex(rgb.blue)}`;
  }

  // Initialize from stores
  $effect(() => {
    const unsubscribeBase = rgbBaseConfig.subscribe((config) => {
      baseConfig = config;
    });

    const unsubscribeConfigs = rgbConfigs.subscribe((configs) => {
      allRgbConfigs = configs;
      if (configs.length > 0) {
        subConfig = { ...configs[0] };
      }
    });

    return () => {
      unsubscribeBase();
      unsubscribeConfigs();
    };
  });

  // Handle base config changes
  function handleBaseConfigChange(config: ekc.RGBBaseConfig) {
    baseConfig = config;
    rgbBaseConfig.update(() => config);
    keyboardConnectionState.controller?.send_rgb_base_packet(config);
  }

  // Handle sub config changes
  function handleSubConfigChange(config: ekc.RGBConfig) {
    subConfig = config;

    // Apply to selected keys or all keys
    const keysToUpdate = $selectedKeys.length > 0 ? $selectedKeys : allRgbConfigs.map((_, i) => i);

    rgbConfigs.update((currentConfigs) => {
      const newConfigs = [...currentConfigs];
      for (const index of keysToUpdate) {
        if (index >= 0 && index < newConfigs.length) {
          newConfigs[index] = { ...config };
        }
      }
      return newConfigs;
    });

    // Send to keyboard
    keyboardConnectionState.controller?.send_rgb_packet(keysToUpdate, config);
  }
</script>

<div
  class="rounded-2xl shadow mt-2 mb-4 grow bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col glassmorphism-card"
  style="padding: calc(2rem * var(--ui-scale, 1));"
>
  <div
    class="flex items-center justify-between -mt-4"
    style="margin-bottom: calc(0.5rem * var(--ui-scale, 1));"
  >
    <h2
      class="font-bold text-black dark:text-white"
      style="font-size: calc(1.5rem * var(--ui-scale, 1));"
    >
      {t('lighting.title', currentLanguage)}
    </h2>
  </div>

  <div
    class="rounded-xl shadow flex flex-col lg:flex-row flex-1 gap-4"
    style="gap: calc(1rem * var(--ui-scale, 1));"
  >
    <!-- Base Configuration Panel -->
    <div class="flex-1 min-w-0">
      <RGBPanel
        baseConfig={baseConfig}
        onConfigChange={handleBaseConfigChange}
        title={t('lighting.baseConfigTitle', currentLanguage)}
      />
    </div>

    <!-- Sub Configuration Panel -->
    <div class="flex-1 min-w-0">
      <RGBSubPanel
        config={subConfig}
        onConfigChange={handleSubConfigChange}
        {keyboardKeys}
        rgbConfigs={allRgbConfigs}
        title={t('lighting.subConfigTitle', currentLanguage)}
      />
    </div>
  </div>
</div>
