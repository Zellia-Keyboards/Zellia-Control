<script lang="ts">
  import type { Snippet } from 'svelte';

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
  interface Props {
    keyslot: Snippet<[string]>;
  }

  let {  keyslot }: Props = $props();
</script>

<div class="flex flex-wrap gap-2">
  {#each AvailableKeys as key}
    {@render keyslot(key)}
  {/each}
</div>
