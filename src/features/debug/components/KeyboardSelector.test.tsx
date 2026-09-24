import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KeyboardSelector } from './KeyboardSelector';

describe('KeyboardSelector', () => {
  it('renders nothing while closed and ignores Escape', () => {
    const onClose = vi.fn();
    render(<KeyboardSelector open={false} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('is a modal dialog named by its title', () => {
    render(<KeyboardSelector open onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Select Key to Track' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveClass('fixed inset-0 z-50 flex items-center justify-center bg-black/70');
  });

  it('asks to connect a keyboard when there is no layout', () => {
    render(<KeyboardSelector open onClose={vi.fn()} />);
    expect(screen.getByText('No keyboard layout available')).toBeInTheDocument();
    expect(screen.getByText('Please connect a keyboard first')).toBeInTheDocument();
  });

  it('closes from the backdrop but not from clicks inside the panel', () => {
    const onClose = vi.fn();
    render(<KeyboardSelector open onClose={onClose} />);
    fireEvent.click(screen.getByText('Select Key to Track'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
