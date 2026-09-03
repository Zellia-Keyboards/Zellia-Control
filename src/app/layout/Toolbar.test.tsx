import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, onTestFinished } from 'vitest';
import { keySelectionStore } from '../../features/keyboard';
import { LAYOUT_OPTIONS_STORAGE_KEY } from '../../features/keyboard/model';
import { connectVirtualKeyboard } from '../../testing/app-keyboard';
import { renderApp, resetShellState } from '../testing/render-app';

afterEach(resetShellState);

async function connect() {
  const keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false });
  onTestFinished(keyboard.dispose);
  return keyboard;
}

function layerButtons(): HTMLElement[] {
  return [1, 2, 3, 4].map(layer => screen.getByTitle(`Layer ${layer}`));
}

/** Ids of the keys on the keyboard, in layout order. */
function visibleKeyIds(): number[] {
  return [...document.querySelectorAll<HTMLElement>('.keycap')].map(cap =>
    Number(cap.dataset.keyId)
  );
}

describe('LayerSelector', () => {
  // Renders the connected shell four times: allow for slow machines.
  it(
    'is shown on Performance, Remap and Dynamic Keys (PL-024), not on Lighting',
    {
      timeout: 15_000,
    },
    async () => {
      await connect();
      for (const path of ['performance', 'remap', 'dynamic']) {
        const { unmount } = renderApp(`/${path}/`);
        await screen.findByTestId('page');
        expect(layerButtons().map(button => button.textContent)).toEqual(['1', '2', '3', '4']);
        expect(screen.getByText('Layer:')).toBeInTheDocument();
        unmount();
      }

      renderApp('/lighting/');
      await screen.findByTestId('page');
      expect(screen.queryByTitle('Layer 1')).not.toBeInTheDocument();
      expect(screen.getByTitle('Configure keyboard layout')).toBeInTheDocument();
    }
  );

  it('selects the layer the pages edit', async () => {
    await connect();
    const user = userEvent.setup();
    renderApp('/remap/');
    await screen.findByTestId('page');
    expect(screen.getByTitle('Layer 1')).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByTitle('Layer 3'));

    expect(keySelectionStore.getState().layer).toBe(3);
    expect(screen.getByTitle('Layer 3')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTitle('Layer 1')).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('LayoutConfigDropdown', () => {
  it('opens and closes on any click outside the menu', async () => {
    await connect();
    const user = userEvent.setup();
    renderApp('/remap/');
    const toggle = await screen.findByTitle('Configure keyboard layout');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const heading = screen.getByRole('heading', { name: 'Layout Configuration' });

    await user.click(heading);
    expect(screen.getByText('Customize your keyboard layout')).toBeInTheDocument();

    await user.click(screen.getByText('ZelliaKB'));
    await waitFor(() => {
      expect(screen.queryByText('Layout Configuration')).not.toBeInTheDocument();
    });

    await user.click(toggle);
    await user.click(toggle);
    await waitFor(() => {
      expect(screen.queryByText('Layout Configuration')).not.toBeInTheDocument();
    });
  });

  it('switches the keyboard between layout variants and persists the choice', async () => {
    await connect();
    const user = userEvent.setup();
    renderApp('/remap/');
    await user.click(await screen.findByTitle('Configure keyboard layout'));
    const menu = within(
      screen.getByRole('heading', { name: 'Layout Configuration' }).parentElement?.parentElement ??
        document.body
    );
    expect(visibleKeyIds()).toContain(13);
    expect(visibleKeyIds()).not.toContain(14);

    await user.click(menu.getByLabelText('Split backspace'));

    expect(visibleKeyIds()).not.toContain(13);
    expect(visibleKeyIds()).toEqual(expect.arrayContaining([14, 15]));
    expect(keySelectionStore.getState().totalKeys).toBe(Math.max(...visibleKeyIds()) + 1);

    await user.click(menu.getByLabelText('7u (Tsangan)'));
    await user.click(menu.getByLabelText(/Split spacebar/));
    await user.click(menu.getByLabelText('Right shift split'));

    expect(menu.getByLabelText('7u (Tsangan)')).toBeChecked();
    expect(menu.getByText('(3u+1u+3u)')).toBeInTheDocument();
    expect(menu.queryByText('(2.25u + 1.25u + 2.75u)')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(LAYOUT_OPTIONS_STORAGE_KEY) ?? 'null')).toEqual({
      bottomRowConfig: '7u',
      splitSpacebar: true,
      rightShiftSplit: true,
      leftShiftSplit: false,
      splitBackspace: true,
    });

    await user.click(menu.getByLabelText('6.25u (Standard)'));
    expect(menu.getByText('(2.25u + 1.25u + 2.75u)')).toBeInTheDocument();
    // The split spacebar option carries over to the other bottom row.
    expect(menu.getByLabelText(/Split spacebar/)).toBeChecked();
  });

  it('keeps its menu state local to the toolbar', async () => {
    await connect();
    const user = userEvent.setup();
    const { router } = renderApp('/remap/');
    await user.click(await screen.findByTitle('Configure keyboard layout'));

    await act(async () => {
      await router.navigate('/settings/');
    });
    await act(async () => {
      await router.navigate('/remap/');
    });

    expect(await screen.findByTitle('Configure keyboard layout')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
});
