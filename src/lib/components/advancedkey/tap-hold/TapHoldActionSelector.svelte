<script lang="ts">
  import KeycodePicker from '../shared/KeycodePicker.svelte';

  interface Props {
    title: string;
    description: string;
    selectedAction: number;
    onActionSelect: (actionId: number) => void;
    highlightColor?: 'primary' | 'green';
  }

  let {
    title,
    description,
    selectedAction = $bindable(),
    onActionSelect,
    highlightColor = 'primary',
  }: Props = $props();
</script>

<KeycodePicker
  {title}
  {description}
  {selectedAction}
  {onActionSelect}
  {highlightColor}
  defaultExpandedSection={highlightColor === 'primary' ? 'Basic' : 'Basic'}
/>
