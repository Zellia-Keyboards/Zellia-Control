<script lang="ts">
  import { KeyboardDisplayValues } from '$lib/KeyboardState.svelte';
  import { darkMode, glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import { language, t } from '$lib/LanguageStore.svelte';
  import {
    globalConfigurations,
    updateGlobalConfiguration,
    resetGlobalConfiguration,
    keyActions,
    DKSAction,
    type KeyConfiguration,
    type DynamicKeystrokeConfiguration as GlobalDynamicKeystrokeConfiguration, // Alias to avoid conflict
    type KeyAction,
  } from '$lib/AdvancedKeyShared';

  import Binding from './Binding.svelte';
  import Performance from './Performance.svelte';
  import KeyTester from './KeyTester.svelte';

  // Import new components
  import SelectedKeyInfo from './SelectedKeyInfo.svelte';
  import DKSBindingRow from './DKSBindingRow.svelte';
  import BottomOutPointConfig from './BottomOutPointConfig.svelte';
  import NoKeySelectedDisplay from './NoKeySelectedDisplay.svelte';
  import ConfiguredDKSList from './ConfiguredDKSList.svelte';
  import NewZellia80He from '$lib/NewZellia80HE.svelte';

  let currentLanguage = $state($language);

  // Subscribe to language changes
  language.subscribe(value => {
    currentLanguage = value;
  });

  // Define the dynamic keystroke specific configuration type (local usage if different from global)
  type DynamicKeystrokeConfiguration = {
    type: 'dynamic';
    keycodes: string[];
    bitmap: DKSAction[][];
    bottomOutPoint: number;
  };

  let currentSelected = $state<[number, number] | null>(null);
  let selectedKeycodes = $state(['esc', '', '', '']);
  let selectedBitmaps = $state<DKSAction[][]>([
    [DKSAction.PRESS, DKSAction.HOLD, DKSAction.HOLD, DKSAction.RELEASE],
    [DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE],
    [DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE],
    [DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE],
  ]);
  let bottomOutPoint = $state(4.0);
  let selectedBindingIndex = $state<number | null>(null);
  let activeTab = $state('bindings');

  // Animation state
  let configuredSectionVisible = $state(false);
  let configuredDKSListRef = $state<ConfiguredDKSList | null>(null);

  let uiBitmaps = $derived([...selectedBitmaps.map((b: DKSAction[]) => [...b])]);

  const NODE_SIZE = 32;
  const NODE_SPACING = 40;
  const SLIDER_GAP = 74.25;
  const SLIDER_WIDTH = SLIDER_GAP * 3 + NODE_SIZE;
  const SLIDER_HEIGHT = NODE_SIZE;
  const NODE_TOP = SLIDER_HEIGHT / 2 - NODE_SIZE / 2;
  const GRIP_WIDTH = 12;
  const GRIP_HEIGHT = 16;
  const GRIP_OFFSET = NODE_SIZE - 10;
  const GRIP_TOP = SLIDER_HEIGHT / 2 - GRIP_HEIGHT / 2;

  const nodeLeft = (i: number) => SLIDER_GAP * i;

  function getIntervals(bitmap: DKSAction[]): [number, number][] {
    const intervals: [number, number][] = [];
    let start = -1;

    for (let i = 0; i < 4; i++) {
      if (bitmap[i] === DKSAction.HOLD) {
        continue;
      }
      if (start !== -1) {
        intervals.push([start, i]);
        start = -1;
      }
      if (bitmap[i] === DKSAction.PRESS) {
        start = i;
      } else if (bitmap[i] === DKSAction.TAP) {
        intervals.push([i, i]);
      }
    }
    return intervals;
  }

  const intervalWidth = ([l, r]: [number, number]) =>
    l === r ? 0 : SLIDER_GAP * (r - l) - NODE_SPACING;

  function updateBitmap(bindingIndex: number, bitmap: DKSAction[]): void {
    selectedBitmaps[bindingIndex] = [...bitmap];
    uiBitmaps[bindingIndex] = [...bitmap];
  }

  function setUIBitmap(bindingIndex: number, bitmap: DKSAction[]): void {
    uiBitmaps[bindingIndex] = [...bitmap];
  }

  function deleteInterval(bindingIndex: number, intervalStart: number): void {
    const bitmap = [...uiBitmaps[bindingIndex]];
    const intervals = getIntervals(bitmap);
    const interval = intervals.find(([l]) => l === intervalStart);

    if (interval) {
      const [start, end] = interval;
      for (let j = start + 1; j < end; j++) {
        bitmap[j] = DKSAction.HOLD;
      }
      if (bitmap[end] === DKSAction.RELEASE) {
        bitmap[end] = DKSAction.HOLD;
      }
      bitmap[start] = intervals.some(([l, r]) => l !== r && r === start)
        ? DKSAction.RELEASE
        : DKSAction.HOLD;
    }
    updateBitmap(bindingIndex, bitmap);
  }

  function handleDrag(bindingIndex: number, nodeIndex: number, deltaX: number): void {
    const bitmap = [...uiBitmaps[bindingIndex]];
    const intervals = getIntervals(selectedBitmaps[bindingIndex]);
    const interval = intervals.find(([l]) => l === nodeIndex) ?? [nodeIndex, -1];
    const upperBound = intervals.find(([l]) => l > nodeIndex)?.[0] ?? 3;

    const clampedX = Math.max(
      0,
      Math.min(
        deltaX + (interval[1] === -1 ? 0 : intervalWidth(interval)),
        intervalWidth([nodeIndex, upperBound])
      )
    );

    let closest = nodeIndex;
    let closestDistance = clampedX;
    for (let j = nodeIndex + 1; j <= upperBound; j++) {
      const distance = Math.abs(clampedX - intervalWidth([nodeIndex, j]));
      if (distance < closestDistance) {
        closest = j;
        closestDistance = distance;
      }
    }

    bitmap[nodeIndex] = nodeIndex === closest ? DKSAction.TAP : DKSAction.PRESS;

    for (let j = nodeIndex + 1; j < Math.max(interval[1], closest); j++) {
      bitmap[j] = DKSAction.HOLD;
    }

    if (interval[1] !== -1 && bitmap[interval[1]] === DKSAction.RELEASE) {
      bitmap[interval[1]] = DKSAction.HOLD;
    }

    if (bitmap[closest] === DKSAction.HOLD) {
      bitmap[closest] = DKSAction.RELEASE;
    }
    setUIBitmap(bindingIndex, bitmap);
  }

  function commitDrag(bindingIndex: number): void {
    updateBitmap(bindingIndex, [...uiBitmaps[bindingIndex]]);
  }

  function handleNodeClick(bindingIndex: number, nodeIndex: number): void {
    const bitmap = [...selectedBitmaps[bindingIndex]];
    const uiBitmapCopy = [...uiBitmaps[bindingIndex]];
    const intervals = getIntervals(bitmap);

    if (intervals.some(([l, r]) => l < nodeIndex && nodeIndex < r)) {
      return;
    }

    uiBitmapCopy[nodeIndex] = DKSAction.TAP;

    // ???? why
    // if (bitmap[nodeIndex] === DKSAction.HOLD) {
    // 	uiBitmapCopy[nodeIndex] = DKSAction.TAP;
    // } else {
    // 	// const interval = intervals.find(
    // 	// 	([l, r]) => l <= nodeIndex && nodeIndex <= r,
    // 	// );
    // 	// if (interval) {
    // 	// 	const [start, end] = interval;
    // 	// 	for (let i = start; i <= end && i < 4; i++) {
    // 	// 		uiBitmapCopy[i] = DKSAction.HOLD;
    // 	// 	}
    // 	// }
    // }
    updateBitmap(bindingIndex, uiBitmapCopy);
  }

  let dragState = $state<{
    isDragging: boolean;
    bindingIndex: number;
    nodeIndex: number;
    startX: number;
    startMouseX: number;
  } | null>(null);

  function handleMouseDown(event: MouseEvent, bindingIndex: number, nodeIndex: number): void {
    const uiIntervals = getIntervals(uiBitmaps[bindingIndex]);

    if (uiIntervals.some(([l, r]) => l < nodeIndex && nodeIndex < r)) {
      return;
    }

    dragState = {
      isDragging: true,
      bindingIndex,
      nodeIndex,
      startX: 0,
      startMouseX: event.clientX,
    };
    event.preventDefault();
  }

  function handleMouseMove(event: MouseEvent): void {
    if (!dragState?.isDragging) return;
    const deltaX = event.clientX - dragState.startMouseX;
    handleDrag(dragState.bindingIndex, dragState.nodeIndex, deltaX);
  }

  function handleMouseUp(): void {
    if (dragState?.isDragging) {
      commitDrag(dragState.bindingIndex);
    }
    dragState = null;
  }

  $effect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  });

  function getCurrentKeyConfiguration(): DynamicKeystrokeConfiguration | null {
    if (!currentSelected) return null;
    const keyId = `${currentSelected[0]},${currentSelected[1]}`;
    const config = $globalConfigurations[keyId];

    if (config && config.type === 'dynamic') {
      return config as DynamicKeystrokeConfiguration;
    }
    return {
      type: 'dynamic',
      keycodes: ['esc', '', '', ''],
      bitmap: [
        [DKSAction.PRESS, DKSAction.HOLD, DKSAction.HOLD, DKSAction.RELEASE],
        [DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE],
        [DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE],
        [DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE],
      ],
      bottomOutPoint: 4.0,
    };
  }

  function updateConfiguration(): void {
    if (!currentSelected) return;
    const keyId = `${currentSelected[0]},${currentSelected[1]}`;
    const config: DynamicKeystrokeConfiguration = {
      type: 'dynamic',
      keycodes: selectedKeycodes.map(k => k), // Ensure new array
      bitmap: selectedBitmaps.map(b => [...b]), // Ensure new array of arrays
      bottomOutPoint: bottomOutPoint,
    };
    updateGlobalConfiguration(keyId, config as GlobalDynamicKeystrokeConfiguration);
  }

  function resetConfiguration(): void {
    if (!currentSelected) return;
    const keyId = `${currentSelected[0]},${currentSelected[1]}`;
    resetGlobalConfiguration(keyId);
    selectedKeycodes = ['esc', 'enter', 'space', 'backspace'];
    selectedBitmaps = [
      [DKSAction.PRESS, DKSAction.HOLD, DKSAction.HOLD, DKSAction.RELEASE],
      [DKSAction.TAP, DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD],
      [DKSAction.PRESS, DKSAction.PRESS, DKSAction.HOLD, DKSAction.RELEASE],
      [DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD],
    ];
    bottomOutPoint = 4.0;
  }

  function resetAllDynamicKeys(): void {
    globalConfigurations.update(configs => {
      const newConfigs = { ...configs };
      Object.keys(newConfigs).forEach(keyId => {
        if (newConfigs[keyId].type === 'dynamic') {
          delete newConfigs[keyId];
        }
      });
      return newConfigs;
    });
  }

  function deleteDynamicKey(keyId: string): void {
    resetGlobalConfiguration(keyId);
  }

  function applyConfiguration(): void {
    updateConfiguration();

    // Trigger new key animation if a key is selected
    if (currentSelected && configuredDKSListRef) {
      const keyId = `${currentSelected[0]},${currentSelected[1]}`;
      configuredDKSListRef.addNewKeyAnimation(keyId);
    }

    console.log('Applying dynamic keystroke configurations:', $globalConfigurations);
  }

  let currentKeyName = $derived(
    currentSelected
      ? $KeyboardDisplayValues[currentSelected[1]]?.[currentSelected[0]] || 'Unknown'
      : 'No key selected'
  );

  $effect(() => {
    uiBitmaps = selectedBitmaps.map(bitmap => [...bitmap]);
  });

  $effect(() => {
    if (currentSelected) {
      const keyId = `${currentSelected[0]},${currentSelected[1]}`;
      const existingGlobalConfig = $globalConfigurations[keyId];

      if (existingGlobalConfig && existingGlobalConfig.type === 'dynamic') {
        const dynamicConfig = existingGlobalConfig as GlobalDynamicKeystrokeConfiguration;
        selectedKeycodes = dynamicConfig.keycodes.map((k: string) => k);
        selectedBitmaps = dynamicConfig.bitmap.map((b: DKSAction[]) => [...b]);
        bottomOutPoint = dynamicConfig.bottomOutPoint;
      } else {
        selectedKeycodes = [currentKeyName, '', '', ''];
        selectedBitmaps = [
          [DKSAction.PRESS, DKSAction.HOLD, DKSAction.HOLD, DKSAction.RELEASE],
          [DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE],
          [DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE],
          [DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE],
        ];
        bottomOutPoint = 3.0;
      }
    }
  });

  const actionCategories = $state([
    {
      name: 'Common',
      actions: keyActions.filter(action =>
        ['esc', 'enter', 'space', 'tab', 'backspace', 'delete'].includes(action.id)
      ),
    },
    {
      name: 'Modifiers',
      actions: keyActions.filter(action => ['ctrl', 'shift', 'alt', 'win'].includes(action.id)),
    },
    {
      name: 'Function',
      actions: keyActions.filter(action => action.category === 'Function').slice(0, 12),
    },
    {
      name: 'Letters',
      actions: keyActions.filter(action => action.category === 'Letter').slice(0, 20),
    },
  ]);

  const configuredDynamicKeysList = $derived(
    Object.entries($globalConfigurations).filter(([_, config]) => config.type === 'dynamic') as [
      string,
      GlobalDynamicKeystrokeConfiguration,
    ][]
  );

  // Effect to handle configured section visibility animation
  $effect(() => {
    const hasKeys = configuredDynamicKeysList.length > 0;
    if (hasKeys && !configuredSectionVisible) {
      // Delay to allow for smooth appearance
      setTimeout(() => {
        configuredSectionVisible = true;
      }, 100);
    } else if (!hasKeys && configuredSectionVisible) {
      configuredSectionVisible = false;
    }
  });
  const phaseDescriptions = $derived([
    { name: t('advancedkey.keyPressedPastActuation', currentLanguage), icon: 'arrow-down' },
    { name: t('advancedkey.keyPressedPastBottomOut', currentLanguage), icon: 'arrow-down-line' },
    { name: t('advancedkey.keyReleasedPastBottomOut', currentLanguage), icon: 'arrow-up-line' },
    { name: t('advancedkey.keyReleasedPastActuation', currentLanguage), icon: 'arrow-up' },
  ]);

  function handleSelectBinding(bindingIdx: number) {
    selectedBindingIndex = selectedBindingIndex === bindingIdx ? null : bindingIdx;
  }
