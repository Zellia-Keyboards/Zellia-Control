<script lang="ts">
  import { darkMode } from "$lib/DarkModeStore.svelte";
  import NewZellia80He from "$lib/NewZellia80HE.svelte";
  import { language, t } from "$lib/LanguageStore.svelte";
  import Basic from "./Basic.svelte";
  import System from "./System.svelte";
  import type { Component } from "svelte";

  let currentLanguage = $state($language);

  const Tabs = [
    {
      name: "Basic",
      component: Basic as Component,
    },
    {
      name: "System",
      component: System as Component,
    },
  ];

  let activeTab = $state(Tabs[0].name);

  const ActiveTabComponent = $derived(
    Tabs.find((t) => t.name === activeTab)!!.component,
  );

  // Subscribe to language changes
  language.subscribe((value) => {
    currentLanguage = value;
  });
  $inspect(ActiveTabComponent, "ActiveTabComponent");
</script>

<NewZellia80He
  currentSelectedKey={null}
  onClick={(x, y, event) => {
    console.log(`Key clicked at (${x}, ${y})`, event);
  }}
>
  {#snippet body(x, y)}
    <span class="text-white w-full h-full rounded-lg hover:border">a</span>
  {/snippet}
</NewZellia80He>
<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow {$darkMode
    ? 'border border-gray-600 text-white'
    : 'text-black'} h-full flex flex-col"
  style="background-color: {$darkMode
    ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)`
    : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`};"
>
  <div class="flex items-center gap-6 mb-4">
    {#each Tabs as tab}
      <button
        class="text-lg font-semibold px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 data-[active=true]:bg-gray-300 dark:data-[active=true]:bg-gray-600"
        onclick={() => (activeTab = tab.name)}
        data-active={activeTab === tab.name}
      >
        {tab.name}
      </button>
    {/each}
  </div>

  <ActiveTabComponent />
</div>

<style>
  .key-square {
    aspect-ratio: 1 / 1;
    width: 4rem;
    min-width: 4rem;
    max-width: 4rem;
    min-height: 4rem;
    max-height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
