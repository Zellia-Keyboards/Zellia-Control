<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import {
    globalConfigurations,
    updateGlobalConfiguration,
    resetGlobalConfiguration,
    keyActions,
    DKSAction,
    type DynamicKeystrokeConfiguration as GlobalDynamicKeystrokeConfiguration,
  } from '$lib/types/AdvancedKeyShared';

  import DKSBinding from '$lib/components/advancedkey/dynamic/Binding.svelte';
  import DKSPerformance from '$lib/components/advancedkey/dynamic/Performance.svelte';
  import DKSKeyTester from '$lib/components/advancedkey/dynamic/KeyTester.svelte';
  import DKSSelectedKeyInfo from '$lib/components/advancedkey/dynamic/SelectedKeyInfo.svelte';
  import DKSBindingRow from '$lib/components/advancedkey/dynamic/DKSBindingRow.svelte';
  import DKSBottomOutPointConfig from '$lib/components/advancedkey/dynamic/BottomOutPointConfig.svelte';
  import DKSNoKeySelectedDisplay from '$lib/components/advancedkey/dynamic/NoKeySelectedDisplay.svelte';
  import DKSConfiguredList from '$lib/components/advancedkey/dynamic/ConfiguredDKSList.svelte';
  import DKSHeader from '$lib/components/advancedkey/dynamic/DKSHeader.svelte';

  interface Props {
    onBack: () => void;
    currentSelected: [number, number] | null;
    currentKeyName: string;
  }

  let { onBack, currentSelected = $bindable(), currentKeyName }: Props = $props();

  let currentLanguage = $derived($language);

  type DynamicKeystrokeConfiguration = {
    type: 'dynamic';
    keycodes: string[];
    bitmap: DKSAction[][];
    bottomOutPoint: number;
  };

  let dksSelectedKeycodes = $state(['esc', '', '', '']);
  let dksSelectedBitmaps = $state<DKSAction[][]>([
    [DKSAction.PRESS, DKSAction.HOLD, DKSAction.HOLD, DKSAction.RELEASE],
    [DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE],
    [DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE],
    [DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE],
  ]);
  let dksBottomOutPoint = $state(4.0);
  let dksSelectedBindingIndex = $state<number | null>(null);
  let dksActiveTab = $state('bindings');
  let dksConfiguredSectionVisible = $state(false);
  let dksConfiguredListRef = $state<DKSConfiguredList | null>(null);

  let dksUiBitmaps = $derived([...dksSelectedBitmaps.map((b: DKSAction[]) => [...b])]);

  const DKS_NODE_SIZE = 32;
  const DKS_NODE_SPACING = 40;
  const DKS_SLIDER_GAP = 74.25;
  const DKS_SLIDER_WIDTH = DKS_SLIDER_GAP * 3 + DKS_NODE_SIZE;
  const DKS_SLIDER_HEIGHT = DKS_NODE_SIZE;
  const DKS_NODE_TOP = DKS_SLIDER_HEIGHT / 2 - DKS_NODE_SIZE / 2;
  const DKS_GRIP_WIDTH = 12;
  const DKS_GRIP_HEIGHT = 16;
  const DKS_GRIP_OFFSET = DKS_NODE_SIZE - 10;
  const DKS_GRIP_TOP = DKS_SLIDER_HEIGHT / 2 - DKS_GRIP_HEIGHT / 2;

  const dksNodeLeft = (i: number) => DKS_SLIDER_GAP * i;

  function dksGetIntervals(bitmap: DKSAction[]): [number, number][] {
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

  const dksIntervalWidth = ([l, r]: [number, number]) =>
    l === r ? 0 : DKS_SLIDER_GAP * (r - l) - DKS_NODE_SPACING;

  function dksUpdateBitmap(bindingIndex: number, bitmap: DKSAction[]): void {
    dksSelectedBitmaps[bindingIndex] = [...bitmap];
  }

  function dksSetUIBitmap(bindingIndex: number, bitmap: DKSAction[]): void {
    dksUiBitmaps[bindingIndex] = [...bitmap];
  }

  function dksDeleteInterval(bindingIndex: number, intervalStart: number): void {
    const bitmap = [...dksUiBitmaps[bindingIndex]];
    const intervals = dksGetIntervals(bitmap);
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
    dksUpdateBitmap(bindingIndex, bitmap);
  }

  function dksHandleDrag(bindingIndex: number, nodeIndex: number, deltaX: number): void {
    const bitmap = [...dksUiBitmaps[bindingIndex]];
    const intervals = dksGetIntervals(dksSelectedBitmaps[bindingIndex]);
    const interval = intervals.find(([l]) => l === nodeIndex) ?? [nodeIndex, -1];
    const upperBound = intervals.find(([l]) => l > nodeIndex)?.[0] ?? 3;

    const clampedX = Math.max(
      0,
      Math.min(
        deltaX + (interval[1] === -1 ? 0 : dksIntervalWidth(interval)),
        dksIntervalWidth([nodeIndex, upperBound])
      )
    );

    let closest = nodeIndex;
    let closestDistance = clampedX;
    for (let j = nodeIndex + 1; j <= upperBound; j++) {
      const distance = Math.abs(clampedX - dksIntervalWidth([nodeIndex, j]));
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
    dksSetUIBitmap(bindingIndex, bitmap);
  }

  function dksCommitDrag(bindingIndex: number): void {
    dksUpdateBitmap(bindingIndex, [...dksUiBitmaps[bindingIndex]]);
  }

  function dksHandleNodeClick(bindingIndex: number, nodeIndex: number): void {
    const bitmap = [...dksSelectedBitmaps[bindingIndex]];
    const uiBitmapCopy = [...dksUiBitmaps[bindingIndex]];
    const intervals = dksGetIntervals(bitmap);

    if (intervals.some(([l, r]) => l < nodeIndex && nodeIndex < r)) {
      return;
    }

    uiBitmapCopy[nodeIndex] = DKSAction.TAP;
    dksUpdateBitmap(bindingIndex, uiBitmapCopy);
  }

  let dksDragState = $state<{
    isDragging: boolean;
    bindingIndex: number;
    nodeIndex: number;
    startX: number;
    startMouseX: number;
  } | null>(null);

  function dksHandleMouseDown(event: MouseEvent, bindingIndex: number, nodeIndex: number): void {
    const uiIntervals = dksGetIntervals(dksUiBitmaps[bindingIndex]);

    if (uiIntervals.some(([l, r]) => l < nodeIndex && nodeIndex < r)) {
      return;
    }

    dksDragState = {
      isDragging: true,
      bindingIndex,
      nodeIndex,
      startX: 0,
      startMouseX: event.clientX,
    };
    event.preventDefault();
  }

  function dksHandleMouseMove(event: MouseEvent): void {
    if (!dksDragState?.isDragging) return;
    const deltaX = event.clientX - dksDragState.startMouseX;
    dksHandleDrag(dksDragState.bindingIndex, dksDragState.nodeIndex, deltaX);
  }

  function dksHandleMouseUp(): void {
    if (dksDragState?.isDragging) {
      dksCommitDrag(dksDragState.bindingIndex);
    }
    dksDragState = null;
  }

  function dksUpdateConfiguration(): void {
    if (!currentSelected) return;
    const keyId = `${currentSelected[0]},${currentSelected[1]}`;
    const config: DynamicKeystrokeConfiguration = {
      type: 'dynamic',
      keycodes: dksSelectedKeycodes.map(k => k),
      bitmap: dksSelectedBitmaps.map(b => [...b]),
      bottomOutPoint: dksBottomOutPoint,
    };
    updateGlobalConfiguration(keyId, config as GlobalDynamicKeystrokeConfiguration);
  }

  function dksResetConfiguration(): void {
    if (!currentSelected) return;
    const keyId = `${currentSelected[0]},${currentSelected[1]}`;
    resetGlobalConfiguration(keyId);
    dksSelectedKeycodes = ['esc', 'enter', 'space', 'backspace'];
    dksSelectedBitmaps = [
      [DKSAction.PRESS, DKSAction.HOLD, DKSAction.HOLD, DKSAction.RELEASE],
      [DKSAction.TAP, DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD],
      [DKSAction.PRESS, DKSAction.PRESS, DKSAction.HOLD, DKSAction.RELEASE],
      [DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD],
    ];
    dksBottomOutPoint = 4.0;
  }

  function dksDeleteKey(keyId: string): void {
    resetGlobalConfiguration(keyId);
  }

  function dksApplyConfiguration(): void {
    dksUpdateConfiguration();
    if (currentSelected && dksConfiguredListRef) {
      const keyId = `${currentSelected[0]},${currentSelected[1]}`;
      dksConfiguredListRef.addNewKeyAnimation(keyId);
    }
  }

  const dksActionCategories = $state([
    {
      name: 'Common',
      actions: keyActions.filter(action =>
        ['esc', 'enter', 'space', 'tab', 'backspace', 'delete'].includes(String(action.keycode))
      ),
    },
    {
      name: 'Modifiers',
      actions: keyActions.filter(action =>
        ['ctrl', 'shift', 'alt', 'win'].includes(String(action.keycode))
      ),
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

  const dksConfiguredList = $derived(
    Object.entries($globalConfigurations).filter(([_, config]) => config.type === 'dynamic') as [
      string,
      GlobalDynamicKeystrokeConfiguration,
    ][]
  );

  const dksPhaseDescriptions = $derived([
    { name: t('advancedkey.keyPressedPastActuation', currentLanguage), icon: 'arrow-down' },
    { name: t('advancedkey.keyPressedPastBottomOut', currentLanguage), icon: 'arrow-down-line' },
    { name: t('advancedkey.keyReleasedPastBottomOut', currentLanguage), icon: 'arrow-up-line' },
    { name: t('advancedkey.keyReleasedPastActuation', currentLanguage), icon: 'arrow-up' },
  ]);

  function dksHandleSelectBinding(bindingIdx: number) {
    dksSelectedBindingIndex = dksSelectedBindingIndex === bindingIdx ? null : bindingIdx;
  }

  $effect(() => {
    dksUiBitmaps = dksSelectedBitmaps.map(bitmap => [...bitmap]);
  });

  $effect(() => {
    if (currentSelected) {
      const keyId = `${currentSelected[0]},${currentSelected[1]}`;
      const existingGlobalConfig = $globalConfigurations[keyId];

      if (existingGlobalConfig && existingGlobalConfig.type === 'dynamic') {
        const dynamicConfig = existingGlobalConfig as GlobalDynamicKeystrokeConfiguration;
        dksSelectedKeycodes = dynamicConfig.keycodes.map((k: string) => k);
        dksSelectedBitmaps = dynamicConfig.bitmap.map((b: DKSAction[]) => [...b]);
        dksBottomOutPoint = dynamicConfig.bottomOutPoint;
      } else {
        dksSelectedKeycodes = [currentKeyName, '', '', ''];
        dksSelectedBitmaps = [
          [DKSAction.PRESS, DKSAction.HOLD, DKSAction.HOLD, DKSAction.RELEASE],
          [DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE],
          [DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE],
          [DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE, DKSAction.RELEASE],
        ];
        dksBottomOutPoint = 3.0;
      }
    }
  });

  $effect(() => {
    const hasKeys = dksConfiguredList.length > 0;
    if (hasKeys && !dksConfiguredSectionVisible) {
      setTimeout(() => {
        dksConfiguredSectionVisible = true;
      }, 100);
    } else if (!hasKeys && dksConfiguredSectionVisible) {
      dksConfiguredSectionVisible = false;
    }
  });

  $effect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => dksHandleMouseMove(e);
    const handleGlobalMouseUp = () => dksHandleMouseUp();

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  });
</script>

{#snippet DKSSlider(bitmap: DKSAction[], uiBitmap: DKSAction[], bindingIndex: number)}
  {@const intervals = dksGetIntervals(bitmap)}
  {@const uiIntervals = dksGetIntervals(uiBitmap)}
  {#each Array(4) as _, i}
    <button
      class="rounded-full border-2 {$glassmorphismMode ? 'glassmorphism-button' : ''}"
      onclick={() => dksHandleNodeClick(bindingIndex, i)}
      style:width={DKS_NODE_SIZE + 'px'}
      style:height={DKS_NODE_SIZE + 'px'}>+</button
    >
  {/each}

  {#each uiIntervals as interval}
    {@const [start, end] = interval}
    {#if start !== -1 && end > start}
      <button
        class="absolute z-20 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''} {'bg-primary-500 hover:bg-primary-600 focus-visible:ring-primary-300 dark:bg-gray-600 '}"
        style="width: {DKS_NODE_SIZE +
          dksIntervalWidth(
            interval
          )}px; height: {DKS_NODE_SIZE}px; top: {DKS_NODE_TOP}px; left: {dksNodeLeft(start)}px;"
        onclick={() => dksDeleteInterval(bindingIndex, start)}
        title="Click to delete interval"
        aria-label="Delete interval"
      >
        <span class="sr-only">Delete interval</span>
      </button>
    {:else if start === end}
      <button
        class="absolute z-20 rounded-full {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''} bg-purple-500 dark:bg-gray-500"
        style="width: {DKS_NODE_SIZE}px; height: {DKS_NODE_SIZE}px; top: {DKS_NODE_TOP}px; left: {dksNodeLeft(
          start
        )}px;"
        title="TAP action at phase {start + 1}"
        aria-label="TAP action at phase {start + 1}"
        onclick={() => dksDeleteInterval(bindingIndex, start)}
      ></button>
    {/if}
    <button
      class="absolute z-30 flex items-center justify-center rounded-sm border cursor-ew-resize transition-colors select-none {$glassmorphismMode
        ? 'glassmorphism-button'
        : ''} bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 hover:bg-gray-600"
      style:width={DKS_GRIP_WIDTH + 'px'}
      style:height={DKS_GRIP_HEIGHT + 'px'}
      style:left="{dksNodeLeft(start) + DKS_GRIP_OFFSET + dksIntervalWidth(interval)}px"
      style:top="{DKS_GRIP_TOP}px"
      onmousedown={e => dksHandleMouseDown(e, bindingIndex, start)}
      title="Drag to resize interval"
      aria-label="Drag to resize interval"
    >
      <svg class="" fill="currentColor" viewBox="0 0 20 20">
        <path
          d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"
        />
      </svg>
    </button>
  {/each}
{/snippet}

<DKSHeader
  {onBack}
  onApply={dksApplyConfiguration}
  onReset={dksResetConfiguration}
  canApply={currentSelected !== null}
/>

<div class="flex-1 p-6 overflow-y-auto -mx-8">
  {#if currentSelected}
    <div class="max-w-7xl mx-auto">
      <DKSSelectedKeyInfo {currentKeyName} currentSelectedCoords={currentSelected} />

      <div class="flex gap-8">
        <div class="w-96 flex flex-col gap-4">
          <div
            class="rounded-lg border p-6 bg-primary-50 dark:bg-black dark:border-primary-200 border-[#e5e5e5] {$glassmorphismMode
              ? 'glassmorphism-card'
              : ''}"
          >
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('advancedkey.configureDKSBindings', currentLanguage)}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('advancedkey.dksBindingInstructions', currentLanguage)}
            </p>

            <div class="flex items-center gap-4 mb-3">
              <div class="w-16 text-center text-sm font-semibold dark:text-white text-gray-900">
                Bindings
              </div>
              <div class="relative h-4" style="width: {DKS_SLIDER_WIDTH}px;">
                {#each dksPhaseDescriptions as phase, i}
                  <div
                    class="absolute top-0 flex flex-col items-center gap-2"
                    style="width: 16px; left: {DKS_SLIDER_GAP * i + DKS_NODE_SIZE / 2 - 8}px;"
                    title={phase.name}
                  >
                    {#if phase.icon === 'arrow-down'}
                      <svg
                        class="w-4 h-4 text-gray-700 dark:text-gray-300"
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
                          class="w-4 h-4 text-gray-700 dark:text-gray-300"
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
                        <div class="w-6 h-0.5 bg-gray-700 dark:bg-gray-300 mt-1"></div>
                      </div>
                    {:else if phase.icon === 'arrow-up-line'}
                      <div class="flex flex-col items-center">
                        <div class="w-6 h-0.5 bg-gray-700 dark:bg-gray-300 mb-1"></div>
                        <svg
                          class="w-4 h-4 text-gray-700 dark:text-gray-300"
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
                        class="w-4 h-4 text-gray-700 dark:text-gray-300"
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
              {#each dksSelectedKeycodes as keycode, bindingIndex (bindingIndex)}
                <DKSBindingRow
                  {bindingIndex}
                  {keycode}
                  selectedBitmap={dksSelectedBitmaps[bindingIndex]}
                  uiBitmap={dksUiBitmaps[bindingIndex]}
                  selectedBindingIndex={dksSelectedBindingIndex}
                  onSelectBinding={dksHandleSelectBinding}
                  DKSSliderSnippet={DKSSlider}
                  {keyActions}
                />
              {/each}
            </div>
          </div>
          <DKSBottomOutPointConfig bind:bottomOutPointValue={dksBottomOutPoint} />
        </div>

        <div class="flex-1 flex flex-col">
          <div class="flex border-b mb-6 dark:border-primary-200 border-[#e5e5e5]">
            {#each [['bindings', t('advancedkey.bindings', currentLanguage)], ['performance', t('advancedkey.performance', currentLanguage)], ['key-tester', t('advancedkey.keyTester', currentLanguage)]] as [value, label]}
              <button
                class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {dksActiveTab ===
                value
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-gray-500 dark:text-gray-400'}"
                onclick={() => (dksActiveTab = value)}
              >
                {label}
              </button>
            {/each}
          </div>

          {#if dksActiveTab === 'bindings'}
            <DKSBinding
              bind:selectedKeycodes={dksSelectedKeycodes}
              bind:selectedBindingIndex={dksSelectedBindingIndex}
              actionCategories={dksActionCategories}
            />
          {:else if dksActiveTab === 'performance'}
            <DKSPerformance />
          {:else if dksActiveTab === 'key-tester'}
            <DKSKeyTester {currentKeyName} />
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <DKSNoKeySelectedDisplay />
  {/if}
  {#if dksConfiguredSectionVisible}
    <div class="animate-fade-in mt-6">
      <DKSConfiguredList
        bind:this={dksConfiguredListRef}
        configuredDynamicKeys={dksConfiguredList}
        onDeleteKey={dksDeleteKey}
      />
    </div>
  {/if}
</div>

<style>
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
