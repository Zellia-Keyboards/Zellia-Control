import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_KEY_SELECTION, keySelection, keySelectionStore } from '../keyboard';
import { connectVirtualKeyboard, type ConnectedKeyboard } from '../../testing/app-keyboard';
import { installChartEnvironment } from './testing/chart-environment';
import { DebugPage } from './index';

let keyboard: ConnectedKeyboard;
let uninstallChart: () => void;

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/debug/']}>
      <DebugPage />
    </MemoryRouter>
  );
}

beforeEach(async () => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  uninstallChart = installChartEnvironment();
  keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false, debugIntervalMs: 5 });
});

afterEach(() => {
  keyboard.dispose();
  keySelectionStore.setState(INITIAL_KEY_SELECTION, true);
  uninstallChart();
});

describe('DebugPage', () => {
  it('shows the header and opens on Key Tracking', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Debug Tools' })).toBeInTheDocument();
    expect(screen.getByText('Test and monitor your keyboard')).toBeInTheDocument();

    const tracking = screen.getByRole('tab', { name: 'Key Tracking' });
    expect(tracking).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Key Test' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('About This Tool');
  });

  it('switches between Key Tracking and Key Test', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Key Test' }));
    expect(screen.getByRole('tab', { name: 'Key Test' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('About Key Test');
    expect(screen.queryByText('About This Tool')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Key Tracking' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('About This Tool');
  });

  it('marks only the active tab with the indicator', async () => {
    const user = userEvent.setup();
    renderPage();
    const [tracking, keyTest] = screen.getAllByRole('tab');
    expect(tracking?.children).toHaveLength(3);
    expect(keyTest?.children).toHaveLength(2);

    await user.click(screen.getByRole('tab', { name: 'Key Test' }));
    expect(tracking?.children).toHaveLength(2);
    expect(keyTest?.children).toHaveLength(3);
  });

  it('stops tracking the key when switching to Key Test', async () => {
    const user = userEvent.setup();
    renderPage();
    act(() => {
      keySelection.setSelected([6]);
    });
    await vi.waitFor(() => {
      expect(keyboard.vk.state.config[0]).toBe(true);
    });

    await user.click(screen.getByRole('tab', { name: 'Key Test' }));

    await vi.waitFor(() => {
      expect(keyboard.vk.state.config[0]).toBe(false);
    });
  });

  it('stops tracking when the page is left', async () => {
    const { unmount } = renderPage();
    act(() => {
      keySelection.setSelected([6]);
    });
    await vi.waitFor(() => {
      expect(keyboard.vk.state.config[0]).toBe(true);
    });

    unmount();

    await vi.waitFor(() => {
      expect(keyboard.vk.state.config[0]).toBe(false);
    });
  });
});
