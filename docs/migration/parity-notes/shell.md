# Parity notes: app shell and keyboard (worker E)

Scenarios: `e2e/parity/scenarios/welcome.ts` and `e2e/parity/scenarios/shell.ts`, captured in
both apps in dark/light × en/zh × 1440×900/2560×1440 with
`E2E_PORT=4311 corepack yarn parity --grep "welcome|shell-"`.

Connected scenarios hide the feature page below the toolbar and the keyboard (it belongs to
workers F–I and has scenarios of its own), so they compare the sidebar, the toolbar and the
keyboard. `shell-settings` hides the whole page region.

## Results

Run of 2026-09-30 (160 captures, strict comparison).

| Scenario                                      | Identical | Differences                                                       |
| --------------------------------------------- | --------- | ----------------------------------------------------------------- |
| `welcome`                                     | 7/8       | one capture with a raster glitch (see noise); 8/8 on re-run       |
| `shell-not-connected`                         | 7/8       | one capture with a raster glitch in the baseline; 8/8 on re-run   |
| `shell-not-found`                             | 8/8       |                                                                   |
| `shell-theme-colors`                          | 8/8       |                                                                   |
| `shell-connection-error`                      | 8/8       |                                                                   |
| `shell-loading-overlay`                       | 8/8       |                                                                   |
| `shell-loading-config`                        | 0/8       | PL-003                                                            |
| `shell-unplugged`                             | 0/8       | PL-004                                                            |
| `shell-settings`                              | 0/8       | PL-002 (Save label)                                               |
| `shell-remap`, `-selection`, `shell-layout-*` | 0/8       | profile dropdown stub (F), PL-002, PL-016, PL-022                 |
| `shell-remap-layer-2`, `-layer-4`             | 0/8       | profile dropdown stub (F), PL-002, PL-022                         |
| `shell-remap-layer-3`                         | 0/8       | profile dropdown stub (F), PL-002, PL-017, PL-022                 |
| `shell-performance`                           | 0/8       | profile dropdown stub (F), PL-002, PL-005                         |
| `shell-lighting`                              | 0/8       | profile dropdown stub (F), PL-002                                 |
| `shell-dynamic`                               | 0/8       | profile dropdown stub (F), PL-002, PL-016, PL-022, PL-023, PL-024 |

Keyboard and toolbar check without the pending profile dropdown: the connected scenarios were
captured once more with the baseline's profile dropdown and both apps' Save button hidden (a
local, uncommitted scenario file). Then `shell-settings` is identical (one noise pixel in one
variant), `shell-lighting` differs only by keycap corner noise (0–32 px), `shell-remap-layer-2`
and `-4` only at key 64 (PL-022, 240–346 px), and every other connected scenario only at the
keycaps of PL-005, PL-016, PL-017, PL-022, PL-023 and the layer selector of PL-024 — at both
viewports, in every theme and language.

## Deviations

Rows for `docs/migration/parity-log.md` (same format; links are relative to
`docs/migration/`, as in the log). Screenshots are the `dark-en-1440x900` captures; every
variant shows the same difference.

