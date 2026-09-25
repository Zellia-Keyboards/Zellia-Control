/**
 * The Key Tracking travel chart (the Chart.js part of `debug/KeyTracking.svelte`, D16).
 *
 * Chart.js and its zoom plugin are imported on first use, so they load with the Debug page.
 * Points are appended to the dataset imperatively (no React state per sample) and drawn at most
 * once per animation frame; the x axis follows the last `TRACKING_WINDOW_MS` of samples.
 */
import type { Chart, ChartConfiguration } from 'chart.js';
import { TRAVEL_MM } from '../../device/model/units';

export interface TravelPoint {
  /** Milliseconds since tracking started. */
  x: number;
  /** Travel in millimetres. */
  y: number;
}

export interface TravelChartLabels {
  readonly dataset: string;
  readonly time: string;
  readonly distance: string;
  /** Unit after each distance tick, read whenever the ticks are drawn. */
  readonly unit: () => string;
}

/** Width of the followed time window (Svelte `WINDOW_MS`). */
export const TRACKING_WINDOW_MS = 500;
/** Lower bound of the distance axis after "Zoom 0.1mm". */
const BOTTOM_ZOOM_MIN_MM = 3.9;
/** Delay between a theme class change and re-reading the chart colours. */
const THEME_COLOR_DELAY_MS = 50;

type TravelChartInstance = Chart<'line', TravelPoint[]>;

interface ChartLibrary {
  readonly ChartJs: typeof Chart;
  /** The zoom plugin registered (it adds `resetZoom()`); the chart works without it. */
  readonly zoom: boolean;
}

let chartLibrary: Promise<ChartLibrary> | null = null;

/** `chart.js/auto` with the zoom plugin registered (once per page; retried after a failure). */
function loadChartLibrary(): Promise<ChartLibrary> {
  chartLibrary ??= (async () => {
    const { default: ChartJs } = await import('chart.js/auto');
    try {
      const { default: zoomPlugin } = await import('chartjs-plugin-zoom');
      ChartJs.register(zoomPlugin);
      return { ChartJs, zoom: true };
    } catch (error) {
      console.warn('Zoom plugin not available:', error);
      return { ChartJs, zoom: false };
    }
  })().catch((error: unknown) => {
    chartLibrary = null;
    throw error;
  });
  return chartLibrary;
}

interface ThemeColors {
  readonly text: string;
  readonly grid: string;
}

function themeColors(): ThemeColors {
  const style = getComputedStyle(document.documentElement);
  return {
    text: style.getPropertyValue('--chart-text-color').trim() || '#6b7280',
    grid: style.getPropertyValue('--chart-grid-color').trim() || '#e5e7eb',
  };
}

function chartConfig(
  points: TravelPoint[],
  labels: TravelChartLabels,
  colors: ThemeColors
): ChartConfiguration<'line', TravelPoint[]> {
  return {
    type: 'line',
    data: {
      datasets: [
        {
          label: labels.dataset,
          data: points,
          borderColor: '#ffffff',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#22c55e',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2,
          tension: 0.1,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: 0,
          max: TRACKING_WINDOW_MS,
          title: { display: true, text: labels.time, color: colors.text },
          ticks: { color: colors.text },
          grid: { color: colors.grid },
        },
        y: {
          min: 0,
          max: TRAVEL_MM,
          reverse: true,
          title: { display: true, text: labels.distance, color: colors.text },
          ticks: {
            color: colors.text,
            stepSize: 0.2,
            callback: value => Number(value).toFixed(3) + labels.unit(),
          },
          grid: { color: colors.grid },
        },
      },
      plugins: {
        legend: { display: false },
        zoom: {
          pan: { enabled: true, mode: 'x' },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
          limits: { x: { minRange: TRACKING_WINDOW_MS }, y: { min: 0, max: TRAVEL_MM } },
        },
      },
      interaction: { intersect: false, mode: 'index' },
    },
  };
}

