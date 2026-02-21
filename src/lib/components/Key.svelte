<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotationAngle?: number;
    rotationX?: number;
    rotationY?: number;
    labels?: string[];
    index?: number;
    selected?: boolean;
    allowSelection?: boolean;
    onselect?: (index: number) => void;
    onmousedown?: (e: MouseEvent) => void;
    onmouseenter?: (e: MouseEvent) => void;
  }

  let {
    x = 0,
    y = 0,
    width = 1,
    height = 1,
    rotationAngle = 0,
    rotationX: rotX = 0,
    rotationY: rotY = 0,
    labels = [],
    index = 0,
    selected = false,
    allowSelection = true,
    onselect,
    onmousedown,
    onmouseenter,
  }: Props = $props();

  // Key unit size - will be read from CSS variable for responsive scaling
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

  function handleClick(e: MouseEvent) {
    onmousedown?.(e);
  }

  function handleMouseEnter(e: MouseEvent) {
    onmouseenter?.(e);
  }

  // Reactive computed styles
  let keyStyle = $derived(`
    position: absolute;
    left: ${x * usize}px;
    top: ${y * usize}px;
    width: ${width * usize}px;
    height: ${height * usize}px;
    transform-origin: ${rotX * usize}px ${rotY * usize}px;
    transform: rotate(${rotationAngle}deg);
    transition: all 0.3s ease-out;
  `);

  let labelContainerStyle = $derived(`
    width: 100%;
    height: 100%;
  `);
</script>

<div class="key-container" style={keyStyle}>
  <button
    class="keycap"
    class:selected={selected && allowSelection}
    class:selection-disabled={!allowSelection}
    onmousedown={handleClick}
    onmouseenter={handleMouseEnter}
  >
    <div class="label-grid" style={labelContainerStyle}>
      {#each Array(9) as _, i}
        {#if labels[i]}
          <span class="label-cell-{i}">{labels[i]}</span>
        {/if}
      {/each}
    </div>
  </button>
</div>

<style>
  .key-container {
    /* 用于定位和旋转 */
    box-sizing: border-box;
    padding: calc(2px * var(--ui-scale, 1));
  }

  .keycap {
    /* 按键本身的美化样式 - 基于 toggleVariants outline 风格 */
    width: 100%;
    height: 100%;
    border-radius: calc(6px * var(--ui-scale, 1));
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans',
      'Helvetica Neue', sans-serif;
    font-weight: 500;
    cursor: pointer;
    /* Outline variant styling - transparent background with gray border */
    background: transparent !important;
    background-color: transparent !important;
    border: 1px solid #d1d5db; /* gray-300 */
    color: hsl(var(--foreground, 222.2 84% 4.9%));
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    padding: calc(4px * var(--ui-scale, 1));
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
    box-sizing: border-box;
    /* Remove default button styling */
    outline: none;
    /* Ensure inner content is transparent */
    -webkit-appearance: none;
    appearance: none;
  }

  /* Force all inner elements transparent */
  .keycap *,
  .keycap *::before,
  .keycap *::after {
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
  }

  /* Dark mode colors */
  :global(.dark) .keycap {
    border-color: #6b7280; /* gray-500 for dark mode */
    color: hsl(var(--foreground, 210 40% 98%));
    background: transparent !important;
    background-color: transparent !important;
  }

  :global(.dark) .keycap *,
  :global(.dark) .keycap *::before,
  :global(.dark) .keycap *::after {
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
  }

  .keycap:hover {
    /* Outline variant hover - subtle background with accent border */
    background-color: hsl(var(--accent, 210 40% 96%)) !important;
    border-color: hsl(var(--accent-foreground, 222.2 84% 4.9%));
  }

  /* Dark mode hover */
  :global(.dark) .keycap:hover {
    background-color: hsl(var(--accent, 217.2 32.6% 17.5%)) !important;
    border-color: hsl(var(--accent-foreground, 210 40% 98%));
  }

  .keycap:active {
    /* Active state - more pronounced background */
    background-color: hsl(var(--accent, 210 40% 94%)) !important;
    border-color: hsl(var(--accent-foreground, 222.2 84% 4.9%));
    transform: scale(0.98);
    transition: all 0.05s ease-in;
  }

  /* Dark mode active */
  :global(.dark) .keycap:active {
    background-color: hsl(var(--accent, 217.2 32.6% 19.5%)) !important;
  }

  /* Focus state for accessibility */
  .keycap:focus-visible {
    outline: 2px solid hsl(var(--ring, 222.2 84% 4.9%));
    outline-offset: 2px;
  }

  /* Selected state: subtle glow around the key border */
  .keycap.selected {
    /* Use theme color variable for glow */
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--theme-color-primary) 18%, transparent),
      0 8px 22px color-mix(in srgb, var(--theme-color-primary) 12%, transparent) !important;
    border-color: color-mix(in srgb, var(--theme-color-primary) 85%, black);
    position: relative;
    z-index: 6;
  }

  :global(.dark) .keycap.selected {
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--theme-color-primary) 16%, transparent),
      0 8px 22px color-mix(in srgb, var(--theme-color-primary) 16%, transparent) !important;
    border-color: color-mix(in srgb, var(--theme-color-primary) 85%, black);
  }

  .keycap {
    transition:
      box-shadow 160ms ease,
      border-color 160ms ease,
      transform 80ms ease;
  }


  /* 使用 CSS Grid 实现九宫格标签布局 */
  .label-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
    width: 100%;
    height: 100%;
    font-size: calc(var(--key-font-size, 14px) * var(--ui-scale, 1));
    box-sizing: border-box;
    padding: 0;
    gap: 0;
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    color: inherit;
  }

  /* Base label cell styling */
  [class^='label-cell-'] {
    display: flex;
    overflow: visible;
    white-space: normal;
    line-height: 1.1;
    min-height: 0;
    min-width: 0;
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    color: inherit;
    text-align: center;
    word-wrap: break-word;
    hyphens: auto;
  }

  /* 九宫格对齐 - using grid-area for proper placement */
  .label-cell-0 {
    grid-area: 1 / 1 / 2 / 2;
    justify-content: flex-start;
    align-items: flex-start;
  }
  .label-cell-1 {
    grid-area: 1 / 2 / 2 / 3;
    justify-content: center;
    align-items: flex-start;
  }
  .label-cell-2 {
    grid-area: 1 / 3 / 2 / 4;
    justify-content: flex-end;
    align-items: flex-start;
  }
  .label-cell-3 {
    grid-area: 2 / 1 / 3 / 2;
    justify-content: flex-start;
    align-items: center;
  }
  .label-cell-4 {
    grid-area: 2 / 2 / 3 / 3;
    justify-content: center;
    align-items: center;
    font-size: calc(var(--key-font-size-center, 18px) * var(--ui-scale, 1));
  }
  .label-cell-5 {
    grid-area: 2 / 3 / 3 / 4;
    justify-content: flex-end;
    align-items: center;
  }
  .label-cell-6 {
    grid-area: 3 / 1 / 4 / 2;
    justify-content: flex-start;
    align-items: flex-end;
  }
  .label-cell-7 {
    grid-area: 3 / 2 / 4 / 3;
    justify-content: center;
    align-items: flex-end;
  }
  .label-cell-8 {
    grid-area: 3 / 3 / 4 / 4;
    justify-content: flex-end;
    align-items: flex-end;
  }
</style>
