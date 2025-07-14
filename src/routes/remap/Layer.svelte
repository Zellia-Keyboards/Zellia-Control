<script lang="ts">
  const AvailableKeys = [
    'MQ(1)',
    'MQ(2)',
    'MQ(3)',
    'DF(0)',
    'DF(1)',
    'DF(2)',
    'DF(3)',
    'TG(0)',
    'TG(1)',
    'TG(2)',
    'TG(3)',
  ];
</script>

{#snippet keyslot(content: string)}
  <button
    class="size-14 text-wrap text-sm border whitespace-pre-line rounded-lg overflow-auto truncate"
  >
    {content}
  </button>
{/snippet}

<div class="flex flex-wrap gap-2">
  {#each AvailableKeys as key}
    {@render keyslot(key)}
  {/each}
</div>
