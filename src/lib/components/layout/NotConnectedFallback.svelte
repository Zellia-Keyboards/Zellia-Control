<script lang="ts">
  import { goto } from '$app/navigation';
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
</script>

<div class="flex-1 flex items-center justify-center p-8">
  <div
    class="text-center p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 {$glassmorphismMode
      ? 'glassmorphism-card'
      : ''}"
  >
    <div
      class="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"
    >
      <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
        />
      </svg>
    </div>
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Keyboard Connected</h3>
    <p class="text-gray-600 dark:text-gray-400 mb-4">
      Please connect a keyboard or go to the home page to start.
    </p>
    <button
      class="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors duration-200 {$glassmorphismMode
        ? 'glassmorphism-button'
        : ''}"
      onclick={() => goto('/')}
    >
      Go to Home
    </button>
  </div>
</div>
