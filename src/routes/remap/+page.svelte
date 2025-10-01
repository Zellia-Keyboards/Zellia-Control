<script lang="ts">
  import { glassmorphismMode, darkMode } from '$lib/DarkModeStore.svelte';
  import { keyboardAPI } from '$lib/keyboardAPI.svelte';
  import { language, t } from '$lib/LanguageStore.svelte';
  import Basic from './Basic.svelte';
  import System from './System.svelte';
  import type { Component, Snippet } from 'svelte';
  import Layer from './Layer.svelte';
  import Profile from './Profile.svelte';
  import Extension from './Extension.svelte';
  import { cubicOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';
  import { X } from 'lucide-svelte';
  import { dev } from '$app/environment';
  import type { Keycode } from '../../src-controller/src/interface';

  // Type for key information with keycode support
  type KeyInfo = {
    label: string;
    keycode: Keycode;
    subcode?: number;
    layer?: number;
    profile?: number;
  };

  // Derived variable to determine which keyboard component to show
  

  // Custom slide transition that moves instead of stretches
  function slideMove(node: Element, { duration = 400, direction = 1 }) {
    return {
      duration,
      easing: cubicOut,
      css: (t: number) => {
        const x = (1 - t) * direction * 100;
        return `transform: translateX(${x}%); opacity: ${t}`;
      },
    };
  }

  // TODO: optimize the usage on icon SVGs for better readability
  const Tabs = [
    {
      name: 'Basic',
      component: Basic as Component<{ keyslot: Snippet<[KeyInfo]> }>,
      icon: `<svg width="22" height="22" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <polygon points="263.75,145.68 43.5,365.92 43.5,466.5 152.04,466.5 368.31,250.23"/>
        <path d="M458.07,139.61l-83.7-83.69c-5.76-5.76-15.1-5.76-20.86,0l-67.13,67.13l104.56,104.55l67.13-67.13 C463.83,154.71,463.83,145.37,458.07,139.61z"/>
      </svg>`,
    },
    {
      name: 'System',
      component: System as Component<{ keyslot: Snippet<[KeyInfo]> }>,
      icon: `<svg width="22" height="22" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
        <path d="M772.672 575.808V448.192l70.848-70.848a370.688 370.688 0 0 0-56.512-97.664l-96.64 25.92-110.528-63.808-25.92-96.768a374.72 374.72 0 0 0-112.832 0l-25.92 96.768-110.528 63.808-96.64-25.92c-23.68 29.44-42.816 62.4-56.576 97.664l70.848 70.848v127.616l-70.848 70.848c13.76 35.264 32.832 68.16 56.576 97.664l96.64-25.92 110.528 63.808 25.92 96.768a374.72 374.72 0 0 0 112.832 0l25.92-96.768 110.528-63.808 96.64 25.92c23.68-29.44 42.816-62.4 56.512-97.664l-70.848-70.848z m39.744 254.848l-111.232-29.824-55.424 32-29.824 111.36c-37.76 10.24-77.44 15.808-118.4 15.808-41.024 0-80.768-5.504-118.464-15.808l-29.888-111.36-55.424-32-111.168 29.824A447.552 447.552 0 0 1 64 625.472L145.472 544v-64L64 398.528A447.552 447.552 0 0 1 182.592 193.28l111.168 29.824 55.424-32 29.888-111.36A448.512 448.512 0 0 1 497.472 64c41.024 0 80.768 5.504 118.464 15.808l29.824 111.36 55.424 32 111.232-29.824c56.32 55.68 97.92 126.144 118.592 205.184L849.472 480v64l81.536 81.472a447.552 447.552 0 0 1-118.592 205.184zM497.536 627.2a115.2 115.2 0 1 0 0-230.4 115.2 115.2 0 0 0 0 230.4z m0 76.8a192 192 0 1 1 0-384 192 192 0 0 1 0 384z"/>
      </svg>`,
    },
    {
      name: 'Layer',
      component: Layer as Component<{ keyslot: Snippet<[KeyInfo]> }>,
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12L12 16L3.00001 12M21 16L12 20L3 16M21 8L12 12L3.00001 8L12 4L21 8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>`,
    },
    {
      name: 'Profile',
      component: Profile as Component<{ keyslot: Snippet<[KeyInfo]> }>,
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 9V17.8C19 18.9201 19 19.4802 18.782 19.908C18.5903 20.2843 18.2843 20.5903 17.908 20.782C17.4802 21 16.9201 21 15.8 21H8.2C7.07989 21 6.51984 21 6.09202 20.782C5.71569 20.5903 5.40973 20.2843 5.21799 19.908C5 19.4802 5 18.9201 5 17.8V6.2C5 5.07989 5 4.51984 5.21799 4.09202C5.40973 3.71569 5.71569 3.40973 6.09202 3.21799C6.51984 3 7.0799 3 8.2 3H13M19 9L13 3M19 9H14C13.4477 9 13 8.55228 13 8V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>`,
    },
    {
      name: 'Extension',
      component: Extension as Component<{ keyslot: Snippet<[KeyInfo]> }>,
      icon: `<svg width="22" height="22" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <path d="M-8.5,16h-4a.5.5,0,0,1-.5-.5v-1A1.5,1.5,0,0,0-14.5,13,1.5,1.5,0,0,0-16,14.5v1a.5.5,0,0,1-.5.5h-4a.5.5,0,0,1-.5-.5V3.5a.5.5,0,0,1,.5-.5H-17V2.5A2.5,2.5,0,0,1-14.5,0,2.5,2.5,0,0,1-12,2.5V3h3.5a.5.5,0,0,1,.5.5V7h.5A2.5,2.5,0,0,1-5,9.5,2.5,2.5,0,0,1-7.5,12H-8v3.5A.5.5,0,0,1-8.5,16ZM-12,15h3V11.5a.5.5,0,0,1,.5-.5h1A1.5,1.5,0,0,0-6,9.5,1.5,1.5,0,0,0-7.5,8h-1A.5.5,0,0,1-9,7.5V4h-3.5a.5.5,0,0,1-.5-.5v-1A1.5,1.5,0,0,0-14.5,1,1.5,1.5,0,0,0-16,2.5v1a.5.5,0,0,1-.5.5H-20V15h3v-.5A2.5,2.5,0,0,1-14.5,12,2.5,2.5,0,0,1-12,14.5Z" transform="translate(21)" fill="currentColor"/>
      </svg>`,
    },
  ];

  let activeTab = $state(Tabs[0].name);
  let previousTabIndex = $state(0);

  const ActiveTabComponent = $derived(Tabs.find(t => t.name === activeTab)!!.component);

  const currentTabIndex = $derived(Tabs.findIndex(t => t.name === activeTab));

  // Function to handle tab change with direction tracking
  function changeTab(newTabName: string) {
    previousTabIndex = currentTabIndex;
    activeTab = newTabName;
  }

  let selectedKeys = $state<[number, number][]>([]);

  let showingNotification = $state(false);

  // Store keycodes with their full info
  let storedKeys = $state<KeyInfo[][]>([
    Array(17).fill({ label: '', keycode: 0 }),
    Array(17).fill({ label: '', keycode: 0 }),
    Array(17).fill({ label: '', keycode: 0 }),
    Array(13).fill({ label: '', keycode: 0 }),
    Array(13).fill({ label: '', keycode: 0 }),
    Array(11).fill({ label: '', keycode: 0 }),
  ]);

  // Function to select all keys
  function selectAllKeys() {
    selectedKeys = [];
    storedKeys.forEach((row, y) => {
      row.forEach((_, x) => {
        selectedKeys.push([x, y]);
      });
    });
  }

  // Function to deselect all keys
  function deselectAllKeys() {
    selectedKeys = [];
  }

  // Keyboard event handler
  function handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && (event.key === 'a' || event.key === 'A')) {
      event.preventDefault();
      selectAllKeys();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      deselectAllKeys();
    }
  }

  // Reference to the main container for focus management
  let mainContainer: HTMLDivElement;

  // Auto-focus the container when component mounts
  $effect(() => {
    if (mainContainer) {
      mainContainer.focus();
    }
  });

  // Function to set key content/keycode for selected keys
  function setKeyContent(keyInfo: KeyInfo) {
    if (selectedKeys.length === 0) return;
    
    selectedKeys.forEach(([x, y]) => {
      dev ? console.log(`Setting key at (${x}, ${y}) to keycode: ${keyInfo.keycode} (${keyInfo.label})`) : null;
      // Set the key info in the keymap
      storedKeys[y][x] = keyInfo;
    });
    
    // Clear selection after setting keys
    selectedKeys = [];
  }

  $inspect(ActiveTabComponent, 'ActiveTabComponent');
  $inspect(selectedKeys, 'selectedKeys');
