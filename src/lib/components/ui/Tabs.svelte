<!--
  Shared horizontal tab navigation.
  Replaces 3+ inline tab implementations that use the same underline pattern.

  Usage:
    <Tabs
      items={['Bindings', 'Performance', 'Key Tester']}
      active={activeTab}
      onTabChange={tab => activeTab = tab}
    />
-->
<script lang="ts">
  type TabItem = string | { name: string; icon?: string };

  interface Props {
    items: TabItem[];
    active: string;
    onTabChange: (name: string) => void;
    class?: string;
  }

  let { items, active, onTabChange, class: className = '' }: Props = $props();

  function getName(item: TabItem): string {
    return typeof item === 'string' ? item : item.name;
  }

  function getIcon(item: TabItem): string | undefined {
    return typeof item === 'string' ? undefined : item.icon;
  }
</script>

<div class="flex border-b border-gray-200 dark:border-gray-700 {className}">
  {#each items as item}
    {@const name = getName(item)}
    {@const icon = getIcon(item)}
    {@const isActive = active === name}
    <button
      class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-200 flex items-center gap-2
             {isActive
        ? 'border-primary-500 text-primary-500'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}"
      onclick={() => onTabChange(name)}
    >
      {#if icon}
        <span class="flex items-center" style="fill: currentColor">
          {@html icon}
        </span>
      {/if}
      {name}
    </button>
  {/each}
</div>
