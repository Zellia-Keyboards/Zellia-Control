# Parity notes: performance + lighting (worker G)

Merged into the [parity log](../parity-log.md) on 2026-10-01; ids are final.

Scenarios: `e2e/parity/scenarios/performance-lighting.ts`, 31 in all: 10 on Performance
(`performance-*`) and 21 on Lighting (`lighting-*`); the lighting redesign added a 22nd,
`lighting-keys-mixed` ([below](#lighting-redesign-2026-10-01)). Fast mode (product owner decision,
2026-10-01): captured in the `dark-en-1440x900` variant only, with
`E2E_PORT=4313 npm run parity -- --workers=2 --grep '(performance|lighting)-.*--dark-en-1440x900'`;
the lead runs the full matrix once all pages are merged.

Rows for [parity-log.md](../parity-log.md), in its table format. PL-005 to PL-007 are the
planned deviations this worker implemented; PL-031 to PL-034 are the deviations found while
porting. Screenshots are the `dark-en-1440x900` captures.

## Results

Run of 2026-10-01 (Chrome 154, strict comparison): 31 captures, 0 identical, 31 different, no
page errors in either app. Run again after the review fixes (reloads, rapid trigger mode, setups
without fixed sleeps): the same results; each app's captures differ from the first run's only by
the corner anti-aliasing noise below.

These runs predate the merge of worker F's branch: the toolbar's profile dropdown was a stub that
rendered nothing, so the toolbar was 58 px instead of 74 px high and everything below it (the
keyboard and the whole page) sat 16 px higher, and every capture differed over most of the screen
(13–26 % of the pixels; 0.8 % for the three scenarios scrolled to the end of the page, where the
bottom edges line up again). To compare the pages themselves, the same scenarios were captured
once more with the baseline's profile dropdown and both apps' Save label hidden, and on
Performance the keycap legends (a local, uncommitted scenario file). Every difference left is a
deviation below or capture noise. The keycap legends hidden on Performance are PL-005 as well: in
every `performance-*` capture React's keycaps show each key's values and the baseline's are blank
(or read NaN on the selected keys with rapid trigger on).

| Scenario                                                           | Differences with the dropdown, the Save label and (on Performance) the keycap legends hidden (px) | Explained by                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `performance-default`                                              | 129                                                                                               | PL-005 (keycaps), PL-002 (Save icon), noise       |
| `performance-keys-selected`                                        | 1 542                                                                                             | PL-005, PL-031, PL-002                            |
| `performance-keys-selected-rapid-trigger`                          | 7 983                                                                                             | PL-005 (the baseline's values read NaN), PL-002   |
| `performance-rapid-trigger-key-selected`                           | 213 280                                                                                           | PL-005 (the baseline keeps rapid trigger off)     |
| `performance-rapid-trigger`, `performance-travel-3mm`              | 1 146 each                                                                                        | PL-005 (keycaps), PL-034, PL-002                  |
| `performance-rapid-trigger-separate`                               | 2 178                                                                                             | PL-005 (keycaps), PL-034 (both sliders), PL-002   |
| `performance-low-actuation`, `performance-travel-tooltip`          | 114 each                                                                                          | PL-005 (keycaps), PL-002 (Save icon)              |
| `performance-travel-dot`                                           | 5 384                                                                                             | PL-005 (keycaps), PL-033, PL-002                  |
| `lighting-default`, `-scrolled`, `-edited`, `-rainbow-preset`      | 10 322–10 324                                                                                     | PL-006 (both speeds), PL-032, PL-002              |
| `lighting-base-mode-off`, `-rainbow`, `-wave`, `-base-applied`     | 10 322–10 837                                                                                     | PL-006, PL-032, PL-002; `-wave` one raster glitch |
| `lighting-key-mode-*` (11 modes), `lighting-key-applied-selection` | 2 692–2 694                                                                                       | PL-006, PL-002 (clicking a key mode ends PL-032)  |
| `lighting-rainbow-applied`                                         | 6 744                                                                                             | PL-007, PL-006, PL-002                            |

PL-002 (the sidebar's Save label, logged by worker E): with both labels hidden, the Save icon
still sits elsewhere, because the baseline's raw `ui.save` label is wider than "Save".

## Lighting redesign (2026-10-01)

The Lighting page follows the
[lighting redesign spec](../../superpowers/specs/2026-10-01-lighting-redesign-design.md): edits
wait for Save, the key panel edits its targets (the selected keys, or all keys while none is
selected) and shows their shared values, and every mode is explained. The
[parity log](../parity-log.md) records what that changes on screen as PL-047 to PL-050 and updates
PL-007 and PL-032.

Scenario changes in `e2e/parity/scenarios/performance-lighting.ts`:

- `openLighting` waits for the base panel's Blank button: the React panels have no Apply button
  to wait for.
- `lighting-base-applied` and `lighting-key-applied-selection` press Apply only in the baseline,
  which sends its edits with it (`applyInBaseline`); the React app has staged the same edits, so
  both apps show the same values. `lighting-base-applied` then removes the focus, which the React
  direction input otherwise keeps (with its spinner) because no Apply click takes it.
- New `lighting-keys-mixed`: keys 0 (Static) and 1 (Linear), each in its own colour, selected: the
  React key panel shows "2 keys", no pressed mode, the mixed-modes line and Mixed (PL-048); the
  baseline shows key 0.

Integration run of 2026-10-01 (all eight variants, 176 lighting captures, strict comparison): 0
identical. The headers keep the height they had with Apply (the baseline's Apply button is 38 px
tall with its glass border), so up to the first explanation line both panels line up with the
baseline's in every variant.

| Scenario                                           | Differences                                                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `lighting-default`, `-scrolled`, `-rainbow-preset` | PL-047 (no Apply, the save hint, "All keys"), PL-048 (no pressed key mode, Mixed), PL-049, PL-006, PL-032 |
| `lighting-keys-mixed`                              | PL-048 ("2 keys", Mixed), PL-047, PL-049, PL-006, PL-032                                                  |
| `lighting-edited`, `-base-mode-*`, `-base-applied` | PL-047 (the edits show at once), PL-049, PL-048, PL-006, PL-032, PL-050 (the dot)                         |
| `lighting-key-mode-*` (11 modes)                   | PL-047 (every keycap shows the clicked mode), PL-049, PL-048 (Mixed colour), PL-006, PL-050 (the dot)     |
| `lighting-key-applied-selection`                   | PL-047 ("3 keys"), PL-048, PL-049, PL-006, PL-050 (the dot)                                               |
| `lighting-rainbow-applied`                         | PL-007, PL-047, PL-048, PL-049, PL-006, PL-050 (the dot)                                                  |

Every capture also shows PL-002 (the Save label). The Performance captures differ as before, plus
PL-050's dot in `performance-keys-selected-rapid-trigger`, which turns rapid trigger on for the
selected keys. In the integration run every capture also differed by darker rows under the Save
button, which was still positioned for the dot; the Save button fix of the same day removed them
(the targeted re-run in the parity log's
[Per-feature results](../parity-log.md#per-feature-results)), so the table leaves them out.

## Deviations

| ID     | Screen / route                 | State and captures                                                                                                                                                                                                                                           | Deviation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Reason                                                                             | Before                                | After                               | Status |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------- | ------ |
| PL-005 | `/performance/`                | connected; keycap values: every `performance-*--*` capture (and `shell-performance--*`); keys selected (normal and rapid trigger): `performance-keys-selected--*`, `performance-keys-selected-rapid-trigger--*`, `performance-rapid-trigger-key-selected--*` | Selecting keys shows every value of the first selected key (actuation, deactivation, rapid trigger, sensitivities, deadzones), rounded to 0.001 mm, and writes nothing to it; the Svelte page kept its 2.000 / 1.500 mm defaults, showed the rapid-trigger values as NaN, left rapid trigger off for a key stored in rapid-trigger mode, and wrote all that to the key. The keycaps show each key's values; the values are the shell's (`performanceLabels`). The baseline's keycaps were blank except the selected ones, which read the defaults it wrote to them, "↓2.000 ↑1.500", or NaN with rapid trigger on.                                                                                                                                                                                                                                                                            | §2, D12                                                                            | [before](../parity/pl-005-before.png) | [after](../parity/pl-005-after.png) | logged |
| PL-006 | `/lighting/`                   | connected, base and key panels; every `lighting-*` capture, e.g. `lighting-default--*`                                                                                                                                                                       | Both panels show the speed as the device value `{n}%` (1–100) with the slider thumb at that value; Svelte showed ×1000 ("20000%", thumb at the end) and sent `speed / 1000`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | D11                                                                                | [before](../parity/pl-006-before.png) | [after](../parity/pl-006-after.png) | logged |
| PL-007 | `/lighting/`                   | Rainbow Preset open, Apply Settings clicked; `lighting-rainbow-applied--*`                                                                                                                                                                                   | Each key gets its own colour from its position in the layout (upstream formula): the selected keys, or every visible key when none is selected. Each key keeps its own mode and speed, and the colours wait for Save like every lighting edit (PL-047). In the capture every key is Linear (the scenario clicks Linear first), so the keycaps read "reactive", and the key panel's colour reads Mixed with key 0's new colour in its swatch (PL-048). Svelte changed nothing (the page never passed a layout to the panel).                                                                                                                                                                                                                                                                                                                                                                   | D11                                                                                | [before](../parity/pl-007-before.png) | [after](../parity/pl-007-after.png) | logged |
| PL-031 | `/performance/`                | connected, keys selected; `performance-keys-selected--*`                                                                                                                                                                                                     | "N keys selected" follows the selection. Svelte froze it at the count when the page opened (`$derived: keysSelected = $selectedCount` is a plain labelled statement that runs once), so it read "0 keys selected" with keys selected.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | intended UI (the statement's comment: "Update local count from store"); Svelte bug | [before](../parity/pl-031-before.png) | [after](../parity/pl-031-after.png) | logged |
| PL-032 | `/lighting/`                   | connected: key panel (base panel too when the base mode is not Blank); every `lighting-*` capture that clicks no key mode, e.g. `lighting-default--*`                                                                                                        | The panels show the keyboard's configuration: the base mode, and in the key panel the shared mode of its targets (PL-048: on the virtual keyboard every seventh key is Static and the others Linear, so with no key selected no mode is pressed). Svelte always highlighted Blank and Linear: the panels took their mode from the page's `new RGBBaseConfig()` / `new RGBConfig()` before the device values arrived, and Apply then wrote those modes to the keyboard. Likewise, when the keyboard loads a configuration while the page is open (a profile switch from the toolbar's dropdown, D7, or the keyboard's own profile keys, or a reset), both panels show it at once: its modes, colours and speeds. The load replaces the app's copy of the configuration, which drops unsaved lighting edits; there are no unapplied panel edits any more (PL-047). Svelte never reloaded there. | intended UI ("initialize from prop"); Svelte initialization-order bug              | [before](../parity/pl-032-before.png) | [after](../parity/pl-032-after.png) | logged |
| PL-033 | `/performance/` (travel badge) | a lone "." typed into the switch travel; `performance-travel-dot--*`                                                                                                                                                                                         | Treated like an empty input: the travel stays 4.0 mm, the badge keeps showing the "." and the sliders keep their bounds and colours. Svelte set the travel to NaN: the badge showed "NaN", and both actuation thumbs dropped to the start of a plain grey track.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | intended UI (the badge clamps to 1.0–4.0); Svelte bug                              | [before](../parity/pl-033-before.png) | [after](../parity/pl-033-after.png) | logged |
| PL-034 | `/performance/`                | rapid trigger on (sensitivity sliders, joint and separate); `performance-rapid-trigger--*`, `performance-rapid-trigger-separate--*`, `performance-travel-3mm--*`                                                                                             | The sensitivity sliders open with the thumb at the value their label shows (0.50 mm: a quarter along the 0.01–2 mm track). Svelte's `ThemedSlider` set `value` before `min`/`max`/`step`, so the browser snapped 0.5 to the default whole-number step and the thumb opened at about 1.01 mm; React sets `value` after the other attributes. The shared `ThemedSlider` fix, which shows on Dynamic Keys too ([Dynamic Keys notes](dynamic-keys.md#deviations)): one row for both pages in the log.                                                                                                                                                                                                                                                                                                                                                                                             | Svelte bug (attribute order in `ui/ThemedSlider.svelte`)                           | [before](../parity/pl-034-before.png) | [after](../parity/pl-034-after.png) | logged |

`lighting-default` shows both PL-006 and PL-032, so `pl-006-*` and `pl-032-*` are the same
captures.

## Known capture noise

- **Rounded corners.** One or two anti-aliased pixels per corner of some keycaps, of the travel
  badge and of slider thumbs, as worker E describes for the shell's keycap corners: they come
  and go with other differences on the page. At times many more: about 80 keycap corners of 4 px
  (up to 43 colour levels, about 325 px) in `performance-travel-tooltip--dark-en-1440x900` (React only, flaky),
  about 1 000 px along the actuation slider's track (at most 8 levels) in
  `performance-low-actuation` at 2560×1440, and 7 px per corner at the main panel's bottom
  corners at 2560×1440.
- **Raster glitches.** One capture (`lighting-base-mode-wave`, React) got a few small blocks of
  wrong pixels over text (roughly 7×7 px each); the same capture in the next run was clean. Later
  ones: `performance-keys-selected--dark-en-2560x1440` (React), 63 px over "Theme Colors" and
  24 px over the "u" of "Language".
- **A page that scrolls in one app only.** When React's page is taller than the viewport and the
  baseline's is not (`performance-rapid-trigger-key-selected--{dark,light}-en-1440x900`, PL-005's
  longer English rapid-trigger page with two-line descriptions), Chrome rasterizes React's
  scrollable main column differently: the toolbar's text 1–2 levels off (728 px dark, 1 180 px
  light), keycap corners up to 42 levels (2 500–3 000 px with the legends' anti-aliasing), the
  sidebar links' corners (about 100 px, at most 2 levels), the card's top corners and the travel
  badge (at most 2 levels). Invisible.

## Kept on purpose (not deviations)

- Performance: the first key selected while the page is open (or already selected when it
  opens) is loaded, which writes nothing. Every change then writes the settings to all selected
  keys, and keys added to the selection take them at once (the brush), also after deselect-all
  (§1.4). Switching layers never writes.
- Performance: controls clamp on every keystroke (e.g. typing "0.5" into the travel badge ends at
  1.5 mm, because "0" clamps to 1.0 at once), and a loaded deactivation point within 0.1 mm of
  the actuation point is pulled down when the travel badge is edited.
- Lighting, until the [lighting redesign](#lighting-redesign-2026-10-01): after Apply, the key
  panel showed key 0's colour and speed again while keeping the chosen mode; the mode buttons
  never followed the panels' own Apply (Svelte: "initialize from prop but don't sync back"). A
  configuration the keyboard loads opened both panels again (PL-032). Since the redesign the
  panels always show the app's copy of the configuration: the base lighting, and the targets'
  shared values (PL-047, PL-048).

## Behavior change not visible in the captures

Listed in the log under
[Behavior changes without a visible difference](../parity-log.md#behavior-changes-without-a-visible-difference).

- Performance never writes when it opens. The key selection outlives navigation, and the Svelte
  page's effect copied the first selected key's settings to the other selected keys on mount, so
  keys selected on Remap or Lighting were overwritten just by opening Performance (unnoticed in
  Svelte, whose keycaps showed no values). Keys selected before the page opened now keep their
  values until the first change, which then goes to all selected keys; only keys added to the
  selection take the brush at once (D12: selecting must not corrupt settings; §1.4). The parity
  scenarios select keys after opening the page, so the captures do not show it.
- Performance starts over when the keyboard loads a configuration (a profile switch from the
  toolbar's dropdown, D7, or the keyboard's own profile keys, or a reset): as when the page opens, the first selected key of the new
  configuration is loaded and nothing is written, and without a selection the brush is no longer
  loaded. Nothing loaded from the previous profile is written to the new one (D2: the UI never
  edits a stale snapshot). Svelte's profile switch never reached the keyboard (§2).
- Performance writes the rapid trigger switch's mode (rapid, or normal analog) once any setting
  differs from what was loaded, as Svelte always did; a key in digital or speed mode becomes a
  normal analog key with the first change. Until then the brush is the first selected key
  exactly, its mode included: keys added to the selection take that key's own mode, also digital
  or speed mode, while the switch shows rapid trigger off (D12: selecting loads every value of the
  key and writes nothing to it). Svelte wrote the switch's mode on selection too.

## Observations for other owners

- **Keycap legends of rapid-trigger keys (shell, `performanceLabels`).** A key with separate
  press and release distances gets four legends at the KLE positions the Svelte transformer
  chose (top-left `↧`, top-centre `↓`, bottom-centre `↑`, bottom-right `↥`); on a 1u keycap the
  top two and the bottom two overlap (`performance-rapid-trigger-key-selected`, key 1). Svelte
  never rendered them (blank keycaps, PL-005), so there is no baseline to match. Recorded under
  PL-005 in the log.
