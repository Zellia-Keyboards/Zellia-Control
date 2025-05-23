<script lang="ts">
    import type { Component } from "svelte";
    import RawData from "./RawData.svelte";
    import KeyTracking from "./KeyTracking.svelte";

    let buttonTabs: [Component, string][] = [
        [RawData, "Raw data"],
        [KeyTracking, "Key Tracking"],
    ];

    let CurrentTabComponent = $state(buttonTabs[0][0]);
</script>

{#each buttonTabs as buttonTab}
    <button
        onclick={() => (CurrentTabComponent = buttonTab[0]!)}
        class="bg-blue-600 text-white px-4 py-2 rounded mr-2"
        >{buttonTab[1]}</button
    >
{/each}
<div class="mt-4 w-full">
    <CurrentTabComponent />
</div>
