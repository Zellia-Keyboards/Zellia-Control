<script lang="ts">
	import { darkMode } from '$lib/DarkModeStore.svelte';
	import type { KeyboardDisplayValues as KeyboardDisplayValuesType } from '$lib/KeyboardState.svelte';
	import type { globalConfigurations, DynamicKeystrokeConfiguration } from '$lib/AdvancedKeyShared';
	import { language, t } from '$lib/LanguageStore.svelte';
	
	let currentLanguage = $state($language);
	
	// Subscribe to language changes
	language.subscribe(value => {
		currentLanguage = value;
	});


	type ConfiguredDynamicKeyEntry = [string, DynamicKeystrokeConfiguration];
	type Props = {
		configuredDynamicKeys: ConfiguredDynamicKeyEntry[];
		KeyboardDisplayValues: typeof KeyboardDisplayValuesType; // Store type
		resetAllDynamicKeys?: () => void; // Optional reset function
	};

	let { configuredDynamicKeys, KeyboardDisplayValues, resetAllDynamicKeys }: Props = $props();
	const KDisplayValues = $state.snapshot($KeyboardDisplayValues); // Get static snapshot for display
</script>

{#if configuredDynamicKeys.length > 0}	<div class="max-w-7xl mx-auto mt-6">
		<div
			class="rounded-lg border p-6"
			style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, ${$darkMode ? 'black' : 'white'}); border-color: ${$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #374151)' : 'color-mix(in srgb, var(--theme-color-primary) 15%, #e5e7eb)'};"
		>			<div class="flex items-center justify-between mb-4">				<h3
					class="text-lg font-medium {$darkMode
						? 'text-white'
						: 'text-gray-900'}"
				>
					{t('advancedkey.configuredDynamicKeys', currentLanguage)}
				</h3>
				<div class="flex items-center gap-2">
					<span
						class="text-sm {$darkMode
							? 'text-gray-400'
							: 'text-gray-500'}"
						>{configuredDynamicKeys.length} {configuredDynamicKeys.length !== 1
							? t('advancedkey.keysCountPlural', currentLanguage)
							: t('advancedkey.keysCount', currentLanguage)}</span
					>
					{#if resetAllDynamicKeys}
						<button 
							class="px-4 py-2 {$darkMode ? 'bg-red-700 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700'} text-white rounded-md transition-colors text-sm font-medium"
							onclick={resetAllDynamicKeys}
						>
							{t('advancedkey.resetAllDynamic', currentLanguage)}
						</button>
					{/if}
				</div>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each configuredDynamicKeys as [keyId, config]}
					{@const [x, y] = keyId.split(',').map(Number)}
					{@const keyName = KDisplayValues[y]?.[x] || 'Unknown'}					<div
						class="p-4 rounded-lg border"
						style="background-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 5%, #111827)' : 'color-mix(in srgb, var(--theme-color-primary) 3%, #f9fafb)'};
							   border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 15%, #4b5563)' : 'color-mix(in srgb, var(--theme-color-primary) 10%, #e5e7eb)'};"
					>
						<div class="flex items-center justify-between mb-2">							<span
								class="font-mono font-bold"
								style="color: var(--theme-color-primary);"
								>{keyName}</span
							>
						</div>
						<div class="text-sm space-y-1">
							<div class="flex justify-between">								<span
									class={$darkMode
										? 'text-gray-400'
										: 'text-gray-600'}
									>{t('advancedkey.bindingsLabel', currentLanguage)}:</span
								>
								<span
									class={$darkMode
										? 'text-gray-300'
										: 'text-gray-700'}
									>{config.keycodes.length}</span
								>
							</div>
							<div class="flex justify-between">								<span
									class={$darkMode
										? 'text-gray-400'
										: 'text-gray-600'}
									>{t('advancedkey.bottomOutLabel', currentLanguage)}:</span
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