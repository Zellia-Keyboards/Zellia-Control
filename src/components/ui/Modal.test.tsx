import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeAnimations } from '../../lib/transitions/testing';
import { Modal } from './Modal';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Modal', () => {
  it('renders nothing while closed', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()}>
        <p>Body</p>
      </Modal>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the Svelte markup: backdrop, dialog and content', () => {
    const { container } = render(
      <Modal open onClose={vi.fn()} maxWidth="lg" className="space-y-2">
        <p>Body</p>
      </Modal>
    );
    expect(container.innerHTML).toBe(
      '<div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">' +
        '<div class="border border-gray-700 rounded-xl shadow-2xl max-w-lg w-full p-6 glassmorphism-card space-y-2" role="dialog" aria-modal="true" tabindex="-1">' +
        '<p>Body</p></div></div>'
    );
  });

  it('defaults to a medium dialog', () => {
    render(
      <Modal open onClose={vi.fn()}>
        <p>Body</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toHaveAttribute(
      'class',
      'border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6 glassmorphism-card '
    );
  });

  it('can be labelled and described for assistive technology', () => {
    render(
      <Modal open onClose={vi.fn()} labelledBy="title" describedBy="message">
        <h3 id="title">Restore to Default</h3>
        <p id="message">This action cannot be undone.</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog', { name: 'Restore to Default' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('This action cannot be undone.');
  });

  it('closes on Escape while open', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open onClose={onClose}>
        <p>Body</p>
      </Modal>
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.keyboard('a');
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <Modal open={false} onClose={onClose}>
        <p>Body</p>
      </Modal>
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a backdrop click but not on clicks inside the dialog', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <button type="button">Inside</button>
      </Modal>
    );
    await user.click(screen.getByRole('button', { name: 'Inside' }));
    await user.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    const backdrop = screen.getByRole('dialog').parentElement;
    if (!backdrop) throw new Error('missing backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fades in and out over 150 ms, staying mounted until the fade ends', () => {
    vi.useFakeTimers();
    const animations = installFakeAnimations();
    try {
      const { rerender } = render(
        <Modal open={false} onClose={vi.fn()}>
          <p>Body</p>
        </Modal>
      );
      rerender(
        <Modal open onClose={vi.fn()}>
          <p>Body</p>
        </Modal>
      );
      const backdrop = screen.getByRole('dialog').parentElement;
      if (!backdrop) throw new Error('missing backdrop');
      act(() => {
        vi.advanceTimersByTime(0);
      });
      const fadeIn = animations.of(backdrop).at(-1);
      expect(fadeIn?.duration).toBe(150);
      expect(fadeIn?.keyframes[0]).toEqual({ opacity: '0' });
      act(() => {
        vi.advanceTimersByTime(150);
      });

      rerender(
        <Modal open={false} onClose={vi.fn()}>
          <p>Body</p>
        </Modal>
      );
      expect(backdrop).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(0);
      });
      expect(animations.of(backdrop).at(-1)?.keyframes.at(-1)).toEqual({ opacity: '0' });
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(backdrop).not.toBeInTheDocument();
    } finally {
      animations.uninstall();
    }
  });

  it('returns focus to the element that had it when the modal opened', async () => {
    const user = userEvent.setup();
    function Page() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
          >
            Delete profile
          </button>
          <Modal
            open={open}
            onClose={() => {
              setOpen(false);
            }}
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </button>
          </Modal>
        </>
      );
    }
    render(<Page />);
    const trigger = screen.getByRole('button', { name: 'Delete profile' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
