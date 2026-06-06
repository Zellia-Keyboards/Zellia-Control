<script lang="ts">
  import { Settings, ChevronDown } from 'lucide-svelte';
  import { browser } from '$app/environment';
  import { layoutLabels, selectedLayoutIndices } from '$lib/stores/ControllerStore.svelte';
  import { Button } from '$lib/components/ui/button';
  import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
  } from '$lib/components/ui/dropdown-menu';
  import { Label } from '$lib/components/ui/label';
  import { Separator } from '$lib/components/ui/separator';
  import { Switch } from '$lib/components/ui/switch';
  import { cn } from '$lib/utils.js';
  import { activeToolbarDropdown } from '$lib/stores/ToolbarDropdownStore';

  const STORAGE_KEY = 'zellia-layout-config';

  interface LayoutConfig {
    bottomRowConfig: '6.25u' | '7u';
    splitSpacebar: boolean;
    rightShiftSplit: boolean;
    leftShiftSplit: boolean;
    splitBackspace: boolean;
  }

  function loadLayoutConfig(): LayoutConfig {
    if (browser) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {
        /* ignore invalid data */
      }
    }
    return {
      bottomRowConfig: '6.25u',
      splitSpacebar: false,
      rightShiftSplit: false,
      leftShiftSplit: false,
      splitBackspace: false,
    };
  }

  const saved = loadLayoutConfig();

  let open = $state(false);
  let bottomRowConfig = $state<'6.25u' | '7u'>(saved.bottomRowConfig);
  let splitSpacebar = $state(saved.splitSpacebar);
  let rightShiftSplit = $state(saved.rightShiftSplit);
  let leftShiftSplit = $state(saved.leftShiftSplit);
  let splitBackspace = $state(saved.splitBackspace);

  const bottomRowOptions = [
    { value: '6.25u', label: '6.25u', description: 'Standard' },
    { value: '7u', label: '7u', description: 'Tsangan' },
  ] as const;

  const switchClass =
    'border-border data-[state=checked]:border-primary-500 data-[state=checked]:bg-primary-500 data-[state=unchecked]:bg-muted data-[state=unchecked]:shadow-inner dark:data-[state=unchecked]:bg-muted/80';

  function bottomRowButtonClass(selected: boolean) {
    return cn(
      'relative z-10 flex min-h-12 flex-col items-center justify-center rounded-[5px] px-3 py-2 text-center transition-colors',
      selected ? 'text-white' : 'text-foreground hover:text-primary-600'
    );
  }

  function splitOptionClass(active: boolean) {
    return cn(
      'relative flex cursor-pointer select-none items-center justify-between gap-3 rounded-md border px-3 py-2.5 transition-colors',
      active
        ? 'border-primary-500 bg-primary-500/10 text-foreground'
        : 'border-border bg-muted/35 text-foreground hover:border-primary-500/45 hover:bg-muted/50'
    );
  }

  $effect(() => {
    if (open) {
      activeToolbarDropdown.set('layout');
    } else if ($activeToolbarDropdown === 'layout') {
      activeToolbarDropdown.set(null);
    }
  });

  $effect(() => {
    if ($activeToolbarDropdown !== 'layout' && open) {
      open = false;
    }
  });

  $effect(() => {
    const config: LayoutConfig = {
      bottomRowConfig,
      splitSpacebar,
      rightShiftSplit,
      leftShiftSplit,
      splitBackspace,
    };
    if (browser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  });

  $effect(() => {
    const labels = $layoutLabels;
    const _splitBackspace = splitBackspace;
    const _leftShiftSplit = leftShiftSplit;
    const _bottomRowConfig = bottomRowConfig;
    const _splitSpacebar = splitSpacebar;
    const _rightShiftSplit = rightShiftSplit;

    if (labels && labels.length > 0) {
      const indices = new Array(labels.length).fill(0);
      if (labels.length > 0 && labels[0].length > 0) indices[0] = _splitBackspace ? 1 : 0;
      if (labels.length > 1 && labels[1].length > 0) indices[1] = _rightShiftSplit ? 1 : 0;
      if (labels.length > 2 && labels[2].length > 0) {
        let baseIndex = _bottomRowConfig === '7u' ? 2 : 0;
        if (_splitSpacebar) baseIndex += 1;
        indices[2] = Math.min(baseIndex, labels[2].length - 1);
      }
      if (labels.length > 3 && labels[3].length > 0) indices[3] = _leftShiftSplit ? 1 : 0;
      selectedLayoutIndices.set(indices);
    }
  });
</script>

<DropdownMenu bind:open>
  <DropdownMenuTrigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="secondary"
        class="glassmorphism-button hover:shadow-md gap-2"
        title="Configure keyboard layout"
      >
        <Settings class="size-4 text-primary-500" />
        <span class="text-sm font-semibold">Layout</span>
        <ChevronDown
          class={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </Button>
    {/snippet}
  </DropdownMenuTrigger>

  <DropdownMenuContent class="z-[70] w-80 p-5 dropdown-surface" align="end" sideOffset={8}>
    <div class="mb-4">
      <h3 class="text-sm font-bold flex items-center gap-2">
        <span class="size-2 rounded-full bg-primary-500"></span>
        Layout Configuration
      </h3>
      <p class="text-xs text-muted-foreground mt-1">Customize your keyboard layout</p>
    </div>

    <Separator class="my-3" />

    <div class="mb-4 space-y-2">
      <Label class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Bottom Row
      </Label>
      <div
        class="relative grid grid-cols-2 rounded-md border border-border bg-background/70 p-1 shadow-xs"
        aria-label="Bottom row layout"
      >
        <span
          class={cn(
            'absolute left-1 top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-[5px] bg-primary-500 shadow-sm transition-transform duration-200',
            bottomRowConfig === '7u' && 'translate-x-full'
          )}
        ></span>
        {#each bottomRowOptions as option}
          {@const selected = bottomRowConfig === option.value}
          <button
            type="button"
            class={bottomRowButtonClass(selected)}
            aria-pressed={selected}
            aria-label={`Use ${option.label} bottom row`}
            onclick={() => (bottomRowConfig = option.value)}
          >
            <span class="text-sm font-semibold leading-tight">{option.label}</span>
            <span
              class={cn(
                'text-xs leading-tight',
                selected ? 'text-white/80' : 'text-muted-foreground'
              )}
            >
              {option.description}
            </span>
          </button>
        {/each}
      </div>
    </div>

    <div class={cn('mb-4', splitOptionClass(splitSpacebar))}>
      <button
        type="button"
        role="switch"
        aria-checked={splitSpacebar}
        aria-label="Split spacebar"
        class="absolute inset-0 z-10 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        onclick={() => (splitSpacebar = !splitSpacebar)}
      ></button>
      <div class="pointer-events-none relative z-20 flex min-w-0 flex-1 flex-col">
        <span class="text-sm font-medium leading-tight">Split spacebar</span>
        <span class="text-xs text-muted-foreground leading-tight">
          {bottomRowConfig === '7u' ? '3u + 1u + 3u' : '2.25u + 1.25u + 2.75u'}
        </span>
      </div>
      <Switch
        checked={splitSpacebar}
        class={cn('pointer-events-none relative z-20', switchClass)}
        aria-hidden="true"
        tabindex={-1}
      />
    </div>

    <Separator class="my-3" />

    <div>
      <Label class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">
        Split Keys
      </Label>
      <div class="space-y-2">
        <div class={splitOptionClass(rightShiftSplit)}>
          <button
            type="button"
            role="switch"
            aria-checked={rightShiftSplit}
            aria-label="Right shift split"
            class="absolute inset-0 z-10 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            onclick={() => (rightShiftSplit = !rightShiftSplit)}
          ></button>
          <div
            class="pointer-events-none relative z-20 min-w-0 flex-1 text-sm font-medium leading-tight"
          >
            Right shift split
          </div>
          <Switch
            checked={rightShiftSplit}
            class={cn('pointer-events-none relative z-20', switchClass)}
            aria-hidden="true"
            tabindex={-1}
          />
        </div>

        <div class={splitOptionClass(leftShiftSplit)}>
          <button
            type="button"
            role="switch"
            aria-checked={leftShiftSplit}
            aria-label="Left shift split"
            class="absolute inset-0 z-10 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            onclick={() => (leftShiftSplit = !leftShiftSplit)}
          ></button>
          <div
            class="pointer-events-none relative z-20 min-w-0 flex-1 text-sm font-medium leading-tight"
          >
            Left shift split
          </div>
          <Switch
            checked={leftShiftSplit}
            class={cn('pointer-events-none relative z-20', switchClass)}
            aria-hidden="true"
            tabindex={-1}
          />
        </div>

        <div class={splitOptionClass(splitBackspace)}>
          <button
            type="button"
            role="switch"
            aria-checked={splitBackspace}
            aria-label="Split backspace"
            class="absolute inset-0 z-10 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            onclick={() => (splitBackspace = !splitBackspace)}
          ></button>
          <div
            class="pointer-events-none relative z-20 min-w-0 flex-1 text-sm font-medium leading-tight"
          >
            Split backspace
          </div>
          <Switch
            checked={splitBackspace}
            class={cn('pointer-events-none relative z-20', switchClass)}
            aria-hidden="true"
            tabindex={-1}
          />
        </div>
      </div>
    </div>
  </DropdownMenuContent>
</DropdownMenu>
