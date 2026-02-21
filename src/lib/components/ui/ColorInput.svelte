<!--
  Shared color input with proper cross-browser styling.
  Replaces 3 duplicate color picker CSS blocks (ColorPicker, SecondaryColorPicker, RGBPanel inline).

  Usage:
    <ColorInput value={color} oninput={e => handleChange(e.target.value)} />
    <ColorInput value={color} oninput={handler} size="lg" label="Secondary Color" />
-->
<script lang="ts">
  type InputSize = 'sm' | 'md' | 'lg';

  interface Props {
    value?: string;
    oninput?: (e: Event) => void;
    size?: InputSize;
    label?: string;
    class?: string;
  }

  let { value = '#000000', oninput, size = 'md', label, class: className = '' }: Props = $props();

  const sizeClasses: Record<InputSize, string> = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };
</script>

<div class="flex items-center gap-2 {className}">
  <input
    type="color"
    {value}
    {oninput}
    class="{sizeClasses[size]} rounded border border-gray-300 dark:border-gray-600 p-0 cursor-pointer overflow-hidden color-input"
  />
  {#if label}
    <span class="text-xs text-gray-600 dark:text-gray-300">{label}</span>
  {/if}
</div>

<style>
  .color-input {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-color: transparent;
    border: none;
    cursor: pointer;
  }

  .color-input::-webkit-color-swatch-wrapper {
    padding: 0;
    border: none;
    border-radius: inherit;
  }

  .color-input::-webkit-color-swatch {
    border: none;
    border-radius: inherit;
    padding: 0;
  }

  .color-input::-moz-color-swatch {
    border: none;
    border-radius: inherit;
  }
</style>
