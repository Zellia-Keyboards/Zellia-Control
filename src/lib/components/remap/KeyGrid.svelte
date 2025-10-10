<script lang="ts">
  import type { Snippet } from 'svelte';

  interface KeyInfo {
    label: string;
    keycode: number;
    subcode?: number;
    layer?: number;
    profile?: number;
  }

  interface Props {
    keys: KeyInfo[];
    keyslot: Snippet<[KeyInfo]>;
    gridClass?: string;
  }

  let { keys, keyslot, gridClass = 'flex flex-wrap gap-2' }: Props = $props();
</script>

<div class={gridClass}>
  {#each keys as key}
    {@render keyslot(key)}
  {/each}
</div>
