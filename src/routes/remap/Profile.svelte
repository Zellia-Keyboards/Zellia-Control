<script lang="ts">

    const AvailableKeys = [
        "PF(1)",
        "PF(2)",
        "PF(3)",
        "PF(4)",
        "↔ PF",
        "↔ PF1",
        "→ PF",
        "← PF",
    ]
</script>



{#snippet keyslot(content: string)}
    <button class="size-14 text-wrap text-sm border overflow-auto whitespace-pre-line">
        {content}
    </button>
{/snippet}

<div class="flex flex-wrap gap-2">
    {#each AvailableKeys as key}
        {@render keyslot(key)}
    {/each}
</div>