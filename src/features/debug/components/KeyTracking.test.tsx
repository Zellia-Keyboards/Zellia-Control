import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chart } from 'chart.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { subscribeDebugSamples, type DebugSample } from '../../device';
import { keySelection, keySelectionStore, INITIAL_KEY_SELECTION } from '../../keyboard';
import { setLanguage } from '../../../lib/i18n';
import { connectVirtualKeyboard, type ConnectedKeyboard } from '../../../testing/app-keyboard';
import { installChartEnvironment } from '../testing/chart-environment';
import { KeyTracking } from './KeyTracking';

interface Point {
  x: number;
  y: number;
}

let keyboard: ConnectedKeyboard;
let uninstallChart: () => void;

function canvas(): HTMLCanvasElement {
  const element = screen.getByRole('img', { name: 'Key Distance' });
  if (!(element instanceof HTMLCanvasElement)) throw new Error('the chart is not a canvas');
  return element;
}

async function chart(): Promise<Chart> {
  return vi.waitFor(() => {
    const instance = Chart.getChart(canvas());
    if (!instance) throw new Error('chart not created yet');
    return instance;
  });
}

function points(instance: Chart): Point[] {
  const data: unknown[] = instance.data.datasets[0]?.data ?? [];
  return data.filter(
    (point): point is Point => typeof point === 'object' && point !== null && 'y' in point
  );
}

/**
 * Waits for the first samples of a recording started at `startedAt` (ms, `Date.now()`) and
 * checks that its time starts again at 0: polled every millisecond, the first point is no later
 * than the time since the start. A recording timed from an earlier start would be later.
 */
async function newRecording(instance: Chart, startedAt: number): Promise<void> {
  await vi.waitFor(
    () => {
      expect(points(instance).length).toBeGreaterThan(0);
    },
    { interval: 1 }
  );
  expect(points(instance)[0]?.x).toBeLessThanOrEqual(Date.now() - startedAt);
}

/** Whether the virtual keyboard streams debug packets (its debug config bit). */
function streaming(): boolean {
  return keyboard.vk.state.config[0] === true;
}

function debugRequests(): (readonly number[])[] {
  return keyboard.vk.sentPackets.flatMap(packet => (packet.op === 'debug' ? [packet.keyIds] : []));
}

function select(...keys: number[]): void {
  act(() => {
    keySelection.setSelected(keys);
  });
}

beforeEach(async () => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  setLanguage('en');
  uninstallChart = installChartEnvironment();
  keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false, debugIntervalMs: 5 });
  keyboard.vk.clearHistory();
});

afterEach(() => {
  keyboard.dispose();
  keySelectionStore.setState(INITIAL_KEY_SELECTION, true);
  uninstallChart();
  localStorage.clear();
});

