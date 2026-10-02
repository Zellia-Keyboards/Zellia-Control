# Zellia Control — SvelteKit → React Rewrite: Design Spec

Date: 2026-09-30 · Branch: `react-rewrite` · Baseline: `4f232a2` (SvelteKit app)

## 1. Goal and hard constraints

Rewrite the Zellia Control PWA as an idiomatic React + TypeScript app that preserves the
product's behavior and **looks, reads and animates exactly like the current app**, while fixing
the architecture and the device-integration bugs underneath.

Hard constraints (from the product owner):

1. **Exact UI parity with the *intended* UI.** Same layout, Tailwind classes, scoped CSS, copy,
   icons, fonts, animations/transitions and interactions. Things that render wrong today
   *because of bugs* (raw i18n keys, literal code text, garbage numbers, blank labels, dead
   charts) are fixed so each screen shows what it was built to show. Every visible deviation is
   recorded in `docs/migration/parity-log.md` with before/after screenshots.
2. **Sync `src-controller` to upstream first.** Vendor the latest
   `emi-keyboard-controller` from `zhangqili/EMIKeyboardConfigurator` (API package only) and
   target it as-is. Only the **newest upstream libamp protocol** is supported (transaction-id
   framing, 2026-08-09+). `Zellia_libamp` is a fork that gets upstreamed; no AmpFrame-v2 or
   older fallback. The local-only `get/set_key_travel` additions are dropped.
3. **Confirmation before Factory Reset and Bootloader** (Settings), styled like the existing
   `ConfirmationModal`. Restart stays single-click.
4. **Paint mode:** keep the remap/performance "brush" (adding keys to the selection applies the
   last-used keycode/settings, and the brush stays loaded after deselect-all), but **switching
   layers never writes to the keyboard.**
5. **Firmware update uses upstream WebDFU** (`WebDfuDevice`, `detect_bootloader`) behind the
   identical 7-step UI.
6. Do not use `Zellia-Keyboards/zllia` / `@zllia/ui`. Build from scratch in this repo.
7. **The Update page works without a connected keyboard**, so a keyboard stuck in its bootloader
   (after a reload or crash mid-flash, or after Settings → Enter Bootloader) can still be
   flashed. Without a keyboard, the flasher looks for the DFU bootloaders of all supported models.
8. **Confirming "Enter Bootloader" in Settings opens the Update page** with an update session
   started, ready to flash the waiting bootloader.
9. **About's "Support Development" button is hidden**: it linked to the placeholder
   `https://github.com/sponsors/your-username`.

## 2. Findings that motivate the design (baseline 4f232a2)

