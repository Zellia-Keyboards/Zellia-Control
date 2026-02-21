<script lang="ts">
  import { AlertCircle } from 'lucide-svelte';
  import { Modal } from '$lib/components/ui';

  interface Props {
    message: string;
    onClose: () => void;
  }

  let { message, onClose }: Props = $props();
</script>

<Modal {onClose}>
  <div class="flex items-start gap-3 mb-4">
    <AlertCircle class="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
    <div>
      <h3 class="text-xl font-bold text-white mb-2">Notice</h3>
      <p class="text-sm text-gray-400">
        {message}
      </p>
    </div>
  </div>

  <div class="flex justify-end">
    <button
      class="px-4 py-2.5 rounded-lg font-medium transition-colors glassmorphism-button bg-gray-700/80 border border-gray-600/50 text-white hover:bg-gray-700"
      onclick={onClose}
    >
      OK
    </button>
  </div>
</Modal>