</script>

<div
  bind:this={mainContainer}
  class="rounded-2xl shadow p-8 mt-2 mb- mb- grow border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col {$glassmorphismMode
    ? 'glassmorphism-card bg-gray-50 dark:bg-gray-900'
    : 'bg-[color-mix(in_srgb,var(--theme-color-primary)_10%,white)] dark:bg-[color-mix(in_srgb,var(--theme-color-primary)_5%,black)]'}"
  tabindex="-1"
  role="application"
  onkeydown={handleKeydown}
  onclick={() => mainContainer?.focus()}
  style="outline: none;"
>
  <!-- Tab Navigation -->
  <div class="flex items-center gap-0.5 -mt-4 mb-4 p-0.5 rounded-xl">
    {#each Tabs as tab}
      {@const isActive = activeTab === tab.name}
      <button
        class="flex-1 text-xl font-medium px-2.5 py-2.5 rounded-lg transition-all duration-200 
               flex items-center justify-center gap-2
               {$glassmorphismMode ? 'glassmorphism-tab' : ''}
               {$glassmorphismMode && isActive ? 'active' : ''}
               {!$glassmorphismMode && isActive ? 'text-white shadow-sm' : ''}
               {!$glassmorphismMode && !isActive ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800' : ''}"
        style={!$glassmorphismMode && isActive ? 'background-color: var(--theme-color-primary);' : ''}
        onclick={() => changeTab(tab.name)}
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

  <!-- Tab Content -->
  <div class="flex-1 min-h-0 relative overflow-hidden">
    {#key activeTab}
      <div
        class="absolute inset-0 w-full h-full overflow-y-auto"
        in:slideMove={{
          duration: 350,
          direction: currentTabIndex > previousTabIndex ? 1 : -1,
        }}
        out:slideMove={{
          duration: 350,
          direction: currentTabIndex > previousTabIndex ? -1 : 1,
        }}
      >
        <ActiveTabComponent>
          {#snippet keyslot(keyInfo: KeyInfo)}
            <button
              onclick={() => {
                if (selectedKeys.length === 0) {
                  showingNotification = true;
                  setTimeout(() => showingNotification = false, 3000);
                } else {
                  dev ? console.log(`Clicked key: ${keyInfo.label} (keycode: ${keyInfo.keycode})`) : null;
                  setKeyContent(keyInfo);
                }
              }}
              class="size-14 text-wrap text-sm border whitespace-pre-line rounded-lg overflow-auto truncate"
            >
              {keyInfo.label}
            </button>
          {/snippet}
        </ActiveTabComponent>
      </div>
    {/key}
  </div>
</div>

{#if showingNotification}
  <div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50" transition:fade={{ duration: 300 }}>
    <div class="glassmorphism-card bg-gray-50 dark:bg-gray-900 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 text-black dark:text-white">
      Select the key you want to remap first
    </div>
  </div>
{/if}

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
