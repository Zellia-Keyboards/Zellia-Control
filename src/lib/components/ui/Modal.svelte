<!--
  Shared modal overlay component.
  Replaces 3+ duplicate modal backdrop implementations.

  Usage:
    <Modal onClose={handleClose}>
      <h3>Title</h3>
      <p>Content here</p>
    </Modal>

    <Modal onClose={handleClose} maxWidth="lg">
      <p>Content here</p>
    </Modal>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade } from 'svelte/transition';

  type ModalMaxWidth = 'sm' | 'md' | 'lg' | 'xl';

  interface Props {
    onClose: () => void;
    maxWidth?: ModalMaxWidth;
    class?: string;
    children: Snippet;
  }

  let { onClose, maxWidth = 'md', class: className = '', children }: Props = $props();

  const maxWidthClasses: Record<ModalMaxWidth, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
  transition:fade={{ duration: 150 }}
  onclick={onClose}
>
  <div
    class="border border-gray-700 rounded-xl shadow-2xl {maxWidthClasses[maxWidth]} w-full p-6 glassmorphism-card {className}"
    onclick={e => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    {@render children()}
  </div>
</div>
