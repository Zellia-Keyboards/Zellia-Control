<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { fade } from 'svelte/transition';

  interface Props {
    title: string;
    message: string;
    confirmText: string;
    confirmColor?: 'blue' | 'orange' | 'red';
    onConfirm: () => void;
    onCancel: () => void;
  }

  let { title, message, confirmText, confirmColor = 'blue', onConfirm, onCancel }: Props = $props();

  const colorClasses = {
    blue: $glassmorphismMode
      ? 'glassmorphism-button bg-blue-600/80 border border-blue-500/50 text-white hover:bg-blue-600'
      : 'bg-blue-600 text-white hover:bg-blue-700',
    orange: $glassmorphismMode
      ? 'glassmorphism-button bg-orange-600/80 border border-orange-500/50 text-white hover:bg-orange-600'
      : 'bg-orange-600 text-white hover:bg-orange-700',
    red: $glassmorphismMode
      ? 'glassmorphism-button bg-red-600/80 border border-red-500/50 text-white hover:bg-red-600'
      : 'bg-red-600 text-white hover:bg-red-700',
  };
</script>

<div
  class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
  transition:fade={{ duration: 150 }}
  onclick={onCancel}
>
  <div
    class="border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6 {$glassmorphismMode
      ? 'glassmorphism-card'
      : 'bg-gray-800'}"
    onclick={e => e.stopPropagation()}
  >
    <h3 class="text-xl font-bold text-white mb-3">{title}</h3>
    <p class="text-sm text-gray-400 mb-6">
      {@html message}
    </p>

    <div class="flex gap-3">
      <button
        class="flex-1 px-4 py-2.5 rounded-lg border font-medium transition-colors {$glassmorphismMode
          ? 'glassmorphism-button border-gray-600 text-gray-300'
          : 'border-gray-600 text-gray-300 hover:bg-gray-700'}"
        onclick={onCancel}
      >
        Cancel
      </button>
      <button
        class="flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors {colorClasses[
          confirmColor
        ]}"
        onclick={onConfirm}
      >
        {confirmText}
      </button>
    </div>
  </div>
</div>
