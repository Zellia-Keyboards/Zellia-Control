<script lang="ts">
    const KEYBOARD_LAYOUT = [
        [[1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1], [1, 1, 1]],
        [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
            [1, 1, 1],
        ],
        [
            [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
            [1, 1, 1],
        ],
        [[1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25]],
        [[2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75], [1]],
        [
            [1.5, 1, 1.5, 7, 1.5, 1, 1.5],
            [1, 1, 1],
        ],
    ];
</script>

<div>
    {#each KEYBOARD_LAYOUT as row}
        <div class="flex nth-[2]:mt-2 group">
            {#each row as block}
                <div class="flex not-[first]:ml-2 group-nth-[5]:nth-[2]:ml-10">
                    {#each block as _}
                        <div
                            class="h-8 bg-gray-500 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-300"
                            style:width="{_ * 2}rem"
                        >
                            {_}
                        </div>
                    {/each}
                </div>
            {/each}
        </div>
    {/each}
</div>
