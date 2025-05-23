<script lang="ts">
    const KEYBOARD_LAYOUT = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1],
        [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1, 1, 1],
        [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
        [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75, 1],
        [1.5, 1, 1.5, 7, 1.5, 1, 1.5, 1, 1, 1],
    ];
    interface Props {
        values: any[][];
        onClick: (x: number, y: number, event: MouseEvent) => void;
    }
    const { values, onClick }: Props = $props();
</script>

<div class="p-4 bg-white rounded-xl shadow-md inline-block">
    {#each KEYBOARD_LAYOUT as row, y}
        <div
            class="flex first:*:[&:nth-child(4n+2)]:ml-3.5 *:nth-15:ml-4 nth-[5]:*:nth-13:ml-18 nth-[6]:*:nth-8:ml-4 nth-[2]:mt-4"
        >   
            {#each row as width, x}
                <button
                    class="h-14 bg-gray-400 border border-gray-300 rounded-lg items-center justify-center hover:bg-gray-300 hover:cursor-pointer"
                    style:width="{width * 3.5}rem"
                    onclick={(_) => onClick(x, y, _)}
                >
                    {values.at(y)?.at(x)?.toString() ?? "null"}
                </button>
            {/each}
        </div>
    {/each}
</div>