</script>

{#snippet DKSSlider(bitmap: DKSAction[], uiBitmap: DKSAction[], bindingIndex: number)}
  {@const intervals = getIntervals(bitmap)}
  {@const uiIntervals = getIntervals(uiBitmap)}
  {#each Array(4) as _, i}
    <button
      class="rounded-full border-2 {$glassmorphismMode ? 'glassmorphism-button' : ''}"
      onclick={() => handleNodeClick(bindingIndex, i)}
      style:width={NODE_SIZE + 'px'}
      style:height={NODE_SIZE + 'px'}>+</button
    >
  {/each}

  {#each uiIntervals as interval}
    {@const [start, end] = interval}
    {#if start !== -1 && end > start}
      <!-- Interval bar (clickable to delete) -->
      <button
        class="absolute z-20 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''} {$darkMode
          ? 'bg-gray-600 hover:bg-gray-500 focus-visible:ring-gray-400'
          : 'bg-blue-500 hover:bg-blue-600 focus-visible:ring-blue-300'}"
        style="width: {NODE_SIZE +
          intervalWidth(interval)}px; height: {NODE_SIZE}px; top: {NODE_TOP}px; left: {nodeLeft(
          start
        )}px;"
        onclick={() => deleteInterval(bindingIndex, start)}
        title="Click to delete interval"
      >
        <span class="sr-only">Delete interval</span>
      </button>
    {:else if start === end}
      <!-- TAP indicator (single point) -->
      <!-- svelte-ignore a11y_consider_explicit_label -->
      <button
        class="absolute z-20 rounded-full {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''} {$darkMode ? 'bg-gray-500' : 'bg-purple-500'}"
        style="width: {NODE_SIZE}px; height: {NODE_SIZE}px; top: {NODE_TOP}px; left: {nodeLeft(
          start
        )}px;"
        title="TAP action at phase {start + 1}"
        onclick={() => deleteInterval(bindingIndex, start)}
      ></button>
    {/if}
    <!-- Grip handle for dragging -->
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button
      class="absolute z-30 flex items-center justify-center rounded-sm border cursor-ew-resize transition-colors select-none {$glassmorphismMode
        ? 'glassmorphism-button'
        : ''} {$darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-600 hover:bg-gray-700'}"
      style:width={GRIP_WIDTH + 'px'}
      style:height={GRIP_HEIGHT + 'px'}
      style:left="{nodeLeft(start) + GRIP_OFFSET + intervalWidth(interval)}px"
      style:top="{GRIP_TOP}px"
      onmousedown={e => handleMouseDown(e, bindingIndex, start)}
      title="Drag to resize interval"
    >
      <svg class="" fill="currentColor" viewBox="0 0 20 20">
        <path
          d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"
        />
      </svg>
    </button>
  {/each}
{/snippet}

<NewZellia80He
  onClick={(x, y, event) => {
    console.log(`Key clicked at (${x}, ${y})`, event);
  }}
  bind:currentSelectedKey={currentSelected}
>
  {#snippet body(x, y)}
  <div       class="hover:scale-90 transition-all duration-300 h-14 {$darkMode
        ? 'bg-black border-gray-700'
        : 'bg-gray-50 border-gray-400'} data-[selected=true]:bg-gray-500 data-[selected=true]:border-gray-700 data-[selected=true]:border-4 border rounded-lg flex flex-col items-center justify-center hover:cursor-pointer gap-1 font-sans text-white"
></div>{/snippet}
</NewZellia80He>
<div
  class="rounded-2xl shadow p-4 mt-2 mb-4 grow {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''} {$darkMode ? 'border border-gray-600 text-white' : 'text-black'} h-full flex flex-col"
  style="background-color: {$darkMode
    ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)`
    : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`};"
