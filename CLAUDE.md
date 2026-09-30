# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zellia Control is a Progressive Web App for configuring Zellia Hall Effect keyboards over WebHID. It is a React + TypeScript + Vite application (rewritten from SvelteKit in 2026; design: `docs/superpowers/specs/2026-09-30-react-rewrite-design.md`). The SvelteKit app at commit `4f232a2` is the behavioral and visual reference; the React UI must match it exactly (see "UI parity").

## Commands

Use npm (`npm ci` to install from `package-lock.json`, `npm run <script>`).

- `npm run dev` — Vite dev server (http://localhost:5173)
- `npm run build` — production build into `build/` (static files, PWA service worker)
- `npm run preview` — serve the production build
- `npm run typecheck` — `tsc -b` over the app, node tooling and the vendored controller
- `npm run lint` — ESLint (type-aware)
- `npm run format` / `format:check` — Prettier
- `npm test` — Vitest (app tests in jsdom + the controller's own tests)
- `npm run test:e2e` — Playwright (Chrome) journeys and parity screenshots
- `npm run validate` — typecheck, lint, format check, tests and build

## Architecture

- `src-controller/` — vendored upstream `emi-keyboard-controller` (see `src-controller/UPSTREAM.md`). **Do not edit it**; the app talks to it only through `src/features/device/controller.ts`. Vite aliases `emi-keyboard-controller` to its source; TypeScript checks it as a separate project reference.
- `src/app/` — app shell, routes, layout (sidebar, toolbar, connection screens).
- `src/features/<feature>/` — feature-owned components, hooks and pure `model/` code. Features: `device` (DeviceSession, controller registry, immutable snapshot store), `keyboard` (layout parsing, key rendering, key selection), `keycodes` (single keycode catalog and encoder), `remap`, `performance`, `lighting`, `dynamic-keys`, `debug`, `profiles`, `settings`, `firmware-update`, `about`. Cross-feature imports go through each feature's `index.ts` or, for pure code, its `model/` entry (`features/keyboard/model`, `features/dynamic-keys/model`, `features/lighting/model`, and the device feature's pure modules `features/device/model/*` such as `types`, `units` and `mutex-mode`), which never import React or the device session.
- `src/components/ui/` — shared primitives with at least two real users.
- `src/lib/` — `i18n`, `theme`, `transitions` (ports of Svelte's slide/fade/flip on the Web Animations API), `storage`.
- `src/testing/` — test setup, the virtual libamp keyboard used by unit, integration and e2e tests.
- `e2e/` — Playwright specs.

State: the device is the source of truth. `DeviceSession` commands update the controller cache, send packets (lighting edits are staged until `save()`) and patch an immutable Zustand snapshot store; components select slices. Shared UI state (key selection/layer, layout options, profiles) uses small Zustand stores; everything else is component state.

## Conventions

- **UI parity:** port markup, Tailwind classes, inline styles and copy 1:1 from the Svelte reference; Svelte `<style>` blocks become CSS Modules with the same selectors (`:global()` preserved). Class names referenced from outside a component stay global. Any visible deviation must be listed in `docs/migration/parity-log.md`.
- Tailwind's engine is pinned to 4.1.10 (PostCSS plugin), lucide-react to 0.511.0, chart.js to 4.4.9 — do not upgrade without screenshot verification.
- Strict TypeScript (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`). No `any`, no `as unknown as`.
- Tests verify behavior; device behavior is tested against the virtual keyboard, not mocks of our own code.
- Commits: small and meaningful; no AI attribution trailers.
