import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmationModal } from './ConfirmationModal';

afterEach(() => {
  cleanup();
});

function renderDuplicate(overrides: Partial<Parameters<typeof ConfirmationModal>[0]> = {}) {
  const props = {
    open: true,
    title: 'Duplicate Profile',
    message: (
      <>
        Create a copy of <strong className="text-white">Gaming</strong> in the next available slot?
      </>
    ),
    confirmText: 'Duplicate',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<ConfirmationModal {...props} />);
  return props;
}

describe('ConfirmationModal', () => {
  it('is a dialog named by its title and described by its message', () => {
    renderDuplicate();
    const dialog = screen.getByRole('dialog', { name: 'Duplicate Profile' });
    expect(dialog).toHaveAccessibleDescription(
      'Create a copy of Gaming in the next available slot?'
    );
  });

  it('renders the Svelte content markup, with rich messages as nodes', () => {
    renderDuplicate();
    const title = screen.getByRole('heading', { name: 'Duplicate Profile' });
    expect(title).toHaveAttribute('class', 'text-xl font-bold text-white mb-3');
    const message = title.nextElementSibling;
    expect(message).toHaveAttribute('class', 'text-sm text-gray-400 mb-6');
    expect(message?.innerHTML).toBe(
      'Create a copy of <strong class="text-white">Gaming</strong> in the next available slot?'
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute(
      'class',
      'flex-1 px-4 py-2.5 rounded-lg border font-medium transition-colors glassmorphism-button border-gray-600 text-gray-300'
    );
  });

  it('never interprets message text as HTML', () => {
    renderDuplicate({ message: '<img src=x onerror=alert(1)>' });
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it.each([
    [
      'blue',
      'glassmorphism-button bg-blue-600/80 border border-blue-500/50 text-white hover:bg-blue-600',
    ],
    [
      'orange',
      'glassmorphism-button bg-orange-600/80 border border-orange-500/50 text-white hover:bg-orange-600',
    ],
    [
      'red',
      'glassmorphism-button bg-red-600/80 border border-red-500/50 text-white hover:bg-red-600',
    ],
  ] as const)('styles the %s confirm button', (confirmColor, classes) => {
    renderDuplicate({ confirmColor });
    expect(screen.getByRole('button', { name: 'Duplicate' })).toHaveAttribute(
      'class',
      `flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${classes}`
    );
  });

  it('defaults to the blue confirm button', () => {
    renderDuplicate();
    expect(screen.getByRole('button', { name: 'Duplicate' })).toHaveClass('bg-blue-600/80');
  });

  it('confirms and cancels', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderDuplicate();
    await user.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('labels Cancel with cancelText when given', () => {
    render(
      <ConfirmationModal
        open
        title="恢复出厂设置"
        message="确定吗？"
        confirmText="恢复出厂设置"
        cancelText="取消"
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />
    );
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });

  it('cancels on Escape', async () => {
    const user = userEvent.setup();
    const { onCancel, onConfirm } = renderDuplicate();
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders nothing while closed', () => {
    renderDuplicate({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
