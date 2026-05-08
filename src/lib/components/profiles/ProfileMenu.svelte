<script lang="ts">
  import { Download, Copy, RotateCcw, Trash2 } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import { Separator } from '$lib/components/ui/separator';
  import { cn } from '$lib/utils.js';

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

  let isHolding = $state(false);
  let holdProgress = $state(0);
  let holdTimer: ReturnType<typeof setInterval> | null = null;
  const HOLD_DURATION = 1500;
  const UPDATE_INTERVAL = 16;

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

  $effect(() => {
    return () => {
      if (holdTimer) clearInterval(holdTimer);
    };
  });

  const itemClass =
    'w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors hover:bg-accent hover:text-accent-foreground';
</script>

<div
  role="menu"
  tabindex={-1}
  class="fixed z-[9999] w-48 overflow-hidden rounded-md border bg-card text-card-foreground shadow-2xl glassmorphism-card border-primary-500/30"
  style="top: {position.top}px; right: {position.right}px;"
  transition:slide={{ duration: 150, axis: 'y' }}
  onclick={e => e.stopPropagation()}
>
  <button class={itemClass} onclick={onExport}>
    <Download class="size-4" />
    Export
  </button>

  <button class={itemClass} onclick={onDuplicate}>
    <Copy class="size-4" />
    Duplicate
  </button>

  <button class={itemClass} onclick={onRestore}>
    <RotateCcw class="size-4" />
    Restore Default
  </button>

  {#if canDelete && !isActive}
    <Separator />
    <button
      class={cn(
        'w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 text-destructive transition-all relative overflow-hidden',
        isHolding ? 'bg-destructive/20' : 'hover:bg-destructive/10'
      )}
      onmousedown={startHold}
      ontouchstart={startHold}
      onmouseup={cancelHold}
      onmouseleave={cancelHold}
      ontouchend={cancelHold}
    >
      <div
        class="absolute inset-0 bg-destructive/30 transition-none"
        style="width: {holdProgress}%;"
      ></div>

      <span class="relative z-10 flex items-center gap-3 w-full">
        {#if isHolding}
          <svg class="size-4 rotate-[-90deg]" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2" class="opacity-30" />
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
          <span class="flex-1">
            {holdProgress >= 100 ? 'Deleted!' : `Deleting... ${Math.floor(holdProgress)}%`}
          </span>
        {:else}
          <Trash2 class="size-4" />
          <span>Hold to Delete (1.5s)</span>
        {/if}
      </span>
    </button>
  {/if}
</div>
