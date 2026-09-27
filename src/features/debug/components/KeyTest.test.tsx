import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KeyTest } from './KeyTest';

/** Dispatches a key event on the window like a physical key; returns whether it was cancelled. */
function key(type: 'keydown' | 'keyup', code: string, keyValue = code): boolean {
  const event = new KeyboardEvent(type, { code, key: keyValue, bubbles: true, cancelable: true });
  fireEvent(window, event);
  return event.defaultPrevented;
}

function rows(): string[][] {
  const header = screen.getByText('Delta (ms)').parentElement;
  const body = header?.nextElementSibling;
  if (!(body instanceof HTMLElement)) throw new Error('missing table body');
  return Array.from(body.children, row =>
    Array.from(row.children, cell => cell.textContent.trim())
  );
}

// Page renders and role queries are slow in jsdom on a busy machine.
describe('KeyTest', { timeout: 20_000 }, () => {
  it('starts idle with the instructions and an empty table', () => {
    render(<KeyTest />);
    expect(screen.getByRole('heading', { name: 'About Key Test' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Listening' })).toBeInTheDocument();
    expect(screen.getByText('Click "Start Listening" to begin')).toBeInTheDocument();
    expect(screen.getByText('Events will appear here')).toBeInTheDocument();
    expect(screen.queryByText('Listening Active')).not.toBeInTheDocument();
  });

  it('ignores keys and leaves them alone until listening starts', () => {
    render(<KeyTest />);
    expect(key('keydown', 'KeyA')).toBe(false);
    expect(screen.getByText('Click "Start Listening" to begin')).toBeInTheDocument();
  });

  it('records presses and releases while listening, with times and deltas', async () => {
    const now = vi.spyOn(performance, 'now');
    const user = userEvent.setup();
    render(<KeyTest />);
    await user.click(screen.getByRole('button', { name: 'Start Listening' }));

    expect(screen.getByText('Listening Active')).toBeInTheDocument();
    expect(screen.getByText('Press any key to start recording...')).toBeInTheDocument();

    now.mockReturnValue(500);
    expect(key('keydown', 'KeyA', 'a')).toBe(true);
    now.mockReturnValue(520);
    expect(key('keydown', 'KeyA', 'a')).toBe(true); // auto-repeat: not logged
    now.mockReturnValue(1623);
    expect(key('keyup', 'KeyA', 'a')).toBe(true);

    expect(rows()).toEqual([
      ['0.000s', 'Press', 'KeyA', '0'],
      ['1.123s', 'Release', 'KeyA', '1123'],
    ]);
  });

  it('styles presses green and releases orange', async () => {
    const user = userEvent.setup();
    render(<KeyTest />);
    await user.click(screen.getByRole('button', { name: 'Start Listening' }));
    key('keydown', 'Space', ' ');
    key('keyup', 'Space', ' ');

    const [press, release] = screen.getAllByText(/^(Press|Release)$/);
    expect(press).toHaveClass('text-green-600 dark:text-green-400 font-semibold');
    expect(release).toHaveClass('text-orange-600 dark:text-orange-400 font-semibold');
    expect(press?.closest('.grid')).toHaveClass('bg-green-50/30 dark:bg-green-900/10');
  });

  it('stops listening but keeps the log, and clears it on demand', async () => {
    const user = userEvent.setup();
    render(<KeyTest />);
    await user.click(screen.getByRole('button', { name: 'Start Listening' }));
    key('keydown', 'KeyB');
    await user.click(screen.getByRole('button', { name: 'Stop Listening' }));

    expect(key('keydown', 'KeyC')).toBe(false);
    expect(rows().map(row => row[2])).toEqual(['KeyB']);
    expect(screen.queryByText('Listening Active')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear Events' }));
    expect(screen.getByText('Click "Start Listening" to begin')).toBeInTheDocument();
  });

  it('starts a fresh log each time listening starts', async () => {
    const user = userEvent.setup();
    render(<KeyTest />);
    await user.click(screen.getByRole('button', { name: 'Start Listening' }));
    key('keydown', 'KeyD');
    key('keyup', 'KeyD');
    await user.click(screen.getByRole('button', { name: 'Stop Listening' }));
    await user.click(screen.getByRole('button', { name: 'Start Listening' }));

    expect(screen.getByText('Press any key to start recording...')).toBeInTheDocument();
  });

  it('swaps Start and Stop for new buttons, which do not take over the focus (as in Svelte)', async () => {
    const user = userEvent.setup();
    render(<KeyTest />);
    const start = screen.getByRole('button', { name: 'Start Listening' });
    await user.click(start);

    const stop = screen.getByRole('button', { name: 'Stop Listening' });
    expect(stop).not.toBe(start);
    expect(stop).not.toHaveFocus();

    await user.click(stop);
    const restart = screen.getByRole('button', { name: 'Start Listening' });
    expect(restart).not.toBe(stop);
    expect(restart).not.toHaveFocus();
  });

  it('stops listening to the window when unmounted', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<KeyTest />);
    await user.click(screen.getByRole('button', { name: 'Start Listening' }));
    unmount();
    expect(key('keydown', 'KeyE')).toBe(false);
  });

  it('labels the table columns', () => {
    render(<KeyTest />);
    const header = screen.getByText('Time').parentElement;
    expect(header).not.toBeNull();
    expect(
      within(header ?? document.body)
        .getAllByText(/./)
        .map(cell => cell.textContent)
    ).toEqual(['Time', 'Type', 'Key', 'Delta (ms)']);
  });
});
