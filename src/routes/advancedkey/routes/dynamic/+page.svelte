<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		CurrentSelected,
		KeyboardDisplayValues,
	} from '$lib/KeyboardState.svelte';
	import { darkMode } from '$lib/DarkModeStore.svelte';
	import {
		globalConfigurations,
		updateGlobalConfiguration,
		resetGlobalConfiguration,
		keyActions,
		DKSAction,
		type KeyConfiguration,
		type DynamicKeystrokeConfiguration as GlobalDynamicKeystrokeConfiguration, // Alias to avoid conflict
		type KeyAction,
	} from '$lib/AdvancedKeyShared';

	import Binding from './Binding.svelte';
	import Performance from './Performance.svelte';
	import KeyTester from './KeyTester.svelte';

	// Import new components
	import SelectedKeyInfo from './SelectedKeyInfo.svelte';
	import DKSBindingRow from './DKSBindingRow.svelte';
	import BottomOutPointConfig from './BottomOutPointConfig.svelte';
	import NoKeySelectedDisplay from './NoKeySelectedDisplay.svelte';
	import ConfiguredDKSList from './ConfiguredDKSList.svelte';

	// Define the dynamic keystroke specific configuration type (local usage if different from global)
	type DynamicKeystrokeConfiguration = {
		type: 'dynamic';
		keycodes: string[];
		bitmap: DKSAction[][];
		bottomOutPoint: number;
	};

	let selectedKeycodes = $state(['esc', '', '', '']);
	let selectedBitmaps = $state<DKSAction[][]>([
		[DKSAction.PRESS, DKSAction.HOLD, DKSAction.HOLD, DKSAction.RELEASE],
		[
			DKSAction.RELEASE,
			DKSAction.RELEASE,
			DKSAction.RELEASE,
			DKSAction.RELEASE,
		],
		[
			DKSAction.RELEASE,
			DKSAction.RELEASE,
			DKSAction.RELEASE,
			DKSAction.RELEASE,
		],
		[
			DKSAction.RELEASE,
			DKSAction.RELEASE,
			DKSAction.RELEASE,
			DKSAction.RELEASE,
		],
	]);
	let bottomOutPoint = $state(4.0);
	let selectedBindingIndex = $state<number | null>(null);
	let activeTab = $state('bindings');

	let uiBitmaps = $derived([...selectedBitmaps.map((b: DKSAction[]) => [...b])]);

	const NODE_SIZE = 32;
	const NODE_SPACING = 40;
	const SLIDER_GAP = 72;
	const SLIDER_WIDTH = SLIDER_GAP * 3 + NODE_SIZE;
	const SLIDER_HEIGHT = NODE_SIZE;
	const NODE_TOP = SLIDER_HEIGHT / 2 - NODE_SIZE / 2;
	const GRIP_WIDTH = 12;
	const GRIP_HEIGHT = 16;
	const GRIP_OFFSET = NODE_SIZE - 10;
	const GRIP_TOP = SLIDER_HEIGHT / 2 - GRIP_HEIGHT / 2;

	const nodeLeft = (i: number) => SLIDER_GAP * i;

	function getIntervals(bitmap: DKSAction[]): [number, number][] {
		const intervals: [number, number][] = [];
		let start = -1;

		for (let i = 0; i < 4; i++) {
			if (bitmap[i] === DKSAction.HOLD) {
				continue;
			}
			if (start !== -1) {
				intervals.push([start, i]);
				start = -1;
			}
			if (bitmap[i] === DKSAction.PRESS) {
				start = i;
			} else if (bitmap[i] === DKSAction.TAP) {
				intervals.push([i, i]);
			}
		}
		return intervals;
	}

	const intervalWidth = ([l, r]: [number, number]) =>
		l === r ? 0 : SLIDER_GAP * (r - l) - NODE_SPACING;

	function updateBitmap(bindingIndex: number, bitmap: DKSAction[]): void {
		selectedBitmaps[bindingIndex] = [...bitmap];
		uiBitmaps[bindingIndex] = [...bitmap];
	}

	function setUIBitmap(bindingIndex: number, bitmap: DKSAction[]): void {
		uiBitmaps[bindingIndex] = [...bitmap];
	}

	function deleteInterval(bindingIndex: number, intervalStart: number): void {
		const bitmap = [...uiBitmaps[bindingIndex]];
		const intervals = getIntervals(bitmap);
		const interval = intervals.find(([l]) => l === intervalStart);

		if (interval) {
			const [start, end] = interval;
			for (let j = start + 1; j < end; j++) {
				bitmap[j] = DKSAction.HOLD;
			}
			if (bitmap[end] === DKSAction.RELEASE) {
				bitmap[end] = DKSAction.HOLD;
			}
			bitmap[start] = intervals.some(([l, r]) => l !== r && r === start)
				? DKSAction.RELEASE
				: DKSAction.HOLD;
		}
		updateBitmap(bindingIndex, bitmap);
	}

	function handleDrag(
		bindingIndex: number,
		nodeIndex: number,
		deltaX: number,
	): void {
		const bitmap = [...uiBitmaps[bindingIndex]];
		const intervals = getIntervals(selectedBitmaps[bindingIndex]);
		const interval = intervals.find(([l]) => l === nodeIndex) ?? [
			nodeIndex,
			-1,
		];
		const upperBound = intervals.find(([l]) => l > nodeIndex)?.[0] ?? 3;

		const clampedX = Math.max(
			0,
			Math.min(
				deltaX + (interval[1] === -1 ? 0 : intervalWidth(interval)),
				intervalWidth([nodeIndex, upperBound]),
			),
		);

		let closest = nodeIndex;
		let closestDistance = clampedX;
		for (let j = nodeIndex + 1; j <= upperBound; j++) {
			const distance = Math.abs(clampedX - intervalWidth([nodeIndex, j]));
			if (distance < closestDistance) {
				closest = j;
				closestDistance = distance;
			}
		}

		bitmap[nodeIndex] =
			nodeIndex === closest ? DKSAction.TAP : DKSAction.PRESS;

		for (let j = nodeIndex + 1; j < Math.max(interval[1], closest); j++) {
			bitmap[j] = DKSAction.HOLD;
		}

		if (interval[1] !== -1 && bitmap[interval[1]] === DKSAction.RELEASE) {
			bitmap[interval[1]] = DKSAction.HOLD;
		}

		if (bitmap[closest] === DKSAction.HOLD) {
			bitmap[closest] = DKSAction.RELEASE;
		}
		setUIBitmap(bindingIndex, bitmap);
	}

	function commitDrag(bindingIndex: number): void {
		updateBitmap(bindingIndex, [...uiBitmaps[bindingIndex]]);
	}

	function handleNodeClick(bindingIndex: number, nodeIndex: number): void {
		const bitmap = [...selectedBitmaps[bindingIndex]];
		const uiBitmapCopy = [...uiBitmaps[bindingIndex]];
		const intervals = getIntervals(bitmap);

		if (intervals.some(([l, r]) => l < nodeIndex && nodeIndex < r)) {
			return;
		}

		if (bitmap[nodeIndex] === DKSAction.HOLD) {
			uiBitmapCopy[nodeIndex] = DKSAction.TAP;
		} else {
			const interval = intervals.find(
				([l, r]) => l <= nodeIndex && nodeIndex <= r,
			);
			if (interval) {
				const [start, end] = interval;
				for (let i = start; i <= end && i < 4; i++) {
					uiBitmapCopy[i] = DKSAction.HOLD;
				}
			}
		}
		updateBitmap(bindingIndex, uiBitmapCopy);
	}

	let dragState = $state<{
		isDragging: boolean;
		bindingIndex: number;
		nodeIndex: number;
		startX: number;
		startMouseX: number;
	} | null>(null);

	function handleMouseDown(
		event: MouseEvent,
		bindingIndex: number,
		nodeIndex: number,
	): void {
		const uiIntervals = getIntervals(uiBitmaps[bindingIndex]);

		if (uiIntervals.some(([l, r]) => l < nodeIndex && nodeIndex < r)) {
			return;
		}

		dragState = {
			isDragging: true,
			bindingIndex,
			nodeIndex,
			startX: 0,
			startMouseX: event.clientX,
		};
		event.preventDefault();
	}

	function handleMouseMove(event: MouseEvent): void {
		if (!dragState?.isDragging) return;
		const deltaX = event.clientX - dragState.startMouseX;
		handleDrag(dragState.bindingIndex, dragState.nodeIndex, deltaX);
	}

	function handleMouseUp(): void {
		if (dragState?.isDragging) {
			commitDrag(dragState.bindingIndex);
		}
		dragState = null;
	}

	$effect(() => {
		const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
		const handleGlobalMouseUp = () => handleMouseUp();

		document.addEventListener('mousemove', handleGlobalMouseMove);
		document.addEventListener('mouseup', handleGlobalMouseUp);

		return () => {
			document.removeEventListener('mousemove', handleGlobalMouseMove);
			document.removeEventListener('mouseup', handleGlobalMouseUp);
		};
	});

	function getCurrentKeyConfiguration(): DynamicKeystrokeConfiguration | null {
		if (!$CurrentSelected) return null;
		const keyId = `${$CurrentSelected[0]},${$CurrentSelected[1]}`;
		const config = $globalConfigurations[keyId];

		if (config && config.type === 'dynamic') {
			return config as DynamicKeystrokeConfiguration;
		}
		return {
			type: 'dynamic',
			keycodes: ['esc', '', '', ''],
			bitmap: [
				[
					DKSAction.PRESS,
					DKSAction.HOLD,
					DKSAction.HOLD,
					DKSAction.RELEASE,
				],
				[
					DKSAction.RELEASE,
					DKSAction.RELEASE,
					DKSAction.RELEASE,
					DKSAction.RELEASE,
				],
				[
					DKSAction.RELEASE,
					DKSAction.RELEASE,
					DKSAction.RELEASE,
					DKSAction.RELEASE,
				],
				[
					DKSAction.RELEASE,
					DKSAction.RELEASE,
					DKSAction.RELEASE,
					DKSAction.RELEASE,
				],
			],
			bottomOutPoint: 4.0,
		};
	}

	function updateConfiguration(): void {
		if (!$CurrentSelected) return;
		const keyId = `${$CurrentSelected[0]},${$CurrentSelected[1]}`;
		const config: DynamicKeystrokeConfiguration = {
			type: 'dynamic',
			keycodes: selectedKeycodes.map(k => k), // Ensure new array
			bitmap: selectedBitmaps.map(b => [...b]), // Ensure new array of arrays
			bottomOutPoint: bottomOutPoint,
		};
		updateGlobalConfiguration(keyId, config as GlobalDynamicKeystrokeConfiguration);
	}

	function resetConfiguration(): void {
		if (!$CurrentSelected) return;
		const keyId = `${$CurrentSelected[0]},${$CurrentSelected[1]}`;
		resetGlobalConfiguration(keyId);
		selectedKeycodes = ['esc', 'enter', 'space', 'backspace'];
		selectedBitmaps = [
			[
				DKSAction.PRESS,
				DKSAction.HOLD,
				DKSAction.HOLD,
				DKSAction.RELEASE,
			],
			[DKSAction.TAP, DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD],
			[
				DKSAction.PRESS,
				DKSAction.PRESS,
				DKSAction.HOLD,
				DKSAction.RELEASE,
			],
			[DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD],
		];
		bottomOutPoint = 4.0;
	}

	function applyConfiguration(): void {
		updateConfiguration();
		console.log(
			'Applying dynamic keystroke configurations:',
			$globalConfigurations,
		);
	}

	let currentKeyName = $derived(
		$CurrentSelected
			? $KeyboardDisplayValues[$CurrentSelected[1]]?.[
					$CurrentSelected[0]
				] || 'Unknown'
			: 'No key selected',
	);

	$effect(() => {
		uiBitmaps = selectedBitmaps.map((bitmap) => [...bitmap]);
	});

	$effect(() => {
		if ($CurrentSelected) {
			const keyId = `${$CurrentSelected[0]},${$CurrentSelected[1]}`;
			const existingGlobalConfig = $globalConfigurations[keyId];

			if (
				existingGlobalConfig &&
				existingGlobalConfig.type === 'dynamic'
			) {
				const dynamicConfig =
					existingGlobalConfig as GlobalDynamicKeystrokeConfiguration;
				selectedKeycodes = dynamicConfig.keycodes.map((k: string) => k);
				selectedBitmaps = dynamicConfig.bitmap.map((b: DKSAction[]) => [...b]);
				bottomOutPoint = dynamicConfig.bottomOutPoint;
			} else {
				selectedKeycodes = [currentKeyName, '', '', ''];
				selectedBitmaps = [
					[
						DKSAction.PRESS,
						DKSAction.HOLD,
						DKSAction.HOLD,
						DKSAction.RELEASE,
					],
					[
						DKSAction.RELEASE,
						DKSAction.RELEASE,
						DKSAction.RELEASE,
						DKSAction.RELEASE,
					],
					[
						DKSAction.RELEASE,
						DKSAction.RELEASE,
						DKSAction.RELEASE,
						DKSAction.RELEASE,
					],
					[
						DKSAction.RELEASE,
						DKSAction.RELEASE,
						DKSAction.RELEASE,
						DKSAction.RELEASE,
					],
				];
				bottomOutPoint = 3.0;
			}
		}
	});

	const actionCategories = $state([
		{
			name: 'Common',
			actions: keyActions.filter((action) =>
				[
					'esc',
					'enter',
					'space',
					'tab',
					'backspace',
					'delete',
				].includes(action.id),
			),
		},
		{
			name: 'Modifiers',
			actions: keyActions.filter((action) =>
				['ctrl', 'shift', 'alt', 'win'].includes(action.id),
			),
		},
		{
			name: 'Function',
			actions: keyActions
				.filter((action) => action.category === 'Function')
				.slice(0, 12),
		},
		{
			name: 'Letters',
			actions: keyActions
				.filter((action) => action.category === 'Letter')
				.slice(0, 20),
		},
	]);

	const configuredDynamicKeysList = $derived(
		Object.entries($globalConfigurations).filter(
			([_, config]) => config.type === 'dynamic',
		) as [string, GlobalDynamicKeystrokeConfiguration][],
	);

	const phaseDescriptions = [
		{ name: 'Key pressed past actuation point', icon: '↓' },
		{ name: 'Key pressed past bottom-out point', icon: '⬇' },
		{ name: 'Key released past bottom-out point', icon: '⬆' },
		{ name: 'Key released past actuation point', icon: '↑' },
	];

	function handleSelectBinding(bindingIdx: number) {
		selectedBindingIndex = selectedBindingIndex === bindingIdx ? null : bindingIdx;
	}
