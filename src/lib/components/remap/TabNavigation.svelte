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

<nav class="flex flex-col gap-2 w-full">
  {#each tabs as tab}
    {@const isActive = activeTab === tab.name}
    <button
      class="w-full h-14 text-base font-medium px-4 py-3 rounded-lg transition-all duration-200
             flex items-center gap-3
             {$glassmorphismMode ? 'glassmorphism-tab' : ''}
             {$glassmorphismMode && isActive ? 'active' : ''}
             {!$glassmorphismMode && isActive ? 'text-white shadow-sm border-l-4' : ''}
             {!$glassmorphismMode && !isActive
        ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border-l-4 border-transparent'
        : ''}"
      style={!$glassmorphismMode && isActive ? 'background-color: var(--theme-color-primary); border-left-color: var(--theme-color-primary);' : ''}
      onclick={() => onTabChange(tab.name)}
    >
      {#if tab.icon}
        <div class="flex items-center justify-center flex-shrink-0" style="fill: currentColor">
          {@html tab.icon}
        </div>
      {/if}
      <span class="text-left">{tab.name}</span>
    </button>
  {/each}
</nav>
