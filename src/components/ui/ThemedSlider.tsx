import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react';
import styles from './ThemedSlider.module.css';

export interface ThemedSliderProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'type' | 'value' | 'min' | 'max' | 'step'
> {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  /**
   * Native `change` event — fires when the user commits a value (pointer release, keyboard),
   * like Svelte's `onchange`. React's `onChange` fires on every input instead.
   */
  onCommit?: (event: Event) => void;
}

/** Shared themed range slider (port of `ui/ThemedSlider.svelte`). */
export function ThemedSlider({
  value = 0,
  min = 0,
  max = 100,
  step = 1,
  className = '',
  onCommit,
  ...rest
}: ThemedSliderProps) {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const element = input.current;
    if (!element || !onCommit) return;
    element.addEventListener('change', onCommit);
    return () => {
      element.removeEventListener('change', onCommit);
    };
  }, [onCommit]);

  return (
    <input
      ref={input}
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      className={`${styles['themed-slider'] ?? ''} ${className}`}
      {...rest}
    />
  );
}
