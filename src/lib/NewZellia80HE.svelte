<script lang="ts">
  import { darkMode } from '$lib/DarkModeStore.svelte';
  import type { Snippet } from 'svelte';

  const KEYBOARD_LAYOUT = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1],
    [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1, 1, 1],
    [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.29],
    [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.82, 1],
    [1.525, 1, 1.525, 7, 1.525, 1, 1.525, 1, 1, 1],
  ];

  interface Props {
    onClick: (x: number, y: number, event: MouseEvent) => void;
    body: Snippet<[number, number]>;
    currentSelectedKey: [number, number] | null;
  }
  let { onClick, body, currentSelectedKey = $bindable(null) }: Props = $props();
</script>

<div
  class="p-4 {$darkMode
    ? 'bg-neutral-800 border border-neutral-700'
    : 'bg-gray-100 border border-gray-300'} rounded-xl shadow-md space-y-0.5 m-auto"
>
  {#each KEYBOARD_LAYOUT as row, y}
    <div
      class="flex first:*:[&:nth-child(4n+2)]:ml-3.5 *:nth-15:ml-4 nth-[5]:*:nth-13:ml-18.5 nth-[6]:*:nth-8:ml-4 nth-[2]:mt-4 gap-x-0.5"
    >
      {#each row as width, x}
        <button
          class="group scale-100 hover:scale-95 transition-all duration-300"
          style:width={y === 5 && x === 3 ? '400px' : `${width * 3.5}rem`}
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
