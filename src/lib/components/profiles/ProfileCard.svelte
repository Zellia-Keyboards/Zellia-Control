<script lang="ts">
  import { MoreVertical } from 'lucide-svelte';
  import type { Profile } from '$lib/stores/ProfileStore.svelte';

  interface Props {
    profile: Profile | null;
    index: number;
    isActive: boolean;
    onActivate: () => void;
    onMenuClick: (event: MouseEvent) => void;
  }

  let { profile, index, isActive, onActivate, onMenuClick }: Props = $props();
</script>

<div
  class="relative rounded-lg border transition-all duration-200 p-6 {isActive
    ? 'border-green-500/50 cursor-default'
    : 'border-gray-700 cursor-pointer hover:border-gray-600'} glassmorphism-card"
  onclick={() => !isActive && onActivate()}
  role="button"
  tabindex={0}
>
  <!-- Profile Name -->
  <h3 class="text-base font-semibold text-gray-900 dark:text-white pr-12">
    {profile?.name || `Profile ${index + 1}`}
  </h3>

  <!-- Active Badge -->
  {#if isActive}
    <div
      class="absolute top-4 right-12 px-2 py-1 rounded-md bg-gray-700 text-white text-xs font-medium"
    >
      Active
    </div>
  {/if}

  <!-- Menu Button -->
  {#if profile}
    <button
      class="absolute top-4 right-4 p-1 rounded hover:bg-gray-800 transition-colors z-10"
      onclick={onMenuClick}
      aria-label="Menu"
    >
      <MoreVertical class="w-5 h-5 text-gray-400" />
    </button>
  {/if}
</div>
