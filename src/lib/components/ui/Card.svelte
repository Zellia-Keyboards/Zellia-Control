<!--
  Shared card wrapper component.
  Standardizes the 88+ glassmorphism-card usages across the codebase.

  Usage:
    <Card>Content here</Card>
    <Card size="sm" rounded="lg">Compact card</Card>
    <Card size="lg" class="my-custom-class">Large card</Card>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  type CardSize = 'sm' | 'md' | 'lg';
  type CardRounding = 'lg' | 'xl' | '2xl';

  interface Props {
    size?: CardSize;
    rounded?: CardRounding;
    border?: boolean;
    class?: string;
    children: Snippet;
  }

  let { size = 'md', rounded = 'xl', border = true, class: className = '', children }: Props =
    $props();

  const paddingSizes: Record<CardSize, string> = {
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  const roundedSizes: Record<CardRounding, string> = {
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
  };

  let cardClass = $derived(
    `glassmorphism-card ${paddingSizes[size]} ${roundedSizes[rounded]} ${border ? 'border border-gray-200 dark:border-gray-700' : ''} transition-all duration-300 ${className}`
  );
</script>

<div class={cardClass}>
  {@render children()}
</div>