- **Type safety:** `svelte-check` reports 153 errors in 28 files. The documented `yarn check`
  never ran it (yarn 1's built-in `check` shadows the script). The vendored controller itself is
  clean under its own tsconfig; ~90 errors come from re-checking it under SvelteKit's
  `verbatimModuleSyntax`, ~60 are real API drift.
- **API drift:** the app calls controller methods/signatures that no longer exist
  (`save_config`, `flash_config`, `set_config_file_index`, old `send_*_packet(indexes, …)`),
  reads advanced-key fields from the wrong level (`key.mode` instead of `key.config.mode`), and
  uses removed enums (`KeyboardKeycode.KeyboardConfig0–3`, enum `KeyboardConfig`).
  Consequences: Save does nothing; Performance keycaps render blank; selecting a key on
  Performance overwrites its actuation point with 2.0 mm; lighting speed renders "20000%" and
  sends 0; the debug chart listens to `updateData` instead of `updateDebugData` and never plots.
- **Protocol drift:** the vendored controller speaks the obsolete AmpFrame-v2 framing; current
  libamp firmware (fork and upstream, since 2026-08-09) uses transaction-id packets.
- **Device matching:** any `0xFEED:22319` device is driven by `ZelliaStarlightController`
  (VID/PID only), so a Zellia 80 gets the wrong layout. Upstream `detect()` adds product-name
  rules.
- **Dynamic keys:** DKS never reaches the device correctly (bitmap not encoded into
  `key_control`, always slot 0, layer number used as key id, keymap never bound). Null-bind
  behaviors are mapped to the wrong firmware modes and mix 0- and 1-based layers. Tap-hold's
  default hold action (`0xE0`) is not a valid EMI keycode. The "configured keys" tables are an
  in-memory list unrelated to what is on the keyboard; "delete" never touches the device.
- **Two keycode catalogs with conflicting encodings** (`remap/*` vs
  `AdvancedKeyShared.keyActions`); "NKRO Toggle" and "↔ PF1" actually assign **Reboot**.
- **PWA offline is broken:** `index.html` registers SvelteKit's `service-worker.js`, which still
  contains an unreplaced `self.__WB_MANIFEST`; Workbox's generated `sw.js` is never registered.
- **Lifecycle:** physical disconnect is ignored; `updateData` is subscribed after `connect()`
  (race); config is shown from controller defaults before the device data arrives.
- **Dead code:** `api.svelte.ts`, `dynamicMap.ts`, `SettingsCard`, `KeyGrid`, `KeyboardLayout`,
  `RainbowPreset`, `SecondaryColorPicker`, `SpeedControl`, `ColorPicker`, `ModeSelector`,
  `DensityControl`, `DirectionNumberControl`, `KeyPressReportingToggle`, UI primitives `Card`,
  `SectionHeader`, `Button`, `Tabs`, `StatusDot`, `ColorInput`, `static/{svelte,tauri,vite}.svg`,
  `tailwind.config.js` (ignored by Tailwind v4), `glassmorphismMode` (constant), 317 unused
  translation keys; 6 used keys are missing (`ui.save`, `advancedkey.done`,
  `advancedkey.deleteKey`, `advancedkey.deletePair`, `advancedkey.trigger`,
  `advancedkey.state`).
- The vendored controller's own suite has 1 failing test (fixed by the upstream sync).

## 3. Decision log

### 3.1 Product owner decisions
See §1 items 1–6.

### 3.2 Engineering decisions (overridable in review)

| # | Decision | Rationale |
|---|---|---|
| D1 | Model registry: Zellia Starlight, Zellia 60, Zellia 80, Oholeo, Trinity Pad. Match a picked HID device to a model with each controller's own `detect(true)` rules; one picker with the union of HID filters. | Reuses upstream matching rules verbatim; fixes wrong-model connections. Zellia 60 added because upstream Starlight now excludes "Zellia 60" names. |
| D2 | Connection shows the existing "Loading configurator…" overlay until the first `updateData`. `updateDataError`, or no `updateDataStart` within 3 s of opening the device (no reply / unsupported firmware version), ends in the error state with its message in the existing error slot. The full load itself has no timeout. A failed reload after the first load also ends the connection in the error state ("Failed to load keyboard configuration: …"), so the UI never edits a stale snapshot. | Removes the flash of controller-default data; unsupported firmware no longer hangs. |
| D3 | Physical disconnect (`deviceDisconnected`) returns to the connect screen, except on the Update page, which never needs a keyboard (§1.7). A firmware update session outlives the page: navigating away does not abort a flash, and returning shows its progress. | Intended behavior; the flasher must survive the reboot into DFU. |
| D4 | The keymap is the source of truth for dynamic-key placement: targets are rebuilt from `DynamicKey \| slot<<8` entries on every load (upstream `mapBackDynamicKey` semantics), before any `save()`. | Device reads don't return target ids; `save()` is fail-fast and rejects DKs without targets. |
| D5 | "Configured keys" tables (dashboard, tap-hold, toggle, null-bind, DKS) are **derived from device dynamic keys**. Delete/Reset/Reset-all remove the DK from the device and restore each target's keymap entry to that DK's own binding (mutex: its per-key binding). UI-only fields (hold delay, toggle mode/state, null-bind bottom-out/RT) live in session memory keyed by the dynamic key's target `KeyLocation` (a mutex's first target) — not by slot: libamp stops scanning at the first empty slot, so freeing a slot compacts the table and slot numbers change. They fall back to defaults. | No duplicated server state; delete actually deletes; matches upstream `last_binding` restore. |
| D6 | Applying a dynamic key reuses the slot already bound to that key/layer, else the first `DynamicKeyNone` slot; if none is free, the apply is rejected and logged. | Svelte leaked slots and could write to index -1. |
| D7 | Profiles: store schema and `keyboard-profiles` key unchanged. Activating profile 1–4 from the Profiles page **or** the toolbar dropdown calls `set_profile_index(n-1)`; 5–16 remain local records (activation marks them active, no device call). On every device load the active profile follows `get_profile_index()` + 1, including when a local profile (5–16) was active. | Consistent entry points; UI reflects the keyboard. |
| D8 | The four Profile-tab placeholders (`↔ PF`, `↔ PF1`, `→ PF`, `← PF`) stay visible but are inert (firmware has no equivalent). `PF(0–3)` → `KeyboardOperation \| (0x10+n)<<8`. "NKRO Toggle" → keyboard-config toggle of NKRO (`0xFE \| ((2<<6)\|(0x20+1))<<8`). "Recovery" keeps its current meaning (Bootloader). | Stop assigning Reboot/debug-off by accident. |
| D9 | Save: `await controller.save()` then `controller.flash()`; concurrent saves are coalesced; failures are logged and exposed on the device store (no new UI). | save() is now a fail-fast transaction. |
| D10 | Live edits: every edit updates the immutable store, the controller cache (`set_*`, never sharing arrays with React state) and sends the single-item packets (keymap runs ≤ 27 codes, advanced key per index, RGB per index/base, DK per slot). | Keeps live preview and makes a later `save()` write exactly what the UI shows. |
| D11 | Lighting speed = the integer device value (slider 1–100, label `{n}%`). The rainbow preset computes a colour per key from the real layout geometry and applies it per key (upstream formula). | Matches upstream semantics; fixes the ×1000 bug. |
| D12 | Performance: selecting a key loads **all** its values (incl. actuation/deactivation); mm↔fraction conversions are symmetric (`mm = fraction × 4.0`, lower deadzone stored as `(4.0 − bottom)/4.0` and loaded inversely). | Stops selection from corrupting settings. |
| D13 | Null-bind UI behaviors map to firmware `DynamicKeyMutexMode`: last-input→`LAST_PRIORITY(1)`, abs-priority-1→`KEY1(2)`, abs-priority-2→`KEY2(3)`, neutral→`NEUTRAL(4)`, distance→`DISTANCE(0)`. All layers are `selectedLayer − 1`. | Firmware enum (libamp `dynamic_key.h`). |
| D14 | DKS: UI bitmap ↔ firmware `key_control` via a pure codec (§6.3). Press/release distances from actuation (1.5 mm, as today) and the bottom-out control. Target = first selected key on the selected layer. | Firmware semantics (libamp `dynamic_key_s_update_state`). |
| D15 | Tap-hold default hold = Left Ctrl encoded as `KeyLeftCtrl<<8`; all pickers emit full encoded keycodes (incl. sub-codes) from the single catalog (§6.1). | One encoder, tested. |
| D16 | Debug tracking polls `request_debug_at([key])` in an async loop (controller suppresses overlap), consumes `updateDebugData`, and pushes points straight into Chart.js (no React state per sample). | Performance + correctness. |
| D17 | i18n: dictionaries ported verbatim; the 6 missing keys added (en+zh); unused keys and zh-only `demo.*` removed; `zh` is typed `Record<TranslationKey, string>`. Hard-coded English strings stay hard-coded (parity). | Type-checked completeness. |
| D18 | PWA: vite-plugin-pwa `generateSW` + `registerSW` with `registerType: 'prompt'` and no update UI: a new deployment waits as a waiting worker and is applied (page reload) only while the app is idle — no keyboard session and no firmware update (`src/app/update-policy.ts`). Identical manifest; a self-unregistering `/service-worker.js` stub for any legacy registration. | Offline actually works; an update can never interrupt a flash or a connected keyboard, and the running page keeps loading its old precached chunks after an `rsync --delete` deploy. |
| D19 | Hosting contract unchanged: static files in `build/`, trailing-slash URLs (`/remap/`), per-route `index.html` copies so deep links work on the current server, same rsync deploy. | No server change needed. |
| D20 | Toolchain: TypeScript 6.0.x (typescript-eslint supports `<6.1`; TS 7 native breaks type-aware lint). Tailwind **engine pinned at 4.1.10** via `@tailwindcss/postcss` (the 4.1.10 Vite plugin does not support Vite 8). lucide-react pinned to 0.511.0 (same SVGs as lucide-svelte 0.511.0), chart.js 4.4.9, chartjs-plugin-zoom 2.2.0, tinycolor2 1.6.0, kle-serial 0.15.1. Upgrades are separate, screenshot-verified changes. | Pixel parity; supported lint. |

