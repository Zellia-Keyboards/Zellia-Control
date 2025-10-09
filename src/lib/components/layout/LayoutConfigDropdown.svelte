<script lang="ts">
  import { Settings } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  
  let showLayoutMenu = $state(false);
  let bottomRowConfig = $state<'6.25u' | '7u'>('6.25u');
  let splitSpacebar = $state(false);
  let rightShiftSplit = $state(false);
  let leftShiftSplit = $state(false);
  let splitBackspace = $state(false);
  
  function applyConfiguration() {
    console.log('Layout config applied:', {
      bottomRowConfig,
      splitSpacebar,
      rightShiftSplit,
      leftShiftSplit,
      splitBackspace
    });
    showLayoutMenu = false;
  }
</script>

<div class="relative">
  <button
    class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 {$glassmorphismMode
      ? 'glassmorphism-button'
      : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}"
    onclick={() => (showLayoutMenu = !showLayoutMenu)}
  >
    <Settings class="w-4 h-4 text-gray-600 dark:text-gray-400" />
    <span class="text-sm font-medium text-gray-900 dark:text-white">Layout</span>
    <svg
      class="w-4 h-4 transition-transform duration-200 text-gray-600 dark:text-gray-400"
      class:rotate-180={showLayoutMenu}
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {#if showLayoutMenu}
    <div 
      class="absolute right-0 top-12 w-72 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 p-4 {$glassmorphismMode ? 'glassmorphism-card' : ''}"
      transition:slide={{ duration: 300, axis: 'y' }}
    >
      <!-- Bottom Row Configuration -->
      <div class="mb-4">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bottom Row</h4>
        <div class="space-y-1">
          <label class="flex items-center text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
            <input
              type="radio"
              bind:group={bottomRowConfig}
              value="6.25u"
              class="mr-2 text-primary-500"
            />
            <span class="text-gray-900 dark:text-white">6.25u (standard)</span>
          </label>
          <label class="flex items-center text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
            <input
              type="radio"
              bind:group={bottomRowConfig}
              value="7u"
              class="mr-2 text-primary-500"
            />
            <span class="text-gray-900 dark:text-white">7u (Tsangan)</span>
          </label>
        </div>
      </div>
      
      <!-- Split Spacebar (only if 7u is selected) -->
      {#if bottomRowConfig === '7u'}
        <div class="mb-4 pb-3 border-b border-gray-200 dark:border-gray-600">
          <label class="flex items-center text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
            <input
              type="checkbox"
              bind:checked={splitSpacebar}
              class="mr-2 text-primary-500"
            />
            <span class="text-gray-900 dark:text-white">Split spacebar (3u+1u+3u)</span>
          </label>
        </div>
      {/if}
      
      <!-- Other Split Options -->
      <div class="space-y-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Split Keys</h4>
        <label class="flex items-center text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
          <input
            type="checkbox"
            bind:checked={rightShiftSplit}
            class="mr-2 text-primary-500"
          />
          <span class="text-gray-900 dark:text-white">Right shift split</span>
        </label>
        
        <label class="flex items-center text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
          <input
            type="checkbox"
            bind:checked={leftShiftSplit}
            class="mr-2 text-primary-500"
          />
          <span class="text-gray-900 dark:text-white">Left shift split</span>
        </label>
        
        <label class="flex items-center text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
          <input
            type="checkbox"
            bind:checked={splitBackspace}
            class="mr-2 text-primary-500"
          />
          <span class="text-gray-900 dark:text-white">Split backspace</span>
        </label>
      </div>
      
      <!-- Apply Button -->
      <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
        <button
          class="w-full px-3 py-2 rounded-lg transition-colors duration-200 text-sm font-medium {$glassmorphismMode
            ? 'glassmorphism-button text-gray-900 dark:text-white'
            : 'bg-primary-500 text-white hover:bg-primary-600'}"
          onclick={applyConfiguration}
        >
          Apply Configuration
        </button>
      </div>
    </div>
  {/if}
</div>
