<script lang="ts">
  const AvailableKeys = [
    'Reboot',
    'Recovery',
    'Reset',
    'NKRO\nToggle',
    'NKRO\nON',
    'NKRO\nOFF',
    'Calibrate',
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
