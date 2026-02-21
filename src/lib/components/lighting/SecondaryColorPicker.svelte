<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { ColorInput } from '$lib/components/ui';

  interface Props {
    color: string;
    onColorChange: (value: string) => void;
  }

  let { color, onColorChange }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<ColorInput
  value={color}
  oninput={e => onColorChange((e.target as HTMLInputElement).value)}
  label={t('lighting.secondaryColor', currentLanguage)}
/>
