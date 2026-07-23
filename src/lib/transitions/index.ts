/**
 * Svelte-identical transitions for React: the ported transition functions and easing, run
 * through the Web Animations API by `Transition` (`{#if}` blocks) and `KeyedTransition`
 * (`{#key}` blocks). Test helpers live in `./testing`.
 */
export { cubicOut, linear } from './easing';
export {
  fade,
  slide,
  slideMove,
  type FadeParams,
  type SlideMoveParams,
  type SlideParams,
} from './functions';
export {
  KeyedTransition,
  Transition,
  type KeyedTransitionProps,
  type TransitionChild,
  type TransitionDirectives,
  type TransitionProps,
} from './Transition';
export type { EasingFunction, TransitionConfig, TransitionFn, TransitionSpec } from './types';
