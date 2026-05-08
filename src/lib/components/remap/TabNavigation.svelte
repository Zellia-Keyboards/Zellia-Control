<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { cn } from '$lib/utils.js';

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

<Tabs
  value={activeTab}
  onValueChange={onTabChange}
  class={cn('w-full', $glassmorphismMode && 'glassmorphism-tab-container rounded-lg p-1')}
>
  <TabsList variant="line" class="h-auto w-full flex-col bg-transparent p-0 gap-2">
    {#each tabs as tab}
      {@const isActive = activeTab === tab.name}
      <TabsTrigger
        value={tab.name}
        class={cn(
          'w-full h-14 text-base font-medium px-4 py-3 rounded-lg justify-start border-l-4',
          isActive
            ? 'text-white shadow-sm border-l-primary-400 bg-primary-600/85 hover:bg-primary-600'
            : 'text-foreground border-l-transparent hover:bg-muted',
          $glassmorphismMode && 'glassmorphism-tab',
          $glassmorphismMode && isActive && 'active'
        )}
      >
        {#if tab.icon}
          <span class="flex items-center justify-center flex-shrink-0" style="fill: currentColor">
            {@html tab.icon}
          </span>
        {/if}
        <span class="text-left">{tab.name}</span>
      </TabsTrigger>
    {/each}
  </TabsList>
</Tabs>