export class TravelChart {
  /** Settles once the chart exists, or once it is known that it never will. */
  readonly ready: Promise<void>;
  #chart: TravelChartInstance | null = null;
  #zoom = false;
  #points: TravelPoint[] = [];
  #frame: number | null = null;
  #destroyed = false;
  readonly #themeObserver: MutationObserver;
  readonly #themeTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(canvas: HTMLCanvasElement, labels: TravelChartLabels) {
    this.ready = this.#create(canvas, labels);
    // Dark mode toggles the root class: re-read the colours once the new theme applies.
    this.#themeObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') continue;
        const timer = setTimeout(() => {
          this.#themeTimers.delete(timer);
          this.#applyThemeColors();
        }, THEME_COLOR_DELAY_MS);
        this.#themeTimers.add(timer);
      }
    });
    this.#themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  async #create(canvas: HTMLCanvasElement, labels: TravelChartLabels): Promise<void> {
    let library: ChartLibrary;
    try {
      library = await loadChartLibrary();
    } catch (error) {
      console.error('[debug] could not load the chart', error);
      return;
    }
    if (this.#destroyed) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    this.#zoom = library.zoom;
    this.#chart = new library.ChartJs(context, chartConfig(this.#points, labels, themeColors()));
    if (this.#points.length > 0) this.#follow();
  }

  /** Adds a sample; the chart redraws on the next animation frame. */
  append(point: TravelPoint): void {
    if (this.#destroyed) return;
    this.#points.push(point);
    if (this.#chart === null || this.#frame !== null) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = null;
      this.#follow();
    });
  }

  /** Starts a new recording: no samples, the initial time window. */
  restart(): void {
    this.#points = [];
    this.#cancelFrame();
    this.#follow();
  }

  /** Removes every sample and resets the zoom (the "Clear" button). */
  clear(): void {
    this.#points = [];
    this.#cancelFrame();
    const chart = this.#chart;
    if (!chart) return;
    this.#dataset(chart).data = this.#points;
    if (this.#zoom) chart.resetZoom();
    chart.update();
  }

  resetZoom(): void {
    const chart = this.#chart;
    if (!chart) return;
    if (this.#zoom) chart.resetZoom();
    const y = this.#scale(chart, 'y');
    y.min = 0;
    y.max = TRAVEL_MM;
    chart.update();
  }

  /** Shows only the last 0.1 mm of travel ("Zoom 0.1mm"). */
  zoomToBottom(): void {
    const chart = this.#chart;
    if (!chart) return;
    const y = this.#scale(chart, 'y');
    y.min = BOTTOM_ZOOM_MIN_MM;
    y.max = TRAVEL_MM;
    chart.update();
  }

  destroy(): void {
    this.#destroyed = true;
    this.#cancelFrame();
    this.#themeObserver.disconnect();
    for (const timer of this.#themeTimers) clearTimeout(timer);
    this.#themeTimers.clear();
    this.#chart?.destroy();
    this.#chart = null;
  }

  /** Shows the current samples, the x axis following the last `TRACKING_WINDOW_MS`. */
  #follow(): void {
    const chart = this.#chart;
    if (!chart) return;
    const lastX = this.#points[this.#points.length - 1]?.x ?? 0;
    const x = this.#scale(chart, 'x');
    if (lastX > TRACKING_WINDOW_MS) {
      x.min = Math.max(0, lastX - TRACKING_WINDOW_MS);
      x.max = lastX;
    } else {
      x.min = 0;
      x.max = TRACKING_WINDOW_MS;
    }
    this.#dataset(chart).data = this.#points;
    chart.update('none');
  }

  #applyThemeColors(): void {
    const chart = this.#chart;
    if (!chart) return;
    const colors = themeColors();
    for (const id of ['x', 'y'] as const) {
      const scale = this.#scale(chart, id);
      if (scale.title) scale.title.color = colors.text;
      if (scale.ticks) scale.ticks.color = colors.text;
      if (scale.grid) scale.grid.color = colors.grid;
    }
    chart.update('none');
  }

  #cancelFrame(): void {
    if (this.#frame !== null) cancelAnimationFrame(this.#frame);
    this.#frame = null;
  }

  #dataset(chart: TravelChartInstance) {
    const dataset = chart.data.datasets[0];
    if (!dataset) throw new Error('The travel chart has no dataset');
    return dataset;
  }

  #scale(chart: TravelChartInstance, id: 'x' | 'y') {
    const scale = chart.options.scales?.[id];
    if (!scale) throw new Error(`The travel chart has no ${id} scale`);
    return scale;
  }
}
