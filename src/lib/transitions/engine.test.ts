import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cubicOut, linear } from './easing';
import { animate, createTransitionManager, cssToKeyframe, runOutTransitions } from './engine';
import { fade, slide, slideMove } from './functions';
import { installFakeAnimations, type FakeAnimations } from './testing';
import type { EasingFunction, TransitionConfig } from './types';

/**
 * Reference implementations copied from svelte@5.34.3 (`src/easing/index.js`,
 * `src/transition/index.js`, `src/internal/client/dom/elements/transitions.js`).
 */
const svelte = {
  cubicOut: (t: number): number => {
    const f = t - 1.0;
    return f * f * f + 1.0;
  },
  cssToKeyframe(css: string): Record<string, string> {
    const keyframe: Record<string, string> = {};
    for (const part of css.split(';')) {
      const [property, value] = part.split(':');
      if (!property || value === undefined) break;
      const name = property
        .trim()
        .split('-')
        .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
        .join('');
      keyframe[name] = value.trim();
    }
    return keyframe;
  },
  /** Keyframes and duration of the main animation from `t1` to `t2`. */
  sample(
    css: (t: number, u: number) => string,
    duration: number,
    t1: number,
    t2: number,
    easing: EasingFunction
  ) {
    const delta = t2 - t1;
    const scaled = duration * Math.abs(delta);
    const n = Math.ceil(scaled / (1000 / 60));
    const keyframes: Record<string, string>[] = [];
    for (let i = 0; i <= n; i += 1) {
      const t = t1 + delta * easing(i / n);
      keyframes.push(svelte.cssToKeyframe(css(t, 1 - t)));
    }
    return { duration: scaled, keyframes };
  },
  slideCss(
    t: number,
    s: {
      opacity: number;
      size: number;
      padding: [number, number];
      margin: [number, number];
      border: [number, number];
    },
    axis: 'x' | 'y'
  ): string {
    const primary = axis === 'y' ? 'height' : 'width';
    const [a, b] = axis === 'y' ? ['top', 'bottom'] : ['left', 'right'];
    return (
      'overflow: hidden;' +
      `opacity: ${Math.min(t * 20, 1) * s.opacity};` +
      `${primary}: ${t * s.size}px;` +
      `padding-${a}: ${t * s.padding[0]}px;` +
      `padding-${b}: ${t * s.padding[1]}px;` +
      `margin-${a}: ${t * s.margin[0]}px;` +
      `margin-${b}: ${t * s.margin[1]}px;` +
      `border-${a}-width: ${t * s.border[0]}px;` +
      `border-${b}-width: ${t * s.border[1]}px;` +
      `min-${primary}: 0`
    );
  },
};

function box(style: string): HTMLElement {
  const element = document.createElement('div');
  element.setAttribute('style', style);
  document.body.append(element);
  return element;
}

const linearCss: TransitionConfig = {
  duration: 300,
  easing: linear,
  css: t => `opacity: ${t}`,
};

let animations: FakeAnimations;

beforeEach(() => {
  vi.useFakeTimers();
  animations = installFakeAnimations();
});

