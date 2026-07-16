# Zellia Control React Rewrite — Implementation Plan

> **For agentic workers:** executed as parallel workflow waves. Each worker owns a git worktree and
> a fixed set of paths (below), works TDD inside that scope, and reports back. Steps use checkbox
> syntax for tracking.

**Goal:** Replace the SvelteKit app with a React app that is visually identical to the intended
Svelte UI and correct against the current upstream `emi-keyboard-controller`.

**Architecture:** `DeviceSession` (only code that talks to the controller) + immutable Zustand
snapshot store; pure domain modules (keycodes, DKS codec, layout, labels, units); UI foundation
(i18n, theme, transitions, primitives); features port the Svelte markup 1:1.

**Tech Stack:** React 19.3, TypeScript 6.0 (strict, project references), Vite 8, React Router 8,
Zustand 5, Tailwind engine 4.1.10 (PostCSS), Vitest 5 + jsdom + Testing Library, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-09-30-react-rewrite-design.md` (read §1, §3, and the
sections named in your task).

## Global Constraints

- Svelte reference (read-only): `/Users/liang/worktrees/svelte-baseline` (commit `4f232a2`). Read
  the original component before porting it; port markup/classes/inline styles/copy 1:1.
- `src-controller/` is vendored upstream: never edit it. App access only through
  `src/features/device/controller.ts`.
- `src/features/device/model/types.ts` is the lead-owned shared contract. Do not edit it; if you
  need a change, report it.
- Do not add, remove or upgrade dependencies (no `package.json`/`yarn.lock` edits) unless your
  task says so. Everything needed is installed.
- Pinned for parity: tailwindcss/@tailwindcss/postcss 4.1.10, lucide-react 0.511.0, chart.js 4.4.9,
  chartjs-plugin-zoom 2.2.0, tinycolor2 1.6.0.
- TypeScript: no `any`, no `as unknown as`, no non-null `!` on data you did not just check,
  discriminated unions for state machines. Validate external data (localStorage, device) at the
  boundary.
- localStorage keys and schemas stay identical to the Svelte app: `language`, `darkMode`,
  `themeColor`, `keyboard-profiles`, `zellia-layout-config`.
- Tests verify behavior. Device behavior is tested through the virtual keyboard
  (`src/testing/virtual-keyboard`), never by mocking our own modules.
- Gates before you finish (run in your worktree, all must pass): `corepack yarn typecheck`,
  `corepack yarn lint`, `corepack yarn format:check`, `corepack yarn test`, `corepack yarn build`.
- Commits: small, meaningful, conventional (`feat:`, `test:`, `refactor:`, `chore:`), on your
  branch only. **Never add Co-Authored-By or any AI attribution.** Never rewrite history of other
  branches, never touch other worktrees, never push.

## File ownership

| Worker | Branch / worktree | Owns |
|---|---|---|
| A device | `rw/device` · `/Users/liang/worktrees/device` | `src/features/device/**` except `model/types.ts` and `model/units.ts`; `src/testing/virtual-keyboard/**` |
| B domain | `rw/domain` · `/Users/liang/worktrees/domain` | `src/features/keycodes/**`, `src/features/keyboard/model/**`, `src/features/dynamic-keys/model/**`, `src/features/lighting/model/**`, `src/features/device/model/units.ts` |
| C ui-foundation | `rw/ui-foundation` · `/Users/liang/worktrees/ui-foundation` | `src/lib/**`, `src/components/ui/**` |
| D tooling | `rw/tooling` · `/Users/liang/worktrees/tooling` | `eslint.config.js`, `vite.config.ts`, `playwright.config.ts`, `postcss.config.js`, `.github/**`, `e2e/**`, `scripts/**`, `public/service-worker.js`, `src/main.tsx`, `src/lib/pwa.ts`, `package.json` (scripts only), `docs/development.md`, `docs/migration/**` |

Wave 2 (after integration 1): E shell `src/app/**`, `src/features/keyboard/**` (not `model/`) ·
F `src/features/remap/**`, `src/features/profiles/**` · G `src/features/performance/**`,
`src/features/lighting/**` · H `src/features/dynamic-keys/**` · I `src/features/debug/**`,
`src/features/settings/**`, `src/features/about/**`, `src/features/firmware-update/**`.

---

## Wave 1 — Worker A: device layer + virtual keyboard

Spec: §3.2 D1–D10, D16, §5, §9. Upstream docs: `src-controller/README.md`,
`src-controller/src/controllers/libamp_keyboard_controller/README.md`; protocol tests in
`src-controller/test/`.

**Files (create):** `src/features/device/{controller.ts, models.ts, mapping.ts, session.ts,
store.ts, debug-stream.ts, index.ts}`, `src/features/device/model/dynamic-key-binding.ts`,
tests next to each (`*.test.ts`), `src/testing/virtual-keyboard/{protocol.ts, state.ts,
device.ts, install.ts, browser.ts, index.ts}` + tests.

**Produces (exact public API, `src/features/device/index.ts`):**

```ts
export type { DeviceController } from './controller';
export type * from './model/types';
export { deviceSession } from './session';            // lazily bound to navigator.hid
export { createDeviceSession, type DeviceSession, type DynamicKeyDraft } from './session';
export { useDeviceStore, deviceStore, type DeviceState } from './store';
export { useConnection, useDeviceConfig, useIsReady, useModel, useDeviceName } from './store';
export { subscribeDebugSamples, type DebugSample } from './debug-stream';
```

```ts
interface DeviceState {
  connection: ConnectionState;            // from model/types
  config: DeviceConfig | null;            // null until first successful load
  feature: FeatureFlags | null;
  firmware: FirmwareVersion | null;
  reloading: boolean;                      // updateDataStart … updateDataEnd
  saving: boolean;
  lastError: DeviceError | null;
}
type DynamicKeyDraft =
  | { kind: 'stroke'; target: KeyLocation; bindings: readonly [Keycode, Keycode, Keycode, Keycode];
      keyControl: readonly [number, number, number, number]; distances: StrokeDistances }
  | { kind: 'modTap'; target: KeyLocation; tap: Keycode; hold: Keycode; durationMs: number }
  | { kind: 'toggle'; target: KeyLocation; binding: Keycode }
  | { kind: 'mutex'; targets: readonly [KeyLocation, KeyLocation];
      bindings: readonly [Keycode, Keycode]; mode: DynamicKeyMutexMode };
interface DeviceSession {
  connect(): Promise<void>;          // call from a user gesture; ends in 'ready' or 'error'
  disconnect(): void;
  save(): Promise<void>;             // await controller.save(), then controller.flash(); coalesced
  setKeycodes(layer: number, keyIds: readonly number[], keycode: Keycode): void;
  setAdvancedKeys(keyIds: readonly number[], config: AdvancedKeyConfig): void;
  setRgbBase(config: RgbBaseConfig): void;
  setRgbKeys(entries: readonly { keyId: number; config: RgbKeyConfig }[]): void;
  applyDynamicKey(draft: DynamicKeyDraft): number | null;   // slot, or null when no slot is free
  removeDynamicKey(slot: number): void;
  removeDynamicKeysOfKind(kind: 'stroke' | 'modTap' | 'toggle' | 'mutex'): void;
  switchProfile(index: number): Promise<void>;              // 0-based
  systemReset(): void; enterBootloader(): void; factoryReset(): void;
  startDebug(keyId: number): void; stopDebug(): void;
  detectBootloader(silent: boolean): Promise<USBDevice[]>;  // USBDevice from emi-keyboard-controller; works after disconnect (last model)
}
interface DebugSample { tick: number; keyId: number; value: number /* 0..1 */; raw: number; filteredRaw: number; state: boolean; reportState: boolean }
```

`createDeviceSession({ hid, models?, store?, timeouts? })` is the testable factory;
`deviceSession` is the app singleton.

**Tasks**

- [ ] `controller.ts`: structural `DeviceController` interface = exactly the members listed in spec
  §4.3, typed from `emi-keyboard-controller` exports; typed event helper
  `onControllerEvent(controller, type, handler): () => void` for `updateDataStart`, `updateData`,
  `updateDataEnd`, `updateDataError` (`detail.error`), `updateDebugData`
  (`detail.{tick, updated_keys}`), `consoleData`, `deviceDisconnected`, validating `detail` shapes.
- [ ] `models.ts`: registry per D1 (Starlight, Zellia 60, Zellia 80, Oholeo, Trinity Pad) with
  `satisfies`; `HID_REQUEST_FILTERS` (deduped union, same as today:
  `{0xFEED, 22319, 0xFF60}`, `{0xFEED, 0xFFFF, 0xFF60}`); `matchModel(device)` using each
  controller's `detect(true)` (identity match) plus the documented `Zellia Starlight` name fallback
  (see `src-controller/UPSTREAM.md`). Tests with fake HID devices for every model and name.
- [ ] `mapping.ts`: controller caches → `DeviceConfig`/`FeatureFlags`/`FirmwareVersion` (deep copies;
  nested `advanced_keys[i].config`), and domain → controller objects (`AdvancedKey`,
  `RGBBaseConfig`, `DynamicKeyStroke4x4`/`ModTap`/`ToggleKey`/`Mutex` with
  `target_keys_location`). Round-trip tests.
- [ ] `model/dynamic-key-binding.ts` (spec §6.4, D4–D6): `rebuildTargets(keymap, slots)`,
  `findSlotForTargets`, `firstFreeSlot`, `bindDynamicKey(keymap, slots, draft) → { keymap, slots,
  slot, changedKeymapEntries }`, `unbindDynamicKey(keymap, slots, slot) → { keymap, slots,
  changedKeymapEntries }` (restores each target to that DK's own binding; mutex per key). Pure,
  exhaustive tests (reuse, first-free, none-free, re-target, mutex order = keymap scan order).
- [ ] `store.ts`: Zustand vanilla store + hooks with selectors; immutable updates only.
- [ ] `session.ts`: state machine per spec §5.1 (listeners before `connect()`, loading until first
  `updateData`, 3 s no-`updateDataStart` timeout, error texts from spec, disconnect handling,
  device-initiated reloads, profile index sync); commands per spec §5.3/D9/D10: keep controller
  cache in sync with fresh copies (`set_*`), send packets (keymap in contiguous runs of ≤27 codes
  per `send_keymap_packet`, one `send_advanced_key_packet` per index, `send_rgb_base_packet`,
  one `send_rgb_packet` per index, `send_dynamic_key_packet` per changed slot + keymap packets for
  changed entries), patch store, catch/log failures into `lastError`. Rebuild DK targets from the
  keymap after every load (before any `save()`). Debug loop per D16 feeding `debug-stream.ts`.
- [ ] Virtual keyboard (spec §9 last paragraph): libamp transaction protocol
  (`code | id | type | body`, replies echo code/id/type; see `src-controller/test/support/hid.ts`
  and the controller's packet encoders/decoders) implementing version (0.1.x), feature, config,
  advanced keys, keymap, RGB base + per-key, dynamic keys, profile index + profile switch events
  (config-changed notification → controller reload), keyboard operations (save/flash, reboot,
  factory reset, bootloader, debug on/off), debug packets (synthetic travel curve), macros (none).
  State seeded deterministically from `new ZelliaStarlightController()` defaults plus one DK of each
  kind bound in the keymap and varied RGB colors. API: `createVirtualKeyboard(options?)` →
  `{ device (HIDDevice-compatible), hid (HID-compatible manager), state, sentReports, disconnect(),
  setFirmwareVersion(), setUnresponsive(), … }`; `installVirtualHid(nav, options?)` for jsdom;
  `browser.ts` installs on `window.navigator.hid` and exposes `window.__virtualKeyboard` for
  Playwright. Also a virtual WebUSB DFU device (`navigator.usb`) sufficient for
  `WebDfuDevice.download()` happy path + abort (see `src-controller/test/web-dfu.test.ts`).
- [ ] Integration tests (jsdom): connect → ready with correct model/name; unsupported firmware →
  error after timeout; physical disconnect → disconnected; every command's wire packets decoded
  and asserted; save failure → `lastError`; profile switch reload; debug samples.

## Wave 1 — Worker B: domain modules

Spec: §3.2 D8, D11–D15, §6 (all). Reference: baseline `src/lib/keycodes/KeycodeDisplay.ts`,
`src/lib/components/remap/*.svelte`, `src/lib/types/AdvancedKeyShared.ts`,
`src/lib/utils/keyboardKeyTransformer.svelte.ts`, `src/lib/components/advancedkey/DynamicMode.svelte`,
`src/lib/components/layout/LayoutConfigDropdown.svelte`, `src/lib/components/lighting/RGBSubPanel.svelte`;
libamp `keycode.h` semantics as summarized in spec §6.1.

**Produces:**

```ts
// src/features/keycodes/index.ts
export const kc: {
  key(code: number): Keycode; withModifiers(code: number, modifierMask: number): Keycode;
  modifier(mask: number): Keycode; layer(op: LayerControlKeycode, layer: number): Keycode;
  mouse(sub: MouseKeycode): Keycode; consumer(sub: ConsumerKeycode): Keycode;
  system(sub: number): Keycode; joystick(sub: number): Keycode;
  keyboardOperation(op: KeyboardKeycode): Keycode;
  keyboardConfig(action: 'off' | 'on' | 'toggle', config: KeyboardConfigCode): Keycode;
  profile(index: 0 | 1 | 2 | 3): Keycode; dynamicKey(slot: number): Keycode;
  user(n: number): Keycode; transparent: Keycode; none: Keycode;
};
export function decodeKeycode(keycode: Keycode): DecodedKeycode;   // discriminated union by category
export function describeKeycode(keycode: Keycode): { main: string; sub: string };  // keyCodeToString port
export function dynamicKeySlotOf(keycode: Keycode): number | null;
export interface PaletteKey { label: string; keycode: Keycode | null }   // null = inert placeholder (D8)
export const REMAP_PALETTES: { basic: readonly (readonly PaletteKey[])[]; system: readonly PaletteKey[];
  layer: readonly PaletteKey[]; profile: readonly PaletteKey[]; extension: readonly PaletteKey[] };
export interface ActionCategory { name: 'Basic' | 'Layer' | 'System' | 'Mouse'; actions: readonly { name: string; keycode: Keycode }[] }
export const ACTION_CATEGORIES: readonly ActionCategory[];         // advanced-key picker, correct encodings
// src/features/device/model/units.ts
export const TRAVEL_MM = 4.0;
export function fractionToMm(f: number): number; export function mmToFraction(mm: number): number;
export function lowerDeadzoneToBottomMm(f: number): number; export function bottomMmToLowerDeadzone(mm: number): number;
// src/features/keyboard/model
export interface LayoutKey { id: number; x: number; y: number; width: number; height: number;
  rotationAngle: number; rotationX: number; rotationY: number; labels: readonly string[];
  layoutGroup: { groupId: number; option: number } | null }
export function parseLayout(layoutJson: string): readonly LayoutKey[];
export function visibleKeys(keys: readonly LayoutKey[], variantIndices: readonly number[]): readonly LayoutKey[];
export interface LayoutOptions { bottomRowConfig: '6.25u' | '7u'; splitSpacebar: boolean; rightShiftSplit: boolean; leftShiftSplit: boolean; splitBackspace: boolean }
export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions; export function parseLayoutOptions(value: unknown): LayoutOptions;
export function layoutVariantIndices(labels: readonly (readonly string[])[], options: LayoutOptions): readonly number[];
export type KeyLabels = readonly string[];   // KLE label slots (0..11), '' when empty
export function performanceLabels(keys, advancedKeys): ReadonlyMap<number, KeyLabels>;
export function remapLabels(keys, keymap, layerIndex: number, dynamicKeys): ReadonlyMap<number, KeyLabels>;
export function lightingLabels(keys, rgbKeys): ReadonlyMap<number, KeyLabels>;
// src/features/dynamic-keys/model
export enum DksAction { Hold = 0, Press = 1, Release = 2, Tap = 3 }   // UI model (unchanged)
export type DksBitmap = readonly [DksAction, DksAction, DksAction, DksAction];
export function getIntervals(bitmap: DksBitmap): readonly (readonly [number, number])[];
export function encodeKeyControl(bitmap: DksBitmap): number; export function decodeKeyControl(byte: number): DksBitmap;
export function deleteInterval(bitmap: DksBitmap, start: number): DksBitmap;   // + dragInterval/commit/clickNode ports
export const NULL_BIND_BEHAVIORS: readonly { behavior: 0 | 1 | 2 | 3 | 4; nameKey: string; descriptionKey: string }[];
export function behaviorToMutexMode(b: 0 | 1 | 2 | 3 | 4): DynamicKeyMutexMode; export function mutexModeToBehavior(m: DynamicKeyMutexMode): 0 | 1 | 2 | 3 | 4;
// src/features/lighting/model
export function rainbowColors(keys: readonly LayoutKey[], referenceHex: string, directionDeg: number, density: number): ReadonlyMap<number, Rgb>;
```

**Tasks** (each: failing tests first, then implementation, then commit)

- [ ] Keycode encoding/decoding + `describeKeycode` (port every name table; renamed enums
  `KeyboardProfileN`, `KeyboardConfigCode`). Tests: every enum member round-trips; spot checks vs
  firmware examples (`0xFE | ((2<<6)|(0x20+0))<<8` = toggle debug; layer `LAYER(MOMENTARY, 1)` =
  `0x01A6`; Left Ctrl modifier = `0x0100`).
- [ ] Palettes: port the five Remap tabs (labels/order/rows exactly as the Svelte files) and the
  advanced-key action list with correct encodings (D8, D15). Tests: each entry decodes to the
  intended category/sub-code; shared keys agree across the two catalogs.
- [ ] Units, layout parsing/variants/options (port the dropdown's index mapping verbatim),
  label builders (port `transformKeyboardKeys`, reading nested config fields, D12 conversions).
- [ ] DKS codec + bitmap editing ports + mutex behavior mapping (D13, D14, spec §6.3). Tests:
  exhaustive encode/decode over all 256 bytes and all UI bitmaps; editing functions against
  recorded Svelte behavior.
- [ ] Rainbow colors (D11; upstream formula). Tests with fixed layouts.

## Wave 1 — Worker C: UI foundation

Spec: §3.2 D17, §4.1, §7.1–7.4. Reference: baseline `src/lib/stores/{LanguageStore,DarkModeStore}.svelte.ts`,
`src/lib/components/ui/*`, `src/lib/components/profiles/{ConfirmationModal,ErrorModal}.svelte`,
and every `transition:`/`in:`/`out:`/`animate:` use in the baseline (`grep -rn "transition:\|in:\|out:\|animate:" src`).

**Produces:**

```ts
// src/lib/storage.ts
export function readString(key: string): string | null; export function writeString(key: string, value: string): void;
export function readJson<T>(key: string, parse: (value: unknown) => T, fallback: T): T; export function writeJson(key: string, value: unknown): void;
// src/lib/i18n/index.ts
export type Language = 'en' | 'zh'; export type TranslationKey = keyof typeof en;
export function translate(key: TranslationKey, language: Language, ...args: string[]): string;  // {0} placeholders
export function useLanguage(): { language: Language; setLanguage(l: Language): void; toggleLanguage(): void };
export function useT(): (key: TranslationKey, ...args: string[]) => string;
// src/lib/theme/index.ts
export const THEME_COLORS: Readonly<Record<ThemeColorName, string>>; export type ThemeColorName = …;
export function bootstrapTheme(): void;          // exact Svelte initial-load logic (default dark)
export function useDarkMode(): { isDark: boolean; toggle(): void };
export function useThemeColor(): { color: ThemeColorName | null; setColor(c: ThemeColorName | null): void };
// src/lib/transitions/index.ts
export type TransitionFn = (node: HTMLElement, params?: object) => TransitionConfig;  // Svelte shape: {delay, duration, easing, css(t,u)}
export const cubicOut, linear, …; export function slide(node, params?): TransitionConfig; export function fade(…); export function slideMove(…);
export function Transition(props: { show: boolean; children: ReactElement; transition?: [TransitionFn, params?];
  in?: [TransitionFn, params?]; out?: [TransitionFn, params?]; appear?: boolean }): ReactNode;
export function KeyedTransition(props: { transitionKey: string | number; children: ReactElement; in?: …; out?: … }): ReactNode;
export function useFlip<T extends HTMLElement>(…): …;   // only if a baseline `animate:flip` needs it visibly
// src/components/ui/index.ts
export { ThemedSlider, Toggle, Modal, NoKeySelected, ConfirmationModal, ErrorModal };  // props mirror the Svelte props
```

**Tasks**

- [ ] `storage.ts` with tests (privacy-mode exceptions swallowed, invalid JSON → fallback).
- [ ] i18n: port both dictionaries verbatim, keeping every key that appears as a string literal
  anywhere in the baseline `src/` (not only `t('…')` calls — keys are also passed through variables,
  e.g. `nav.*`, `settings.*`, tip keys), plus the six missing keys (`ui.save` "Save"/"保存",
  `advancedkey.done` "Done"/"完成", `advancedkey.deleteKey` "Delete key"/"删除按键",
  `advancedkey.deletePair` "Delete pair"/"删除配对", `advancedkey.trigger` "Trigger"/"触发",
  `advancedkey.state` "State"/"状态"); drop the rest. `zh` typed `Record<TranslationKey, string>`.
  Persist `language`, sync `<html lang>`. Tests: completeness, fallback to key, placeholders,
  persistence.
- [ ] theme: exact port of DarkModeStore behavior (initial dark default, `--color-primary` plain
  colors `#fafafafa`/`#000000`, `no-transition` flash guard, `glassmorphism` class always on,
  toggle semantics). Tests on `document.documentElement`.
- [ ] transitions: port Svelte 5 `slide`, `fade`, easing functions and the remap `slideMove`
  (from `routes/remap/+page.svelte`); run them through WAAPI keyframes sampled like Svelte;
  `Transition` implements local-by-default semantics (no animation when mounted inside an
  already-visible parent unless `appear`), keeps children mounted during `out`. Tests: keyframe
  values vs Svelte formulas, mount/unmount lifecycle with fake timers.
- [ ] UI primitives: port `ThemedSlider`, `Toggle`, `Modal`, `NoKeySelected`, and
  `ConfirmationModal`/`ErrorModal` (from `profiles/`) with CSS Modules and identical markup.
  Component tests (roles, keyboard: Escape closes modals, toggle `aria-pressed`).

## Wave 1 — Worker D: tooling, CI, PWA, deploy, parity harness

Spec: §3.2 D18–D20, §9. Reference: baseline `.github/workflows/web.yml`, `vite.config.js`,
`src/service-worker.ts`, `svelte.config.js`.

**Tasks**

- [ ] PWA registration: `src/lib/pwa.ts` (`registerServiceWorker()` via `virtual:pwa-register`,
  autoUpdate) called from `src/main.tsx`; `public/service-worker.js` self-unregistering kill switch
  (unregisters itself and deletes its caches).
- [ ] Static hosting: Vite plugin (in `vite.config.ts` or `scripts/`) that writes
  `build/<route>/index.html` copies for `remap performance lighting dynamic debug settings update
  about profiles` so deep links work without server rewrites; verify with `vite preview`.
- [ ] Playwright: `playwright.config.ts` (Chrome channel, 1440×900 default, projects for `e2e`
  and `parity`), `e2e/fixtures.ts` exposing `virtualKeyboard` fixture that bundles
  `src/testing/virtual-keyboard/browser.ts` with esbuild (`scripts/build-virtual-keyboard.mjs`)
  and injects it via `addInitScript` (write it against that module path; worker A delivers it —
  guard with a clear error if missing), and one smoke test for the disconnected welcome screen.
- [ ] Parity harness (`scripts/parity/`): `prepare-baseline.mjs` (in
  `/Users/liang/worktrees/svelte-baseline`: copy the repo's synced `src-controller` over its own,
  install with corepack yarn, build, serve on port 4180), `capture.ts` (drive both apps with the
  same scenarios: route list, light/dark, en/zh, 1440×900 and 2560×1440; scenarios are loaded
  from `e2e/parity/scenarios/*.ts`, one file per feature, each exporting
  `ParityScenario[] = { name; path; setup?(page) }[]`), `compare.mjs` (pixelmatch; HTML report and
  JSON summary in `e2e/.artifacts/parity/`). Provide a `welcome` scenario now.
- [ ] CI (`.github/workflows/web.yml`): Node 24, corepack yarn install --frozen-lockfile,
  typecheck, lint, format:check, test, build, Playwright e2e (install chrome), upload `build/`,
  unchanged rsync deploy job for `main`.
- [ ] Docs: `docs/development.md` (commands, project layout, testing layers, parity workflow,
  deployment, re-syncing the controller) and `docs/migration/parity-log.md` (template + the
  deliberate deviations already decided in spec §3).

## Integration 1 (lead)

- [ ] Review each branch diff against this plan; merge `rw/domain`, `rw/ui-foundation`,
  `rw/device`, `rw/tooling` into `react-rewrite`; resolve; run all gates; run parity `welcome`.
- [ ] Add Wave 2 stubs (each feature's `index.ts` exporting its page component and the
  cross-feature exports: `ProfileDropdown`, `useFirmwareUpdateSession`), then write Wave 2 briefs.

## Wave 2 (briefs finalized after integration 1)

- E shell & keyboard: routes (trailing-slash URLs, lazy pages, 404), AppShell/Sidebar/
  MainContentArea/Toolbar/LayerSelector/LayoutConfigDropdown/Connection screens/SmallScreenWarning,
  KeyboardRender/Key (+ CSS module with global `label-cell-N`), key-selection + layer store,
  layout-options store, Save/Disconnect wiring, `/` redirect, firmware-update gate exception.
- F remap + profiles (page, dropdown, store; D7, D8, paint brush).
- G performance + lighting (D11, D12, paint brush, dual sliders, direction dial, rainbow).
- H dynamic keys (dashboard, tap-hold, toggle, null-bind, DKS; D4–D6, D13–D15).
- I debug + settings + about + firmware update (D16, confirmations, WebDFU flow).

Each: port markup 1:1, CSS Modules, unit/component tests, e2e journey, parity scenarios file.

## Integration 2 and Wave 3 (lead)

- [ ] Merge Wave 2, full gates, parity capture across all scenarios, fix or log every diff, e2e.
- [ ] Cleanup (dead code/deps/config), docs (architecture, state, device API, testing, deployment,
  migration decisions), final validation, bundle inspection, PR.
