<script lang="ts">
  import { selectedLayer } from '$lib/stores/SelectedLayerStore.svelte';
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';

  let { shouldShow = false } = $props();
</script>

{#if shouldShow}
  <div class="layer-selector flex items-center gap-2 px-4 py-2 h-12">
    <span
      class="font-semibold text-gray-900 dark:text-white mr-2 text-gray-800 dark:text-white">Layer:</span
    >
    {#each [1, 2, 3, 4] as layer}
      <button
        class="w-8 h-8 flex items-center justify-center rounded-lg border font-bold text-lg transition-all duration-200 focus:outline-none bg-white dark:bg-black border-gray-300 dark:border-gray-600 text-primary-500 hover:bg-primary-100 dark:hover:bg-gray-700 {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''} {$selectedLayer === layer
          ? 'bg-primary-500 !text-white !border-primary-700 shadow-lg scale-110 ring-2 ring-primary-400'
          : ''}"
        onclick={() => selectedLayer.set(layer)}
        title="Layer {layer}"
      >
        {layer}
      </button>
    {/each}
  </div>
{:else}
  <div></div>
{/if}
