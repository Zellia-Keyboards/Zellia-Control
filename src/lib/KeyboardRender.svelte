<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { flip } from 'svelte/animate';
  import Key from './Key.svelte';
  // Assuming the kle-serial types are available in your project
  import type * as kle from '@ijprest/kle-serial';

  // 1. In Svelte, props are declared with `export let`
  export let keys: kle.Key[] = [];

  // 2. The event dispatcher replaces Vue's `emit`
  const dispatch = createEventDispatcher<{ select: number }>();

  // 3. A regular `let` variable is reactive within the component
  let usize = 59; // Match the Key.svelte size

  // 4. Reactive statements (`$:`) are the Svelte equivalent of Vue's `computed` properties.
  // They automatically recalculate when their dependencies (like `keys` or `usize`) change.
  $: maxY = keys.length > 0 ? Math.max(...keys.map(key => key.y + key.height)) : 0;
  $: minHeight = `${maxY * usize}px`;

  $: maxX = keys.length > 0 ? Math.max(...keys.map(key => key.x + key.width)) : 0;
  $: minWidth = `${maxX * usize}px`;

  // --- Event Handlers ---
  // These functions can be defined directly in the script.
  function handleMouseDown(event: MouseEvent, index: number) {
    if (event.buttons === 1) {
      keyButtonClick(index);
    }
  }

  function handleMouseEnter(event: MouseEvent, index: number) {
    if (event.buttons === 1) {
      keyButtonClick(index);
    }
  }

  function keyButtonClick(index: number) {
    // Dispatch the custom event
    dispatch('select', index);
  }
</script>

<!-- The template uses Svelte's logic blocks like `#each` -->
<div class="grid-container">
  <!-- Keyboard container with styling similar to NewZellia60HE -->
  <div class="keyboard-container p-4 bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-xl shadow-md m-auto" style="width: fit-content;">
    <div class="keyboard no-select" style="width: {minWidth}; height: {minHeight};">
      <!-- 5. Svelte's `#each` block replaces `v-for`. The `(index)` is the key for the list. -->
      {#each keys as key, index (index)}
        <!-- 6. The `animate:flip` directive provides smooth reordering, replacing Vue's <TransitionGroup> -->
        <div animate:flip={{ duration: 500 }}>
          <Key
            on:mousedown={(event) => handleMouseDown(event, index)}
            on:mouseenter={(event) => handleMouseEnter(event, index)}
            x={key.x}
            y={key.y}
            width={key.width}
            height={key.height}
            rotationX={key.rotation_x}
            rotationY={key.rotation_y}
            rotationAngle={key.rotation_angle}
            labels={key.labels}
            {index}
          />
        </div>
      {/each}
    </div>
  </div>
</div>

<!-- 7. Styles in Svelte are scoped by default, just like in Vue's `<style scoped>` -->
<style>
  .grid-container {
    display: grid;
    place-items: center;
    width: 100%;
  }
  
  .keyboard-container {
    /* Container styling similar to NewZellia60HE */
    display: inline-block;
    box-sizing: border-box;
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
