<script lang="ts">
  import { Settings } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import { layoutLabels, selectedLayoutIndices } from '$lib/stores/ControllerStore.svelte';
  
  let showLayoutMenu = $state(false);
  let bottomRowConfig = $state<'6.25u' | '7u'>('6.25u');
  let splitSpacebar = $state(false);
  let rightShiftSplit = $state(false);
  let leftShiftSplit = $state(false);
  let splitBackspace = $state(false);

  // Reactively update selectedLayoutIndices when toggles change
  $effect(() => {
    const labels = $layoutLabels;
    // Read all toggle states to create reactive dependencies
    const _splitBackspace = splitBackspace;
    const _leftShiftSplit = leftShiftSplit;
    const _bottomRowConfig = bottomRowConfig;
    const _splitSpacebar = splitSpacebar;
    const _rightShiftSplit = rightShiftSplit;

    if (labels && labels.length > 0) {
      const indices = new Array(labels.length).fill(0);

      // Group 0: Split backspace (toggle: off=0, on=1)
      if (labels.length > 0 && labels[0].length > 0) {
        indices[0] = _splitBackspace ? 1 : 0;
      }

      // Group 1: Split enter / right shift split (toggle: off=0, on=1)
      if (labels.length > 1 && labels[1].length > 0) {
        indices[1] = _rightShiftSplit ? 1 : 0;
      }

      // Group 2: Bottom row + split spacebar combination
      // Maps to: 0=6.25u, 1=6.25u split, 2=7u, 3=7u split
      if (labels.length > 2 && labels[2].length > 0) {
        let baseIndex = _bottomRowConfig === '7u' ? 2 : 0;
        if (_splitSpacebar) baseIndex += 1;
        // Clamp to available options
        indices[2] = Math.min(baseIndex, labels[2].length);
      }

      // Group 3+: Additional layout groups
      if (labels.length > 3 && labels[3].length > 0) {
        indices[3] = _leftShiftSplit ? 1 : 0;
      }

      selectedLayoutIndices.set(indices);
    }
  });

  function applyConfiguration() {
    console.log('Layout config applied:', {
      bottomRowConfig,
      splitSpacebar,
      rightShiftSplit,
      leftShiftSplit,
      splitBackspace,
    });
    showLayoutMenu = false;
  }

  function handleOutsideClick() {
    showLayoutMenu = false;
  }
</script>

<svelte:window onclick={handleOutsideClick} />

<div class="relative">
  <button
    class="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 glassmorphism-button hover:shadow-md active:scale-95"
    onclick={(e) => { e.stopPropagation(); showLayoutMenu = !showLayoutMenu; }}
    title="Configure keyboard layout"
  >
    <Settings class="w-4 h-4 text-primary-500" />
    <span class="text-sm font-semibold text-gray-900 dark:text-white">Layout</span>
    <svg
      class="w-4 h-4 transition-transform duration-300 text-gray-600 dark:text-gray-400 {showLayoutMenu ? 'rotate-180' : ''}"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {#if showLayoutMenu}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute right-0 top-14 w-80 glassmorphism-card border border-gray-300 dark:border-gray-600 rounded-xl shadow-xl z-50 p-5 backdrop-blu"
      transition:slide={{ duration: 250, axis: 'y' }}
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="mb-5 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-primary-500"></div>
          Layout Configuration
        </h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Customize your keyboard layout</p>
      </div>

      <!-- Bottom Row Configuration -->
      <div class="mb-4">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Bottom Row</h4>
        <div class="space-y-2">
          <label
            class="flex items-center px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-150"
          >
            <input
              type="radio"
              bind:group={bottomRowConfig}
              value="6.25u"
              class="w-4 h-4 mr-3 text-primary-500 accent-primary-500 cursor-pointer"
            />
            <span class="text-gray-900 dark:text-white font-medium flex-1">6.25u (Standard)</span>
          </label>
          <label
            class="flex items-center px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-150"
          >
            <input
              type="radio"
              bind:group={bottomRowConfig}
              value="7u"
              class="w-4 h-4 mr-3 text-primary-500 accent-primary-500 cursor-pointer"
            />
            <span class="text-gray-900 dark:text-white font-medium flex-1">7u (Tsangan)</span>
          </label>
        </div>
      </div>
      
      <!-- Split Spacebar (only if 6.25u is selected) -->
      {#if bottomRowConfig === '6.25u'}
        <div class="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700" transition:slide={{ duration: 200 }}>
          <label
            class="flex items-center px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-150"
          >
            <input type="checkbox" bind:checked={splitSpacebar} class="w-4 h-4 mr-3 text-primary-500 accent-primary-500 cursor-pointer rounded" />
            <span class="text-gray-900 dark:text-white font-medium flex-1">Split spacebar</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">(2.25u + 1.25u + 2.75u)</span>
          </label>
        </div>
      {/if}


      <!-- Split Spacebar (only if 7u is selected) -->
      {#if bottomRowConfig === '7u'}
        <div class="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700" transition:slide={{ duration: 200 }}>
          <label
            class="flex items-center px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-150"
          >
            <input type="checkbox" bind:checked={splitSpacebar} class="w-4 h-4 mr-3 text-primary-500 accent-primary-500 cursor-pointer rounded" />
            <span class="text-gray-900 dark:text-white font-medium flex-1">Split spacebar</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">(3u+1u+3u)</span>
          </label>
        </div>
      {/if}

      <!-- Other Split Options -->
      <div class="mb-4">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Split Keys</h4>
        <div class="space-y-2">
          <label
            class="flex items-center px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-150"
          >
            <input type="checkbox" bind:checked={rightShiftSplit} class="w-4 h-4 mr-3 text-primary-500 accent-primary-500 cursor-pointer rounded" />
            <span class="text-gray-900 dark:text-white font-medium">Right shift split</span>
          </label>

          <label
            class="flex items-center px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-150"
          >
            <input type="checkbox" bind:checked={splitBackspace} class="w-4 h-4 mr-3 text-primary-500 accent-primary-500 cursor-pointer rounded" />
            <span class="text-gray-900 dark:text-white font-medium">Split backspace</span>
          </label>
        </div>
      </div>
    </div>
  {/if}
</div>
