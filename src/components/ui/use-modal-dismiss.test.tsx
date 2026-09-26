import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useModalDismiss } from './use-modal-dismiss';

function Dialog({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  useModalDismiss(open, () => {
    onClose();
    setOpen(false);
  });
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        open
      </button>
      {open && (
        <div role="dialog">
          <button type="button">inside</button>
        </div>
      )}
    </>
  );
}

describe('useModalDismiss', () => {
  it('closes on Escape only while open and returns focus to the opener', () => {
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'open' });

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    opener.focus();
    fireEvent.click(opener);
    const inside = screen.getByRole('button', { name: 'inside' });
    inside.focus();
    expect(inside).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });
});
