import type { ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useDeviceStore } from '../../features/device';
import { useFirmwareUpdateSession } from '../../features/firmware-update';
import { isConnecting } from '../connection';
import { hidesToolbarAndKeyboard, isActivePage, shouldShowLayerSelector } from '../navigation';
import { ConnectionScreen } from './ConnectionScreen';
import { LoadingOverlay } from './LoadingOverlay';
import { NotConnectedFallback } from './NotConnectedFallback';
import { ShellKeyboard } from './ShellKeyboard';
import { Toolbar } from './Toolbar';

/**
 * The main column (port of `MainContentArea.svelte`): toolbar and global keyboard while
 * connected, then the loading overlay, the connection screen (`/`), the page, or the
 * not-connected fallback. The page is always the last child, so it stays mounted when the
 * Update page is kept through a disconnect (D3).
 */
export function MainContentArea() {
  const { pathname } = useLocation();
  const status = useDeviceStore(state => state.connection.status);
  const firmwareUpdateActive = useFirmwareUpdateSession().active;

  const ready = status === 'ready';
  const isLoadingConfigurator = isConnecting(status);
  const showConfigurator = ready && !isLoadingConfigurator && !hidesToolbarAndKeyboard(pathname);
  // A firmware update keeps its page through the keyboard's reboot into the bootloader.
  const keepUpdatePage = firmwareUpdateActive && isActivePage(pathname, '/update');

  let content: ReactNode;
  if (keepUpdatePage) content = <Outlet />;
  else if (isLoadingConfigurator) content = <LoadingOverlay />;
  else if (!ready && pathname === '/') content = <ConnectionScreen />;
  else if (ready) content = <Outlet />;
  else content = <NotConnectedFallback />;

  return (
    <>
      {showConfigurator && <Toolbar showLayerSelector={shouldShowLayerSelector(pathname)} />}
      {showConfigurator && <ShellKeyboard pathname={pathname} />}
      {content}
    </>
  );
}
