<script lang="ts">
  import type { Snippet } from 'svelte';

  const AvailableKeys = [
    'BRT-',
    'BRT+',
    'Vol-',
    'Vol+',
    'Mute',
    'Play\nPause',
    'Stop',
    'Prev',
    'Next',
    'Email',
    'Calculator',
    'Explorer',
    'Media\nPlayer',
    'Control\nPanel',
    'Search',
    'Home',
    'Back',
    'Forward',
    'Stop',
    'Refresh',
    'Bookmarks',
    'Mission\nControl',
    'Launchpad',
  ];

  interface Props {
    keyslot: Snippet<[string]>;
  }

  let { keyslot }: Props = $props();
</script>

<div class="flex flex-wrap gap-2 *:w-20">
  {#each AvailableKeys as key}
    {@render keyslot(key)}
  {/each}
</div>