</script>

{#snippet DKSSlider(bitmap: DKSAction[], uiBitmap: DKSAction[], bindingIndex: number)}
	{@const intervals = getIntervals(bitmap)}
	{@const uiIntervals = getIntervals(uiBitmap)}

	<div
		class="relative flex items-center"
		style="width: {SLIDER_WIDTH}px; height: {SLIDER_HEIGHT}px;"
	>
		{#each Array(4) as _, i}
			<button
				class="absolute inline-flex items-center justify-center rounded-full border-2 {$darkMode
					? 'bg-black'
					: 'bg-white'} transition-all z-10 {intervals.some(
					([start, end]) => start <= i && i <= end,
				)
					? $darkMode
						? 'border-white bg-gray-800'
						: 'border-blue-500 bg-blue-50'
					: $darkMode
						? 'border-gray-600 hover:border-gray-400 hover:bg-gray-800'
						: 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}"
				style="width: {NODE_SIZE}px; height: {NODE_SIZE}px; top: {NODE_TOP}px; left: {nodeLeft(
					i,
				)}px;"
				onclick={() => handleNodeClick(bindingIndex, i)}
				title="Click to toggle action at phase {i + 1}"
			>
				<svg
					class="w-4 h-4 {intervals.some(
						([start, end]) => start <= i && i <= end,
					)
						? $darkMode
							? 'text-white'
							: 'text-blue-600'
						: $darkMode
							? 'text-gray-400'
							: 'text-gray-400'}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 6v6m0 0v6m0-6h6m-6 0H6"
					/>
				</svg>
			</button>
		{/each}

		{#each uiIntervals as interval}
			{@const [start, end] = interval}
			{#if start !== -1 && end > start}
				<button
					class="absolute z-20 rounded-full {$darkMode
						? 'bg-gray-600 hover:bg-gray-500'
						: 'bg-blue-500 hover:bg-blue-600'} transition-colors focus-visible:outline-none focus-visible:ring-2 {$darkMode
						? 'focus-visible:ring-gray-400'
						: 'focus-visible:ring-blue-300'}"
					style="width: {NODE_SIZE +
						intervalWidth(
							interval,
						)}px; height: {NODE_SIZE}px; top: {NODE_TOP}px; left: {nodeLeft(
						start,
					)}px;"
					onclick={() => deleteInterval(bindingIndex, start)}
					title="Click to delete interval"
				>
					<span class="sr-only">Delete interval</span>
				</button>

				<div
					class="absolute z-30 flex items-center justify-center rounded-sm border {$darkMode
						? 'bg-gray-700 hover:bg-gray-600'
						: 'bg-gray-600 hover:bg-gray-700'} cursor-ew-resize transition-colors select-none"
					style="width: {GRIP_WIDTH}px; height: {GRIP_HEIGHT}px; top: {GRIP_TOP}px; left: {nodeLeft(
						start,
					) +
						GRIP_OFFSET +
						intervalWidth(interval)}px;"
					onmousedown={(e) => handleMouseDown(e, bindingIndex, start)}
					title="Drag to resize interval"
				>
					<svg
						class="w-2.5 h-2.5 text-white pointer-events-none"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"
						/>
					</svg>
				</div>
			{:else if start === end}
				<div
					class="absolute z-20 rounded-full {$darkMode
						? 'bg-gray-500'
						: 'bg-purple-500'}"
					style="width: {NODE_SIZE}px; height: {NODE_SIZE}px; top: {NODE_TOP}px; left: {nodeLeft(
						start,
					)}px;"
					title="TAP action at phase {start + 1}"
				></div>
			{/if}
		{/each}

		{#each Array(4) as _, i}
			{#if !uiIntervals.some(([l, r]) => l < i && i < r)}
				<div
					class="absolute z-40 cursor-pointer rounded-full"
					style="width: {NODE_SIZE}px; height: {NODE_SIZE}px; top: {NODE_TOP}px; left: {nodeLeft(
						i,
					)}px;"
					onmousedown={(e) => {
						const committedIntervals = getIntervals(selectedBitmaps[bindingIndex]);
						const intervalToDrag = committedIntervals.find(([l]) => l === i);
						if (intervalToDrag && intervalToDrag[1] !== intervalToDrag[0]) {
							handleMouseDown(e, bindingIndex, i);
						}
					}}
					title="Drag to create/modify interval"
				>
					<span class="sr-only">Draggable area</span>
				</div>
			{/if}
		{/each}
	</div>
{/snippet}

