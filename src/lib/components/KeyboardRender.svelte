<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { flip } from 'svelte/animate';
  import Key from '$lib/components/Key.svelte';
  import { setTotalKeys, toggleKey, selectedKeys } from '$lib/stores/SelectedKeysStore';
  import { selectedLayoutIndices } from '$lib/stores/ControllerStore.svelte';
  import { filterVisibleKeys, type ExtendedKey } from '$lib/utils/keyboardKeyTransformer.svelte';
  // Assuming the kle-serial types are available in your project
  import type * as kle from '@ijprest/kle-serial';

  // 1. In Svelte, props are declared with `export let`
  export let keys: ExtendedKey[] = [];
  export let allowSelection = true;

  // 2. The event dispatcher replaces Vue's `emit`
  const dispatch = createEventDispatcher<{ select: number }>();

  // 3. Key unit size - responsive via CSS variable
  let usize = 59;

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

    // Update on resize for responsive changes
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  });

  // Filter visible keys based on layout group selection
  $: visibleKeys = filterVisibleKeys(keys, $selectedLayoutIndices);

  // 4. Reactive statements (`$:`) are the Svelte equivalent of Vue's `computed` properties.
  $: maxY = visibleKeys.length > 0 ? Math.max(...visibleKeys.map(key => key.y + key.height)) : 0;
  $: minHeight = `${maxY * usize}px`;

  $: maxX = visibleKeys.length > 0 ? Math.max(...visibleKeys.map(key => key.x + key.width)) : 0;
  $: minWidth = `${maxX * usize}px`;

  // Keep store informed of total unique key IDs
  $: {
    const uniqueIds = new Set(visibleKeys.map(k => k.id));
    setTotalKeys(Math.max(...uniqueIds, 0) + 1);
  }

  // --- Event Handlers ---
  function handleMouseDown(event: MouseEvent, keyId: number) {
    if (event.buttons === 1 && allowSelection) {
      keyButtonClick(keyId);
    }
  }

  function handleMouseEnter(event: MouseEvent, keyId: number) {
    if (event.buttons === 1 && allowSelection) {
      keyButtonClick(keyId);
    }
  }

  function keyButtonClick(keyId: number) {
    if (!allowSelection) return;
    // Dispatch the custom event with the key's actual ID
    dispatch('select', keyId);
  }
</script>

<!-- The template uses Svelte's logic blocks like `#each` -->
<div class="grid-container">
  <!-- Keyboard container with styling similar to NewZellia60HE -->
  <div class="keyboard no-select" style="width: {minWidth}; height: {minHeight};">
    <!-- 5. Svelte's `#each` block replaces `v-for`. Using key.id for the keyed block. -->
    {#each visibleKeys as key (key.id)}
      <!-- 6. The `animate:flip` directive provides smooth reordering, replacing Vue's <TransitionGroup> -->
      <div animate:flip={{ duration: 500 }}>
        <Key
          on:mousedown={event => handleMouseDown(event as unknown as MouseEvent, key.id)}
          on:mouseenter={event => handleMouseEnter(event as unknown as MouseEvent, key.id)}
          on:select={() => toggleKey(key.id)}
          x={key.x}
          y={key.y}
          width={key.width}
          height={key.height}
          rotationX={key.rotation_x}
          rotationY={key.rotation_y}
          rotationAngle={key.rotation_angle}
          labels={key.labels}
          id={key.id}
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
