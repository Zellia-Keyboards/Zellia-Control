import { useEffect, useRef, type ChangeEventHandler, type ComponentPropsWithoutRef } from 'react';
import styles from './ThemedSlider.module.css';

interface SliderProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'type' | 'value' | 'defaultValue' | 'min' | 'max' | 'step' | 'onChange'
> {
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  /**
   * Native `change` event — fires when the user commits a value (pointer release, keyboard),
   * like Svelte's `onchange`. `onChange` fires on every input instead.
   */
  onCommit?: (event: Event) => void;
}

/** The caller owns the value and updates it from `onChange`, which fires on every input. */
interface ControlledSliderProps extends SliderProps {
  value: number;
  onChange: ChangeEventHandler<HTMLInputElement>;
  defaultValue?: never;
}

/** The slider keeps its own position, starting at `defaultValue` (0, as in Svelte). */
interface UncontrolledSliderProps extends SliderProps {
  value?: never;
  defaultValue?: number;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}

/**
 * A `value` always comes with `onChange`: a controlled input without it is read-only in React.
 * Porting Svelte call sites:
 * - `value={x} oninput={…}` → `value={x} onChange={…}`;
 * - `bind:value={x}` → `value={x} onChange={event => setX(Number(event.currentTarget.value))}`
 *   (the Svelte binding never propagated, so whatever showed `x` did not follow the slider);
 * - `onchange={…}` → `onCommit={…}`, in addition to the above.
 */
export type ThemedSliderProps = ControlledSliderProps | UncontrolledSliderProps;

/** Shared themed range slider (port of `ui/ThemedSlider.svelte`). */
export function ThemedSlider({
  value,
  defaultValue = 0,
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
      {...(value === undefined ? { defaultValue } : { value })}
      min={min}
      max={max}
      step={step}
      className={`${styles['themed-slider'] ?? ''} ${className}`}
      {...rest}
    />
  );
}
