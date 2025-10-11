<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { keyActions } from '$lib/types/AdvancedKeyShared';

  interface Props {
    currentKeyName: string;
    tapAction: string;
    holdAction: string;
    holdDelay: number;
  }

  let { currentKeyName, tapAction, holdAction, holdDelay }: Props = $props();
</script>

<div
  class="rounded-lg border p-4 sm:p-6 {$glassmorphismMode
    ? 'glassmorphism-card'
    : 'bg-primary-50 dark:bg-primary-950 border-primary-300 dark:border-primary-800'}"
>
  <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Preview</h3>

  <div class="space-y-3">
    <div
      class="flex justify-between items-center py-2 border-gray-100 dark:border-gray-700 border-b"
    >
      <span class="text-sm text-gray-600 dark:text-gray-400">Key</span>
      <span class="font-mono font-medium text-gray-900 dark:text-white">{currentKeyName}</span>
    </div>
    <div
      class="flex justify-between items-center py-2 border-gray-100 dark:border-gray-700 border-b"
    >
      <span class="text-sm text-gray-600 dark:text-gray-400">Tap</span>
      <span class="font-medium text-primary-500"
        >{keyActions.find(k => k.keycode === tapAction)?.name || tapAction}</span
      >
    </div>
    <div
      class="flex justify-between items-center py-2 border-gray-100 dark:border-gray-700 border-b"
    >
      <span class="text-sm text-gray-600 dark:text-gray-400">Hold</span>
      <span class="font-medium text-green-500"
        >{keyActions.find(k => k.keycode === holdAction)?.name || holdAction}</span
      >
    </div>
    <div class="flex justify-between items-center py-2">
      <span class="text-sm text-gray-600 dark:text-gray-400">Delay</span>
      <span class="font-medium text-gray-900 dark:text-white">{holdDelay}ms</span>
    </div>
  </div>
</div>
