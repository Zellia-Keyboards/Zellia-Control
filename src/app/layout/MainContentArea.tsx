import type { ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useDeviceStore } from '../../features/device';
import { isConnecting } from '../connection';
import { hidesToolbarAndKeyboard, isActivePage, shouldShowLayerSelector } from '../navigation';
import { ConnectionScreen } from './ConnectionScreen';
import { LoadingOverlay } from './LoadingOverlay';
import { NotConnectedFallback } from './NotConnectedFallback';
import { ShellKeyboard } from './ShellKeyboard';
import { Toolbar } from './Toolbar';

/**
 * The main column (port of `MainContentArea.svelte`): toolbar and global keyboard while
 * connected, then the page, the loading overlay, the connection screen (`/`) or the
 * not-connected fallback. The page is always the last child, so the Update page stays mounted
 * when the keyboard goes away (D3).
 */
export function MainContentArea() {
  const { pathname } = useLocation();
  const status = useDeviceStore(state => state.connection.status);

  const ready = status === 'ready';
  const showConfigurator = ready && !hidesToolbarAndKeyboard(pathname);
  // The Update page needs no keyboard: it also flashes a keyboard waiting in its bootloader.
  const updatePage = isActivePage(pathname, '/update');

  let content: ReactNode;
  if (ready || updatePage) content = <Outlet />;
  else if (isConnecting(status)) content = <LoadingOverlay />;
  else if (pathname === '/') content = <ConnectionScreen />;
  else content = <NotConnectedFallback />;

  return (
    <>
      {showConfigurator && <Toolbar showLayerSelector={shouldShowLayerSelector(pathname)} />}
      {showConfigurator && <ShellKeyboard pathname={pathname} />}
      {content}
    </>
  );
}
