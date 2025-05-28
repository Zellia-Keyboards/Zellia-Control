<script lang="ts">
	import { darkMode } from '$lib/DarkModeStore.svelte';
	import type { KeyAction } from '$lib/AdvancedKeyShared';

	interface Props {
		selectedKeycodes: string[];
		selectedBindingIndex: number | null;
		actionCategories: { name: string; actions: KeyAction[] }[];
	}

	let { selectedKeycodes = $bindable(), selectedBindingIndex = $bindable(), actionCategories }: Props = $props();

	function selectKeycode(keycode: string): void {
		if (selectedBindingIndex !== null) {
			selectedKeycodes[selectedBindingIndex] = keycode; // Directly mutates the $state array [cite: 222, 223]
			selectedBindingIndex = null;
		}
	}
</script>

<div
	class="{$darkMode
		? 'bg-black border-gray-600'
		: 'bg-white border-gray-200'} rounded-lg border p-6"
>
	<h3
		class="text-lg font-medium {$darkMode
			? 'text-white'
			: 'text-gray-900'} mb-4"
	>
		Keycode Selection
	</h3>
	{#if selectedBindingIndex !== null}
		<p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
			Select a keycode for binding {selectedBindingIndex + 1}
		</p>
	{:else}
		<p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
			Click on a binding button to select a keycode
		</p>
	{/if}

	<div class="space-y-4">
		{#each actionCategories as category}
			<div>
				<h4
					class="text-sm font-medium {$darkMode
						? 'text-gray-300'
						: 'text-gray-700'} mb-2"
				>
					{category.name}
				</h4>
				<div class="grid grid-cols-10 gap-2">
					{#each category.actions as action}
						<button
							class="aspect-square w-15 h-15 text-xs rounded-md border transition-all {selectedBindingIndex !==
							null
								? $darkMode
									? 'bg-gray-900 border-gray-600 hover:bg-gray-800 hover:border-white text-gray-300'
									: 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-700'
								: $darkMode
									? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
									: 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}"
							onclick={() => selectKeycode(action.id)}
							disabled={selectedBindingIndex === null}
							title={action.name}
						>
							{action.name}
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>