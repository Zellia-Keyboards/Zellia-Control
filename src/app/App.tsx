import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createAppRoutes } from './routes';

let router: ReturnType<typeof createBrowserRouter> | undefined;

/** The app's router, created on first render (it starts listening to the history then). */
function appRouter(): ReturnType<typeof createBrowserRouter> {
  router ??= createBrowserRouter(createAppRoutes());
  return router;
}

export function App() {
  return <RouterProvider router={appRouter()} />;
}
