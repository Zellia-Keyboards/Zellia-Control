<!--
  Shared toggle switch component.
  Replaces 5+ duplicate toggle implementations across the codebase.

  Usage:
    <Toggle checked={enabled} onToggle={val => enabled = val} />
    <Toggle checked={on} onToggle={val => on = val} size="sm" />
    <Toggle checked={active} onToggle={val => active = val} size="lg" color="amber" />
-->
<script lang="ts">
  type ToggleSize = 'sm' | 'md' | 'lg';
  type ToggleColor = 'primary' | 'amber';

  interface Props {
    checked?: boolean;
    onToggle?: (value: boolean) => void;
    size?: ToggleSize;
    color?: ToggleColor;
    disabled?: boolean;
    ariaLabel?: string;
    class?: string;
  }

  let {
    checked = false,
    onToggle,
    size = 'md',
    color = 'primary',
    disabled = false,
    ariaLabel = 'Toggle',
    class: className = '',
  }: Props = $props();

  // Size maps
  const trackSizes: Record<ToggleSize, string> = {
    sm: 'h-5 w-9',
    md: 'h-6 w-11',
    lg: 'h-7 w-14',
  };

  const thumbSizes: Record<ToggleSize, string> = {
    sm: 'h-3 w-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const thumbTranslate: Record<ToggleSize, { on: string; off: string }> = {
    sm: { on: 'translate-x-5', off: 'translate-x-1' },
    md: { on: 'translate-x-6', off: 'translate-x-1' },
    lg: { on: 'translate-x-8', off: 'translate-x-1' },
  };

  // Color styles
  function getActiveBackground(c: ToggleColor): string {
    if (c === 'amber') return 'bg-gradient-to-r from-amber-500 to-orange-500';
    // 'primary' uses inline gradient for theme color
    return '';
  }

  function getActiveStyle(c: ToggleColor): string {
    if (c === 'primary') {
      return 'background: linear-gradient(135deg, var(--theme-color-primary) 0%, color-mix(in srgb, var(--theme-color-primary) 80%, black) 100%)';
    }
    return '';
  }

  function getFocusRing(c: ToggleColor): string {
    if (c === 'amber') return 'focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-offset-gray-900';
    return '';
  }

  let trackClass = $derived(
    `relative inline-flex items-center rounded-full transition-all duration-200 focus:outline-none ${trackSizes[size]} ${getFocusRing(color)} ${className}`
  );

  let thumbClass = $derived(
    `inline-block transform rounded-full bg-white transition-all shadow ${thumbSizes[size]} ${checked ? thumbTranslate[size].on : thumbTranslate[size].off}`
  );
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={ariaLabel}
  {disabled}
  class="{trackClass} {checked ? getActiveBackground(color) : 'bg-gray-300 dark:bg-gray-600'}"
  class:opacity-50={disabled}
  class:cursor-not-allowed={disabled}
  style={checked ? getActiveStyle(color) : ''}
  onclick={() => onToggle?.(!checked)}
>
  <span class={thumbClass}></span>
</button>
