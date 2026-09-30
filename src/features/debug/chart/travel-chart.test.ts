import { Chart } from 'chart.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installChartEnvironment } from '../testing/chart-environment';
import { TRACKING_WINDOW_MS, TravelChart, type TravelChartLabels } from './travel-chart';

const LABELS: TravelChartLabels = {
  dataset: 'Key Distance',
  time: 'Time (ms)',
  distance: 'Distance (mm)',
  unit: () => 'mm',
};

let uninstall: () => void;
let canvas: HTMLCanvasElement;
let travel: TravelChart | null = null;
let themeStyle: HTMLStyleElement;

function chartOf(element: HTMLCanvasElement): Chart {
  const chart = Chart.getChart(element);
  if (!chart) throw new Error('no chart on the canvas');
  return chart;
}

async function createChart(): Promise<{ travel: TravelChart; chart: Chart }> {
  travel = new TravelChart(canvas, LABELS);
  await travel.ready;
  return { travel, chart: chartOf(canvas) };
}

function points(chart: Chart): unknown[] {
  return chart.data.datasets[0]?.data ?? [];
}

function scale(chart: Chart, id: 'x' | 'y') {
  const options = chart.options.scales?.[id];
  if (!options) throw new Error(`no ${id} scale`);
  return options;
}

function nextFrame(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

beforeEach(() => {
  uninstall = installChartEnvironment();
  const container = document.createElement('div');
  canvas = document.createElement('canvas');
  container.append(canvas);
  document.body.append(container);
  themeStyle = document.createElement('style');
  themeStyle.textContent =
    ':root { --chart-text-color: #9ca3af; --chart-grid-color: #797979; } .dark { --chart-grid-color: #bfbfbf; }';
  document.head.append(themeStyle);
});

afterEach(() => {
  travel?.destroy();
  travel = null;
  document.body.replaceChildren();
  themeStyle.remove();
  document.documentElement.classList.remove('dark');
  uninstall();
});

describe('TravelChart', () => {
  it('draws a filled travel line on a reversed 0–4 mm axis over a 500 ms window', async () => {
    const { chart } = await createChart();

    expect(chart.config).toMatchObject({ type: 'line' });
    expect(chart.data.datasets[0]).toMatchObject({
      label: 'Key Distance',
      borderColor: '#ffffff',
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.1,
      fill: true,
    });
    expect(scale(chart, 'x')).toMatchObject({ type: 'linear', min: 0, max: TRACKING_WINDOW_MS });
    expect(scale(chart, 'y')).toMatchObject({ min: 0, max: 4, reverse: true });
    expect(scale(chart, 'x')).toMatchObject({ title: { display: true, text: 'Time (ms)' } });
    expect(scale(chart, 'y')).toMatchObject({ title: { display: true, text: 'Distance (mm)' } });
    expect(chart.options.plugins?.legend?.display).toBe(false);
    expect(chart.options.plugins?.zoom).toMatchObject({
      pan: { enabled: true, mode: 'x' },
      zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
      limits: { x: { minRange: 500 }, y: { min: 0, max: 4 } },
    });
    expect(typeof chart.resetZoom).toBe('function');
  });

  it('labels the distance ticks in millimetres with three decimals', async () => {
    const { chart } = await createChart();
    const y = chart.scales['y'];
    const callback = scale(chart, 'y').ticks?.callback;
    if (!y || !callback) throw new Error('no y tick callback');
    expect(callback.call(y, 0.2, 0, [])).toBe('0.200mm');
  });

  it('takes its axis colours from the theme and follows dark mode changes', async () => {
    const { chart } = await createChart();
    expect(scale(chart, 'x')).toMatchObject({ ticks: { color: '#9ca3af' } });
    expect(scale(chart, 'y')).toMatchObject({ grid: { color: '#797979' } });

    document.documentElement.classList.add('dark');
    await vi.waitFor(() => {
      expect(scale(chart, 'y')).toMatchObject({ grid: { color: '#bfbfbf' } });
    });
    expect(scale(chart, 'x')).toMatchObject({
      grid: { color: '#bfbfbf' },
      title: { color: '#9ca3af' },
      ticks: { color: '#9ca3af' },
    });
  });

  it('appends points and keeps the last 500 ms in view', async () => {
    const { travel, chart } = await createChart();

    travel.append({ x: 100, y: 1 });
    await nextFrame();
    expect(points(chart)).toEqual([{ x: 100, y: 1 }]);
    expect(scale(chart, 'x')).toMatchObject({ min: 0, max: 500 });

    travel.append({ x: 400, y: 2 });
    travel.append({ x: 750, y: 3 });
    await nextFrame();
    expect(points(chart)).toHaveLength(3);
    expect(scale(chart, 'x')).toMatchObject({ min: 250, max: 750 });
  });

  it('keeps points that arrive before Chart.js has loaded', async () => {
    travel = new TravelChart(canvas, LABELS);
    travel.append({ x: 10, y: 0.5 });
    await travel.ready;
    expect(points(chartOf(canvas))).toEqual([{ x: 10, y: 0.5 }]);
  });

  it('restarts with an empty series and the initial window', async () => {
    const { travel, chart } = await createChart();
    travel.append({ x: 900, y: 3 });
    await nextFrame();

    travel.restart();

    expect(points(chart)).toEqual([]);
    expect(scale(chart, 'x')).toMatchObject({ min: 0, max: 500 });
  });

  it('clears the series and resets the zoom', async () => {
    const { travel, chart } = await createChart();
    const resetZoom = vi.spyOn(chart, 'resetZoom');
    travel.append({ x: 900, y: 3 });

    travel.clear();

    expect(points(chart)).toEqual([]);
    expect(resetZoom).toHaveBeenCalledOnce();
  });

  it('zooms the distance axis to the last 0.1 mm and back', async () => {
    const { travel, chart } = await createChart();

    travel.zoomToBottom();
    expect(scale(chart, 'y')).toMatchObject({ min: 3.9, max: 4 });

    const resetZoom = vi.spyOn(chart, 'resetZoom');
    travel.resetZoom();
    expect(resetZoom).toHaveBeenCalledOnce();
    expect(scale(chart, 'y')).toMatchObject({ min: 0, max: 4 });
  });

  it('removes the chart when destroyed, also while Chart.js is still loading', async () => {
    const { travel } = await createChart();
    travel.destroy();
    expect(Chart.getChart(canvas)).toBeUndefined();
    travel.append({ x: 1, y: 1 });

    const other = document.createElement('canvas');
    document.body.append(other);
    const early = new TravelChart(other, LABELS);
    early.destroy();
    await early.ready;
    expect(Chart.getChart(other)).toBeUndefined();
  });

  it('does nothing without a 2D context', async () => {
    uninstall();
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => null);
    travel = new TravelChart(canvas, LABELS);
    await travel.ready;
    travel.append({ x: 1, y: 1 });
    travel.clear();
    travel.resetZoom();
    expect(Chart.getChart(canvas)).toBeUndefined();
    getContext.mockRestore();
    uninstall = installChartEnvironment();
  });
});
