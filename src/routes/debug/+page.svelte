<script lang="ts">
  import { keyboardAPI } from '$lib/api/keyboardAPI.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import KeyTracking from '$lib/components/debug/KeyTracking.svelte';
  import KeyTest from '$lib/components/debug/KeyTest.svelte';

  let currentLanguage = $derived($language);

  let currentSelected = $state<[number, number] | null>(null);
  let activeTab = $state<'tracking' | 'keytest'>('tracking');
</script>

<div class="flex flex-col h-full p-6">
  <!-- Tab Navigation -->
  <div class="inline-flex gap-1 p-1 rounded-full glassmorphism-tab-container mb-6 w-fit">
    <button
      class="px-6 py-2 text-sm font-medium rounded-full transition-all duration-200 {activeTab === 'tracking' 
        ? 'glassmorphism-tab active' 
        : 'glassmorphism-tab'}"
      onclick={() => activeTab = 'tracking'}
    >
      Key Tracking
    </button>
    <button
      class="px-6 py-2 text-sm font-medium rounded-full transition-all duration-200 {activeTab === 'keytest' 
        ? 'glassmorphism-tab active' 
        : 'glassmorphism-tab'}"
      onclick={() => activeTab = 'keytest'}
    >
      Key Test
    </button>
  </div>

  <!-- Tab Content -->
  <div class="flex-1 min-h-0">
    {#if activeTab === 'tracking'}
      <KeyTracking {currentSelected}/>
    {:else}
      <KeyTest />
    {/if}
  </div>
</div>
