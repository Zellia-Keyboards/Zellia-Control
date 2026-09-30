/** Unknown paths: SvelteKit's default error page for a 404, which the Svelte app showed. */
export function NotFound() {
  return <ErrorPage status={404} message="Not Found" />;
}

export interface ErrorPageProps {
  readonly status: number;
  readonly message: string;
}

/** SvelteKit's default error page (`<h1>{status}</h1><p>{message}</p>`). */
export function ErrorPage({ status, message }: ErrorPageProps) {
  return (
    <>
      <h1>{status}</h1>
      <p>{message}</p>
    </>
  );
}
