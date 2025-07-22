<script lang="ts">
  import type { Snippet } from "svelte";

  const AvailableKeys = ['PF(1)', 'PF(2)', 'PF(3)', 'PF(4)', '↔ PF', '↔ PF1', '→ PF', '← PF'];

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