>
  <!-- Header -->
  <div
    class="border-b px-6 py-4"
    style="background-color: color-mix(in srgb, var(--theme-color-primary) 3%, ${$darkMode
      ? 'black'
      : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 20%, ${$darkMode
      ? 'white'
      : '#e5e5e5'});"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <a
          class="flex items-center gap-2 {$darkMode
            ? 'text-gray-400 hover:text-white'
            : 'text-gray-600 hover:text-gray-900'} transition-colors"
          href="/advancedkey"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t('ui.back', currentLanguage)}
        </a>
        <div>
          <h1 class="text-xl font-semibold {$darkMode ? 'text-white' : 'text-gray-900'}">
            {t('advancedkey.dynamicTitle', currentLanguage)}
          </h1>
          <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">
            {t('advancedkey.dynamicSubtitle', currentLanguage)}
          </p>
        </div>
      </div>
      <div class="flex gap-3">
        <button
          class="px-4 py-2 text-white rounded-md transition-colors text-sm font-medium {$glassmorphismMode
            ? 'glassmorphism-button'
            : ''} {$darkMode ? 'bg-red-700 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700'}"
          onclick={resetConfiguration}
          disabled={!currentSelected}
        >
          {t('advancedkey.resetConfiguration', currentLanguage)}
        </button>
        <button
          class="px-4 py-2 rounded-md transition-colors text-sm font-medium text-white {$glassmorphismMode
            ? 'glassmorphism-button'
            : ''}"
          style="background-color: var(--theme-color-primary); 
					       border: 1px solid var(--theme-color-primary);"
          onclick={applyConfiguration}
          disabled={!currentSelected}
        >
          {t('advancedkey.applyConfiguration', currentLanguage)}
        </button>
      </div>
    </div>
  </div>

  <div class="flex-1 p-6 overflow-y-auto">
    {#if currentSelected}
      <div class="max-w-7xl mx-auto">
        <SelectedKeyInfo {currentKeyName} currentSelectedCoords={currentSelected} />

        <div class="flex gap-8">
          <div class="w-96 flex flex-col gap-4">
            <div
              class="rounded-lg border p-6 {$glassmorphismMode ? 'glassmorphism-card' : ''}"
              style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode
                ? 'black'
                : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode
                ? 'white'
                : '#e5e5e5'});"
            >
              <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">
                {t('advancedkey.configureDKSBindings', currentLanguage)}
              </h3>
              <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
                {t('advancedkey.dksBindingInstructions', currentLanguage)}
              </p>

              <div class="flex items-center gap-4 mb-3">
                <div
                  class="w-16 text-center text-sm font-semibold {$darkMode
                    ? 'text-white'
                    : 'text-gray-900'}"
                >
                  Bindings
                </div>
                <div class="relative h-4" style="width: {SLIDER_WIDTH}px;">
                  {#each phaseDescriptions as phase, i}
                    <div
                      class="absolute top-0 flex flex-col items-center gap-2"
                      style="width: 16px; left: {SLIDER_GAP * i + NODE_SIZE / 2 - 8}px;"
                      title={phase.name}
                    >
                      {#if phase.icon === 'arrow-down'}
                        <svg
                          class="w-4 h-4 {$darkMode ? 'text-gray-300' : 'text-gray-700'}"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      {:else if phase.icon === 'arrow-down-line'}
                        <div class="flex flex-col items-center">
                          <svg
                            class="w-4 h-4 {$darkMode ? 'text-gray-300' : 'text-gray-700'}"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 14l-7 7m0 0l-7-7m7 7V3"
                            />
                          </svg>
                          <div
                            class="w-6 h-0.5 {$darkMode ? 'bg-gray-300' : 'bg-gray-700'} mt-1"
                          ></div>
                        </div>
                      {:else if phase.icon === 'arrow-up-line'}
                        <div class="flex flex-col items-center">
                          <div
                            class="w-6 h-0.5 {$darkMode ? 'bg-gray-300' : 'bg-gray-700'} mb-1"
                          ></div>
                          <svg
                            class="w-4 h-4 {$darkMode ? 'text-gray-300' : 'text-gray-700'}"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M5 10l7-7m0 0l7 7m-7-7v18"
                            />
                          </svg>
                        </div>
                      {:else if phase.icon === 'arrow-up'}
                        <svg
                          class="w-4 h-4 {$darkMode ? 'text-gray-300' : 'text-gray-700'}"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 10l7-7m0 0l7 7m-7-7v18"
                          />
                        </svg>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>

              <div class="space-y-2">
                {#each selectedKeycodes as keycode, bindingIndex (bindingIndex)}
                  <DKSBindingRow
                    {bindingIndex}
                    {keycode}
                    selectedBitmap={selectedBitmaps[bindingIndex]}
                    uiBitmap={uiBitmaps[bindingIndex]}
                    {selectedBindingIndex}
                    onSelectBinding={handleSelectBinding}
                    DKSSliderSnippet={DKSSlider}
                    {keyActions}
                  />
                {/each}
              </div>
            </div>
            <BottomOutPointConfig bind:bottomOutPointValue={bottomOutPoint} />
          </div>

          <div class="flex-1 flex flex-col">
            <div
              class="flex border-b mb-6"
              style="border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode
                ? 'white'
                : '#e5e5e5'});"
            >
              {#each [['bindings', t('advancedkey.bindings', currentLanguage)], ['performance', t('advancedkey.performance', currentLanguage)], ['key-tester', t('advancedkey.keyTester', currentLanguage)]] as [value, label]}
                <button
                  class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
                  style={activeTab === value
                    ? `border-color: var(--theme-color-primary); color: var(--theme-color-primary);`
                    : `border-color: transparent; color: ${$darkMode ? '#9ca3af' : '#6b7280'};`}
                  onclick={() => (activeTab = value)}
                >
                  {label}
                </button>
              {/each}
            </div>

            {#if activeTab === 'bindings'}
              <Binding bind:selectedKeycodes bind:selectedBindingIndex {actionCategories} />
            {:else if activeTab === 'performance'}
              <Performance />
            {:else if activeTab === 'key-tester'}
              <KeyTester {currentKeyName} />
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <NoKeySelectedDisplay />
    {/if}
    {#if configuredSectionVisible}
      <div class="animate-fade-in">
        <ConfiguredDKSList
          bind:this={configuredDKSListRef}
          configuredDynamicKeys={configuredDynamicKeysList}
          {KeyboardDisplayValues}
          onDeleteKey={deleteDynamicKey}
        />
      </div>
    {/if}
  </div>
</div>

<style>
  /* Fade-in animation for the configured section */
  @keyframes fade-in {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.5s ease-out;
  }
</style>
