<script lang="ts">
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

  let {
    profileId,
    position,
    isActive,
    canDelete,
    onExport,
    onDuplicate,
    onRestore,
    onDelete,
  }: Props = $props();

  // Long press delete state
  let isHolding = $state(false);
  let holdProgress = $state(0);
  let holdTimer: ReturnType<typeof setInterval> | null = null;
  const HOLD_DURATION = 1500; // 1.5 seconds
  const UPDATE_INTERVAL = 16; // ~60fps

  function startHold(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    isHolding = true;
    holdProgress = 0;

    holdTimer = setInterval(() => {
      holdProgress += (UPDATE_INTERVAL / HOLD_DURATION) * 100;

      if (holdProgress >= 100) {
        cancelHold();
        onDelete();
      }
    }, UPDATE_INTERVAL);
  }

  function cancelHold() {
    isHolding = false;
    holdProgress = 0;
    if (holdTimer) {
      clearInterval(holdTimer);
      holdTimer = null;
    }
  }

  // Cleanup on unmount
  $effect(() => {
    return () => {
      if (holdTimer) clearInterval(holdTimer);
    };
  });
</script>

<div
  class="fixed border rounded-lg shadow-2xl z-[9999] w-48 overflow-hidden backdrop-blur-2xl glassmorphism-card border-primary-500/30"
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
      class="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 text-red-400 transition-all relative overflow-hidden {isHolding
        ? 'bg-red-900/30'
        : 'hover:bg-red-900/20'}"
      onmousedown={startHold}
      onTouchstart={startHold}
      onmouseup={cancelHold}
      onmouseleave={cancelHold}
      onTouchend={cancelHold}
    >
      <!-- Progress bar background -->
      <div
        class="absolute inset-0 bg-red-900/40 transition-none"
        style="width: {holdProgress}%;"
      ></div>

      <!-- Content -->
      <span class="relative z-10 flex items-center gap-3 w-full">
        {#if isHolding}
          <div class="w-4 h-4 relative">
            <!-- Circular progress spinner -->
            <svg class="w-4 h-4 rotate-[-90deg]" viewBox="0 0 16 16">
              <circle
                cx="8"
                cy="8"
                r="6"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="opacity-30"
              />
              <circle
                cx="8"
                cy="8"
                r="6"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-dasharray={holdProgress * 0.377}
                stroke-dashoffset="0"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <span class="flex-1">
            {holdProgress >= 100 ? 'Deleted!' : `Deleting... ${Math.floor(holdProgress)}%`}
          </span>
        {:else}
          <Trash2 class="w-4 h-4" />
          <span>Hold to Delete (1.5s)</span>
        {/if}
      </span>
    </button>
  {/if}
</div>
