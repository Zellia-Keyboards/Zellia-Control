<script lang="ts">
	import "../app.css";
	import Zellia80HE from "../lib/Zellia80HE.svelte";
	import { KeyboardDisplayValues, CurrentSelected } from "$lib/KeyboardState.svelte";

	const NAVIGATE = [
		["/test", "Test"],
		["/performance", "Performance"],
		["/remap", "keymap"],
		["/advancedkey", "Advanced Keys"],
		["/debug", "Debug"],
		["/settings", "Settings"],
		["/about", "About"],
	];

	let { children } = $props();
	let selectedLayer = $state(1);
	let showDropdown = $state(false);
</script>

<div class="flex h-screen">
	<!-- Sidebar -->
	<div class="flex flex-col w-48 bg-white shadow h-full relative">
		<p class="font-bold p-4 text-2xl text-black text-center">Zellia Control</p>
		<!-- Large Centered Sync Button -->
		<div class="flex justify-center mb-4 mt-2">
			<button class="bg-indigo-200 px-18 py-2 rounded-4xl font-bold hover:bg-indigo-400 hover:text-white transition-colors duration-200 shadow w-auto">Sync</button>
		</div>
		<!-- Profile Dropdown and Import/Export Buttons -->
		<div class="flex flex-col gap-2 px-2 mb-2">
			<div class="flex flex-col items-stretch mb-2">
				<!-- Profile Dropdown (repurposed for keyboard profiles) -->
				<div class="relative">
					<button class="flex items-center px-3 py-1 text-sm font-semibold border border-gray-300 rounded-lg bg-white hover:bg-gray-100 focus:outline-none w-full justify-between transition-all duration-200" onclick={() => showDropdown = !showDropdown} aria-haspopup="true" aria-expanded={showDropdown}>
						<span>Profiles</span>
						<svg class="w-4 h-4 ml-2 transition-transform duration-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style:transform={showDropdown ? 'rotate(180deg)' : 'rotate(0deg)'}><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
					</button>
				</div>
				<!-- Import/Export Buttons -->
				<div class="flex gap-1 mt-2 transition-all duration-300" style:marginTop={showDropdown ? '0.5rem' : '0'}>
					<button class="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-100 w-full">Import</button>
					<button class="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-100 w-full">Export</button>
				</div>
			</div>
			<!-- Animate the rest of the sidebar content down when dropdown is open -->
			<div class="transition-all duration-300" style:marginTop={showDropdown ? '2.5rem' : '0'}>
				<div class="flex flex-col gap-1 mt-4">
					{#each NAVIGATE as [href, name]}
						<a {href} class="p-2 rounded-2xl font-bold transition-colors duration-200 hover:bg-indigo-100 hover:text-indigo-700 focus:bg-indigo-200 focus:outline-none">{name}</a>
					{/each}
				</div>
			</div>
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
