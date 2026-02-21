<!--
  Shared status dot indicator with optional pulse animation.
  Replaces 8+ hand-coded dot+text patterns.

  Usage:
    <StatusDot color="green" pulse />
    <StatusDot color="gray" />
    <StatusDot color="orange" label="Warning" />
    <StatusDot color="green" pulse label="Connected" />
-->
<script lang="ts">
  type DotColor = 'green' | 'gray' | 'orange' | 'red' | 'primary';

  interface Props {
    color?: DotColor;
    pulse?: boolean;
    size?: 'sm' | 'md';
    label?: string;
    class?: string;
  }

  let { color = 'gray', pulse = false, size = 'sm', label, class: className = '' }: Props =
    $props();

  const colorClasses: Record<DotColor, string> = {
    green: 'bg-green-500',
    gray: 'bg-gray-400',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    primary: 'bg-primary-500',
  };

  const pingColorClasses: Record<DotColor, string> = {
    green: 'bg-green-400',
    gray: 'bg-gray-300',
    orange: 'bg-orange-400',
    red: 'bg-red-400',
    primary: 'bg-primary-400',
  };

  const sizeClasses: Record<'sm' | 'md', string> = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
  };

  const labelColorClasses: Record<DotColor, string> = {
    green: 'text-green-600 dark:text-green-400',
    gray: 'text-gray-500 dark:text-gray-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
    primary: 'text-primary-600 dark:text-primary-400',
  };
</script>

<span class="flex items-center gap-2 {className}">
  <span class="relative flex {sizeClasses[size]}">
    {#if pulse}
      <span
        class="animate-ping absolute inline-flex h-full w-full rounded-full {pingColorClasses[color]} opacity-75"
      ></span>
    {/if}
    <span class="relative inline-flex rounded-full {sizeClasses[size]} {colorClasses[color]}"
    ></span>
  </span>
  {#if label}
    <span class="text-sm font-medium {labelColorClasses[color]}">
      {label}
    </span>
  {/if}
</span>
