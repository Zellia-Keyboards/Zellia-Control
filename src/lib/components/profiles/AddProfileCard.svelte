<script lang="ts">
  import { Plus } from 'lucide-svelte';
  import { Card } from '$lib/components/ui/card';

  interface Props {
    onAdd: () => void;
  }

  let { onAdd }: Props = $props();
</script>

<Card
  role="button"
  tabindex={0}
  onclick={onAdd}
  onkeydown={e => (e.key === 'Enter' || e.key === ' ') && onAdd()}
  class="border-2 border-dashed border-border p-6 transition-all duration-200 hover:border-primary-500 hover:bg-primary-500/5 cursor-pointer flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground glassmorphism-card"
>
  <Plus class="size-5" />
  <span class="font-medium">Add Profile</span>
</Card>
