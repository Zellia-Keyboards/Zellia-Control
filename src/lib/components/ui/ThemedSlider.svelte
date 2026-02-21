<!--
  Shared themed range slider.
  Replaces 8+ duplicate slider CSS blocks across the codebase.

  Usage:
    <ThemedSlider
      value={0.5}
      min={0} max={1} step={0.01}
      oninput={e => handleChange(Number(e.target.value))}
    />
-->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends HTMLInputAttributes {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    class?: string;
  }

  let { value = $bindable(0), min = 0, max = 100, step = 1, class: className = '', ...rest }: Props =
    $props();
</script>

<input
  type="range"
  {value}
  {min}
  {max}
  {step}
  class="themed-slider {className}"
  {...rest}
/>

<style>
  .themed-slider {
    width: 100%;
    height: 8px;
    border-radius: 9999px;
    appearance: none;
    background: color-mix(in srgb, var(--theme-color-primary) 20%, transparent);
  }

  .themed-slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--theme-color-primary);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease;
  }

  .themed-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  .themed-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--theme-color-primary);
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease;
  }

  .themed-slider::-moz-range-thumb:hover {
    transform: scale(1.1);
  }
</style>
