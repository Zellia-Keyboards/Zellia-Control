<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { Plus } from 'lucide-svelte';

  interface Props {
    onAdd: () => void;
  }

  let { onAdd }: Props = $props();
</script>

<button
  class="rounded-lg border-2 border-dashed border-gray-700 p-6 transition-all duration-200 hover:border-gray-600 flex items-center justify-center gap-2 text-gray-400 hover:text-gray-300 {$glassmorphismMode
    ? 'glassmorphism-card'
    : 'bg-transparent hover:bg-gray-900/50'}"
  onclick={onAdd}
>
  <Plus class="w-5 h-5" />
  <span class="font-medium">Add Profile</span>
</button>
