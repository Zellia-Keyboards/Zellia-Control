<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Keycode, KeyboardKeycode } from '../../../src-controller/src/interface';

  type KeyInfo = {
    label: string;
    keycode: Keycode;
    subcode?: KeyboardKeycode;
    profile?: number;
  };

  const AvailableKeys: KeyInfo[] = [
    { label: 'PF(0)', keycode: Keycode.KeyboardOperation, subcode: KeyboardKeycode.KeyboardConfig0, profile: 0 },
    { label: 'PF(1)', keycode: Keycode.KeyboardOperation, subcode: KeyboardKeycode.KeyboardConfig1, profile: 1 },
    { label: 'PF(2)', keycode: Keycode.KeyboardOperation, subcode: KeyboardKeycode.KeyboardConfig2, profile: 2 },
    { label: 'PF(3)', keycode: Keycode.KeyboardOperation, subcode: KeyboardKeycode.KeyboardConfig3, profile: 3 },
    { label: '↔ PF', keycode: Keycode.KeyboardOperation, subcode: KeyboardKeycode.KeyboardConfigBase },
    { label: '↔ PF1', keycode: Keycode.KeyboardOperation, subcode: KeyboardKeycode.KeyboardConfig1 },
    { label: '→ PF', keycode: Keycode.KeyboardOperation, subcode: KeyboardKeycode.KeyboardConfigBase },
    { label: '← PF', keycode: Keycode.KeyboardOperation, subcode: KeyboardKeycode.KeyboardConfigBase },
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