## 4. Target architecture

### 4.1 Stack and why

| Concern | Choice | Why (and what was rejected) |
|---|---|---|
| UI | React 19.3, function components, TSX | Target platform. React Compiler not enabled (keeps toolchain simple; memoize where measured). |
| Build | Vite 8 + `@vitejs/plugin-react` 6 | Already Vite-based; fastest path. |
| Routing | React Router 8, library mode (`createBrowserRouter`, lazy route modules) | 10 static routes, prefix-active nav, trailing-slash tolerant matching, code-splitting. No loaders/SSR needed (data comes from the device). Rejected: TanStack Router (type-safe params unnecessary), hand-rolled router. |
| Device/server state | `DeviceSession` service + Zustand 5 vanilla store of immutable snapshots | The device pushes data via events from outside React; many routes read slices; selectors keep the ~90-key keyboard and debug streaming from re-rendering the tree. Rejected: TanStack Query (HTTP cache semantics don't fit HID push + packets), Context+reducer (broad re-renders, provider stacking). |
| Shared UI state | Zustand stores only where state is shared across layout and pages (key selection/layer, layout options, profiles) | Smallest scope that works; everything else is component state. |
| Preferences | i18n + theme modules with tiny external stores and `localStorage` persistence under the **same keys** | Existing users keep their settings. |
| Styling | Tailwind (engine 4.1.10) + global `styles/app.css` ported verbatim + CSS Modules for former Svelte `<style>` blocks | Same generated utilities and cascade; CSS Modules support `:global()` like Svelte. |
| Animation | `lib/transitions`: ports of Svelte's `slide`, `fade`, `flip`, and remap `slideMove`, run through the Web Animations API, plus `<Presence>` for enter/exit | Exact easing/duration semantics, zero dependency. Rejected: motion/framer (approximate curves, ~30 kB). |
| Charts | chart.js + zoom plugin, lazy-loaded on Debug | Existing, framework-agnostic. |
| Firmware update | `WebDfuDevice` + `controller.detect_bootloader()` from `emi-keyboard-controller` | Tested DfuSe implementation. |
| Tests | Vitest 5 + jsdom + Testing Library; Playwright 1.63 (Chrome channel); shared virtual libamp keyboard | See §9. |
| Lint/format | ESLint 10 flat config, typescript-eslint (type-aware), react-hooks, jsx-a11y; Prettier 3 (existing options, Svelte plugin removed) | Repo had no linter. |
| Package manager | npm 11 with `package-lock.json` (switched from yarn 1 on 2026-10-01 at the product owner's request; npm resolved identical versions); `bun.lock` removed | One lockfile, no corepack needed. |

### 4.2 Repository layout (after migration)

```
index.html                  Vite entry (ported from src/app.html)
vite.config.ts              React, PWA, controller alias, postcss/tailwind, vitest
tsconfig.json               solution file → app, node, controller projects
tsconfig.controller.json    composite project checking src-controller with its own options
eslint.config.js
playwright.config.ts
public/                     favicon.png, alipayqr.jpg, service-worker.js (kill-switch stub)
src-controller/             vendored upstream emi-keyboard-controller + UPSTREAM.md (commit, date, local changes: none)
src/
  main.tsx                  theme bootstrap before first paint, PWA register, render
  app/                      App, route table, trailing-slash normalization
    layout/                 AppShell, Sidebar, MainContentArea, Toolbar, LayerSelector,
                            LayoutConfigDropdown, ConnectionScreen, LoadingOverlay,
                            NotConnectedFallback, SmallScreenWarning, ThemeSelector,
                            LanguageSwitch, DarkModeToggle, NotFound
  features/
    device/                 models registry, DeviceController adapter type, DeviceSession,
                            snapshot mapping, store, hooks, debug stream
    keyboard/               KeyboardRender, Key, key-selection store, layout parsing/variants,
                            layout-options store, per-page label builders
    keycodes/               single catalog, encode/decode, display names
    remap/ performance/ lighting/ dynamic-keys/ debug/ profiles/ settings/ firmware-update/ about/
  components/ui/            primitives with ≥2 real users, e.g. ThemedSlider, Toggle, Modal,
                            NoKeySelected, DualRangeSlider (actuation + deadzone), ConfirmationModal
                            (profiles + settings)
  lib/  i18n/ theme/ transitions/ storage.ts
  styles/app.css
  testing/                  virtual keyboard (libamp simulator), render helpers
e2e/                        Playwright journeys + parity capture
docs/                       architecture, migration notes, parity log, specs/plans
```

Features own their `components/`, `hooks/`, `model/` sub-folders only when needed. Each feature
exposes a small `index.ts` (its page and public components); cross-feature imports go through
that index.

### 4.3 TypeScript configuration

- App: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `isolatedModules`.
- `src-controller` is a **project reference** (`tsconfig.controller.json`, composite,
  declaration-only) compiled with its own options; app code sees it through declarations, so
  vendored code is never re-checked under app flags. `tsc -b` is the type-check command.
- Vite aliases `emi-keyboard-controller` → `src-controller/src/index.ts` (no pre-build step).
- `LibampKeyboardController` is not exported from the package root, so the app defines a
  structural `DeviceController` interface in `features/device/controller.ts` containing exactly
  the members the app calls: `detect`, `connect`, `disconnect`, `addEventListener`,
  `removeEventListener`, `get_layout_json`, `get_layout_labels`, `get_feature`,
  `get_firmware_version`, `get_profile_num`, `get_profile_index`, `set_profile_index`, the
  `get_*`/`set_*` pairs for advanced keys, keymap, RGB base, RGB configs and dynamic keys,
  `save`, `flash`, the five `send_*_packet` methods, `request_debug_at`, `start_debug`,
  `stop_debug` (libamp only streams debug data while its debug config bit is on), `system_reset`,
  `factory_reset`, `enter_bootloader` and `detect_bootloader`. Each registry entry is checked
  with `satisfies`, so a controller API change breaks this one module at compile time.

## 5. Device layer (`features/device`)

### 5.1 Connection state machine

```
idle ──connect()──▶ selecting (browser picker) ──device──▶ connecting (open) ──▶ loading
  ▲                        │cancel/none                        │fail            │updateData
  │                        ▼                                   ▼                ▼
  └─────────────────── error{message} ◀──────── updateDataError / 3 s timeout ── ready{model}
ready ──deviceDisconnected / disconnect()──▶ idle
ready ──updateDataStart…updateData (device-initiated reload, profile switch)──▶ ready (reloading flag)
```

- Listeners are attached **before** `controller.connect()`.
- Error messages keep today's texts where they exist ("No compatible keyboards found",
  "No compatible controller found for detected device", "Failed to connect to keyboard").
- On `ready` the app navigates to `/remap/` (as today).

### 5.2 Snapshot model

Controller caches are mapped at the boundary into immutable, plain domain types:

```ts
interface DeviceSnapshot {
  model: ModelInfo;                        // id, display name, layout (parsed once), layout labels
  advancedKeys: readonly AdvancedKeyConfig[];   // fractions 0..1 as on the wire
  keymap: readonly (readonly number[])[];       // layers × keys
  rgbBase: RgbBaseConfig; rgbKeys: readonly RgbKeyConfig[];
  dynamicKeys: readonly DynamicKeySlot[];       // discriminated union, targets rebuilt from keymap
  profileIndex: number; profileCount: number;
  feature: FeatureFlags; firmwareVersion: FirmwareVersion;
}
type DynamicKeySlot =
  | { kind: 'none' }
  | { kind: 'stroke'; bindings: Keycodes4; keyControl: Bytes4; distances: StrokeDistances; target: KeyLocation | null }
  | { kind: 'modTap'; tap: number; hold: number; durationMs: number; target: KeyLocation | null }
  | { kind: 'toggle'; binding: number; target: KeyLocation | null }
  | { kind: 'mutex'; bindings: readonly [number, number]; mode: MutexMode; targets: readonly [KeyLocation | null, KeyLocation | null] };
```

Snapshots are rebuilt from the controller on `updateData`, and patched immutably by commands.

### 5.3 Commands (the only way UI changes the keyboard)

`setKeycodes(layer, keyIds, keycode)`, `setAdvancedKeys(keyIds, config)`, `setRgbBase(cfg)`,
`setRgbKeys(entries)`, `applyDynamicKey(draft)`, `removeDynamicKey(slot)`,
`removeDynamicKeysOfKind(kind)`, `save()`, `switchProfile(index)`, `systemReset()`,
`enterBootloader()`, `factoryReset()`, `startDebug(keyId)` / `stopDebug()`,
`detectBootloader()`. Each command: validate → update controller cache (fresh copies) → send
packets (controller queue serializes) → patch store. Failures are logged and surfaced as
`store.lastError` (no new UI).

### 5.4 Debug stream

`updateDebugData` is forwarded to a separate emitter (not the store). The debug feature
subscribes, reads the updated advanced keys from the controller, and appends to the chart
imperatively.

## 6. Domain modules (pure, exhaustively unit-tested)

### 6.1 Keycodes (`features/keycodes`)

Encoding (libamp `keycode.h`): `code | sub<<8`, i.e. modifiers `mod<<8`; layer control
`op<<12 | layer<<8 | 0xA6`; collections (mouse 0xA5, consumer 0xA8, system 0xA9, joystick 0xAA,
MIDI 0xAB/0xAC, macro 0xAD) `code | sub<<8`; keyboard operation `0xFE | sub<<8` where
`sub < 0x20` is an operation (reboot 0, factory reset 1, save 2, bootloader 3, reset-default 4,
brightness ±5/6, calibrate 7, recovery 8, profile0–3 0x10–0x13) and
`sub = action<<6 | (0x20 + configIndex)` toggles a keyboard config (action 0 off, 1 on,
2 toggle); dynamic key `0xA7 | slot<<8`; user `0xFD | n<<8`; transparent `0xFF`.
One catalog of palette entries (label + encoded keycode + category) feeds the Remap tabs and the
advanced-key pickers; labels stay per-palette (parity), encodings come from shared
constructors. `describeKeycode()` ports `keyCodeToString` with the renamed enums.

### 6.2 Units and layout

`mm = fraction × 4.0` (display and conversion; the 1.0–4.0 "switch travel" badge only bounds
sliders, as today). KLE parsing with `@ijprest/kle-serial`; key id = numeric `labels[0]`;
layout group = `labels[8]` "`group,option`"; visible keys = keys whose group option is selected.
Layout-options store keeps the `zellia-layout-config` schema and the existing index mapping
(0 split backspace, 1 right-shift split, 2 bottom row ×4, 3 left-shift split).

### 6.3 DKS codec

UI model (unchanged): per binding, 4 stage nodes with actions `HOLD=0` (no change),
`PRESS=1`, `RELEASE=2`, `TAP=3`; intervals as computed by `dksGetIntervals`.
Firmware (libamp): `key_control[b]` = 4 × 2 bits, stage `s` at bits `2s`,
`RELEASE=0`, `TAP=1`, `HOLD=3` — the state applied when crossing stage `s`
(0 press-begin, 1 press-fully, 2 release-begin, 3 release-fully).
Encode: interval `[s,e]` (s<e) → stages `s…e−1 = HOLD`, stage `e = RELEASE` unless another
interval or tap starts at `e`; tap at `i` → `TAP`; everything else `RELEASE`.
Decode: maximal `HOLD` runs → PRESS at run start and RELEASE at the first non-HOLD stage (a run
reaching stage 3 is clamped to end at 3); `TAP` → TAP. Round-trip is tested for all 256
firmware values and all UI bitmaps; lossy cases are enumerated in tests.

### 6.4 Dynamic-key binding

`rebuildTargets(keymap, slots)` (upstream `mapBackDynamicKey`), `bindDynamicKey`,
`unbindDynamicKey` (restore targets to the DK's own binding), `findSlotFor(target)`,
`firstFreeSlot()`. Mutex key order = keymap scan order (layer-major, key id ascending).

### 6.5 Label builders

Per-route keycap labels (performance values, remap keycodes incl. DK kind names, lighting mode
names) as pure functions of (visible keys, snapshot slice, layer), memoized per input.

## 7. UI layer

### 7.1 Svelte store audit

| Svelte store | React destination | Why |
|---|---|---|
| `keyboardAPI` / `keyboardConnectionState` | `DeviceSession` + device store | App-global device session, event-driven |
| `api.svelte.ts` | deleted | Dead, stale API |
| `ControllerStore` config stores | device store snapshot (read-only to UI) | Device is the source of truth |
| `ControllerStore.layoutLabels`, `LayoutStore.keyboardLayout` | `model` in device store | Static per model |
| `selectedLayoutIndices` | derived from layout options + labels | Pure derivation |
| `SelectedKeysStore` + `SelectedLayerStore` | `keySelection` store (features/keyboard) | Shared by layout keyboard and pages |
| `LanguageStore` | `lib/i18n` (key `language`) | Global preference |
| `DarkModeStore` | `lib/theme` (keys `darkMode`, `themeColor`), identical root classes and `--color-primary` values | Global preference; default dark |
| `glassmorphismMode` | removed (class always applied) | Constant |
| `ProfileStore` | `features/profiles` persisted store (key `keyboard-profiles`, same schema, validated) | Feature-owned persistence |
| `globalConfigurations` | removed; derived from device (D5) | Duplicated server state |
| `LayoutConfigDropdown` local state | `features/keyboard` layout-options store | Read by keyboard render + dropdown |

Everything else (panel sliders, active tabs, editor drafts, modal flags) is component state.

### 7.2 Styling and parity rules

- Port markup 1:1: same element tree, `class`/`style` strings, inline `calc(… var(--ui-scale))`.
- Svelte `<style>` → `Component.module.css`, selectors unchanged, `:global()` preserved.
  Class names referenced from outside a component (e.g. `label-cell-N`, `keycap`,
  `performance-page-keys`, `lighting-page-keys`, `glassmorphism-*`) stay global.
- `app.css` ported verbatim (Tailwind v4 `@theme`, `@custom-variant dark`, layers).
- The `<html>` element carries `dark`/`glassmorphism` classes and `lang` exactly as today.

### 7.3 Transitions

`slide` (height/padding/margin/border, default 400 ms `cubicOut`, `axis`), `fade` (linear),
`flip`, and the remap `slideMove`; `<Presence>` implements Svelte 5 local-by-default semantics
(`appear`/global opt-in for the sidebar Save/Disconnect `in:slide|global`). Keyframes are
generated by sampling `css(t)` like Svelte and played with WAAPI; unit-tested against Svelte's
formulas. Respect `prefers-reduced-motion` only where the Svelte app did (it did not globally;
parity).

### 7.4 Accessibility

Keep the visible UI identical; improve non-visual semantics where missing (button `type`,
`aria-pressed` on toggles, `aria-label` on icon buttons, dialog roles, focus return and Escape
on modals, `aria-live` on connection errors). Keyboard shortcuts preserved (Remap: Ctrl+A
toggle-select-all, Esc deselect; Performance/Lighting: Ctrl/⌘+A, Ctrl/⌘+Esc).

## 8. Feature behavior contracts

The Svelte source at the baseline is the reference for markup/copy; the items below are the
behavior to implement (✱ = deliberate change, logged in the parity log).

- **Shell:** layout visible on `/` and sidebar routes; `xl` breakpoint small-screen warning;
  sidebar nav (Performance, Remap, Lighting, Dynamic Keys, Debug, Settings, Update, About),
  Profiles link, connection status, Save (✱ works; label "Save" via new i18n key) and
  Disconnect; theme colors, language, dark mode. Toolbar (layer selector on Performance/Remap,
  profile dropdown, layout dropdown) and global keyboard are hidden on About, Profiles, Debug,
  Settings, Update. Pages other than `/` show *No Keyboard Connected* when disconnected; `/`
  shows the connection screen; connected `/` redirects to `/remap/`.
- **Keyboard/selection:** left-press toggles a key; drag-enter with button held toggles;
  selection disabled state; select-all uses max visible id + 1; key positions animate with the
  existing CSS transitions when layout options change.
- **Remap:** five tabs with the vertical `slideMove` transition (350 ms, direction by tab
  order); clicking a palette key with no selection shows the 3 s toast; assigning writes to all
  selected keys on the current layer; brush per §1.4; labels per §6.5.
- **Performance:** controls, clamps and animations as today; values apply to all selected keys
  on change and to newly selected keys (brush); loading per D12; travel badge bounds sliders.
- **Lighting:** base panel Apply → base config; sub panel Apply → selected keys, or all keys
  when none selected; rainbow preset per D11; direction dial; labels per §6.5.
- **Dynamic keys:** dashboard (mode cards + configured table with ✱ real count) and the four
  editors; allow-selection off on the dashboard; back clears selection; apply/delete/reset per
  D4–D6, D13–D15; UI-only fields per D5. DKS "Reset" removes the selected key's DKS from the
  device (if any) and loads the existing preset (Esc/Enter/Space/Backspace with the preset
  bitmaps) into the editor; tap-hold/toggle "Reset all" removes every DK of that kind.
- **Debug:** Key Tracking (select via modal keyboard; chart per D16; clear, reset zoom, theme
  colors) and Key Test (keydown/keyup log) as today.
- **Profiles:** 16 slots, first 4 defaults, create/duplicate/restore/delete (hold-to-delete
  1.5 s)/import/export, error and confirmation modals; activation per D7.
- **Settings:** Restart (immediate), Bootloader and Factory Reset (✱ confirmation); a confirmed
  Bootloader opens the Update page with an update session started (✱ §1.8).
- **Update:** identical 7-step UI and copy; driven by WebDFU: choose `.bin` (1 KiB–1 MiB) →
  `enter_bootloader()` → `detect_bootloader()` picker + open → erase → (connect step completes
  immediately) → download with progress → manifest/finish; abort and error states. WebUSB's
  picker needs transient user activation (~5 s in Chromium): try `detect_bootloader(true)`
  first (already-authorized device), and open the picker only from a user click, reusing the
  flasher's existing buttons/prompts. A silently found device is flashed only if it appeared
  after the app asked the keyboard to reboot into its bootloader (a bootloader that was already
  attached could be another board); anything else needs the click. The page renders with or
  without a keyboard (✱ §1.7: without one, the "enter bootloader" step is skipped and the
  bootloaders of all supported models are searched). The update session lives outside the page
  (D3); `useFirmwareUpdateSession().active` tells the shell and the update policy that a flash
  is in progress.
- **About:** static content, GitHub link, donation QR; no "Support Development" button (✱ §1.9).

## 9. Verification

1. **Unit** (Vitest): keycode codec and catalogs (every palette entry decodes to its label
   intent; the two catalogs agree), DKS codec (exhaustive), mutex mapping, DK binding/targets,
   units, layout variants, label builders, rainbow math, profile store migration, i18n
   completeness, theme persistence/root classes, transitions keyframes.
2. **Integration** (Vitest + jsdom + Testing Library + virtual keyboard): connect/match/load,
   unsupported-firmware timeout, disconnect, save/flash (incl. failure), every command's wire
   packets (layer/start/length/codes, advanced-key payloads, RGB pages, DK payloads),
   profile switch reload, debug stream.
3. **E2E** (Playwright, Chrome, injected virtual `navigator.hid`/`navigator.usb`): connect →
   remap → save; performance; lighting; each dynamic-key mode incl. delete; debug tracking;
   profiles import/export/switch; settings confirmations; theme/language persistence; offline
   reload after SW install; firmware update happy path + abort on a virtual DFU device.
4. **Visual parity:** the baseline worktree (`4f232a2`, controller alias pointed at the synced
   upstream controller) and the React build are driven by the **same** virtual keyboard and
   state script; screenshots per route × state × light/dark × en/zh at 1440×900 (plus 2560 for
   `--ui-scale`) compared with pixelmatch. Differences must be zero or listed in the parity log.
5. **Quality gates per unit:** `tsc -b`, ESLint, Prettier check, tests, `vite build`, no dead
   code, a11y review, parity capture for touched screens.

The virtual keyboard implements the upstream libamp protocol (code | id | type | body; replies
echo code/id/type) for a Zellia Starlight: version 0.1, config, 70 advanced keys, 5×64 keymap,
RGB base + per-key, 32 dynamic keys (seeded with one of each kind), 4 profiles with
config-changed notifications, debug packets with a synthetic travel curve.

## 10. Migration strategy and parallel work

- **Reference:** read-only worktree `../worktrees/svelte-baseline` at `4f232a2` (the Svelte
  source never needs to live on the React branch).
- **Wave 0 (lead, sequential):** sync `src-controller` to upstream + `UPSTREAM.md` + its tests;
  replace SvelteKit tooling with the React scaffold, tooling, global CSS, contracts and stubs
  (feature `index.ts` stubs, store/service interfaces) so workers can start in parallel.
- **Wave 1 (parallel worktrees):** A device layer + virtual keyboard · B domain modules ·
  C UI foundation (i18n, theme, transitions, primitives, storage) · D tooling, CI, PWA, deploy,
  parity harness.
- **Integration 1 (lead):** review, merge, full gates.
- **Wave 2 (parallel worktrees):** E shell + keyboard · F remap + profiles · G performance +
  lighting · H dynamic keys · I debug + settings + about + firmware update.
- **Integration 2 (lead):** review, merge, parity capture, e2e, fixes.
- **Wave 3:** cleanup (dead files, deps, config), docs (architecture, state, device API, testing,
  deployment, migration decisions), final full validation, bundle inspection.

Ownership is by directory; no two workers edit the same files. Shared contracts are created by
the lead before a wave starts; changes to them go through the lead. Each worker: inspect the
Svelte reference, implement, test, format, type-check, commit small meaningful commits (no AI
attribution trailers), report changes/decisions/tests/limitations.

## 11. Risks and open items

- Upstream controller keeps moving (libamp added layout options on 2026-09-29); we pin a commit
  and document how to re-sync.
- The DKS UI model cannot represent a hold that continues through stage 3; such device values
  are displayed clamped (documented, tested).
- The firmware DKS encoding cannot express a release plus a tap (or a release plus a new press)
  at the same stage: an interval ended by a tap is sent as one press that ends shortly after the
  tap stage, and 56 editor bitmaps reload in a normalized form (e.g. the Reset preset's Space
  `[0,1]+[1,3]` reloads as `[0,3]`). Enumerated in `dks-codec.test.ts`; logged in the parity log.
- A `switchProfile()` sent while a device-initiated reload is already running can resolve on the
  older load; the follow-up reload corrects the snapshot (documented in `session.ts`).
- The layout dropdown's fixed group mapping is Starlight-shaped; other models may show
  imperfect options (unchanged behavior, documented).
- No real hardware in CI: protocol correctness rests on upstream's tests plus the simulator;
  a manual hardware smoke checklist ships with the PR.
