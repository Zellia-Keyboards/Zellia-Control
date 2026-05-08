<script lang="ts">
  import { selectedLayer } from '$lib/stores/SelectedLayerStore.svelte';
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Tooltip, TooltipTrigger, TooltipContent } from '$lib/components/ui/tooltip';
  import { cn } from '$lib/utils.js';

  let { shouldShow = false } = $props();
</script>

{#if shouldShow}
  <div class="layer-selector flex items-center gap-2 px-4 py-2 h-12">
    <span class="font-semibold text-foreground mr-2 text-sm">Layer:</span>
    {#each [1, 2, 3, 4] as layer}
      {@const active = $selectedLayer === layer}
      <Tooltip>
        <TooltipTrigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant={active ? 'default' : 'outline'}
              size="icon"
              class={cn(
                'size-9 font-bold text-base rounded-lg transition-transform',
                active &&
                  'bg-primary-500 hover:bg-primary-600 text-white border-primary-700 shadow-lg scale-110 ring-2 ring-primary-400',
                $glassmorphismMode && 'glassmorphism-button'
              )}
              onclick={() => selectedLayer.set(layer)}
            >
              {layer}
            </Button>
          {/snippet}
        </TooltipTrigger>
        <TooltipContent side="bottom">Layer {layer}</TooltipContent>
      </Tooltip>
    {/each}
  </div>
{/if}
