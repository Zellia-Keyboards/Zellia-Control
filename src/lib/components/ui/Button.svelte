<!--
  Shared button component with predefined variants.
  Replaces ~12 inline button style combinations.

  Usage:
    <Button onclick={handleClick}>Save</Button>
    <Button variant="danger" onclick={handleDelete}>Delete</Button>
    <Button variant="ghost" size="sm">Cancel</Button>
    <Button variant="primary" fullWidth>Apply Changes</Button>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  type ButtonSize = 'sm' | 'md' | 'lg';

  interface Props extends HTMLButtonAttributes {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    class?: string;
    children: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    class: className = '',
    children,
    ...rest
  }: Props = $props();

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'glassmorphism-button text-white shadow-md hover:shadow-lg',
    secondary:
      'glassmorphism-button border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
    danger:
      'glassmorphism-button bg-red-600/80 border border-red-500/50 text-white hover:bg-red-600',
    success:
      'glassmorphism-button bg-green-600/80 border border-green-500/50 text-white hover:bg-green-600',
    ghost:
      'glassmorphism-button text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800',
    outline:
      'glassmorphism-button border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800',
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs rounded-md',
    md: 'px-4 py-2.5 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-lg',
  };

  let buttonClass = $derived(
    `font-medium transition-all duration-200 active:scale-95 ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`
  );

  // Primary variant uses theme color via inline style
  let buttonStyle = $derived(
    variant === 'primary'
      ? 'background: linear-gradient(135deg, var(--theme-color-primary) 0%, var(--theme-color-hover) 100%);'
      : ''
  );
</script>

<button class={buttonClass} style={buttonStyle} {...rest}>
  {@render children()}
</button>
