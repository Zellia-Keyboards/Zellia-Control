<script lang="ts">

    const AvailableKeys = [
        "BRT-",
        "BRT+",
        "Vol-",
        "Vol+",
        "Mute",
        "Play/Pause",
        "Stop",
        "Prev",
        "Next",
        "Email",
        "Calculator",
        "Explorer",
        "Media Player",
        "Control Panel",
        "Search",
        "Home",
        "Back",
        "Forward",
        "Stop",
        "Refresh",
        "Bookmarks",
        "Mission Control",
        "Launchpad",
    ]
</script>



{#snippet keyslot(content: string)}
    <button class="size-14 text-wrap text-sm border overflow-auto">
        {content}
    </button>
{/snippet}

<div class="flex flex-wrap gap-2">
    {#each AvailableKeys as key}
        {@render keyslot(key)}
    {/each}
</div>