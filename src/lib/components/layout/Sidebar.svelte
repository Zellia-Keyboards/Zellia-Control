<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { keyboardAPI, keyboardConnectionState } from '$lib/api/keyboardAPI.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import ThemeSelector from './ThemeSelector.svelte';
  import LanguageSwitch from './LanguageSwitch.svelte';
  import DarkModeToggle from './DarkModeToggle.svelte';
  import { NAVIGATE } from '$lib/config/navigation';
  import {
    Bug,
    ChevronRight,
    Command,
    Download,
    FolderKanban,
    Gauge,
    Info,
    Keyboard as KeyboardIcon,
    Lightbulb,
    LogOut,
    Save,
    Settings,
  } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import {
    advancedKeys,
    dynamicKeys,
    keymap,
    rgbBaseConfig,
    rgbConfigs,
    configHydrationStatus,
  } from '$lib/stores/ControllerStore.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { cn } from '$lib/utils.js';
  import { toast } from 'svelte-sonner';

  const navigationIcons = {
    '/performance': Gauge,
    '/remap': KeyboardIcon,
    '/lighting': Lightbulb,
    '/dynamic': Command,
    '/debug': Bug,
    '/settings': Settings,
    '/update': Download,
    '/about': Info,
  };

  let currentLanguage = $derived($language);

  function isActive(href: string): boolean {
    return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
  }

  function handleDisconnect() {
    keyboardAPI.disconnect();
    goto('/');
    toast.success('Disconnected');
  }

  async function handleSave() {
    keyboardConnectionState.controller?.set_advanced_keys($advancedKeys);
    keyboardConnectionState.controller?.set_rgb_base_config($rgbBaseConfig);
    if ($keymap != undefined) {
      keyboardConnectionState.controller?.set_keymap($keymap);
    }
    keyboardConnectionState.controller?.set_rgb_configs($rgbConfigs);
    keyboardConnectionState.controller?.set_dynamic_keys($dynamicKeys);
    const saved = await keyboardAPI.saveConfiguration();
    if (!saved) {
      toast.error('Failed to save configuration');
      return;
    }
    await keyboardAPI.flashConfiguration();
    toast.success('Configuration saved');
  }
</script>

<aside
  class="sidebar flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border glassmorphism-sidebar shadow-xl h-full overflow-hidden isolate"
  style="width: var(--sidebar-width, 13rem);"
>
  <!-- Header -->
  <div class="p-4">
    <h1 class="font-black text-xl text-sidebar-foreground text-center tracking-tight">
      <span>ZELLIA</span>
      {currentLanguage === 'en' ? 'Control' : '控制'}
    </h1>

    <!-- Connection Status -->
    <div class="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
      {#if keyboardAPI.shouldShowConfigurator}
        <span
          class={cn(
            'size-2 rounded-full',
            $configHydrationStatus === 'loading'
              ? 'bg-amber-400 animate-pulse'
              : 'bg-green-500 animate-pulse'
          )}
        ></span>
        <span>
          {$configHydrationStatus === 'loading'
            ? 'Loading config...'
            : keyboardAPI.state.lastConnectedDevice || 'Connected'}
        </span>
      {:else}
        <span class="size-2 rounded-full bg-muted-foreground/50"></span>
        <span>Waiting to connect</span>
      {/if}
    </div>
  </div>

  <Separator class="bg-sidebar-border/60" />

  <!-- Profile + Save + Disconnect -->
  <div class="px-3 py-3 space-y-2">
    <Button
      href="/profiles"
      variant="default"
      class="w-full justify-between bg-primary-500 hover:bg-primary-600 text-white shadow-md hover:shadow-lg glassmorphism-button"
    >
      <span class="flex items-center gap-2">
        <FolderKanban class="size-4" />
        <span>{t('ui.profiles', currentLanguage)}</span>
      </span>
      <ChevronRight class="size-4" />
    </Button>

    {#if keyboardAPI.shouldShowConfigurator}
      <div in:slide|global={{ duration: 350, axis: 'y' }}>
        <Button
          variant="default"
          class="w-full shadow-lg hover:shadow-xl glassmorphism-button"
          onclick={handleSave}
          title="Save configuration"
        >
          <Save class="size-4" />
          <span>{t('ui.save', currentLanguage)}</span>
        </Button>
      </div>

      <div in:slide|global={{ duration: 350, axis: 'y' }}>
        <Button
          variant="outline"
          size="sm"
          class="w-full text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive glassmorphism-button"
          onclick={handleDisconnect}
        >
          <LogOut class="size-4" />
          <span>{t('ui.disconnect', currentLanguage)}</span>
        </Button>
      </div>
    {/if}
  </div>

  <Separator class="bg-sidebar-border/60" />

  <!-- Navigation -->
  <ScrollArea class="flex-1">
    <nav class="p-3 space-y-1">
      {#each NAVIGATE as [href, name]}
        {@const active = isActive(href)}
        {@const Icon = navigationIcons[href]}
        <a
          {href}
          data-active={active}
          class:active
          class={cn(
            'group flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-md relative overflow-hidden transition-colors',
            'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            'data-[active=true]:bg-primary-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
            'glassmorphism-nav-item'
          )}
        >
          <Icon
            class={cn(
              'relative z-10 size-4 shrink-0 transition-colors',
              active
                ? 'text-white'
                : 'text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground'
            )}
          />
          <span class="relative z-10">{t(name, currentLanguage)}</span>
        </a>
      {/each}
    </nav>
  </ScrollArea>

  <Separator class="bg-sidebar-border/60" />

  <!-- Theme / Language / Dark mode -->
  <ThemeSelector />
  <LanguageSwitch />
  <DarkModeToggle />
</aside>

<style lang="postcss">
  .sidebar {
    user-select: none;
  }
</style>
