/**
 * Transition functions ported from `svelte/transition` (5.34.3) and the Remap page. Each
 * measures the element when the transition starts and returns a `css(t)` that the engine
 * samples into Web Animations keyframes.
 */
import { cubicOut, linear } from './easing';
import type { EasingFunction, TransitionConfig } from './types';

export interface FadeParams {
  delay?: number;
  duration?: number;
  easing?: EasingFunction;
}

/** Animates opacity between 0 and the element's computed opacity. */
export function fade(
  node: Element,
  { delay = 0, duration = 400, easing = linear }: FadeParams = {}
): TransitionConfig {
  const o = +getComputedStyle(node).opacity;
  return {
    delay,
    duration,
    easing,
    css: t => `opacity: ${t * o}`,
  };
}

export interface SlideParams {
  delay?: number;
  duration?: number;
  easing?: EasingFunction;
  axis?: 'x' | 'y';
}

/** Slides an element in and out by animating its size, padding, margin and border. */
export function slide(
  node: Element,
  { delay = 0, duration = 400, easing = cubicOut, axis = 'y' }: SlideParams = {}
): TransitionConfig {
  const style = getComputedStyle(node);
  const opacity = +style.opacity;
  const primaryProperty = axis === 'y' ? 'height' : 'width';
  const primaryPropertyValue = parseFloat(style.getPropertyValue(primaryProperty));
  const [start, end] = axis === 'y' ? (['top', 'bottom'] as const) : (['left', 'right'] as const);
  const measure = (property: string) => parseFloat(style.getPropertyValue(property));
  const paddingStartValue = measure(`padding-${start}`);
  const paddingEndValue = measure(`padding-${end}`);
  const marginStartValue = measure(`margin-${start}`);
  const marginEndValue = measure(`margin-${end}`);
  const borderWidthStartValue = measure(`border-${start}-width`);
  const borderWidthEndValue = measure(`border-${end}-width`);
  return {
    delay,
    duration,
    easing,
    css: t =>
      'overflow: hidden;' +
      `opacity: ${Math.min(t * 20, 1) * opacity};` +
      `${primaryProperty}: ${t * primaryPropertyValue}px;` +
      `padding-${start}: ${t * paddingStartValue}px;` +
      `padding-${end}: ${t * paddingEndValue}px;` +
      `margin-${start}: ${t * marginStartValue}px;` +
      `margin-${end}: ${t * marginEndValue}px;` +
      `border-${start}-width: ${t * borderWidthStartValue}px;` +
      `border-${end}-width: ${t * borderWidthEndValue}px;` +
      `min-${primaryProperty}: 0`,
  };
}

export interface SlideMoveParams {
  duration?: number;
  /** `1` enters from below / leaves upwards, `-1` the opposite. */
  direction?: number;
}

/** The Remap page's tab transition: a vertical slide by the element's height plus a fade. */
export function slideMove(
  _node: Element,
  { duration = 400, direction = 1 }: SlideMoveParams = {}
): TransitionConfig {
  return {
    duration,
    easing: cubicOut,
    css: t => {
      const y = (1 - t) * direction * 100;
      return `transform: translateY(${y}%); opacity: ${t}`;
    },
  };
}
