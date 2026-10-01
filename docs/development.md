# Development

Zellia Control is a React + TypeScript PWA built with Vite. It talks to the
keyboard over WebHID through the vendored `emi-keyboard-controller`
(`src-controller/`).

## Requirements

- Node.js 24 (as in CI).
- npm 11 (bundled with Node 24). `npm ci` installs exactly `package-lock.json`;
  add or upgrade dependencies with `npm install <package>` and commit the
  lockfile. Arguments for a script go after `--`, e.g.
  `npm run parity -- --grep welcome`.
- Google Chrome for end-to-end and parity runs. Without it Playwright falls back
  to its bundled Chromium: `npx playwright install chromium`.

```sh
npm ci
npm run dev                  # http://localhost:5173
```

## Commands

| Command                | What it does                                                     |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run dev`          | Vite dev server (SPA fallback, no service worker)                |
| `npm run build`        | Production build into `build/` (PWA, per-route `index.html`)     |
| `npm run preview`      | Serves `build/` on :4173 like the production static host         |
| `npm run typecheck`    | `tsc -b`: app, node tooling and the vendored controller projects |
| `npm run lint`         | ESLint (type-aware, react-hooks, jsx-a11y)                       |
| `npm run format`       | Prettier, write                                                  |
| `npm run format:check` | Prettier, check only                                             |
| `npm test`             | Vitest: projects `app`, `tooling` and `controller`               |
| `npm run test:watch`   | Vitest in watch mode                                             |
| `npm run test:e2e`     | Playwright project `e2e` against the production build            |
| `npm run parity`       | Visual parity pipeline (see below)                               |
| `npm run validate`     | typecheck, lint, format check, tests and build (the merge gates) |

All five gates (`typecheck`, `lint`, `format:check`, `test`, `build`) must pass
before a change is merged; CI runs them plus `test:e2e`.

## Project layout

```
index.html                  Vite entry
vite.config.ts              React, PWA, static hosting, controller alias, Vitest projects
postcss.config.js           Tailwind engine 4.1.10 via PostCSS (candidates from src/ only)
playwright.config.ts        Projects e2e and parity; Chrome channel; builds and previews the app
eslint.config.js
tsconfig*.json              Solution: app (src), node (configs, e2e, scripts), controller
public/                     Copied verbatim: favicon, QR image, legacy service-worker kill switch
src-controller/             Vendored upstream emi-keyboard-controller (never edited, see UPSTREAM.md)
src/
  main.tsx                  Entry: styles, render, service-worker registration
  app/                      App shell and routes
  features/                 device, keyboard, keycodes, remap, performance, lighting, ...
  components/ui/            Shared UI primitives
  lib/                      i18n, theme, transitions, storage, pwa.ts
  styles/app.css            Global styles (ported from the Svelte app)
  testing/                  Test setup and the virtual libamp keyboard
