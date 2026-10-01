/**
 * Port Playwright serves the production build on (projects `e2e` and `parity`). Deliberately not
 * Vite's default preview port 4173, which `npm run preview` and the Svelte baseline's
 * `yarn preview` use.
 */
export const DEFAULT_E2E_PORT = 4273;

/** `E2E_PORT` if set (e.g. to run two worktrees side by side), else DEFAULT_E2E_PORT. */
export function resolveE2EPort(env: NodeJS.ProcessEnv = process.env): number {
  const value = env.E2E_PORT?.trim();
  if (!value) return DEFAULT_E2E_PORT;
  const port = /^\d+$/.test(value) ? Number(value) : Number.NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`E2E_PORT must be a TCP port between 1 and 65535 (got "${value}")`);
  }
  return port;
}
