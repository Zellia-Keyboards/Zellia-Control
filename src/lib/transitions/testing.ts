/**
 * Test double for the Web Animations API, which jsdom does not implement.
 *
 * `element.animate()` returns a fake animation that records its keyframes and options and
 * finishes after its duration on the timer clock (use `vi.useFakeTimers()` to drive it).
 * Only the members the transition engine uses are provided.
 */

export interface FakeAnimation {
  readonly element: Element;
  readonly keyframes: readonly Keyframe[];
  readonly duration: number;
  readonly fill: FillMode | undefined;
  readonly cancelled: boolean;
  readonly finished: boolean;
  /** Elapsed time in ms, `null` once cancelled. */
  readonly currentTime: number | null;
}

export interface FakeAnimations {
  /** Every animation created since installation, in creation order. */
  readonly all: readonly FakeAnimation[];
  /** Animations that are neither cancelled nor finished (optionally for one element). */
  active(element?: Element): FakeAnimation[];
  /** Animations created for `element`. */
  of(element: Element): FakeAnimation[];
  uninstall(): void;
}

class FakeAnimationImpl implements FakeAnimation {
  readonly duration: number;
  readonly fill: FillMode | undefined;
  cancelled = false;
  finished = false;
  onfinish: (() => void) | null = null;
  effect: object | null = {};
  private readonly startedAt = Date.now();
  private readonly timer: ReturnType<typeof setTimeout>;

  constructor(
    readonly element: Element,
    readonly keyframes: readonly Keyframe[],
    options: KeyframeAnimationOptions
  ) {
    this.duration = typeof options.duration === 'number' ? options.duration : 0;
    this.fill = options.fill;
    this.timer = setTimeout(() => {
      this.finish();
    }, this.duration);
  }

  get currentTime(): number | null {
    if (this.cancelled) return null;
    return Math.min(Date.now() - this.startedAt, this.duration);
  }

  cancel(): void {
    this.cancelled = true;
    clearTimeout(this.timer);
  }

  dispose(): void {
    clearTimeout(this.timer);
  }

  private finish(): void {
    if (this.cancelled) return;
    this.finished = true;
    this.onfinish?.();
  }
}

export function installFakeAnimations(): FakeAnimations {
  const all: FakeAnimationImpl[] = [];
  const original = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');

  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    writable: true,
    value(this: Element, keyframes: unknown, options?: number | KeyframeAnimationOptions) {
      const animation = new FakeAnimationImpl(
        this,
        Array.isArray(keyframes) ? (keyframes as Keyframe[]) : [],
        typeof options === 'number' ? { duration: options } : (options ?? {})
      );
      all.push(animation);
      return animation;
    },
  });

  return {
    all,
    active: element =>
      all.filter(
        animation =>
          !animation.cancelled &&
          !animation.finished &&
          (element === undefined || animation.element === element)
      ),
    of: element => all.filter(animation => animation.element === element),
    uninstall: () => {
      all.forEach(animation => {
        animation.dispose();
      });
      if (original) Object.defineProperty(Element.prototype, 'animate', original);
      else Reflect.deleteProperty(Element.prototype, 'animate');
    },
  };
}
