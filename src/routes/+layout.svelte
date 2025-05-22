<script lang="ts">
	import "../app.css";
	import Zellia80HE from "../lib/Zellia80HE.svelte";
	import { KeyboardDisplayValues, CurrentSelected } from "$lib/KeyboardState.svelte";

	const NAVIGATE = [
		["/debug", "Debug"],
		["/test", "Test"],
		["/remap", "Remap"],
		["/about", "About"],
	];

	let { children } = $props();
</script>

<div class="flex items-center">
	<p class="font-bold p-2 px-4 text-2xl">Zellia</p>
	{#each NAVIGATE as [href, name]}
		<a {href} class="p-2 px-4 rounded-4xl font-bold">{name}</a>
	{/each}
</div>
<div class="flex flex-col">
    <!-- Global keyboard layout -->
    <div class="flex justify-center">
        <Zellia80HE
            onClick={(x, y) => {
                console.log(`Clicked on ${x}, ${y}`);
                $CurrentSelected = [x, y];
            }}
            values={$KeyboardDisplayValues}
        />
    </div>
    <div class="flex">
        <button
            class="bg-gray-300 p-2 px-4 rounded-4xl font-bold hover:bg-gray-500"
            >Sync</button
        >
    </div>
    <!-- Component for adjust part -->
    {@render children()}
</div>

<style lang="postcss">
	@reference "tailwindcss";
	:global(html) {
		background-color: theme(--color-gray-100);
	}
</style>
