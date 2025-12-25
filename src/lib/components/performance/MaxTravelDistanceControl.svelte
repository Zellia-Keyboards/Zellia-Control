<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    maxTravelDistance: number;
    onMaxTravelChange: (value: number) => void;
    onClampValues?: (maxDistance: number) => void;
  }

  let { maxTravelDistance, onMaxTravelChange, onClampValues }: Props = $props();

  let currentLanguage = $derived($language);

  function handleInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    let value = Number(input.value);

    // Clamp values to valid range
    if (value < 1.0) value = 1.0;
    if (value > 10.0) value = 10.0;

    maxTravelDistance = value;
    onMaxTravelChange(value);

    // Call optional clamp callback for other values
    if (onClampValues) {
      onClampValues(value);
    }
  }
</script>

<div class="travel-badge group relative {$glassmorphismMode ? 'glassmorphism-card' : ''}">
  <div class="flex items-center gap-1.5">
    <svg
      class="w-3.5 h-3.5 text-gray-500 dark:text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M12 3v18M12 3l-4 4M12 3l4 4M12 21l-4-4M12 21l4-4" />
    </svg>
    <input
      type="number"
      min="1.0"
      max="10.0"
      step="0.1"
      bind:value={maxTravelDistance}
      oninput={handleInputChange}
      class="travel-input"
    />
    <span class="text-xs font-medium text-gray-500 dark:text-gray-400">mm</span>
  </div>
  <!-- Tooltip -->
  <div class="travel-tooltip">Switch Travel Distance</div>
</div>

<style>
  /* Travel Distance Badge */
  .travel-badge {
    display: flex;
    align-items: center;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.9) 0%,
      rgba(248, 250, 252, 0.95) 100%
    );
    border: 1px solid rgba(0, 0, 0, 0.08);
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.6);
    transition: all 0.2s ease;
  }

  :global(.dark) .travel-badge {
    background: linear-gradient(135deg, rgba(31, 41, 55, 0.9) 0%, rgba(17, 24, 39, 0.95) 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .travel-badge:hover {
    transform: translateY(-1px);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.6);
  }

  :global(.dark) .travel-badge:hover {
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .travel-badge:focus-within {
    border-color: var(--theme-color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-color-primary) 20%, transparent);
  }

  .travel-input {
    width: 2.5rem;
    padding: 0;
    border: none;
    background: transparent;
    font-size: 0.875rem;
    font-weight: 600;
    text-align: center;
    color: inherit;
    outline: none;
    appearance: textfield;
    -moz-appearance: textfield;
  }

  .travel-input::-webkit-outer-spin-button,
  .travel-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .travel-tooltip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%) scale(0.95);
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
    color: white;
    background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
    border-radius: 0.5rem;
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
  }

  .travel-tooltip::before {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: #374151;
  }

  .travel-badge:hover .travel-tooltip,
  .travel-badge:focus-within .travel-tooltip {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) scale(1);
  }
</style>