// Page renders and role queries are slow in jsdom on a busy machine.
describe('KeyTracking', { timeout: 20_000 }, () => {
  it('waits for a key: nothing recorded, Start disabled', async () => {
    render(<KeyTracking />);
    await chart();

    expect(screen.getByRole('button', { name: 'Select Key...' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    expect(screen.queryByText('Recording')).not.toBeInTheDocument();
    expect(streaming()).toBe(false);
  });

  it('tracks the selected key: streams it from the keyboard into the chart in mm', async () => {
    const samples: DebugSample[] = [];
    const stop = subscribeDebugSamples(sample => {
      samples.push(sample);
    });
    render(<KeyTracking />);
    const instance = await chart();

    select(5);

    expect(screen.getByText('Recording').nextElementSibling).toHaveTextContent('Key 5');
    expect(screen.getByRole('button', { name: 'Key 5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(points(instance).length).toBeGreaterThanOrEqual(5);
    });
    // Read both series in the same task, so no sample arrives in between.
    const ys = points(instance).map(point => point.y);
    const expected = samples.map(sample => sample.value * 4);
    stop();
    expect(streaming()).toBe(true);
    expect(debugRequests()[0]).toEqual([5]);

    expect(ys).toEqual(expected);
    expect(samples.every(sample => sample.keyId === 5)).toBe(true);
    const xs = points(instance).map(point => point.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it('switches to a newly selected key and starts a new recording', async () => {
    render(<KeyTracking />);
    const instance = await chart();
    select(5);
    // Long enough for a recording timed from key 5's start to stand out after the switch.
    await vi.waitFor(() => {
      expect(points(instance).at(-1)?.x).toBeGreaterThan(100);
    });
    const switchedAt = Date.now();

    select(7);

    // Key 5's recording is gone at once.
    expect(points(instance)).toEqual([]);
    expect(screen.getByText('Recording').nextElementSibling).toHaveTextContent('Key 7');
    await vi.waitFor(() => {
      expect(debugRequests().at(-1)).toEqual([7]);
    });
    // Key 7's samples arrive, timed from the switch.
    await newRecording(instance, switchedAt);
    expect(streaming()).toBe(true);
  });

  it('stops when the selection is not exactly one key', async () => {
    render(<KeyTracking />);
    await chart();
    select(5);
    await vi.waitFor(() => {
      expect(streaming()).toBe(true);
    });

    select(5, 6);

    await vi.waitFor(() => {
      expect(streaming()).toBe(false);
    });
    expect(screen.queryByText('Recording')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Select Key...' })).toBeInTheDocument();
  });

  it('stops and restarts on Stop and Start, keeping the key', async () => {
    const user = userEvent.setup();
    render(<KeyTracking />);
    const instance = await chart();
    select(3);
    await vi.waitFor(() => {
      expect(points(instance).length).toBeGreaterThan(0);
    });

    await user.click(screen.getByRole('button', { name: 'Stop' }));

    await vi.waitFor(() => {
      expect(streaming()).toBe(false);
    });
    expect(keySelectionStore.getState().selected).toEqual([3]);
    expect(screen.queryByText('Recording')).not.toBeInTheDocument();
    const recorded = points(instance).length;
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(points(instance)).toHaveLength(recorded);
    const startedAt = Date.now();

    await user.click(screen.getByRole('button', { name: 'Start' }));

    // The stopped recording is gone at once; a new one starts.
    expect(screen.getByText('Recording')).toBeInTheDocument();
    expect(points(instance)).toEqual([]);
    await newRecording(instance, startedAt);
    expect(streaming()).toBe(true);
  });

  it('swaps Stop and Start for new buttons, which do not take over the focus (as in Svelte)', async () => {
    const user = userEvent.setup();
    render(<KeyTracking />);
    await chart();
    select(3);
    const stop = screen.getByRole('button', { name: 'Stop' });

    await user.click(stop);
    const start = screen.getByRole('button', { name: 'Start' });
    expect(start).not.toBe(stop);
    expect(start).not.toHaveFocus();

    await user.click(start);
    const stopAgain = screen.getByRole('button', { name: 'Stop' });
    expect(stopAgain).not.toBe(start);
    expect(stopAgain).not.toHaveFocus();
  });

  it('clears the chart and the selection, which stops tracking', async () => {
    const user = userEvent.setup();
    render(<KeyTracking />);
    const instance = await chart();
    select(9);
    await vi.waitFor(() => {
      expect(points(instance).length).toBeGreaterThan(0);
    });

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(points(instance)).toEqual([]);
    expect(keySelectionStore.getState().selected).toEqual([]);
    await vi.waitFor(() => {
      expect(streaming()).toBe(false);
    });
    expect(screen.getByRole('button', { name: 'Select Key...' })).toBeInTheDocument();
  });

  it('zooms the distance axis to the last 0.1 mm and resets it', async () => {
    const user = userEvent.setup();
    render(<KeyTracking />);
    const instance = await chart();

    await user.click(screen.getByRole('button', { name: 'Zoom 0.1mm' }));
    expect(instance.options.scales?.y).toMatchObject({ min: 3.9, max: 4 });

    await user.click(screen.getByRole('button', { name: 'Reset Zoom' }));
    expect(instance.options.scales?.y).toMatchObject({ min: 0, max: 4 });
  });

  it('stops tracking and removes the chart when unmounted', async () => {
    const { unmount } = render(<KeyTracking />);
    const element = canvas();
    await chart();
    select(2);
    await vi.waitFor(() => {
      expect(streaming()).toBe(true);
    });

    unmount();

    await vi.waitFor(() => {
      expect(streaming()).toBe(false);
    });
    expect(Chart.getChart(element)).toBeUndefined();
  });

  it('starts tracking at once when exactly one key is already selected', async () => {
    keySelection.setSelected([4]);
    render(<KeyTracking />);

    expect(screen.getByText('Recording')).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(streaming()).toBe(true);
    });
    expect(debugRequests()[0]).toEqual([4]);
  });

  it('opens the key selector and closes it again', async () => {
    const user = userEvent.setup();
    render(<KeyTracking />);
    const trigger = screen.getByRole('button', { name: 'Select Key...' });

    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Select Key to Track' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(trigger);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(trigger);
    await user.click(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