| ID     | Screen / route          | State and captures                                                                                                         | Deviation                                                                                                                                                                                              | Reason                                     | Before                             | After                            | Status |
| ------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ---------------------------------- | -------------------------------- | ------ |
| PL-002 | sidebar                 | connected; every connected `shell-*` capture, e.g. `shell-settings--dark-en-1440x900`                                      | The Save button reads "Save" / "保存" (was the raw key `ui.save`) and saves (`deviceSession.save()`).                                                                                                  | §8 Shell, D9, D17                          | [before](parity/pl-002-before.png) | [after](parity/pl-002-after.png) | logged |
| PL-003 | `/` → `/remap/`         | connecting to a slowly answering keyboard; `shell-loading-config--*`                                                       | "Loading configurator interface..." stays until the first configuration arrives; the baseline opened `/remap/` at once and showed the KLE legends (key ids, layout-group tags) until its data came in. | D2                                         | [before](parity/pl-003-before.png) | [after](parity/pl-003-after.png) | logged |
| PL-004 | `/`                     | keyboard unplugged on `/remap/`; `shell-unplugged--*`                                                                      | Returns to the connection screen ("Waiting to connect", "Get Started"); the baseline ignored the unplug and kept showing the keyboard.                                                                 | D3                                         | [before](parity/pl-004-before.png) | [after](parity/pl-004-after.png) | logged |
| PL-022 | keycaps on `/remap/`    | connected; key 64 on every layer (`shell-remap*--*`), keys 64–66 with a split spacebar (`shell-layout-variants-closed--*`) | Keys without a keymap entry are blank; the baseline showed their KLE legends (`64` / `2,0`, `65` / `2,1`, …).                                                                                          | intended UI; src-controller/UPSTREAM.md    | [before](parity/pl-022-before.png) | [after](parity/pl-022-after.png) | logged |
| PL-023 | keyboard on `/dynamic/` | connected; `shell-dynamic--*`                                                                                              | Keycaps show the selected layer's keycodes and dynamic-key kinds like Remap; the baseline showed the KLE legends (key ids, layout-group tags).                                                         | intended UI                                | [before](parity/pl-023-before.png) | [after](parity/pl-023-after.png) | logged |
| PL-024 | toolbar on `/dynamic/`  | connected; `shell-dynamic--*`                                                                                              | The layer selector is shown; the Svelte list of layer-selector pages still named the old `/advancedkey` route.                                                                                         | bug: stale route in `LAYER_SELECTOR_PAGES` | [before](parity/pl-024-before.png) | [after](parity/pl-024-after.png) | logged |

Also visible on the shell's keyboard, logged with screenshots by the workers whose pages show
them: PL-005 (performance values on the keycaps, `shell-performance--*`, worker G), PL-016
(modifier names, `shell-remap--*`, worker F) and PL-017 (keyboard operation and config names,
`shell-remap-layer-3--*`, worker F).

No new deviations (`E-n`).

## Expected until the other Wave 2 branches are merged

- **Toolbar profile dropdown (worker F).** The stub renders nothing: in every connected capture
  the toolbar is 58 px instead of 74 px high, everything below it (the keyboard included) sits
  16 px higher, and the dropdown's own region differs. See the check above.
- **Page regions (workers F–I).** Hidden in these scenarios; the feature scenarios compare them.

## Known capture noise

- **Keycap corners.** While other content of the page differs (the Save label of PL-002, the
  keycap labels of PL-016/PL-017/PL-022), Chrome rasterizes the rounded corners of some keycaps
  differently: one or two pixels per corner swap between the same two anti-aliasing patterns.
  Layout and computed styles of all keycaps are identical in both apps (DOM and
  `getComputedStyle` compared node by node), and with the other differences hidden the corners
  match exactly. Expect up to a few dozen such pixels per connected capture while PL-002 applies.
- **Raster glitches.** About one capture in 10–20, in either app, gets a small block of wrong
  pixels (roughly 7×7 px, 40–70 px in total) over text; a re-run of the capture is identical.

## Implementation notes

- `+layout.svelte`'s `:global(html)` rule is `src/app/layout/AppShell.css` (a plain stylesheet:
  Vite drops CSS modules whose exports are unused), with `#f9fafb`, the value the Svelte build
  emitted for `theme(--color-gray-50)`.
- Lightning CSS (Vite 8's CSS minifier) drops a `backdrop-filter` declaration that precedes its
  `-webkit-backdrop-filter` twin in the same rule; the Svelte build kept both. The language
  switch slider lists the prefixed declaration first. (app.css loses the same declarations in
  both builds, through Tailwind's optimizer, so it matches as is.)
- React re-applies only the inline style properties that changed, so the Get Started / Go to
  Home buttons' `background` plus `background-size` are one `background` value with per-layer
  sizes (identical computed style), and pointer moves do not reset the sizes.
- Svelte renders `</span> {expr}` as one text node (`" Control"`); the sidebar title renders
  that single text node as well (two text nodes shifted the italic span by 0.01 px).
- Svelte's `animate:flip` on the keyboard's key wrappers is not ported: the wrappers are empty
  blocks that never move, so the flip never ran. Keys keep their element across layout variants
  (keyed by id) and move with their own `transition: all 0.3s ease-out`, as in Svelte.
