<script lang="ts">
	import { darkMode } from '$lib/DarkModeStore.svelte';

	type Props = {
		currentKeyName: string;
		currentSelectedCoords: [number, number] | null;
	};
	let { currentKeyName, currentSelectedCoords }: Props = $props();
</script>

<div
	class="{$darkMode
		? 'bg-black border-white'
		: 'bg-white border-gray-200'} rounded-lg border p-6 mb-6"
>
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<div class="flex items-center gap-3">
				<div
					class="w-12 h-12 {$darkMode
						? 'bg-gray-800 border-white'
						: 'bg-gray-100 border-blue-300'} rounded-lg flex items-center justify-center border-2"
				>
					<span
						class="font-mono font-bold {$darkMode
							? 'text-white'
							: 'text-gray-900'}"
						>{currentKeyName}</span
					>
				</div>
				<div>
					<h3
						class="font-medium {$darkMode
							? 'text-white'
							: 'text-gray-900'}"
					>
						Selected Key
					</h3>
					{#if currentSelectedCoords}
						<p
							class="text-sm {$darkMode
								? 'text-gray-400'
								: 'text-gray-500'}"
						>
							Position: {currentSelectedCoords[0]}, {currentSelectedCoords[1]}
						</p>
					{/if}
				</div>
			</div>
		</div>
		<div class="flex items-center gap-3">
			<span
				class="text-sm {$darkMode
					? 'text-gray-400'
					: 'text-gray-600'}">Mode:</span
			>
			<span
				class="px-3 py-1 {$darkMode
					? 'bg-gray-800 text-white border border-white'
					: 'bg-indigo-100 text-indigo-700'} rounded-full text-sm font-medium"
			>
				Dynamic Keystroke
			</span>
		</div>
	</div>
</div>