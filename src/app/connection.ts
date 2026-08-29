import type { ConnectionStatus } from '../features/device';

/**
 * A connection attempt is running: the device picker is open, or the keyboard is being opened
 * or loaded. The shell shows its loading overlay then, where the Svelte app did while its status
 * was `connecting` (from "Get Started" on).
 */
export function isConnecting(status: ConnectionStatus): boolean {
  return status === 'selecting' || status === 'connecting' || status === 'loading';
}

/** A keyboard session ended: it was connecting or connected, and is now gone or failed. */
export function sessionEnded(previous: ConnectionStatus, next: ConnectionStatus): boolean {
  return (
    (previous === 'loading' || previous === 'ready') &&
    (next === 'disconnected' || next === 'error')
  );
}
