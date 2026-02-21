<script lang="ts">
  import { Modal } from '$lib/components/ui';

  interface Props {
    title: string;
    message: string;
    confirmText: string;
    confirmColor?: 'blue' | 'orange' | 'red';
    onConfirm: () => void;
    onCancel: () => void;
  }

  let { title, message, confirmText, confirmColor = 'blue', onConfirm, onCancel }: Props = $props();

  const colorClasses = {
    blue: 'glassmorphism-button bg-blue-600/80 border border-blue-500/50 text-white hover:bg-blue-600',
    orange:
      'glassmorphism-button bg-orange-600/80 border border-orange-500/50 text-white hover:bg-orange-600',
    red: 'glassmorphism-button bg-red-600/80 border border-red-500/50 text-white hover:bg-red-600',
  };
</script>

<Modal onClose={onCancel}>
  <h3 class="text-xl font-bold text-white mb-3">{title}</h3>
  <p class="text-sm text-gray-400 mb-6">
    {@html message}
  </p>

  <div class="flex gap-3">
    <button
      class="flex-1 px-4 py-2.5 rounded-lg border font-medium transition-colors glassmorphism-button border-gray-600 text-gray-300"
      onclick={onCancel}
    >
      Cancel
    </button>
    <button
      class="flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors {colorClasses[
        confirmColor
      ]}"
      onclick={onConfirm}
    >
      {confirmText}
    </button>
  </div>
</Modal>
