/**
 * Test-only stand-ins that let the real Chart.js (and its zoom plugin) run in jsdom, which has
 * neither a 2D canvas context nor `ResizeObserver`. Drawing calls are accepted and ignored;
 * `measureText` returns a plausible width so the scales can lay out their ticks.
 */

class NoopResizeObserver implements ResizeObserver {
  observe(): void {
    // jsdom does no layout: nothing ever resizes.
  }
  unobserve(): void {
    // See observe().
  }
  disconnect(): void {
    // See observe().
  }
}

/** CanvasRenderingContext2D methods Chart.js may call; each does nothing. */
const DRAWING_METHODS = [
  'arc',
  'arcTo',
  'beginPath',
  'bezierCurveTo',
  'clearRect',
  'clip',
  'closePath',
  'drawImage',
  'ellipse',
  'fill',
  'fillRect',
  'fillText',
  'lineTo',
  'moveTo',
  'quadraticCurveTo',
  'rect',
  'resetTransform',
  'restore',
  'rotate',
  'roundRect',
  'save',
  'scale',
  'setLineDash',
  'setTransform',
  'stroke',
  'strokeRect',
  'strokeText',
  'transform',
  'translate',
] as const;

function createContext(canvas: HTMLCanvasElement): object {
  const context: Record<string, unknown> = {
    canvas,
    measureText: (text: string) => ({ width: text.length * 6 }),
    getLineDash: () => [],
    createLinearGradient: () => ({ addColorStop: () => undefined }),
    createRadialGradient: () => ({ addColorStop: () => undefined }),
  };
  for (const method of DRAWING_METHODS) context[method] = () => undefined;
  return context;
}

/** Installs the stand-ins; returns the function that restores jsdom's originals. */
export function installChartEnvironment(): () => void {
  const getContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext');
  const resizeObserver = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
  const contexts = new WeakMap<HTMLCanvasElement, object>();

  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value(this: HTMLCanvasElement, contextId: string) {
      if (contextId !== '2d') return null;
      let context = contexts.get(this);
      if (!context) {
        context = createContext(this);
        contexts.set(this, context);
      }
      return context;
    },
  });
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: NoopResizeObserver,
  });

  return () => {
    if (getContext) Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', getContext);
    if (resizeObserver) Object.defineProperty(globalThis, 'ResizeObserver', resizeObserver);
    else Reflect.deleteProperty(globalThis, 'ResizeObserver');
  };
}
