<script lang="ts">
  import { ArrowRight, ArrowLeft, ArrowDown, ArrowUp } from 'lucide-svelte';
  import { keyboardAPI, keyboardConnectionState } from '$lib/api/keyboardAPI.svelte';
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { selectedKeys } from '$lib/stores/SelectedKeysStore';
  import { selectedCount, toggleSelectAll, deselectAll } from '$lib/stores/SelectedKeysStore';
  import * as ekc from 'emi-keyboard-controller';
  import { color } from 'chart.js/helpers';
  import tinycolor from 'tinycolor2';
  import { rgbBaseConfig, rgbConfigs } from '$lib/stores/ControllerStore.svelte';
  import EffectSelector from '$lib/components/lighting/EffectSelector.svelte';
  import BrightnessControl from '$lib/components/lighting/BrightnessControl.svelte';
  import SpeedControl from '$lib/components/lighting/SpeedControl.svelte';
  import ColorPicker from '$lib/components/lighting/ColorPicker.svelte';
  import DirectionSelector from '$lib/components/lighting/DirectionSelector.svelte';

  // Helper function for string formatting
  const formatString = (template: string, ...args: (string | number)[]): string => {
    return template.replace(/{(\d+)}/g, (match, index) => {
      return args[index] !== undefined ? String(args[index]) : match;
    });
  };

  let currentLanguage = $derived($language);

  // Subscribe to language changes
  language.subscribe(value => {
    currentLanguage = value;
  });

  let selectedGlobalEffect = $state('blank');
  let selectedEffect = $state('static');
  let brightness = $state(100); // Frontend display value (0-100)
  let speed = $state(50);
  let direction = $state('left-to-right');
  let staticColor = $state('#ff0000');
  let selectedLayer = $state(1);
  let keyColor = $state('#ffffff');
  let effectMode = $state<'global' | 'per-key'>('per-key'); // Track effect scope

  let CurrentSelected = $state<[number, number] | null>(null);

  // Convert frontend brightness (0-100) to hardware brightness (0-70)
  function getHardwareBrightness(frontendBrightness: number): number {
    return Math.round((frontendBrightness / 100) * 70);
  } // Convert hardware brightness (0-70) to frontend brightness (0-100)
  function getFrontendBrightness(hardwareBrightness: number): number {
    return Math.round((hardwareBrightness / 70) * 100);
  }

  // Global effects - apply to entire keyboard (全键盘效果)
  const globalEffects = $derived([
    {
      id: 'blank',
      name: t('lighting.blank', currentLanguage), // 彩虹
      description: t('lighting.rainbowDesc', currentLanguage),
      mode: 'global' as const,
    },
    {
      id: 'rainbow',
      name: t('lighting.rainbow', currentLanguage), // 彩虹
      description: t('lighting.rainbowDesc', currentLanguage),
      mode: 'global' as const,
    },
    {
      id: 'wave',
      name: t('lighting.wave', currentLanguage), // 波浪
      description: t('lighting.waveDesc', currentLanguage),
      mode: 'global' as const,
    },
    {
      id: 'breathing',
      name: t('lighting.breathing', currentLanguage), // 呼吸
      description: t('lighting.breathingDesc', currentLanguage),
      mode: 'global' as const,
    },
  ]);

  // Per-key effects - can be customized per key (单键效果)
  const perKeyEffects = $derived([
    {
      id: 'static',
      name: t('lighting.static', currentLanguage),
      description: t('lighting.staticDesc', currentLanguage),
      mode: 'per-key' as const,
    },
    {
      id: 'reactive',
      name: t('lighting.reactive', currentLanguage),
      description: t('lighting.reactiveDesc', currentLanguage),
      mode: 'per-key' as const,
    },
    {
      id: 'ripple',
      name: t('lighting.ripple', currentLanguage),
      description: t('lighting.rippleDesc', currentLanguage),
      mode: 'per-key' as const,
    },
  ]);

  const directions = $derived([
    { id: 'left-to-right', name: t('lighting.leftToRight', currentLanguage), icon: ArrowRight },
    { id: 'right-to-left', name: t('lighting.rightToLeft', currentLanguage), icon: ArrowLeft },
    { id: 'top-to-bottom', name: t('lighting.topToBottom', currentLanguage), icon: ArrowDown },
    { id: 'bottom-to-top', name: t('lighting.bottomToTop', currentLanguage), icon: ArrowUp },
  ]);

  function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  function toggleKeySelection() {}

  function applyToSelectedKeys() {
    // Apply current color to selected keys
    console.log('Applying color to selected keys:', selectedKeys);
  }

  function clearKeySelection() {
    //selectedKeys.clear();
    //selectedKeys = new Set(selectedKeys);
  }

  function applySettings() {
    const hardwareBrightness = getHardwareBrightness(brightness);

    console.log('Applying lighting settings:', {
      effect: selectedGlobalEffect,
      effectMode,
      brightness: hardwareBrightness, // Send hardware value (0-70)
      frontendBrightness: brightness, // For reference (0-100)
      speed,
      direction,
      staticColor,
      layer: selectedLayer,
      selectedKeys: effectMode === 'per-key' ? Array.from(selectedKeys) : 'all',
    });
  }

  // Update effect mode when selecting an effect
  function selectEffect(effectId: string, mode: 'global' | 'per-key') {
    if (mode == 'global') {
      selectedGlobalEffect = effectId;
    } else {
      selectedEffect = effectId;
    }
    effectMode = mode;
  }

  let rGBBaseConfig: ekc.RGBBaseConfig = $derived.by(() => {
    var rgb = new ekc.RGBBaseConfig();

    rgb.brightness = brightness;
    switch (selectedGlobalEffect) {
      case 'rainbow':
        rgb.mode = ekc.RGBBaseMode.RgbBaseModeRainbow;
        rgb.speed = speed;
        rgb.density = 10;
        break;
      case 'wave':
        rgb.mode = ekc.RGBBaseMode.RgbBaseModeWave;
        rgb.speed = speed;
        rgb.density = 10;
        break;
      case 'breathing':
        rgb.mode = ekc.RGBBaseMode.RgbBaseModeWave;
        rgb.speed = speed;
        rgb.density = 0.001;
        break;
      default:
        rgb.mode = ekc.RGBBaseMode.RgbBaseModeBlank;
        break;
    }
    var c = tinycolor(staticColor).toRgb();
    rgb.rgb.red = c.r;
    rgb.rgb.green = c.g;
    rgb.rgb.blue = c.b;
    return rgb;
  });

  let rGBConfig: ekc.RGBConfig = $derived.by(() => {
    var rgb = new ekc.RGBConfig();

    switch (selectedEffect) {
      case 'static':
        rgb.mode = ekc.RGBMode.RgbModeStatic;
        break;
      case 'reactive':
        rgb.mode = ekc.RGBMode.RgbModeLinear;
        break;
      case 'ripple':
        rgb.mode = ekc.RGBMode.RgbModeFadingDiamondRipple;
        rgb.speed = 1;
        break;
      default:
        rgb.mode = ekc.RGBMode.RgbModeLinear;
        break;
    }
    var c = tinycolor(staticColor).toRgb();
    rgb.rgb.red = c.r;
    rgb.rgb.green = c.g;
    rgb.rgb.blue = c.b;
    return rgb;
  });

  let hasSelection = $state(false);
  $effect(() => {
    const keysToUpdate = $selectedKeys;
    const isSelected = $selectedKeys.length > 0;
    if (isSelected && !hasSelection) {
      let rgb = $rgbConfigs[$selectedKeys[0]];
      speed = rgb.speed;
    }
    // 只有在有按键被选中的时候才更新
    if (keysToUpdate.length === 0) {
      return;
    }
    hasSelection = isSelected;

    // 更新 advancedKeys 存储
    rgbConfigs.update(currentKeys => {
      // 创建一个新的数组副本进行修改
      const newKeys = [...currentKeys];
      const config = rGBConfig;

      // 遍历所有选中的按键索引，将配置应用到对应位置
      for (const index of keysToUpdate) {
        // 确保索引在数组范围内，并应用新的配置
        if (index >= 0 && index < newKeys.length) {
          // 创建一个新对象以避免直接修改旧对象（保持不变性）
          newKeys[index] = { ...config };
        }
      }
      return newKeys;
    });
    console.log(rGBConfig);
    keyboardConnectionState.controller?.send_rgb_packet($selectedKeys, rGBConfig);
  });
  $effect(() => {
    rgbBaseConfig.update(() => {
      return rGBBaseConfig;
    });
    keyboardConnectionState.controller?.send_rgb_base_packet(rGBBaseConfig);
  });
