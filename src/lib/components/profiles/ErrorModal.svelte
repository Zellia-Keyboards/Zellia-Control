<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { AlertCircle } from 'lucide-svelte';
  import { fade } from 'svelte/transition';

  interface Props {
    message: string;
    onClose: () => void;
  }

  let { message, onClose }: Props = $props();
</script>

<div
  class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
  transition:fade={{ duration: 150 }}
  onclick={onClose}
>
  <div
    class="border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6 {$glassmorphismMode
      ? 'glassmorphism-card'
      : 'bg-gray-800'}"
    onclick={e => e.stopPropagation()}
  >
    <div class="flex items-start gap-3 mb-4">
      <AlertCircle class="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
      <div>
        <h3 class="text-xl font-bold text-white mb-2">Notice</h3>
        <p class="text-sm text-gray-400">
          {message}
        </p>
      </div>
    </div>

    <div class="flex justify-end">
      <button
        class="px-4 py-2.5 rounded-lg font-medium transition-colors {$glassmorphismMode
          ? 'glassmorphism-button bg-gray-700/80 border border-gray-600/50 text-white hover:bg-gray-700'
          : 'bg-gray-700 text-white hover:bg-gray-600'}"
        onclick={onClose}
      >
        OK
      </button>
    </div>
  </div>
</div>
