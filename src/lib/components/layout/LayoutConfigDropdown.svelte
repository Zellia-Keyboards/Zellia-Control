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
  import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
  } from '$lib/components/ui/select';
  import { Switch } from '$lib/components/ui/switch';
  import { Label } from '$lib/components/ui/label';
  import { Separator } from '$lib/components/ui/separator';
  import { cn } from '$lib/utils.js';

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
        indices[2] = Math.min(baseIndex, labels[2].length);
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

  <DropdownMenuContent class="w-80 p-5 glassmorphism-card" align="end">
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
      <Select type="single" bind:value={bottomRowConfig as never}>
        <SelectTrigger class="w-full">
          {bottomRowConfig === '7u' ? '7u (Tsangan)' : '6.25u (Standard)'}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="6.25u" label="6.25u (Standard)" />
          <SelectItem value="7u" label="7u (Tsangan)" />
        </SelectContent>
      </Select>
    </div>

    <div class="mb-4 flex items-center justify-between gap-3 px-1">
      <div class="flex flex-col">
        <Label for="split-spacebar" class="text-sm font-medium">Split spacebar</Label>
        <span class="text-xs text-muted-foreground">
          {bottomRowConfig === '7u' ? '(3u + 1u + 3u)' : '(2.25u + 1.25u + 2.75u)'}
        </span>
      </div>
      <Switch id="split-spacebar" bind:checked={splitSpacebar} />
    </div>

    <Separator class="my-3" />

    <div>
      <Label class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">
        Split Keys
      </Label>
      <div class="space-y-3">
        <div class="flex items-center justify-between px-1">
          <Label for="right-shift-split" class="text-sm font-medium">Right shift split</Label>
          <Switch id="right-shift-split" bind:checked={rightShiftSplit} />
        </div>
        <div class="flex items-center justify-between px-1">
          <Label for="split-backspace" class="text-sm font-medium">Split backspace</Label>
          <Switch id="split-backspace" bind:checked={splitBackspace} />
        </div>
      </div>
    </div>
  </DropdownMenuContent>
</DropdownMenu>