</script>

<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
>
  <div class="flex items-center justify-between -mt-4 mb-2">
    <h2 class="text-2xl font-bold text-black dark:text-white">
      {t('lighting.title', currentLanguage)}
    </h2>
    <div class="flex gap-2 mb-2">
      <button
        class="px-4 py-2 rounded transition-colors text-white {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''}"
        style="background-color: var(--theme-color-primary);"
        onclick={applySettings}
      >
        {t('lighting.applySettings', currentLanguage)}
      </button>
    </div>
  </div>

  <div
    class="rounded-xl shadow p-4 flex flex-col lg:flex-row gap-4 flex-1 {$glassmorphismMode
      ? 'glassmorphism-card'
      : ''}"
  >
    <!-- Left: Effects Panel -->
    <div class="flex-1">
      <!-- Global Effects (全键盘效果) -->
      <EffectSelector
        effects={globalEffects}
        selectedEffect={selectedGlobalEffect}
        title={t('lighting.globalEffects', currentLanguage)}
        badge="allKeys"
        onSelectEffect={selectEffect}
      />

      <!-- Per-Key Effects (单键效果) -->
      <EffectSelector
        effects={perKeyEffects}
        selectedEffect={selectedEffect}
        title={t('lighting.perKeyEffects', currentLanguage)}
        badge="customizable"
        onSelectEffect={selectEffect}
      />
    </div>

    <!-- Right: Settings Panel -->
    <div class="flex-1 space-y-3">
      <!-- Brightness -->
      <BrightnessControl
        {brightness}
        onBrightnessChange={(value) => (brightness = value)}
      />

      <!-- Speed (for animated effects) -->
      {#if ['breathing', 'wave', 'rainbow'].includes(selectedGlobalEffect) || ['ripple'].includes(selectedEffect)}
        <SpeedControl {speed} onSpeedChange={(value) => (speed = value)} />
      {/if}

      <!-- Color (for applicable effects) -->
      <ColorPicker color={staticColor} onColorChange={(value) => (staticColor = value)} />

      <!-- Direction (for directional effects) -->
      {#if ['rainbow'].includes(selectedGlobalEffect)}
        <DirectionSelector
          {directions}
          selectedDirection={direction}
          onDirectionChange={(value) => (direction = value)}
        />
      {/if}
    </div>
  </div>
</div>


