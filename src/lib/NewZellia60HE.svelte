<script lang="ts">
  import type { Snippet } from 'svelte';

  const KEYBOARD_LAYOUT = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
    [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1.25, 1.25, 1.25, 6.25, 1, 1, 1, 1, 1],
  ];

  interface Props {
    onClick: (x: number, y: number, event: MouseEvent) => void;
    body: Snippet<[number, number]>;
    currentSelectedKey: [number, number] | null;
  }
  let { onClick, body, currentSelectedKey = $bindable(null) }: Props = $props();
</script>

<div
  class="p-4 bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-xl shadow-md space-y-0.5 m-auto"
>
  {#each KEYBOARD_LAYOUT as row, y}
    <div class="flex">
      {#each row as width, x}
        <button
          class="group scale-100 hover:scale-95 transition-all duration-300"
          style:width={`${width * 56}px`}
          onclick={_ => {
            currentSelectedKey = [x, y];
            onClick(x, y, _);
          }}
        >
          {@render body(x, y)}
        </button>
      {/each}
    </div>
  {/each}
</div>