afterEach(() => {
  animations.uninstall();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('cssToKeyframe', () => {
  it('converts declarations to camel-cased keyframe properties', () => {
    expect(cssToKeyframe('transform: translateY(100%); opacity: 0')).toEqual({
      transform: 'translateY(100%)',
      opacity: '0',
    });
    expect(cssToKeyframe('overflow: hidden;border-top-width: 1px;min-height: 0')).toEqual({
      overflow: 'hidden',
      borderTopWidth: '1px',
      minHeight: '0',
    });
  });

  it('keeps custom properties and maps float/offset like Svelte', () => {
    expect(cssToKeyframe('--glow: 2px; float: left; offset: none')).toEqual({
      '--glow': '2px',
      cssFloat: 'left',
      cssOffset: 'none',
    });
  });

  it('stops at the first empty declaration', () => {
    expect(cssToKeyframe('opacity: 1;;height: 2px')).toEqual({ opacity: '1' });
    expect(cssToKeyframe('opacity: 1;')).toEqual({ opacity: '1' });
  });
});

describe('easing', () => {
  it('matches Svelte', () => {
    for (let i = 0; i <= 20; i += 1) {
      const t = i / 20;
      expect(cubicOut(t)).toBe(svelte.cubicOut(t));
      expect(linear(t)).toBe(t);
    }
  });
});

describe('transition functions', () => {
  it('fade animates opacity from 0 to the computed opacity', () => {
    const element = box('opacity: 0.5');
    const config = fade(element, { duration: 150 });
    expect(config).toMatchObject({ delay: 0, duration: 150, easing: linear });
    expect(config.css?.(0.4, 0.6)).toBe(`opacity: ${0.4 * 0.5}`);
    expect(fade(element)).toMatchObject({ delay: 0, duration: 400, easing: linear });
  });

  it('slide animates the measured size, padding, margin and border (y axis)', () => {
    const element = box(
      'height: 40px; padding-top: 4px; padding-bottom: 6px; margin-top: 2px; margin-bottom: 3px;' +
        ' border-style: solid; border-top-width: 1px; border-bottom-width: 2px; opacity: 0.8'
    );
    const config = slide(element, { duration: 300, axis: 'y' });
    expect(config).toMatchObject({ delay: 0, duration: 300, easing: cubicOut });
    const measured = {
      opacity: 0.8,
      size: 40,
      padding: [4, 6] as [number, number],
      margin: [2, 3] as [number, number],
      border: [1, 2] as [number, number],
    };
    for (const t of [0, 0.01, 0.05, 0.37, 1]) {
      expect(config.css?.(t, 1 - t)).toBe(svelte.slideCss(t, measured, 'y'));
    }
  });

  it('slide uses width and left/right on the x axis', () => {
    const element = box(
      'width: 120px; padding-left: 8px; padding-right: 10px; margin-left: 1px; margin-right: 5px;' +
        ' border-style: solid; border-left-width: 3px; border-right-width: 4px'
    );
    const config = slide(element, { axis: 'x' });
    expect(config).toMatchObject({ delay: 0, duration: 400, easing: cubicOut });
    expect(config.css?.(0.5, 0.5)).toBe(
      svelte.slideCss(
        0.5,
        { opacity: 1, size: 120, padding: [8, 10], margin: [1, 5], border: [3, 4] },
        'x'
      )
    );
  });

  it('slideMove translates vertically in the given direction while fading', () => {
    const element = box('');
    const down = slideMove(element, { duration: 350, direction: 1 });
    expect(down).toMatchObject({ duration: 350, easing: cubicOut });
    expect(down.css?.(0.25, 0.75)).toBe(`transform: translateY(${0.75 * 1 * 100}%); opacity: 0.25`);
    const up = slideMove(element, { duration: 350, direction: -1 });
    expect(up.css?.(0.25, 0.75)).toBe(`transform: translateY(${0.75 * -1 * 100}%); opacity: 0.25`);
    expect(slideMove(element)).toMatchObject({ duration: 400 });
  });
});

describe('animate', () => {
  it('holds the t=0 styles during the delay, then plays the sampled intro', () => {
    const element = box('');
    const onFinish = vi.fn();
    const config = slideMove(element, { duration: 350, direction: 1 });
    animate(element, config, undefined, 1, onFinish);

    const [hold] = animations.all;
    const css = config.css ?? (() => '');
    expect(hold?.duration).toBe(0);
    expect(hold?.fill).toBe('forwards');
    expect(hold?.keyframes).toEqual([
      svelte.cssToKeyframe(css(0, 1)),
      svelte.cssToKeyframe(css(0, 1)),
    ]);

    vi.advanceTimersByTime(0);
    const main = animations.all[1];
    const expected = svelte.sample(css, 350, 0, 1, svelte.cubicOut);
    expect(hold?.cancelled).toBe(true);
    expect(main?.duration).toBe(expected.duration);
    expect(main?.fill).toBe('forwards');
    expect(main?.keyframes).toEqual(expected.keyframes);
    expect(main?.keyframes).toHaveLength(22);

    vi.advanceTimersByTime(349);
    expect(onFinish).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('uses the delay as the hold duration', () => {
    const element = box('');
    animate(element, { ...linearCss, delay: 120 }, undefined, 1, vi.fn());
    expect(animations.all[0]?.duration).toBe(120);
    vi.advanceTimersByTime(119);
    expect(animations.all).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(animations.all).toHaveLength(2);
  });

  it('plays outros from t=1 to t=0 without a hold frame', () => {
    const element = box('');
    const onFinish = vi.fn();
    const config = fade(element, { duration: 150 });
    animate(element, config, undefined, 0, onFinish);
    expect(animations.all[0]?.keyframes).toEqual([]);

    vi.advanceTimersByTime(0);
    const expected = svelte.sample(config.css ?? (() => ''), 150, 1, 0, linear);
    expect(animations.all[1]?.keyframes).toEqual(expected.keyframes);
    expect(animations.all[1]?.duration).toBe(150);
    vi.advanceTimersByTime(150);
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('reverses from the current position of the interrupted counterpart', () => {
    const element = box('');
    const introFinished = vi.fn();
    const intro = animate(element, linearCss, undefined, 1, introFinished);
    vi.advanceTimersByTime(0);
    vi.advanceTimersByTime(100);
    expect(intro.t()).toBeCloseTo(1 / 3);

    const outroFinished = vi.fn();
    animate(element, linearCss, intro, 0, outroFinished);
    vi.advanceTimersByTime(0);
    const introMain = animations.all[1];
    const outroMain = animations.all[3];
    const expected = svelte.sample(linearCss.css ?? (() => ''), 300, 1 / 3, 0, linear);
    expect(introMain?.cancelled).toBe(true);
    expect(outroMain?.duration).toBeCloseTo(100);
    expect(outroMain?.keyframes).toEqual(expected.keyframes);

    vi.advanceTimersByTime(300);
    expect(introFinished).not.toHaveBeenCalled();
    expect(outroFinished).toHaveBeenCalledOnce();
  });

  it('finishes synchronously without a duration', () => {
    const element = box('');
    const onFinish = vi.fn();
    const running = animate(element, { css: t => `opacity: ${t}` }, undefined, 1, onFinish);
    expect(onFinish).toHaveBeenCalledOnce();
    expect(animations.all).toHaveLength(0);
    expect(running.t()).toBe(1);
  });

  it('finishes synchronously when the Web Animations API is unavailable', () => {
    animations.uninstall();
    const element = box('');
    const onFinish = vi.fn();
    animate(element, linearCss, undefined, 0, onFinish);
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('abort cancels the animation without finishing', () => {
    const element = box('');
    const onFinish = vi.fn();
    const running = animate(element, linearCss, undefined, 1, onFinish);
    vi.advanceTimersByTime(0);
    running.abort();
    vi.advanceTimersByTime(1000);
    expect(onFinish).not.toHaveBeenCalled();
    expect(animations.active()).toHaveLength(0);
  });

  it('sets overflow: hidden inline while a clipping transition runs', () => {
    const element = box('height: 10px');
    animate(element, slide(element, { duration: 200 }), undefined, 1, vi.fn());
    expect(element.style.overflow).toBe('');
    vi.advanceTimersByTime(0);
    expect(element.style.overflow).toBe('hidden');
  });
});

describe('createTransitionManager', () => {
  it('plays the intro and removes its styles and inline overflow when done', () => {
    const element = box('height: 10px; overflow: auto');
    const manager = createTransitionManager(element, 'both', () =>
      slide(element, { duration: 100 })
    );
    manager.in();
    vi.advanceTimersByTime(0);
    expect(element.style.overflow).toBe('hidden');
    vi.advanceTimersByTime(100);
    expect(animations.active(element)).toHaveLength(0);
    expect(animations.all.every(animation => animation.cancelled)).toBe(true);
    expect(element.style.overflow).toBe('auto');
  });

  it('makes the element inert during the outro and reports completion', () => {
    const element = box('');
    const manager = createTransitionManager(element, 'both', () => linearCss);
    const done = vi.fn();
    manager.out(done);
    expect(element.inert).toBe(true);
    vi.advanceTimersByTime(0);
    vi.advanceTimersByTime(299);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledOnce();
  });

  it('reverses an interrupted outro smoothly and never completes it', () => {
    const element = box('');
    const getConfig = vi.fn(() => linearCss);
    const manager = createTransitionManager(element, 'both', getConfig);
    const done = vi.fn();
    manager.out(done);
    vi.advanceTimersByTime(0);
    vi.advanceTimersByTime(150);
    manager.in();
    expect(element.inert).toBeFalsy();
    vi.advanceTimersByTime(0);
    const reversal = animations.all.at(-1);
    expect(reversal?.keyframes[0]).toEqual({ opacity: '0.5' });
    expect(reversal?.duration).toBeCloseTo(150);
    vi.advanceTimersByTime(1000);
    expect(done).not.toHaveBeenCalled();
    expect(getConfig).toHaveBeenCalledOnce();
  });

  it('computes the config when a transition starts and again after it completed', () => {
    const element = box('');
    const getConfig = vi.fn(() => linearCss);
    const manager = createTransitionManager(element, 'both', getConfig);
    expect(getConfig).not.toHaveBeenCalled();
    manager.in();
    expect(getConfig).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(0);
    vi.advanceTimersByTime(300);
    manager.out();
    expect(getConfig).toHaveBeenCalledTimes(2);
  });

  it('an intro-only manager completes outros immediately', () => {
    const element = box('');
    const manager = createTransitionManager(element, 'in', () => linearCss);
    const done = vi.fn();
    manager.out(done);
    expect(done).toHaveBeenCalledOnce();
    expect(animations.all).toHaveLength(0);
    expect(element.inert).toBeFalsy();
  });

  it('an outro-only manager plays no intro and cancels a running outro on in()', () => {
    const element = box('');
    const manager = createTransitionManager(element, 'out', () => linearCss);
    manager.in();
    expect(animations.all).toHaveLength(0);
    const done = vi.fn();
    manager.out(done);
    vi.advanceTimersByTime(0);
    manager.in();
    expect(animations.active(element)).toHaveLength(0);
    vi.advanceTimersByTime(1000);
    expect(done).not.toHaveBeenCalled();
  });

  it('a new intro restarts from t=0 for intro-only managers', () => {
    const element = box('');
    const manager = createTransitionManager(element, 'in', () => linearCss);
    manager.in();
    vi.advanceTimersByTime(0);
    vi.advanceTimersByTime(100);
    manager.in();
    expect(animations.all.at(-1)?.keyframes).toEqual([{ opacity: '0' }, { opacity: '0' }]);
  });

  it('stop aborts running animations', () => {
    const element = box('');
    const manager = createTransitionManager(element, 'both', () => linearCss);
    const done = vi.fn();
    manager.out(done);
    vi.advanceTimersByTime(0);
    manager.stop();
    vi.advanceTimersByTime(1000);
    expect(done).not.toHaveBeenCalled();
    expect(animations.active()).toHaveLength(0);
  });
});

describe('runOutTransitions', () => {
  it('completes once every outro has finished', () => {
    const element = box('');
    const done = vi.fn();
    runOutTransitions(
      [
        createTransitionManager(element, 'in', () => linearCss),
        createTransitionManager(element, 'out', () => linearCss),
      ],
      done
    );
    vi.advanceTimersByTime(0);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(done).toHaveBeenCalledOnce();
  });

  it('completes immediately without transitions', () => {
    const done = vi.fn();
    runOutTransitions([], done);
    expect(done).toHaveBeenCalledOnce();
  });
});
