import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorModal } from './ErrorModal';

afterEach(() => {
  cleanup();
});

describe('ErrorModal', () => {
  it('is a "Notice" dialog describing the error', () => {
    render(<ErrorModal open message="Invalid profile file" onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Notice' });
    expect(dialog).toHaveAccessibleDescription('Invalid profile file');
  });

  it('renders the Svelte content markup with the alert icon', () => {
    render(<ErrorModal open message="Invalid profile file" onClose={vi.fn()} />);
    const heading = screen.getByRole('heading', { name: 'Notice' });
    expect(heading).toHaveAttribute('class', 'text-xl font-bold text-white mb-2');
    expect(screen.getByText('Invalid profile file')).toHaveAttribute(
      'class',
      'text-sm text-gray-400'
    );
    const row = heading.parentElement?.parentElement;
    expect(row).toHaveAttribute('class', 'flex items-start gap-3 mb-4');
    const icon = row?.querySelector('svg');
    expect(icon).toHaveClass('lucide-circle-alert', 'w-6', 'h-6', 'text-yellow-500');
    expect(icon).toHaveClass('flex-shrink-0', 'mt-0.5');
    expect(screen.getByRole('button', { name: 'OK' })).toHaveAttribute(
      'class',
      'px-4 py-2.5 rounded-lg font-medium transition-colors glassmorphism-button bg-gray-700/80 border border-gray-600/50 text-white hover:bg-gray-700'
    );
  });

  it('closes with OK and Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ErrorModal open message="Profile limit reached" onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'OK' }));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders nothing while closed', () => {
    render(<ErrorModal open={false} message="x" onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
