<script lang="ts">
	import { darkMode } from '$lib/DarkModeStore.svelte';
	import { language, t } from '$lib/LanguageStore.svelte';

	type Props = {
		currentKeyName: string;
		currentSelectedCoords: [number, number] | null;
	};
	let { currentKeyName, currentSelectedCoords }: Props = $props();
	
	let currentLanguage = $state($language);
	
	// Subscribe to language changes
	language.subscribe(value => {
		currentLanguage = value;
	});
</script>

<div
	class="rounded-lg border p-6 mb-6"
	style="background-color: color-mix(in srgb, var(--theme-color-primary) 8%, {$darkMode ? 'black' : 'white'});
	       border-color: color-mix(in srgb, var(--theme-color-primary) 30%, {$darkMode ? 'white' : '#e5e5e5'});"
>
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<div class="flex items-center gap-3">
				<div
					class="w-12 h-12 rounded-lg flex items-center justify-center border-2"
					style="background-color: color-mix(in srgb, var(--theme-color-primary) 15%, {$darkMode ? 'black' : 'white'});
					       border-color: var(--theme-color-primary);"
				>
					<span
						class="font-mono font-bold {$darkMode
							? 'text-white'
							: 'text-gray-900'}"
						>{currentKeyName}</span
					>
				</div>
				<div>					<h3
						class="font-medium {$darkMode
							? 'text-white'
							: 'text-gray-900'}"
					>
						{t('advancedkey.selectedKey', currentLanguage)}
					</h3>
					{#if currentSelectedCoords}
						<p
							class="text-sm {$darkMode
								? 'text-gray-400'
								: 'text-gray-500'}"
						>
							{t('advancedkey.position', currentLanguage)}: {currentSelectedCoords[0]}, {currentSelectedCoords[1]}
						</p>
					{/if}
				</div>
			</div>
		</div>		<div class="flex items-center gap-3">
			<span
				class="text-sm {$darkMode
					? 'text-gray-400'
					: 'text-gray-600'}">{t('advancedkey.mode', currentLanguage)}:</span
			>			<span
				class="px-3 py-1 rounded-full text-sm font-medium border"
				style="background-color: color-mix(in srgb, var(--theme-color-primary) 20%, {$darkMode ? 'black' : 'white'});
				       color: {$darkMode ? 'white' : 'var(--theme-color-primary)'};
				       border-color: color-mix(in srgb, var(--theme-color-primary) 40%, {$darkMode ? 'white' : '#e5e5e5'});"
			>
				{t('advancedkey.dynamicKeystroke', currentLanguage)}
			</span>
		</div>
	</div>
</div>