e2e/                        Playwright specs, fixtures and parity scenarios
scripts/                    Vite plugins, Playwright helpers and the parity harness
docs/                       Development, migration notes, specs and plans
```

Import the controller only through `src/features/device/controller.ts`; Vite
and TypeScript alias `emi-keyboard-controller` to `src-controller/src/index.ts`.

Tailwind only looks for class candidates in `src/` (`base` in
`postcss.config.js`), so classes must appear in app sources to be generated.

## Testing layers

1. **Unit** (Vitest). Pure modules next to their sources (`*.test.ts`). Project
   `app` runs `src/**` in jsdom; `tooling` runs `scripts/**` in Node (Vite
   plugins, the virtual-keyboard bundler, the parity harness and the
   `public/service-worker.js` kill switch); `controller` runs the vendored
   upstream suite.
2. **Integration** (Vitest + jsdom + Testing Library). Device behavior is tested
   against the virtual keyboard in `src/testing/virtual-keyboard`, never by
   mocking our own modules.
3. **End-to-end** (Playwright, project `e2e`, `e2e/**/*.spec.ts`). Runs against
   the production build served by `vite preview`, which behaves like the static
   host (no SPA fallback). Locally Playwright builds first; in CI (`CI` set) it
   serves the build step's output. Import `test` and `expect` from
   `e2e/fixtures.ts`:
   - Google Fonts are answered locally, so tests never depend on the CDN.
   - `virtualKeyboard` injects the simulated keyboard before any page script:
     it bundles `src/testing/virtual-keyboard/browser.ts` with Vite's build API
     (library mode, IIFE, same controller alias and `?raw` handling as the app)
     once per worker and adds it with `addInitScript`. Request the fixture
     before navigating, then drive the device through its handle:

     ```ts
     test.use({ virtualKeyboardOptions: { seedDynamicKeys: false } }); // optional

     test('connects', async ({ page, virtualKeyboard }) => {
       await page.goto('/');
       const keyboard = await virtualKeyboard.handle();
       await keyboard.evaluate(handle => handle.disconnect());
     });
     ```

     The handle's type (`VirtualKeyboardHandle`) is shared with the simulator,
     so specs see its real state (`state.active.keymap`, …) and controls.
     Component tests connect the app's session the same way with
     `connectVirtualKeyboard()` from `src/testing/app-keyboard.ts`; see
     [device.md](device.md#testing).

4. **Visual parity** (Playwright, project `parity`), below.

Browser: `PLAYWRIGHT_CHANNEL` if set, otherwise stable Chrome when installed,
otherwise Playwright's bundled Chromium (`scripts/browser-channel.ts`). Reports
and traces go to `e2e/.artifacts/`.

Server: Playwright serves the build on port 4273, not Vite's default preview
port 4173 (`npm run preview`, and the Svelte baseline's). Set `E2E_PORT`
to use another port, e.g. to run two worktrees at the same time. Playwright
only tests a server it started itself: if something already answers on the
port, the run fails with "is already used" instead of testing that server.

## Visual parity

The React app must look exactly like the intended Svelte UI. The parity harness
drives the Svelte baseline (commit `4f232a2`) and the React build with the same
scenarios and compares screenshots pixel by pixel.

### Baseline checkout

The baseline is a detached git worktree of this repository at `4f232a2`:

```sh
git worktree add --detach ../svelte-baseline 4f232a2
```

`scripts/parity/prepare-baseline.mjs` finds it through `git worktree list`
(or `--baseline-dir <dir>` / `PARITY_BASELINE_DIR`). It replaces the baseline's
outdated `src-controller/` with this repository's synced copy, installs with
yarn 1 (its own frozen lockfile, via corepack), builds with SvelteKit (`build/`) and serves `build/`
on :4180. It never commits in the baseline; a stamp in `build/` skips install
and build until the baseline commit, its lockfile or `src-controller/` change
(`--force` rebuilds). The baseline is served with the same static-host
emulation as this app's `vite preview` (`scripts/static-host.mjs`), so both
sides of a comparison answer every request the same way.

### Running

```sh
npm run parity                          # everything
npm run parity -- --grep welcome        # extra arguments go to playwright test
npm run parity -- --force-baseline      # rebuild the baseline first
```

The pipeline prepares the baseline, serves it on a free port of its own (never
whatever already listens on :4180, so several worktrees can run it at once),
runs the Playwright project `parity` (which builds and previews this app) and
compares. The steps also run alone: `parity:baseline` (prepare and serve on
:4180), `parity:capture` (needs that server, or `PARITY_BASELINE_URL`) and
`parity:compare`. Every capture run first empties `captures/` (project
`parity-setup`, which `--grep` does not filter), so the report always covers
exactly the latest capture run, e.g. only the scenarios a `--grep` selected.

Every scenario is captured in both apps in light/dark × en/zh × 1440×900 and
2560×1440 (the `--ui-scale` breakpoint). Captures are deterministic: the same
browser for both apps, `localStorage` seeded with the same preferences
(`darkMode`, `language`), timezone UTC, animations finished or cancelled by
Playwright, service workers disabled and Google Fonts replayed from
`e2e/.artifacts/font-cache` (fetched on first use).

Output in `e2e/.artifacts/parity/`:

- `index.html`: report with baseline, React and diff side by side, worst first,
  including page errors seen during capture.
- `summary.json`: comparison settings (`threshold`, `includeAA`, `strict`),
  totals and per-capture results (mismatched pixels, ratio, size mismatch).
- `captures/{baseline,react}/<id>.png`, `captures/<id>.json` and
  `diff/<id>.png`.

The comparison is strict: every changed pixel counts, including pixels that
pixelmatch classifies as anti-aliasing (pixelmatch threshold 0, `includeAA`).
Both apps are captured with the same browser and fonts, so any difference is
real; pixelmatch's default threshold would pass neighbouring Tailwind shades
such as `gray-800` and `gray-700`. To explore a large diff, re-compare the last
captures tolerantly, e.g.
`npm run parity:compare -- --threshold 0.1 --ignore-aa`. That report is
marked as tolerant and is not a parity result; `npm run parity` always
compares strictly.

`compare` exits 1 when any capture differs or is missing (React-only captures are `new` and pass).
A difference is either fixed or recorded in
[docs/migration/parity-log.md](migration/parity-log.md).

### Scenarios

One file per feature in `e2e/parity/scenarios/`, default-exporting
`readonly ParityScenario[]` (`e2e/parity/scenario.ts`):

```ts
import type { ParityScenario } from '../scenario';

