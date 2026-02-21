<script lang="ts">
  import { onMount } from 'svelte';
  import { flip } from 'svelte/animate';
  import Key from '$lib/components/Key.svelte';
  import { setTotalKeys, toggleKey, selectedKeys } from '$lib/stores/SelectedKeysStore';
  import { selectedLayoutIndices } from '$lib/stores/ControllerStore.svelte';
  import { filterVisibleKeys, type ExtendedKey } from '$lib/utils/keyboardKeyTransformer.svelte';
  import type * as kle from '@ijprest/kle-serial';

  interface Props {
    keys?: ExtendedKey[];
    allowSelection?: boolean;
    onselect?: (keyId: number) => void;
  }

  let { keys = [], allowSelection = true, onselect }: Props = $props();

  // Key unit size - responsive via CSS variable
  let usize = $state(59);

  // Read CSS variable for responsive scaling
  onMount(() => {
    const updateSize = () => {
      const root = document.documentElement;
      const cssSize = getComputedStyle(root).getPropertyValue('--key-unit-size');
      if (cssSize) {
        usize = parseInt(cssSize, 10) || 59;
      }
    };
    updateSize();

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  });

  // Filter visible keys based on layout group selection
  let visibleKeys = $derived(filterVisibleKeys(keys, $selectedLayoutIndices));

  // Reactive layout calculations
  let maxY = $derived(visibleKeys.length > 0 ? Math.max(...visibleKeys.map(key => key.y + key.height)) : 0);
  let minHeight = $derived(`${maxY * usize}px`);

  let maxX = $derived(visibleKeys.length > 0 ? Math.max(...visibleKeys.map(key => key.x + key.width)) : 0);
  let minWidth = $derived(`${maxX * usize}px`);

  // Keep store informed of total unique key IDs
  $effect(() => {
    const uniqueIds = new Set(visibleKeys.map(k => k.id));
    setTotalKeys(Math.max(...uniqueIds, 0) + 1);
  });

  // --- Event Handlers ---
  function handleMouseDown(event: MouseEvent, keyId: number) {
    if (event.buttons === 1 && allowSelection) {
      toggleKey(keyId);
      onselect?.(keyId);
    }
  }

  function handleMouseEnter(event: MouseEvent, keyId: number) {
    if (event.buttons === 1 && allowSelection) {
      toggleKey(keyId);
      onselect?.(keyId);
    }
  }
</script>

<!-- The template uses Svelte's logic blocks like `#each` -->
<div class="grid-container">
  <div class="keyboard no-select" style="width: {minWidth}; height: {minHeight};">
    {#each visibleKeys as key (key.id)}
      <div animate:flip={{ duration: 500 }}>
        <Key
          onmousedown={event => handleMouseDown(event, key.id)}
          onmouseenter={event => handleMouseEnter(event, key.id)}
          x={key.x}
          y={key.y}
          width={key.width}
          height={key.height}
          rotationX={key.rotation_x}
          rotationY={key.rotation_y}
          rotationAngle={key.rotation_angle}
          labels={key.labels}
          index={key.id}
          {allowSelection}
          selected={$selectedKeys.includes(key.id)}
        />
      </div>
    {/each}
  </div>
</div>

<!-- 7. Styles in Svelte are scoped by default, just like in Vue's `<style scoped>` -->
<style>
  .grid-container {
    display: grid;
    place-items: center;
    width: 100%;
  }

  .keyboard {
    background-color: transparent;
    padding: 10px;
    /* position: relative is needed for the absolute positioning of children during animations */
    position: relative;
    transition: all 0.5s ease;
  }

  .no-select {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
</style>
