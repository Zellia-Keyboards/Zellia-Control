<script lang="ts">
	import { darkMode } from '$lib/DarkModeStore.svelte';
	import type { KeyboardDisplayValues as KeyboardDisplayValuesType } from '$lib/KeyboardState.svelte';
	import type { globalConfigurations, DynamicKeystrokeConfiguration } from '$lib/AdvancedKeyShared';


	type ConfiguredDynamicKeyEntry = [string, DynamicKeystrokeConfiguration];

	type Props = {
		configuredDynamicKeys: ConfiguredDynamicKeyEntry[];
		KeyboardDisplayValues: typeof KeyboardDisplayValuesType; // Store type
	};

	let { configuredDynamicKeys, KeyboardDisplayValues }: Props = $props();
	const KDisplayValues = $state.snapshot($KeyboardDisplayValues); // Get static snapshot for display
</script>

{#if configuredDynamicKeys.length > 0}
	<div class="max-w-7xl mx-auto mt-6">
		<div
			class="{$darkMode
				? 'bg-black border-white'
				: 'bg-white border-gray-200'} rounded-lg border p-6"
		>
			<div class="flex items-center justify-between mb-4">
				<h3
					class="text-lg font-medium {$darkMode
						? 'text-white'
						: 'text-gray-900'}"
				>
					Configured Dynamic Keys
				</h3>
				<span
					class="text-sm {$darkMode
						? 'text-gray-400'
						: 'text-gray-500'}"
					>{configuredDynamicKeys.length} key{configuredDynamicKeys.length !== 1
						? 's'
						: ''}</span
				>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each configuredDynamicKeys as [keyId, config]}
					{@const [x, y] = keyId.split(',').map(Number)}
					{@const keyName = KDisplayValues[y]?.[x] || 'Unknown'}
					<div
						class="p-4 {$darkMode
							? 'bg-gray-900 border-gray-600'
							: 'bg-gray-50'} rounded-lg border"
					>
						<div class="flex items-center justify-between mb-2">
							<span
								class="font-mono font-bold {$darkMode
									? 'text-white'
									: 'text-gray-900'}"
								>{keyName}</span
							>
						</div>
						<div class="text-sm space-y-1">
							<div class="flex justify-between">
								<span
									class={$darkMode
										? 'text-gray-400'
										: 'text-gray-600'}
									>Bindings:</span
								>
								<span
									class={$darkMode
										? 'text-gray-300'
										: 'text-gray-700'}
									>{config.keycodes.length}</span
								>
							</div>
							<div class="flex justify-between">
								<span
									class={$darkMode
										? 'text-gray-400'
										: 'text-gray-600'}
									>Bottom Out:</span
								>
								<span
									class={$darkMode
										? 'text-gray-300'
										: 'text-gray-700'}
									>{config.bottomOutPoint.toFixed(1)}mm</span
								>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}