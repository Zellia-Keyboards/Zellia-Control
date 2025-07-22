<script lang="ts">
  import type { Snippet } from 'svelte';

  const AvailableKeys = [
    'Reboot',
    'Recovery',
    'Reset',
    'NKRO\nToggle',
    'NKRO\nON',
    'NKRO\nOFF',
    'Calibrate',
  ];
  interface Props {
    keyslot: Snippet<[string]>;
  }

  let { keyslot }: Props = $props();
</script>

<div class="flex flex-wrap gap-2">
  {#each AvailableKeys as key}
    {@render keyslot(key)}
  {/each}
</div>
