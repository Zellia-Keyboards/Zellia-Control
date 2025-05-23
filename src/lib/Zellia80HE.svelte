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

    // Helper function to format key text
    function formatKeyText(keyText: string) {
        const parts = keyText.split('\n');
        if (parts.length === 2) {
            return {
                top: parts[0],
                bottom: parts[1]
            };
        }
        return {
            top: keyText,
            bottom: ''
        };
    }
</script>

<div class="p-4 bg-white rounded-xl shadow-md inline-block">
    {#each KEYBOARD_LAYOUT as row, y}
        <div
            class="flex first:*:[&:nth-child(4n+2)]:ml-3.5 *:nth-15:ml-4 nth-[5]:*:nth-13:ml-18 nth-[6]:*:nth-8:ml-4 nth-[2]:mt-4"
        >   
            {#each row as width, x}
                {@const keyText = values.at(y)?.at(x)?.toString() ?? "null"}
                {@const formatted = formatKeyText(keyText)}
                <button
                    class="h-14 bg-gray-400 border border-gray-300 rounded-lg flex flex-col items-center justify-center hover:bg-gray-300 hover:cursor-pointer gap-1"
                    style:width="{width * 3.5}rem"
                    onclick={(_) => onClick(x, y, _)}
                >
                    <div class="key-bottom text-xs text-gray-800">{formatted.bottom}</div>
                    <div class="key-top text-sm font-bold text-black">{formatted.top}</div>
                </button>
            {/each}
        </div>
    {/each}
</div>

<style>
    .key-top {
        line-height: 1;
    }
    
    .key-bottom {
        line-height: 1;
    }
</style>