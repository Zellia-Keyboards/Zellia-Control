<script lang="ts">

    const AvailableKeys = [
        "BRT-",
        "BRT+",
        "Vol-",
        "Vol+",
        "Mute",
        "Play\nPause",
        "Stop",
        "Prev",
        "Next",
        "Email",
        "Calculator",
        "Explorer",
        "Media\nPlayer",
        "Control\nPanel",
        "Search",
        "Home",
        "Back",
        "Forward",
        "Stop",
        "Refresh",
        "Bookmarks",
        "Mission\nControl",
        "Launchpad",
    ]
</script>



{#snippet keyslot(content: string)}
    <button class="size-14 text-wrap text-sm border whitespace-pre-line rounded-lg overflow-auto truncate">
        {content}
    </button>
{/snippet}

<div class="flex flex-wrap gap-2">
    {#each AvailableKeys as key}
        {@render keyslot(key)}
    {/each}
</div>