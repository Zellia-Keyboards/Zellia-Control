<script lang="ts">
  import LayerSelector from './LayerSelector.svelte';
  import ProfileDropdown from '$lib/components/ProfileDropdown.svelte';
  import LayoutConfigDropdown from './LayoutConfigDropdown.svelte';

  let { shouldShowLayerSelector = false } = $props();
</script>

<div class="flex items-center justify-between -mb-3">
  <LayerSelector shouldShow={shouldShowLayerSelector} />

  <div class="flex items-center gap-3 px-4 py-2">
    <!-- Profile Dropdown -->
    <ProfileDropdown />

    <!-- Layout Configuration Dropdown -->
    <LayoutConfigDropdown />
  </div>
</div>
