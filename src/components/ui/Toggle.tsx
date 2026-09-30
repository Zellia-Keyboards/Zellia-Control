import type { CSSProperties } from 'react';

type ToggleSize = 'sm' | 'md' | 'lg';
type ToggleColor = 'primary' | 'amber';

export interface ToggleProps {
  checked?: boolean;
  onToggle?: (value: boolean) => void;
  size?: ToggleSize;
  color?: ToggleColor;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

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
function getActiveBackground(color: ToggleColor): string {
  if (color === 'amber') return 'bg-gradient-to-r from-amber-500 to-orange-500';
  // 'primary' uses inline gradient for theme color
  return '';
}

function getActiveStyle(color: ToggleColor): CSSProperties | undefined {
  if (color === 'primary') {
    return {
      background:
        'linear-gradient(135deg, var(--theme-color-primary) 0%, color-mix(in srgb, var(--theme-color-primary) 80%, black) 100%)',
    };
  }
  return undefined;
}

function getFocusRing(color: ToggleColor): string {
  if (color === 'amber') {
    return 'focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-offset-gray-900';
  }
  return '';
}

/** Shared toggle switch (port of `ui/Toggle.svelte`). */
export function Toggle({
  checked = false,
  onToggle,
  size = 'md',
  color = 'primary',
  disabled = false,
  ariaLabel = 'Toggle',
  className = '',
}: ToggleProps) {
  const trackClass = `relative inline-flex items-center rounded-full transition-all duration-200 focus:outline-none ${trackSizes[size]} ${getFocusRing(color)} ${className}`;
  const thumbClass = `inline-block transform rounded-full bg-white transition-all shadow ${thumbSizes[size]} ${checked ? thumbTranslate[size].on : thumbTranslate[size].off}`;
  // `class:opacity-50` / `class:cursor-not-allowed` append their names when active.
  const disabledClass = disabled ? ' opacity-50 cursor-not-allowed' : '';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`${trackClass} ${checked ? getActiveBackground(color) : 'bg-gray-300 dark:bg-gray-600'}${disabledClass}`}
      style={checked ? getActiveStyle(color) : undefined}
      onClick={() => {
        onToggle?.(!checked);
      }}
    >
      <span className={thumbClass}></span>
    </button>
  );
}