<div class="h-full flex flex-col {$darkMode ? 'bg-black' : 'bg-gray-50'}">
	<div
		class="{$darkMode
			? 'bg-black border-white'
			: 'bg-white border-gray-200'} border-b px-6 py-4"
	>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<a
					class="flex items-center gap-2 {$darkMode
						? 'text-gray-400 hover:text-white'
						: 'text-gray-600 hover:text-gray-900'} transition-colors"
					href="/advancedkey"
				>
					<svg
						class="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
					Back
				</a>
				<div>
					<h1
						class="text-xl font-semibold {$darkMode
							? 'text-white'
							: 'text-gray-900'}"
					>
						Dynamic Keystroke Configuration
					</h1>
					<p
						class="text-sm {$darkMode
							? 'text-gray-400'
							: 'text-gray-500'}"
					>
						Configure 4-phase keystroke control with analog input response
					</p>
				</div>
			</div>
			<div class="flex gap-3">
				<button
					class="px-4 py-2 {$darkMode
						? 'text-white bg-gray-800 hover:bg-gray-700 border border-white'
						: 'text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-md transition-colors text-sm font-medium"
					onclick={resetConfiguration}
					disabled={!$CurrentSelected}
				>
					Reset
				</button>
				<button
					class="px-4 py-2 {$darkMode
						? 'bg-white text-black hover:bg-gray-200'
						: 'bg-blue-600 text-white hover:bg-blue-700'} rounded-md transition-colors text-sm font-medium"
					onclick={applyConfiguration}
					disabled={!$CurrentSelected}
				>
					Apply
				</button>
			</div>
		</div>
	</div>

	<div class="flex-1 p-6 overflow-y-auto">
		{#if $CurrentSelected}
			<div class="max-w-7xl mx-auto">
				<SelectedKeyInfo {currentKeyName} currentSelectedCoords={$CurrentSelected} />

				<div class="flex gap-8">
					<div class="w-96 flex flex-col gap-4">
						<div
							class="{$darkMode
								? 'bg-black border-white'
								: 'bg-white border-gray-200'} rounded-lg border p-6"
						>
							<h3
								class="text-lg font-medium {$darkMode
									? 'text-white'
									: 'text-gray-900'} mb-2"
							>
								Configure DKS Bindings
							</h3>
							<p
								class="text-sm {$darkMode
									? 'text-gray-400'
									: 'text-gray-600'} mb-4"
							>
								Assign a keycode to each binding. Click nodes to create intervals,
								drag grips to resize, click bars to delete.
							</p>

							<div class="flex items-center gap-4 mb-3">
								<div
									class="w-16 text-center text-sm font-semibold {$darkMode
										? 'text-white'
										: 'text-gray-900'}"
								>
									Bindings
								</div>
								<div class="relative h-4" style="width: {SLIDER_WIDTH}px;">
									{#each phaseDescriptions as phase, i}
										<div
											class="absolute top-0 flex flex-col items-center gap-2"
											style="width: 16px; left: {SLIDER_GAP * i +
												NODE_SIZE / 2 -
												8}px;"
											title={phase.name}
										>
											<span
												class="text-sm {$darkMode
													? 'text-gray-300'
													: 'text-gray-700'}"
												>{phase.icon}</span
											>
										</div>
									{/each}
								</div>
							</div>

							<div class="space-y-2">
								{#each selectedKeycodes as keycode, bindingIndex (bindingIndex)}
									<DKSBindingRow
										{bindingIndex}
										{keycode}
										selectedBitmap={selectedBitmaps[bindingIndex]}
										uiBitmap={uiBitmaps[bindingIndex]}
										{selectedBindingIndex}
										onSelectBinding={handleSelectBinding}
										DKSSliderSnippet={DKSSlider}
										{keyActions}
									/>
								{/each}
							</div>
						</div>
						<BottomOutPointConfig bind:bottomOutPointValue={bottomOutPoint} />
					</div>

					<div class="flex-1 flex flex-col">
						<div
							class="flex {$darkMode
								? 'border-gray-600'
								: 'border-gray-200'} border-b mb-6"
						>
							{#each [['bindings', 'Bindings'], ['performance', 'Performance'], ['key-tester', 'Key Tester']] as [value, label]}
								<button
									class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab ===
									value
										? $darkMode
											? 'border-white text-white'
											: 'border-blue-500 text-blue-600'
										: $darkMode
											? 'border-transparent text-gray-400 hover:text-gray-200'
											: 'border-transparent text-gray-500 hover:text-gray-700'}"
									onclick={() => (activeTab = value)}
								>
									{label}
								</button>
							{/each}
						</div>

						{#if activeTab === 'bindings'}
							<Binding
								bind:selectedKeycodes
								bind:selectedBindingIndex
								{actionCategories}
							/>
						{:else if activeTab === 'performance'}
							<Performance />
						{:else if activeTab === 'key-tester'}
							<KeyTester {currentKeyName} />
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<NoKeySelectedDisplay />
		{/if}
		<ConfiguredDKSList
			configuredDynamicKeys={configuredDynamicKeysList}
			KeyboardDisplayValues={KeyboardDisplayValues}
		/>
	</div>
</div>

<style>
</style>