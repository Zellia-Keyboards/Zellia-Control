<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import KeyboardRender from '$lib/components/KeyboardRender.svelte';
  import { keyboardLayout } from '$lib/stores/LayoutStore.svelte';
  import { selectedKeys, deselectAll, toggleKey } from '$lib/stores/SelectedKeysStore';
  import * as kle from '@ijprest/kle-serial';

  interface Props {
    isOpen: boolean;
  }

  let { isOpen = $bindable() }: Props = $props();

  const dispatch = createEventDispatcher<{
    selectKey: number;
    close: void;
  }>();

  let keys: kle.Key[] = $state([]);

  // Parse and deserialize the keyboard layout
  $effect(() => {
    try {
      const layoutString = $keyboardLayout;
      if (layoutString && layoutString !== '[]') {
        const layoutData = JSON.parse(layoutString);
        const deserialized = kle.Serial.deserialize(layoutData);
        keys = deserialized.keys;
      } else {
        keys = [];
      }
    } catch (e) {
      console.error('Failed to parse keyboard layout:', e);
      keys = [];
    }
  });

  function handleKeySelect(event: CustomEvent<number>) {
    const keyIndex = event.detail;
    dispatch('selectKey', keyIndex);
    deselectAll();
    toggleKey(keyIndex);
    closeModal();
  }

  function closeModal() {
    isOpen = false;
    dispatch('close');
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      closeModal();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-labelledby="keyboard-selector-title"
    tabindex="-1"
  >
    <div class="relative w-auto mx-4 max-h-[90vh] flex flex-col animate-scale-in">
      <!-- Modal content -->
      <div class="glassmorphism-card rounded-2xl p-8 overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 id="keyboard-selector-title" class="text-xl font-semibold text-white">
            Select the key to track
          </h2>
          <button
            onclick={closeModal}
            class="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
            aria-label="Close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Keyboard render container - no inner glassmorphism -->
        <div class="overflow-auto max-h-[calc(90vh-10rem)] rounded-xl p-6 bg-black/20">
          {#if keys.length > 0}
            <div class="flex justify-center">
              <KeyboardRender {keys} on:select={handleKeySelect} />
            </div>
          {:else}
            <div class="text-center py-12 text-gray-400">
              <p class="text-lg">No keyboard layout available</p>
              <p class="text-sm mt-2">Please connect a keyboard first</p>
            </div>
          {/if}
        </div>

        <!-- Footer -->
        <div class="mt-6 flex justify-end">
          <button
            onclick={closeModal}
            class="px-6 py-2.5 text-sm font-medium glassmorphism-button rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes scale-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.2s ease-out forwards;
  }

  .animate-scale-in {
    animation: scale-in 0.2s ease-out forwards;
  }
</style>