const scenarios: readonly ParityScenario[] = [
  {
    name: 'remap-connected',
    path: '/',
    virtualKeyboard: { seedDynamicKeys: false },
    setup: async page => {
      await page.getByRole('button', { name: /Get Started|开始使用/ }).click();
      await page.waitForURL('**/remap/');
    },
  },
];

export default scenarios;
```

- `name`: unique kebab-case id (part of the file names).
- `path`: path to open, e.g. `/remap/` (routes use trailing slashes).
- `setup(page)`: optional. It runs unchanged in both apps and in every variant,
  including Chinese, so select by role and structure or match both languages.
- `virtualKeyboard`: inject the virtual keyboard before the page loads — `true`
  or its options (`model`, `seedDynamicKeys`, `latencyMs`, `picker`, …; see
  `VirtualKeyboardBrowserOptions` in `src/testing/virtual-keyboard/handle.ts`).
  Connected scenarios need `{ seedDynamicKeys: false }`: the baseline cannot
  load a keyboard with dynamic keys (upstream bug, `src-controller/UPSTREAM.md`).
- `storage`: extra `localStorage` entries seeded before the first page script.
- `reactOnly`: a screen the Svelte app does not have (the Macros and Scripts pages). It is
  captured in the React app only and reported as `new`, which passes; its row in the parity log
  has an after-screenshot only.

## PWA

- `vite-plugin-pwa` generates the Workbox worker `/sw.js` (precache id
  `zellia-control`, Google Fonts runtime cache) with `registerType: 'prompt'`;
  `src/lib/pwa.ts` registers it from `main.tsx`.
- Updates wait for an idle app. A new deployment installs as a _waiting_
  worker, so the running page keeps its old worker and precache (its lazy route
  chunks stay loadable even after `rsync --delete` removed them from the
  server). The update is applied — the waiting worker activated, the page
  reloaded — only while `src/app/update-policy.ts` reports the app idle: no
  keyboard connecting or connected and no firmware update running. There is no
  update prompt. `clientsClaim` only lets the very first install control the
  page at once, so the app works offline right after the first visit.
- `public/service-worker.js` is a kill switch for browsers that still hold the
  SvelteKit worker registration: it deletes that worker's caches and
  unregisters itself.
- The dev server has no service worker; use `build` + `preview` (or
  `test:e2e`) to exercise it.

## Deployment

`.github/workflows/web.yml` runs on pushes and pull requests to `main`: install
(`--frozen-lockfile`), typecheck, lint, format check, tests, build, Playwright
e2e, then uploads `build/` as `website-build`. On `main` the deploy job rsyncs
`build/` to the server (`-avz --delete`).

Hosting contract: plain static files, no rewrites. Routes use trailing-slash
URLs (`/remap/`), and the build writes `build/<route>/index.html` for every
route in `STATIC_ROUTES` (`scripts/static-hosting.ts`) so deep links and
reloads work. Add new routes there. `vite preview` behaves the same way: no SPA
fallback, `/remap` redirects to `/remap/`, unknown paths are 404.

## Re-syncing the controller

`src-controller/` is an unmodified copy of upstream `emi-keyboard-controller`.
Follow `src-controller/UPSTREAM.md`, then:

1. `npm run typecheck && npm test`; adapt
   `src/features/device/controller.ts` (the app's only adapter) to API changes.
2. `npm run test:e2e`.
3. `npm run parity`: the baseline stamp includes the controller hash, so
   the baseline is rebuilt against the new copy automatically.
