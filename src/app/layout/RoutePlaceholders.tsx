import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ErrorPage } from './NotFound';

/** `/` itself has no content: the shell shows the connection screen or redirects to Remap. */
export function HomePage() {
  return null;
}

/** The page slot stays empty while a deep-linked page loads; the shell renders at once. */
export function PageLoading() {
  return null;
}

/**
 * The status and message SvelteKit's error page shows for a route error. Unexpected errors are
 * logged, as SvelteKit's default `handleError` hook did.
 */
function useErrorPage(): { status: number; message: string } {
  const error = useRouteError();
  const expected = isRouteErrorResponse(error);
  useEffect(() => {
    if (!expected) console.error('[app] route error', error);
  }, [error, expected]);
  return expected
    ? { status: error.status, message: error.statusText }
    : { status: 500, message: 'Internal Error' };
}

/**
 * A page that failed to load or render: SvelteKit's error page in the page slot, below the
 * sidebar, like its error pages inside the root layout.
 */
export function PageError() {
  const { status, message } = useErrorPage();
  return <ErrorPage status={status} message={message} />;
}

/** An error of the shell itself: SvelteKit's error page on its own. */
export function RouteError() {
  const { status, message } = useErrorPage();
  return (
    <div className="min-h-screen">
      <ErrorPage status={status} message={message} />
    </div>
  );
}
