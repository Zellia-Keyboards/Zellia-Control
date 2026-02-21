<!--
  Shared section header with title and optional subtitle.
  Replaces 35+ inline heading+subtitle combinations.

  Usage:
    <SectionHeader title="Performance" />
    <SectionHeader title="Configuration" subtitle="Customize your settings" />
    <SectionHeader title="Advanced" level={2} size="xl" />
-->
<script lang="ts">
  type HeadingSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

  interface Props {
    title: string;
    subtitle?: string;
    level?: 1 | 2 | 3 | 4;
    size?: HeadingSize;
    class?: string;
  }

  let { title, subtitle, level = 3, size = 'lg', class: className = '' }: Props = $props();

  const sizeClasses: Record<HeadingSize, string> = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-semibold',
    lg: 'text-lg font-medium',
    xl: 'text-xl font-bold',
    '2xl': 'text-2xl font-bold',
  };

  let headingClass = $derived(`${sizeClasses[size]} text-gray-900 dark:text-white ${className}`);
</script>

{#if level === 1}
  <h1 class={headingClass}>{title}</h1>
{:else if level === 2}
  <h2 class={headingClass}>{title}</h2>
{:else if level === 4}
  <h4 class={headingClass}>{title}</h4>
{:else}
  <h3 class={headingClass}>{title}</h3>
{/if}

{#if subtitle}
  <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
{/if}
