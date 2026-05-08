<script lang="ts">
  import { MoreVertical } from 'lucide-svelte';
  import type { Profile } from '$lib/stores/ProfileStore.svelte';
  import { Card } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { cn } from '$lib/utils.js';

  interface Props {
    profile: Profile | null;
    index: number;
    isActive: boolean;
    onActivate: () => void;
    onMenuClick: (event: MouseEvent) => void;
  }

  let { profile, index, isActive, onActivate, onMenuClick }: Props = $props();
</script>

<Card
  role="button"
  tabindex={0}
  onclick={() => !isActive && onActivate()}
  onkeydown={e => (e.key === 'Enter' || e.key === ' ') && !isActive && onActivate()}
  class={cn(
    'relative p-6 transition-all duration-200 glassmorphism-card',
    isActive
      ? 'border-green-500/60 cursor-default'
      : 'cursor-pointer hover:border-primary-500/60 hover:-translate-y-0.5'
  )}
>
  <h3 class="text-base font-semibold text-foreground pr-12">
    {profile?.name || `Profile ${index + 1}`}
  </h3>

  {#if isActive}
    <Badge class="absolute top-4 right-12 bg-green-600 text-white hover:bg-green-600">
      Active
    </Badge>
  {/if}

  {#if profile}
    <Button
      variant="ghost"
      size="icon-sm"
      class="absolute top-3 right-3 text-muted-foreground"
      onclick={onMenuClick}
      aria-label="Menu"
    >
      <MoreVertical class="size-4" />
    </Button>
  {/if}
</Card>
