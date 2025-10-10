<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface TabOption {
    name: string;
    icon: string;
  }

  interface Props {
    tabs: TabOption[];
    activeTab: string;
    onTabChange: (tabName: string) => void;
  }

  let { tabs, activeTab, onTabChange }: Props = $props();
</script>

<div class="flex items-center gap-0.5 -mt-4 mb-4 p-0.5 rounded-xl">
  {#each tabs as tab}
    {@const isActive = activeTab === tab.name}
    <button
      class="flex-1 text-xl font-medium px-2.5 py-2.5 rounded-lg transition-all duration-200
             flex items-center justify-center gap-2
             {$glassmorphismMode ? 'glassmorphism-tab' : ''}
             {$glassmorphismMode && isActive ? 'active' : ''}
             {!$glassmorphismMode && isActive ? 'text-white shadow-sm' : ''}
             {!$glassmorphismMode && !isActive
        ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800'
        : ''}"
      style={!$glassmorphismMode && isActive ? 'background-color: var(--theme-color-primary);' : ''}
      onclick={() => onTabChange(tab.name)}
    >
      {#if tab.icon}
        <div class="flex items-center justify-center" style="fill: currentColor">
          {@html tab.icon}
        </div>
      {/if}
      {tab.name}
    </button>
  {/each}
</div>
