import { useEffect, useLayoutEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation, useNavigate, type To } from 'react-router';
import { deviceStore, useIsReady } from '../../features/device';
import { firmwareUpdateSession } from '../../features/firmware-update';
import { sessionEnded } from '../connection';
import { shouldShowConfiguratorLayout } from '../navigation';
import { lacksTrailingSlash } from '../pages';
import { MainContentArea } from './MainContentArea';
import { SmallScreenWarning } from './SmallScreenWarning';
import { Sidebar } from './Sidebar';
import './AppShell.css';

/**
 * Returns to the connection screen when the keyboard session ends: unplugged, disconnected or
 * failed (D3) — except while a firmware update runs, whose page survives the keyboard's reboot.
 */
function useReturnToConnectionScreen(pathname: string): void {
  const navigate = useNavigate();
  const currentPath = useRef(pathname);
  useLayoutEffect(() => {
    currentPath.current = pathname;
  });

  useEffect(
    () =>
      deviceStore.subscribe((state, previous) => {
        if (!sessionEnded(previous.connection.status, state.connection.status)) return;
        if (firmwareUpdateSession.getState().active || currentPath.current === '/') return;
        void navigate('/');
      }),
    [navigate]
  );
}

/**
 * The app layout (port of `routes/+layout.svelte`): the sidebar layout on `/` and the sidebar
 * pages, a plain page otherwise (404). Page URLs get their trailing slash, and a connected `/`
 * goes to Remap, both replacing the history entry.
 */
export function AppShell() {
  const location = useLocation();
  const { pathname } = location;
  const ready = useIsReady();
  useReturnToConnectionScreen(pathname);

  let redirect: To | null = null;
  if (lacksTrailingSlash(pathname)) {
    redirect = { pathname: `${pathname}/`, search: location.search, hash: location.hash };
  } else if (pathname === '/' && ready) {
    redirect = '/remap/';
  }

  return (
    <>
      {redirect !== null && <Navigate to={redirect} replace />}
      {shouldShowConfiguratorLayout(pathname) ? (
        <>
          {/* Small Screen Warning */}
          <SmallScreenWarning />

          {/* Main Application (hidden on small screens) */}
          <div className="hidden xl:flex h-screen bg-gray-50 dark:bg-black overflow-hidden">
            <Sidebar />

            <div
              className="flex-1 flex flex-col overflow-y-scroll overflow-x-hidden isolate glassmorphism-main"
              style={{
                gap: 'calc(1rem * var(--ui-scale, 1))',
                padding: 'calc(1rem * var(--ui-scale, 1))',
              }}
            >
              <MainContentArea />
            </div>
          </div>
        </>
      ) : (
        // Standalone pages without the sidebar (404)
        <div className="min-h-screen">
          <Outlet />
        </div>
      )}
    </>
  );
}
