/**
 * Port of Svelte 5's transition runtime (`internal/client/dom/elements/transitions.js`,
 * svelte@5.34.3): `css(t, u)` is sampled once per 60 Hz frame into Web Animations keyframes,
 * interrupted transitions reverse from their current position, and outros make the element
 * inert. Keeping this logic identical is what makes the animations match the Svelte app.
 */
import { linear } from './easing';
import type { TransitionConfig } from './types';

/** A running intro or outro (Svelte's internal `Animation`). */
export interface RunningTransition {
  abort(): void;
  /** Stops the completion callback from running (the counterpart takes over). */
  deactivate(): void;
  /** Current progress, 0 = hidden, 1 = shown. */
  t(): number;
}

export type TransitionDirection = 'in' | 'out' | 'both';

/** Transitions of one element for one directive (Svelte's `TransitionManager`). */
export interface TransitionManager {
  in(): void;
  out(done?: () => void): void;
  stop(): void;
}

function noop(): void {
  // Intentionally empty.
}

/** Converts a CSS property to the camel-case form `Element.animate()` expects. */
function cssPropertyToCamelCase(style: string): string {
  if (style === 'float') return 'cssFloat';
  if (style === 'offset') return 'cssOffset';
  if (style.startsWith('--')) return style;
  const [first = '', ...rest] = style.split('-');
  return first + rest.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

export function cssToKeyframe(css: string): Keyframe {
  const keyframe: Keyframe = {};
  for (const part of css.split(';')) {
    const [property, value] = part.split(':');
    if (!property || value === undefined) break;
    keyframe[cssPropertyToCamelCase(property.trim())] = value.trim();
  }
  return keyframe;
}

function supportsWebAnimations(element: Element): boolean {
  const candidate: Partial<Pick<Element, 'animate'>> = element;
  return typeof candidate.animate === 'function';
}

/**
 * Animates `element` towards `t2` (1 = intro, 0 = outro). When `counterpart` (the opposite
 * transition) is still running, it is taken over from its current progress.
 */
export function animate(
  element: HTMLElement,
  options: TransitionConfig,
  counterpart: RunningTransition | undefined,
  t2: 0 | 1,
  onFinish: () => void
): RunningTransition {
  const isIntro = t2 === 1;
  let finish = onFinish;

  counterpart?.deactivate();

  const { duration } = options;
  if (!duration || !supportsWebAnimations(element)) {
    finish();
    return { abort: noop, deactivate: noop, t: () => t2 };
  }

  const { delay = 0, css, easing = linear } = options;
  const holdKeyframes: Keyframe[] = [];

  if (isIntro && counterpart === undefined && css) {
    const styles = cssToKeyframe(css(0, 1));
    holdKeyframes.push(styles, styles);
  }

  let getT = (): number => 1 - t2;

  // Lasts as long as the delay; filling forwards keeps the element at its t=0 styles until
  // the main animation starts, and defers creating keyframes until the DOM is updated.
  let animation = element.animate(holdKeyframes, { duration: delay, fill: 'forwards' });

  animation.onfinish = () => {
    animation.cancel();

    // Bidirectional transitions start from the current position rather than the end.
    const t1 = counterpart?.t() ?? 1 - t2;
    counterpart?.abort();

    const delta = t2 - t1;
    const scaledDuration = duration * Math.abs(delta);
    const keyframes: Keyframe[] = [];

    if (scaledDuration > 0) {
      // Safari < 18 needs `overflow: hidden` inline when the keyframes clip.
      let needsOverflowHidden = false;

      if (css) {
        const n = Math.ceil(scaledDuration / (1000 / 60));
        for (let i = 0; i <= n; i += 1) {
          const t = t1 + delta * easing(i / n);
          const styles = cssToKeyframe(css(t, 1 - t));
          keyframes.push(styles);
          needsOverflowHidden ||= styles.overflow === 'hidden';
        }
      }

      if (needsOverflowHidden) element.style.overflow = 'hidden';

      getT = () => {
        const time = animation.currentTime;
        return t1 + delta * easing((typeof time === 'number' ? time : 0) / scaledDuration);
      };
    }

    animation = element.animate(keyframes, { duration: scaledDuration, fill: 'forwards' });
    animation.onfinish = () => {
      getT = () => t2;
      finish();
    };
  };

  return {
    abort: () => {
      animation.cancel();
      animation.effect = null; // prevents a Chromium leak
      animation.onfinish = null;
    },
    deactivate: () => {
      finish = noop;
    },
    t: () => getT(),
  };
}

/**
 * Creates the transition manager for one directive on `element`. `getConfig` runs when a
 * transition starts (the element is measured then) and its result is reused while that
 * transition or its reversal is running.
 */
export function createTransitionManager(
  element: HTMLElement,
  direction: TransitionDirection,
  getConfig: () => TransitionConfig
): TransitionManager {
  const isIntro = direction !== 'out';
  const isOutro = direction !== 'in';
  const inert = element.inert;
  const overflow = element.style.overflow;

  let currentOptions: TransitionConfig | undefined;
  let intro: RunningTransition | undefined;
  let outro: RunningTransition | undefined;

  const getOptions = (): TransitionConfig => (currentOptions ??= getConfig());

  return {
    in: () => {
      element.inert = inert;

      if (!isIntro) {
        outro?.abort();
        return;
      }

      // An intro that interrupts an earlier intro restarts unless it can reverse an outro.
      if (!isOutro) intro?.abort();

      intro = animate(element, getOptions(), outro, 1, () => {
        intro?.abort(); // drop the filled keyframes
        intro = undefined;
        currentOptions = undefined;
        element.style.overflow = overflow;
      });
    },
    out: done => {
      if (!isOutro) {
        done?.();
        currentOptions = undefined;
        return;
      }

      element.inert = true;
      outro = animate(element, getOptions(), intro, 0, () => {
        done?.();
      });
    },
    stop: () => {
      intro?.abort();
      outro?.abort();
    },
  };
}

/** Runs the outros of `managers` and calls `done` once all of them have finished. */
export function runOutTransitions(managers: readonly TransitionManager[], done: () => void): void {
  let remaining = managers.length;
  if (remaining === 0) {
    done();
    return;
  }
  const check = () => {
    remaining -= 1;
    if (remaining === 0) done();
  };
  for (const manager of managers) manager.out(check);
}
