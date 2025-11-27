<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { keyboardAPI, keyboardConnectionState } from '$lib/api/keyboardAPI.svelte';
  import { AlertTriangle, AppleIcon, LetterText } from 'lucide-svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { selectedCount, toggleSelectAll, deselectAll } from '$lib/stores/SelectedKeysStore';
  import * as ekc from 'emi-keyboard-controller';
  import { advancedKeys } from '$lib/stores/ControllerStore.svelte';
  import { selectedKeys } from '$lib/stores/SelectedKeysStore';
  import ActuationPointControl from '$lib/components/performance/ActuationPointControl.svelte';
  import RapidTriggerToggle from '$lib/components/performance/RapidTriggerToggle.svelte';
  import DeadzoneControl from '$lib/components/performance/DeadzoneControl.svelte';
  import SensitivityControl from '$lib/components/performance/SensitivityControl.svelte';

  //let advancedKey : ekc.AdvancedKey = $derived.by(()=>{
  //  var k = new ekc.AdvancedKey();
  //  k.mode = rapidTriggerEnabled ? ekc.KeyMode.KeyAnalogRapidMode : ekc.KeyMode.KeyAnalogNormalMode;
  //  k.activation_value = mmToPercent(actuationPoint);
  //  k.trigger_distance = mmToPercent(pressSensitivity);
  //  k.release_distance = mmToPercent(releaseSensitivity);
  //  k.upper_deadzone = mmToPercent(upperDeadzone);
  //  k.lower_deadzone = mmToPercent(4.0 - lowerDeadzone);
  //  return k;
  //});

  function mmToPercent(distance: number) {
    return distance / 4.0;
  }

  function percentToMm(distance: number) {
    return distance * 4.0;
  }

  let currentLanguage = $derived($language);

  let rapidTriggerEnabled = $state(false);
  let actuationPoint = $state(2.0);
  let deactivationPoint = $state(1.5); // Deactivation point (must be <= actuation point)
  let sensitivityValue = $state(0.5);
  let separateSensitivity = $state(false);
  let pressSensitivity = $state(0.5);
  let releaseSensitivity = $state(0.5);
  let upperDeadzone = $state(0.5); // Start of key (top)
  let lowerDeadzone = $state(3.5); // Bottom of key
  let keysSelected = $state(0);

  let advancedKey: ekc.AdvancedKey = $derived.by(() => {
    var k = new ekc.AdvancedKey();

    // 基础模式和点位计算
    k.mode = rapidTriggerEnabled ? ekc.KeyMode.KeyAnalogRapidMode : ekc.KeyMode.KeyAnalogNormalMode;
    k.activation_value = mmToPercent(actuationPoint);
    k.deactivation_value = mmToPercent(deactivationPoint);
    // 灵敏度设置
    // 使用 separateSensitivity 来决定使用哪个值
    let finalPressSensitivity = separateSensitivity ? pressSensitivity : sensitivityValue;
    let finalReleaseSensitivity = separateSensitivity ? releaseSensitivity : sensitivityValue;

    k.trigger_distance = mmToPercent(finalPressSensitivity);
    k.release_distance = mmToPercent(finalReleaseSensitivity);

    // 死区设置 (仅在 Rapid Trigger 启用时有意义，但会设置)
    k.upper_deadzone = mmToPercent(upperDeadzone);
    k.lower_deadzone = mmToPercent(4.0 - lowerDeadzone); // 注意这里有一个 4.0 - lowerDeadzone 的转换
    return k;
  });

  let hasSelection = $state(false);

  $effect(() => {
    const keysToUpdate = $selectedKeys;
    const isSelected = $selectedKeys.length > 0;
    if (isSelected && !hasSelection) {
      let k = $advancedKeys[$selectedKeys[0]];
      rapidTriggerEnabled = k.mode === ekc.KeyMode.KeyAnalogRapidMode;
      separateSensitivity = k.trigger_distance != k.release_distance;
      pressSensitivity = percentToMm(k.trigger_distance);
      sensitivityValue = percentToMm(k.trigger_distance);
      releaseSensitivity = percentToMm(k.release_distance);
      upperDeadzone = percentToMm(k.upper_deadzone);
      lowerDeadzone = percentToMm(k.lower_deadzone);
    }
    // 只有在有按键被选中的时候才更新
    if (keysToUpdate.length === 0) {
      return;
    }
    hasSelection = isSelected;

    // 更新 advancedKeys 存储
    advancedKeys.update(currentKeys => {
      // 创建一个新的数组副本进行修改
      const newKeys = [...currentKeys];
      const config = advancedKey;

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
    keyboardConnectionState.controller?.send_advanced_key_packet($selectedKeys, advancedKey);
  });

  // Update local count from store (auto-subscribes)
  $derived: keysSelected = $selectedCount;

  // Keyboard shortcuts
  function onKeyDown(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey;
    // Ctrl+A behavior
    if (ctrl && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      toggleSelectAll();
      return;
    }

    // Ctrl+Escape => deselect all
    if (ctrl && e.key === 'Escape') {
      e.preventDefault();
      deselectAll();
      return;
    }
  }

  // Attach listener on mount
  import { onMount, onDestroy } from 'svelte';
  onMount(() => {
    window.addEventListener('keydown', onKeyDown);
  });
  onDestroy(() => {
    window.removeEventListener('keydown', onKeyDown);
  });
</script>

<div
  class="rounded-2xl shadow mt-2 mb-4 grow bg-primary-100 dark:bg-black border border-transparent dark:border-gray-600 text-black dark:text-white h-full flex flex-col {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
  style="padding: calc(2rem * var(--ui-scale, 1));"
>
  <div class="flex items-center justify-between" style="margin-bottom: calc(1rem * var(--ui-scale, 1));">
    <h2 class="font-bold text-gray-900 dark:text-white" style="font-size: calc(1.5rem * var(--ui-scale, 1));">
      {t('performance.title', currentLanguage)}
    </h2>
    <div class="flex gap-2">
      <!-- svelte-ignore a11y_mouse_events_have_key_events -->
      <button
        class="px-4 py-2 text-sm rounded mr-1 transition-colors duration-200 text-white {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''}"
        style="background-color: var(--theme-color-primary);"
        onmouseover={e =>
          ((e.currentTarget as HTMLElement).style.backgroundColor =
            'color-mix(in srgb, var(--theme-color-primary) 85%, black)')}
        onmouseout={e =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--theme-color-primary)')}
        onclick={() => toggleSelectAll()}
      >
        {t('performance.selectAllKeys', currentLanguage)}
      </button>
      <button
        class="bg-gray-200 hover:bg-gray-300 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white dark:border dark:border-white px-4 py-2 text-sm rounded transition-colors duration-200 {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''}"
        onclick={() => deselectAll()}
      >
        {t('performance.discardSelection', currentLanguage)}
      </button>
    </div>
  </div>
  <div
    class="rounded-xl shadow flex flex-col md:flex-row flex-1 {$glassmorphismMode
      ? 'glassmorphism-card'
      : ''}"
    style="padding: calc(1.25rem * var(--ui-scale, 1)); gap: calc(1.25rem * var(--ui-scale, 1));"
  >
    <!-- 1st Box: Actuation Point (with slide-out animation) -->
    <div class="actuation-point-container" class:slide-out={rapidTriggerEnabled}>
      <ActuationPointControl
        {actuationPoint}
        {deactivationPoint}
        {keysSelected}
        onActuationChange={value => (actuationPoint = value)}
        onDeactivationChange={value => (deactivationPoint = value)}
      />
    </div>

    <!-- Divider for desktop (with animation) -->
    <div class="divider-container" class:slide-out={rapidTriggerEnabled}>
      <div class="hidden md:block w-px bg-gray-200 dark:bg-white mx-2"></div>
    </div>

    <!-- 2nd Box: Rapid Trigger Toggle -->
    <div class="flex-1 min-w-[260px] flex flex-col">
      <RapidTriggerToggle {rapidTriggerEnabled} onToggle={value => (rapidTriggerEnabled = value)} />
      <div class="flex-1">
        {#if rapidTriggerEnabled}
          <DeadzoneControl
            {upperDeadzone}
            {lowerDeadzone}
            onUpperChange={value => (upperDeadzone = value)}
            onLowerChange={value => (lowerDeadzone = value)}
          />
        {/if}
      </div>
    </div>

    <!-- Divider for desktop -->
    {#if rapidTriggerEnabled}
      <div class="hidden md:block w-px bg-gray-200 dark:bg-white mx-2"></div>
    {/if}

    <!-- 3rd Box: Sensitivity Slider & Toggle (only shown when Rapid Trigger is enabled) -->
    {#if rapidTriggerEnabled}
      <SensitivityControl
        {separateSensitivity}
        {sensitivityValue}
        {pressSensitivity}
        {releaseSensitivity}
        onToggleSeparate={value => (separateSensitivity = value)}
        onSensitivityChange={value => (sensitivityValue = value)}
        onPressChange={value => (pressSensitivity = value)}
        onReleaseChange={value => (releaseSensitivity = value)}
      />
    {/if}
  </div>
</div>

<style>
  /* Animation for actuation point slide-out */
  .actuation-point-container {
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateX(0);
    opacity: 1;
    width: auto;
    flex: 1;
    min-width: 260px;
    overflow: hidden;
  }

  .actuation-point-container.slide-out {
    transform: translateX(100%);
    opacity: 0;
    width: 0;
    min-width: 0;
    flex: 0;
    margin: 0;
    padding: 0;
  }

  /* Divider animation */
  .divider-container {
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateX(0);
    opacity: 1;
    width: auto;
    overflow: hidden;
  }

  .divider-container.slide-out {
    transform: translateX(100%);
    opacity: 0;
    width: 0;
    margin: 0;
    padding: 0;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .actuation-point-container.slide-out {
      transform: translateY(-100%);
      height: 0;
      min-height: 0;
    }

    .divider-container.slide-out {
      transform: translateY(-100%);
      height: 0;
    }
  }
</style>
