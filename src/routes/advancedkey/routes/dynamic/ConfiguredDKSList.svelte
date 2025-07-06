<script lang="ts">
	import { darkMode } from '$lib/DarkModeStore.svelte';
	import type { KeyboardDisplayValues as KeyboardDisplayValuesType } from '$lib/KeyboardState.svelte';
	import type { globalConfigurations, DynamicKeystrokeConfiguration } from '$lib/AdvancedKeyShared';
	import { language, t } from '$lib/LanguageStore.svelte';
	import { Trash2 } from 'lucide-svelte';
	
	let currentLanguage = $state($language);
	
	// Subscribe to language changes
	language.subscribe(value => {
		currentLanguage = value;
	});

	// Animation state
	let deletingKeys = $state<Set<string>>(new Set());
	let newlyAddedKeys = $state<Set<string>>(new Set());


	type ConfiguredDynamicKeyEntry = [string, DynamicKeystrokeConfiguration];
	type Props = {
		configuredDynamicKeys: ConfiguredDynamicKeyEntry[];
		KeyboardDisplayValues: typeof KeyboardDisplayValuesType; // Store type
		resetAllDynamicKeys?: () => void; // Optional reset function
		onDeleteKey?: (keyId: string) => void; // New prop for deleting individual keys
	};

	let { configuredDynamicKeys, KeyboardDisplayValues, resetAllDynamicKeys, onDeleteKey }: Props = $props();
	const KDisplayValues = $state.snapshot($KeyboardDisplayValues); // Get static snapshot for display

	function deleteKey(keyId: string): void {
		if (!onDeleteKey) return;
		
		// Start fade-out animation
		deletingKeys = new Set([...deletingKeys, keyId]);
		
		// Wait for animation to complete, then remove
		setTimeout(() => {
			onDeleteKey(keyId);
			deletingKeys = new Set([...deletingKeys].filter(id => id !== keyId));
		}, 300); // Match the CSS animation duration
	}

	// Export function to trigger new key animation
	export function addNewKeyAnimation(keyId: string): void {
		newlyAddedKeys = new Set([...newlyAddedKeys, keyId]);
		
		// Remove the fade-in effect after animation completes
		setTimeout(() => {
			newlyAddedKeys = new Set([...newlyAddedKeys].filter(id => id !== keyId));
		}, 500);
	}
</script>

{#if configuredDynamicKeys.length > 0}	
<div class="max-w-7xl mx-auto mt-6">
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
							: t('advancedkey.keysCount', currentLanguage)}</span>
				</div>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each configuredDynamicKeys as [keyId, config]}
					{@const [x, y] = keyId.split(',').map(Number)}
					{@const keyName = KDisplayValues[y]?.[x] || 'Unknown'}
					{@const isDeleting = deletingKeys.has(keyId)}
					{@const isNewlyAdded = newlyAddedKeys.has(keyId)}
					
					<div
						class="group relative overflow-hidden transition-all duration-300 ease-out hover:shadow-lg hover:shadow-primary/10 {isDeleting ? 'opacity-0 scale-95 pointer-events-none' : isNewlyAdded ? 'opacity-100 scale-100 animate-fade-in' : 'opacity-100 scale-100 hover:scale-[1.02] hover:-translate-y-1'} p-4 rounded-lg border"
						style="background: linear-gradient(135deg, 
								color-mix(in srgb, var(--theme-color-primary) 8%, {$darkMode ? '#1f2937' : '#ffffff'}) 0%, 
								color-mix(in srgb, var(--theme-color-primary) 3%, {$darkMode ? '#111827' : '#f8fafc'}) 100%);
							   border-color: color-mix(in srgb, var(--theme-color-primary) 20%, {$darkMode ? '#374151' : '#e2e8f0'});"
					>
						<div class="flex items-center justify-between mb-3">							
							<span
								class="font-mono font-bold"
								style="color: var(--theme-color-primary);"
								>{keyName}</span>
							
							{#if onDeleteKey}
								<button 
									class="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-colors"
									onclick={() => deleteKey(keyId)}
									title={t('advancedkey.deleteKey', currentLanguage)}
									aria-label={t('advancedkey.deleteKey', currentLanguage)}
								>
									<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
									</svg>
								</button>
							{/if}
						</div>
						<div class="text-sm space-y-2">
							<div class="flex items-center justify-between">								
								<span
									class="{$darkMode
										? 'text-gray-400'
										: 'text-gray-600'}"
								>{t('advancedkey.bindingsLabel', currentLanguage)}:</span>
								<span
									class="{$darkMode
										? 'text-gray-300'
										: 'text-gray-700'}"
									>{config.keycodes.length}</span>
							</div>
							<div class="flex items-center justify-between">								
								<span
									class="{$darkMode
										? 'text-gray-400'
										: 'text-gray-600'}"
								>{t('advancedkey.bottomOutLabel', currentLanguage)}:</span>
								<span
									class="{$darkMode
										? 'text-gray-300'
										: 'text-gray-700'}"
									>{config.bottomOutPoint.toFixed(1)}mm</span>
							</div>
						</div>

						<!-- Hover effect overlay -->
						<div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
							 style="background: linear-gradient(135deg, 
									 color-mix(in srgb, var(--theme-color-primary) 5%, transparent) 0%, 
									 color-mix(in srgb, var(--theme-color-primary) 2%, transparent) 100%);"></div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Smooth hover and animation transitions */
	.group {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		transform-origin: center;
	}
	
	/* Enhanced hover effects */
	.group:hover {
		box-shadow: 
			0 10px 25px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -2px rgba(0, 0, 0, 0.05),
			0 0 0 1px color-mix(in srgb, var(--theme-color-primary) 25%, transparent);
	}
	
	:global(.dark) .group:hover {
		box-shadow: 
			0 10px 25px -3px rgba(0, 0, 0, 0.25),
			0 4px 6px -2px rgba(0, 0, 0, 0.1),
			0 0 0 1px color-mix(in srgb, var(--theme-color-primary) 40%, transparent);
	}
	
	/* Ensure smooth animation when keys are being deleted */
	.group.opacity-0 {
		transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
				   transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	/* Fade-in animation for newly added keys */
	@keyframes fade-in {
		0% {
			opacity: 0;
			transform: scale(0.95) translateY(10px);
		}
		100% {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}
	
	.animate-fade-in {
		animation: fade-in 0.4s ease-out;
	}

	/* Smooth bin button transitions */
	.group button {
		transition: background-color 0.2s ease-out;
	}
</style>