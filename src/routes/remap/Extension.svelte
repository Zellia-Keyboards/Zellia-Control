<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Keycode, MouseKeycode, JoystickKeycode, KeyboardKeycode, KeyboardConfig } from '../../../src-controller/src/interface';

  type KeyInfo = {
    label: string;
    keycode: Keycode;
    subcode?: MouseKeycode | JoystickKeycode | KeyboardKeycode | KeyboardConfig;
  };

  const AvailableKeys: KeyInfo[] = [
    // Mouse buttons
    { label: 'Mouse\nLeft', keycode: Keycode.MouseCollection, subcode: MouseKeycode.MouseLButton },
    { label: 'Mouse\nRight', keycode: Keycode.MouseCollection, subcode: MouseKeycode.MouseRButton },
    { label: 'Mouse\nMiddle', keycode: Keycode.MouseCollection, subcode: MouseKeycode.MouseMButton },
    { label: 'Mouse\nForward', keycode: Keycode.MouseCollection, subcode: MouseKeycode.MouseForward },
    { label: 'Mouse\nBack', keycode: Keycode.MouseCollection, subcode: MouseKeycode.MouseBack },
    
    // Mouse wheel
    { label: 'Wheel\nUp', keycode: Keycode.MouseCollection, subcode: MouseKeycode.MouseWheelUp },
    { label: 'Wheel\nDown', keycode: Keycode.MouseCollection, subcode: MouseKeycode.MouseWheelDown },
    { label: 'Wheel\nLeft', keycode: Keycode.MouseCollection, subcode: MouseKeycode.MouseWheelLeft },
    { label: 'Wheel\nRight', keycode: Keycode.MouseCollection, subcode: MouseKeycode.MouseWheelRight },
    
    // Mouse movement
    { label: 'Move\nUp', keycode: Keycode.MouseCollection, subcode: MouseKeycode.MouseMoveUp },
    { label: 'Move\nDown', keycode: Keycode.MouseCollection, subcode: MouseKeycode.MouseMoveDown },
    { label: 'Move\nLeft', keycode: Keycode.MouseCollection, subcode: MouseKeycode.MouseMoveLeft },
    { label: 'Move\nRight', keycode: Keycode.MouseCollection, subcode: MouseKeycode.MouseMoveRight },
    
    // Joystick controls
    { label: 'Joy\nButton', keycode: Keycode.JoystickCollection, subcode: JoystickKeycode.JoystickButton },
    { label: 'Joy\nPositive', keycode: Keycode.JoystickCollection, subcode: JoystickKeycode.JoystickPositive },
    { label: 'Joy\nNegative', keycode: Keycode.JoystickCollection, subcode: JoystickKeycode.JoystickNegative },
    
    // Keyboard operations
    { label: 'Reboot', keycode: Keycode.KeyboardOperation, subcode: KeyboardKeycode.KeyboardReboot },
    { label: 'Recovery', keycode: Keycode.KeyboardOperation, subcode: KeyboardKeycode.KeyboardBootloader },
    { label: 'Reset', keycode: Keycode.KeyboardOperation, subcode: KeyboardKeycode.KeyboardFactoryReset },
    { label: 'NKRO\nToggle', keycode: Keycode.KeyboardOperation, subcode: KeyboardConfig.KeyboardConfigNkro },
    
    // Special keys
    { label: 'Transparent', keycode: Keycode.KeyTransparent },
    { label: 'Dynamic\nKey', keycode: Keycode.DynamicKey },
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
