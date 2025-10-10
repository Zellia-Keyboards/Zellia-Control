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
    rows: KeyInfo[][];
    keyslot: Snippet<[KeyInfo]>;
    rowClasses?: string[];
  }

  let { rows, keyslot, rowClasses = [] }: Props = $props();
</script>

<div class="space-y-2">
  {#each rows as row, index}
    <div class={rowClasses[index] || 'flex gap-2'}>
      {#each row as key}
        {@render keyslot(key)}
      {/each}
    </div>
  {/each}
</div>
