export type EasingFunction = (t: number) => number;

/** What a transition function returns (Svelte's `TransitionConfig`, without `tick`). */
export interface TransitionConfig {
  delay?: number;
  duration?: number;
  easing?: EasingFunction;
  /** Styles at progress `t` (0 = hidden, 1 = shown); `u` is `1 - t`. */
  css?: (t: number, u: number) => string;
}

export type TransitionFn<P extends object = object> = (
  node: HTMLElement,
  params?: P
) => TransitionConfig;

/** A transition function and its parameters, e.g. `[slide, { duration: 300, axis: 'y' }]`. */
export type TransitionSpec<P extends object = object> = readonly [
  fn: TransitionFn<P>,
  params?: NoInfer<P>,
];
