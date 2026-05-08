<script lang="ts">
  import { profileStore } from '$lib/stores/ProfileStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Check, ChevronDown, FolderKanban } from 'lucide-svelte';
  import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
  } from '$lib/components/ui/dropdown-menu';
  import { Button } from '$lib/components/ui/button';
  import { cn } from '$lib/utils.js';

  let currentLanguage = $derived($language);
  let profiles = $derived($profileStore.profiles);
  let activeProfileId = $derived($profileStore.activeProfileId);
  let activeProfile = $derived(profiles.find(p => p?.id === activeProfileId));
  let availableProfiles = $derived(profiles.filter(p => p !== null));

  let open = $state(false);

  function selectProfile(profileId: number) {
    profileStore.setActiveProfile(profileId);
    open = false;
  }
</script>

<DropdownMenu bind:open>
  <DropdownMenuTrigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="secondary"
        class="glassmorphism-button hover:shadow-md gap-2"
        title={t('ui.profiles', currentLanguage)}
      >
        <FolderKanban class="size-4 text-primary-500" />
        <span class="text-sm font-semibold">
          {activeProfile?.name || t('profiles.noProfile', currentLanguage)}
        </span>
        <ChevronDown class={cn('size-4 transition-transform', open && 'rotate-180')} />
      </Button>
    {/snippet}
  </DropdownMenuTrigger>

  <DropdownMenuContent class="w-72 glassmorphism-card" align="end">
    {#if availableProfiles.length === 0}
      <div class="px-4 py-8 text-center text-sm text-muted-foreground">
        {t('ui.noProfilesAvailable', currentLanguage)}
      </div>
    {:else}
      {#each availableProfiles as profile}
        <DropdownMenuItem
          class="flex items-center justify-between py-2.5 cursor-pointer"
          onclick={() => selectProfile(profile.id)}
        >
          <div class="flex-1">
            <div class="text-sm font-semibold">{profile.name}</div>
            <div class="text-xs text-muted-foreground">
              {t('profiles.slot', currentLanguage)} {profile.id}
            </div>
          </div>
          {#if profile.id === activeProfileId}
            <Check class="size-4 text-primary-500" />
          {/if}
        </DropdownMenuItem>
      {/each}
    {/if}

    <DropdownMenuSeparator />

    <DropdownMenuItem class="cursor-pointer">
      <a
        href="/profiles"
        class="block w-full text-center text-sm font-semibold text-primary-600 dark:text-primary-400"
        onclick={() => (open = false)}
      >
        {t('profiles.manageAll', currentLanguage)}
      </a>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
