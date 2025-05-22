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
	let selectedLayer = $state(1);
</script>

<div class="flex h-screen">
	<!-- Sidebar -->
	<div class="flex flex-col w-48 bg-white shadow h-full">
		<p class="font-bold p-4 text-2xl text-black text-align:center">Zellia Control</p>
		<div class="flex flex-col gap-2 px-2">
            <button
				class="ml-2 bg-indigo-200 p-2 px-4 rounded-4xl font-bold hover:bg-indigo-400 hover:text-white transition-colors duration-200 shadow"
				>Sync</button
			>
			{#each NAVIGATE as [href, name]}
				<a {href} class="p-2 rounded-2xl font-bold transition-colors duration-200 hover:bg-indigo-100 hover:text-indigo-700 focus:bg-indigo-200 focus:outline-none">{name}</a>
			{/each}
		</div>
		<div class="flex-1"></div>
	</div>
	<!-- Main Content -->
	<div class="flex-1 flex flex-col gap-4 px-4">
		<div class="flex items-center  mb-4">
			<div class="flex items-center gap-2 px-4 py-2">
				<span class="font-semibold text-gray-700 mr-2">Layer:</span>
				{#each [1,2,3,4] as layer}
					<button
						class="w-8 h-8 flex items-center justify-center rounded-lg border-2 font-bold text-lg transition-colors duration-200 focus:outline-none {selectedLayer === layer ? 'bg-indigo-500 text-white border-indigo-700' : 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-100'}"
						onclick={() => selectedLayer = layer}
					>
						{layer}
					</button>
				{/each}
			</div>
		</div>
		<!-- Global keyboard layout -->
		<div class="flex justify-center my-4">
			<Zellia80HE
				onClick={(x, y) => {
					console.log(`Clicked on ${x}, ${y}`);
					$CurrentSelected = [x, y];
				}}
				values={$KeyboardDisplayValues}
			/>
		</div>
		<!-- Component for adjust part -->
		<div class="bg-white rounded-2xl shadow p-4 mt-2">
			{@render children()}
		</div>
	</div>
</div>

<style lang="postcss">
	@reference "tailwindcss";
	:global(html) {
		background-color: theme(--color-gray-100);
	}
</style>
