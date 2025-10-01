<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Keycode, LayerControlKeycode } from '../../../src-controller/src/interface';

  type KeyInfo = {
    label: string;
    keycode: Keycode;
    subcode?: LayerControlKeycode;
    layer?: number;
  };

  const AvailableKeys: KeyInfo[] = [
    { label: 'MO(1)', keycode: Keycode.LayerControl, subcode: LayerControlKeycode.LayerMomentary, layer: 1 },
    { label: 'MO(2)', keycode: Keycode.LayerControl, subcode: LayerControlKeycode.LayerMomentary, layer: 2 },
    { label: 'MO(3)', keycode: Keycode.LayerControl, subcode: LayerControlKeycode.LayerMomentary, layer: 3 },
    { label: 'TO(0)', keycode: Keycode.LayerControl, subcode: LayerControlKeycode.LayerTurnOn, layer: 0 },
    { label: 'TO(1)', keycode: Keycode.LayerControl, subcode: LayerControlKeycode.LayerTurnOn, layer: 1 },
    { label: 'TO(2)', keycode: Keycode.LayerControl, subcode: LayerControlKeycode.LayerTurnOn, layer: 2 },
    { label: 'TO(3)', keycode: Keycode.LayerControl, subcode: LayerControlKeycode.LayerTurnOn, layer: 3 },
    { label: 'TG(0)', keycode: Keycode.LayerControl, subcode: LayerControlKeycode.LayerToggle, layer: 0 },
    { label: 'TG(1)', keycode: Keycode.LayerControl, subcode: LayerControlKeycode.LayerToggle, layer: 1 },
    { label: 'TG(2)', keycode: Keycode.LayerControl, subcode: LayerControlKeycode.LayerToggle, layer: 2 },
    { label: 'TG(3)', keycode: Keycode.LayerControl, subcode: LayerControlKeycode.LayerToggle, layer: 3 },
    { label: 'TT(0)', keycode: Keycode.LayerControl, subcode: LayerControlKeycode.LayerTurnOff, layer: 0 },
    { label: 'TT(1)', keycode: Keycode.LayerControl, subcode: LayerControlKeycode.LayerTurnOff, layer: 1 },
    { label: 'TT(2)', keycode: Keycode.LayerControl, subcode: LayerControlKeycode.LayerTurnOff, layer: 2 },
    { label: 'TT(3)', keycode: Keycode.LayerControl, subcode: LayerControlKeycode.LayerTurnOff, layer: 3 },
  ];

  interface Props {
    keyslot: Snippet<[KeyInfo]>;
  }

  let { keyslot }: Props = $props();
</script>

<div class="flex flex-wrap gap-2">
  {#each AvailableKeys as key}
    {@render keyslot(key)}
  {/each}
</div>
