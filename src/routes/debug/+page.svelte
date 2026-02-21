<script lang="ts">
  import { keyboardAPI } from '$lib/api/keyboardAPI.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import KeyTracking from '$lib/components/debug/KeyTracking.svelte';
  import KeyTest from '$lib/components/debug/KeyTest.svelte';
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { Activity, TestTube } from 'lucide-svelte';

  let currentLanguage = $derived($language);
  let activeTab = $state<'tracking' | 'keytest'>('tracking');

  const tabs = [
    { id: 'tracking' as const, label: 'Key Tracking', icon: Activity },
    { id: 'keytest' as const, label: 'Key Test', icon: TestTube },
  ];
</script>

<div class="debug-container">
  <!-- Header -->
  <div class="debug-header">
    <h1 class="page-title text-gray-900 dark:text-white">Debug Tools</h1>
    <p class="page-subtitle text-gray-600 dark:text-gray-300">Test and monitor your keyboard</p>
  </div>

  <!-- Tabs -->
  <div class="tabs-container">
    {#each tabs as tab}
      {@const TabIcon = tab.icon}
      <button
        class="tab {activeTab === tab.id ? 'tab-active' : ''}"
        onclick={() => (activeTab = tab.id)}
      >
        <TabIcon class="tab-icon" />
        <span>{tab.label}</span>
        {#if activeTab === tab.id}
          <div class="tab-indicator"></div>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Content -->
  <div class="content-area {$glassmorphismMode ? 'glassmorphism-card' : ''}">
    {#if activeTab === 'tracking'}
      <KeyTracking currentSelected={null} />
    {:else}
      <KeyTest />
    {/if}
  </div>
</div>

<style lang="postcss">
  @reference "tailwindcss";

  .debug-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1.5rem;
    animation: fade-in 400ms ease-out;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Header */
  .debug-header {
    margin-bottom: 2rem;
    animation: slide-in 500ms ease-out;
  }

  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .page-title {
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .page-subtitle {
    margin-top: 0.25rem;
    font-size: 0.875rem;
  }

  /* Tabs */
  .tabs-container {
    display: inline-flex;
    gap: 0.25rem;
    padding: 0.25rem;
    border-radius: 1rem;
    margin-bottom: 1.5rem;
    animation: fade-in 400ms ease-out backwards;
    animation-delay: 100ms;
  }

  .tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    border-radius: 0.75rem;
    font-size: 0.875rem;
    font-weight: 500;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 200ms ease-out;
  }

  .tab span,
  .tab :global(.tab-icon) {
    position: relative;
    z-index: 1;
  }

  /* Inactive tab colors */
  .tab:not(.tab-active) {
    color: #6b7280;
  }

  :global(.dark) .tab:not(.tab-active) {
    color: #9ca3af;
  }

  .tab:not(.tab-active):hover {
    color: #374151;
  }

  :global(.dark) .tab:not(.tab-active):hover {
    color: #d1d5db;
  }

  /* Active tab colors - light mode */
  .tab-active {
    color: #4f46e5;
  }

  .tab-active :global(.tab-icon) {
    color: #4f46e5;
  }

  /* Active tab colors - dark mode */
  :global(.dark) .tab-active {
    color: #a78bfa;
  }

  :global(.dark) .tab-active :global(.tab-icon) {
    color: #a78bfa;
  }

  :global(.tab-icon) {
    width: 1rem;
    height: 1rem;
  }

  .tab-indicator {
    position: absolute;
    inset: 0;
    border-radius: 0.75rem;
    background: #e0e7ff;
    animation: tab-appear 200ms ease-out;
  }

  @keyframes tab-appear {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  :global(.dark) .tab-indicator {
    background: rgba(99, 102, 241, 0.25);
  }

  /* Content Area */
  .content-area {
    flex: 1;
    min-height: 0;
    border-radius: 1rem;
    background: white;
    padding: 1.5rem;
    animation: fade-in 400ms ease-out backwards;
    animation-delay: 200ms;
    overflow: hidden;
  }

  :global(.dark) .content-area {
    background: rgba(0, 0, 0, 0.6);
  }

  .glassmorphism-card.content-area {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.18);
  }

  :global(.dark) .glassmorphism-card.content-area {
    background: rgba(0, 0, 0, 0.5);
    border-color: rgba(99, 102, 241, 0.2);
  }
</style>
