<script lang="ts">
  import { Tooltip, TooltipTrigger, TooltipContent } from '$lib/components/ui/tooltip';
  import { Input } from '$lib/components/ui/input';

  interface Props {
    maxTravelDistance: number;
    onMaxTravelChange: (value: number) => void;
    onClampValues?: (maxDistance: number) => void;
  }

  let { maxTravelDistance, onMaxTravelChange, onClampValues }: Props = $props();
  let inputValue = $state(String(maxTravelDistance));

  $effect(() => {
    inputValue = String(maxTravelDistance);
  });

  function handleInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const filteredValue = input.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
    inputValue = filteredValue;

    let value = filteredValue ? Number(filteredValue) : 4.0;
    if (value < 1.0) value = 1.0;
    if (value > 4.0) value = 4.0;

    onMaxTravelChange(value);
    onClampValues?.(value);
  }
</script>

<Tooltip>
  <TooltipTrigger>
    {#snippet child({ props })}
      <div
        {...props}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card glassmorphism-card transition-all hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-ring"
      >
        <svg
          class="size-3.5 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 3v18M12 3l-4 4M12 3l4 4M12 21l-4-4M12 21l4-4" />
        </svg>
        <Input
          type="text"
          inputmode="decimal"
          bind:value={inputValue}
          oninput={handleInputChange}
          class="w-12 h-auto p-0 border-0 bg-transparent text-sm font-semibold text-center shadow-none focus-visible:ring-0"
        />
        <span class="text-xs font-medium text-muted-foreground">mm</span>
      </div>
    {/snippet}
  </TooltipTrigger>
  <TooltipContent side="bottom">Switch Travel Distance</TooltipContent>
</Tooltip>
