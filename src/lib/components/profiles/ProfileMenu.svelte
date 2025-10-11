<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { Download, Copy, RotateCcw, Trash2 } from 'lucide-svelte';
  import { slide } from 'svelte/transition';

  interface Props {
    profileId: number;
    position: { top: number; right: number };
    isActive: boolean;
    canDelete: boolean;
    onExport: () => void;
    onDuplicate: () => void;
    onRestore: () => void;
    onDelete: () => void;
  }

  let { profileId, position, isActive, canDelete, onExport, onDuplicate, onRestore, onDelete }: Props = $props();
</script>

<div
  class="fixed border rounded-lg shadow-2xl z-[9999] w-48 overflow-hidden backdrop-blur-2xl {$glassmorphismMode
    ? 'glassmorphism-card border-primary-500/30'
    : 'bg-primary-900 dark:bg-primary-900 border-primary-700'}"
  style="top: {position.top}px; right: {position.right}px;"
  transition:slide={{ duration: 150, axis: 'y' }}
  onclick={e => e.stopPropagation()}
>
  <button
    class="w-full px-4 py-2.5 text-left text-sm hover:bg-primary-800/50 flex items-center gap-3 text-gray-200 dark:text-gray-200 transition-colors"
    onclick={onExport}
  >
    <Download class="w-4 h-4" />
    Export
  </button>

  <button
    class="w-full px-4 py-2.5 text-left text-sm hover:bg-primary-800/50 flex items-center gap-3 text-gray-200 dark:text-gray-200 transition-colors"
    onclick={onDuplicate}
  >
    <Copy class="w-4 h-4" />
    Duplicate
  </button>

  <button
    class="w-full px-4 py-2.5 text-left text-sm hover:bg-primary-800/50 flex items-center gap-3 text-gray-200 dark:text-gray-200 transition-colors"
    onclick={onRestore}
  >
    <RotateCcw class="w-4 h-4" />
    Restore Default
  </button>

  {#if canDelete && !isActive}
    <div class="border-t border-primary-700/50"></div>
    <button
      class="w-full px-4 py-2.5 text-left text-sm hover:bg-red-900/20 flex items-center gap-3 text-red-400 transition-colors"
      onclick={onDelete}
    >
      <Trash2 class="w-4 h-4" />
      Delete
    </button>
  {/if}
</div>
