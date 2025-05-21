<script lang="ts">
    import {
        KeyboardDisplayValues,
        CurrentSelected,
    } from "$lib/KeyboardState.svelte";
    let data = $state(1);
</script>

<h2>State test page</h2>
<p>
    Current selected: {$CurrentSelected?.[0] ?? "N/A"}, {$CurrentSelected?.[1] ??
        "N/A"}
</p>
<label for="inputTest">Input Test</label>
<input
    id="inputTest"
    type="text"
    class="border-2 border-gray-300 rounded-lg p-2"
    bind:value={data}
/>
<button
    class="bg-gray-300 p-2 px-4 rounded-4xl font-bold hover:bg-gray-500"
    onclick={() => {
        if ($CurrentSelected === null) {
            alert("No key selected");
            return;
        }
        $KeyboardDisplayValues[$CurrentSelected[1]][$CurrentSelected[0]] = data;
    }}>Submit</button
>
