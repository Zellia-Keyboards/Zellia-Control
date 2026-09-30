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

/** Errors while rendering or loading a route: SvelteKit's error page for unexpected errors. */
export function RouteError() {
  const error = useRouteError();
  if (!isRouteErrorResponse(error)) console.error('[app] route error', error);
  return (
    <div className="min-h-screen">
      {isRouteErrorResponse(error) ? (
        <ErrorPage status={error.status} message={error.statusText} />
      ) : (
        <ErrorPage status={500} message="Internal Error" />
      )}
    </div>
  );
}
