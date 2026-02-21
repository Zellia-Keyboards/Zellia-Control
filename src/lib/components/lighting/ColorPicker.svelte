<script lang="ts">
  import { ColorInput } from '$lib/components/ui';

  interface Props {
    color: string;
    onColorChange: (value: string) => void;
  }

  let { color, onColorChange }: Props = $props();
</script>

<ColorInput
  value={color}
  oninput={e => onColorChange((e.target as HTMLInputElement).value)}
/>
