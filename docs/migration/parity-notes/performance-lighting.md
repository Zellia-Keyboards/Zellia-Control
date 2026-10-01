# Parity notes: performance + lighting (worker G)

Scenarios: `e2e/parity/scenarios/performance-lighting.ts`, 31 in all: 10 on Performance
(`performance-*`) and 21 on Lighting (`lighting-*`). Fast mode (product owner decision,
2026-10-01): captured in the `dark-en-1440x900` variant only, with
`E2E_PORT=4313 npm run parity -- --workers=2 --grep '(performance|lighting)-.*--dark-en-1440x900'`;
the lead runs the full matrix once all pages are merged.

Rows for [parity-log.md](../parity-log.md), in its table format (links relative to
`docs/migration/`, as in the log). PL ids are the planned deviations this worker implements;
`G-n` ids are new deviations found while porting (temporary ids, renumbered by the lead).
Screenshots are the `dark-en-1440x900` captures.

## Results

Run of 2026-10-01 (Chrome 154, strict comparison): 31 captures, 0 identical, 31 different, no
page errors in either app. Run again after the review fixes (reloads, rapid trigger mode, setups
without fixed sleeps): the same results; each app's captures differ from the first run's only by
the corner anti-aliasing noise below.

Until worker F's branch is merged, the toolbar's profile dropdown is a stub that renders nothing:
the toolbar is 58 px instead of 74 px high and everything below it (the keyboard and the whole
page) sits 16 px higher, so every capture differs over most of the screen (13–26 % of the
pixels; 0.8 % for the three scenarios scrolled to the end of the page, where the bottom edges
line up again). To compare the pages themselves, the same scenarios were captured once more with
the baseline's profile dropdown and both apps' Save label hidden, and on Performance the keycap
legends (a local, uncommitted scenario file). Every difference left is a deviation below or
capture noise. The keycap legends hidden on Performance are PL-005 as well: in every
`performance-*` capture React's keycaps show each key's values and the baseline's are blank (or
read NaN on the selected keys with rapid trigger on).

| Scenario                                                           | Differences with the dropdown, the Save label and (on Performance) the keycap legends hidden (px) | Explained by                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `performance-default`                                              | 129                                                                                               | PL-005 (keycaps), PL-002 (Save icon), noise     |
| `performance-keys-selected`                                        | 1 542                                                                                             | PL-005, G-1, PL-002                             |
| `performance-keys-selected-rapid-trigger`                          | 7 983                                                                                             | PL-005 (the baseline's values read NaN), PL-002 |
| `performance-rapid-trigger-key-selected`                           | 213 280                                                                                           | PL-005 (the baseline keeps rapid trigger off)   |
| `performance-rapid-trigger`, `performance-travel-3mm`              | 1 146 each                                                                                        | PL-005 (keycaps), G-4, PL-002                   |
| `performance-rapid-trigger-separate`                               | 2 178                                                                                             | PL-005 (keycaps), G-4 (both sliders), PL-002    |
| `performance-low-actuation`, `performance-travel-tooltip`          | 114 each                                                                                          | PL-005 (keycaps), PL-002 (Save icon)            |
| `performance-travel-dot`                                           | 5 384                                                                                             | PL-005 (keycaps), G-3, PL-002                   |
| `lighting-default`, `-scrolled`, `-edited`, `-rainbow-preset`      | 10 322–10 324                                                                                     | PL-006 (both speeds), G-2, PL-002               |
| `lighting-base-mode-off`, `-rainbow`, `-wave`, `-base-applied`     | 10 322–10 837                                                                                     | PL-006, G-2, PL-002; `-wave` one raster glitch  |
| `lighting-key-mode-*` (11 modes), `lighting-key-applied-selection` | 2 692–2 694                                                                                       | PL-006, PL-002 (clicking a key mode ends G-2)   |
| `lighting-rainbow-applied`                                         | 6 744                                                                                             | PL-007, PL-006, PL-002                          |

PL-002 (the sidebar's Save label, logged by worker E): with both labels hidden, the Save icon
still sits elsewhere, because the baseline's raw `ui.save` label is wider than "Save".

## Deviations

| ID     | Screen / route                 | State and captures                                                                                                                                                                                                                                           | Deviation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Reason                                                                             | Before                             | After                            | Status |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------- | ------ |
| PL-005 | `/performance/`                | connected; keycap values: every `performance-*--*` capture (and `shell-performance--*`); keys selected (normal and rapid trigger): `performance-keys-selected--*`, `performance-keys-selected-rapid-trigger--*`, `performance-rapid-trigger-key-selected--*` | Selecting keys shows every value of the first selected key (actuation, deactivation, rapid trigger, sensitivities, deadzones), rounded to 0.001 mm, and writes nothing to it; the Svelte page kept its 2.000 / 1.500 mm defaults, showed the rapid-trigger values as NaN, left rapid trigger off for a key stored in rapid-trigger mode, and wrote all that to the key. The keycaps show each key's values (they were blank); the values are the shell's (`performanceLabels`).                                                                                                                                                                     | §2, D12                                                                            | [before](parity/pl-005-before.png) | [after](parity/pl-005-after.png) | logged |
| PL-006 | `/lighting/`                   | connected, base and key panels; every `lighting-*` capture, e.g. `lighting-default--*`                                                                                                                                                                       | Both panels show the speed as the device value `{n}%` (1–100) with the slider thumb at that value; Svelte showed ×1000 ("20000%", thumb at the end) and sent `speed / 1000`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | D11                                                                                | [before](parity/pl-006-before.png) | [after](parity/pl-006-after.png) | logged |
| PL-007 | `/lighting/`                   | Rainbow Preset open, Apply Settings clicked; `lighting-rainbow-applied--*`                                                                                                                                                                                   | Each key gets its own colour from its position in the layout (upstream formula): the selected keys, or every visible key when none is selected, with the panel's mode and speed. The keycaps then show that mode's label, and the key panel key 0's new colour. Svelte changed nothing (the page never passed a layout to the panel).                                                                                                                                                                                                                                                                                                               | D11                                                                                | [before](parity/pl-007-before.png) | [after](parity/pl-007-after.png) | logged |
| G-1    | `/performance/`                | connected, keys selected; `performance-keys-selected--*`                                                                                                                                                                                                     | "N keys selected" follows the selection. Svelte froze it at the count when the page opened (`$derived: keysSelected = $selectedCount` is a plain labelled statement that runs once), so it read "0 keys selected" with keys selected.                                                                                                                                                                                                                                                                                                                                                                                                               | intended UI (the statement's comment: "Update local count from store"); Svelte bug | [before](parity/g-1-before.png)    | [after](parity/g-1-after.png)    | logged |
| G-2    | `/lighting/`                   | connected: key panel (base panel too when the base mode is not Blank); every `lighting-*` capture that clicks no key mode, e.g. `lighting-default--*`                                                                                                        | The mode buttons open on the keyboard's modes: the base mode, and the first key's mode (Static on the virtual keyboard). Svelte always highlighted Blank and Linear: the panels took their mode from the page's `new RGBBaseConfig()` / `new RGBConfig()` before the device values arrived, and Apply then wrote those modes to the keyboard. Likewise, when the keyboard loads a configuration while the page is open (a profile switch from the toolbar's dropdown, D7, or the keyboard's own profile keys, or a reset), both panels open again on it: its modes, colours and speeds, with unapplied edits dropped (Svelte never reloaded there). | intended UI ("initialize from prop"); Svelte initialization-order bug              | [before](parity/g-2-before.png)    | [after](parity/g-2-after.png)    | logged |
| G-3    | `/performance/` (travel badge) | a lone "." typed into the switch travel; `performance-travel-dot--*`                                                                                                                                                                                         | Treated like an empty input: the travel stays 4.0 mm, the badge keeps showing the "." and the sliders keep their bounds and colours. Svelte set the travel to NaN: the badge showed "NaN", and both actuation thumbs dropped to the start of a plain grey track.                                                                                                                                                                                                                                                                                                                                                                                    | intended UI (the badge clamps to 1.0–4.0); Svelte bug                              | [before](parity/g-3-before.png)    | [after](parity/g-3-after.png)    | logged |
| G-4    | `/performance/`                | rapid trigger on (sensitivity sliders, joint and separate); `performance-rapid-trigger--*`, `performance-rapid-trigger-separate--*`, `performance-travel-3mm--*`                                                                                             | The sensitivity sliders open with the thumb at the value their label shows (0.50 mm: a quarter along the 0.01–2 mm track). Svelte's `ThemedSlider` set `value` before `min`/`max`/`step`, so the browser snapped 0.5 to the default whole-number step and the thumb opened at about 1.01 mm; React sets `value` after the other attributes. The shared `ThemedSlider` fix that worker H logged as H-3: one general row for both.                                                                                                                                                                                                                    | Svelte bug (attribute order in `ui/ThemedSlider.svelte`)                           | [before](parity/g-4-before.png)    | [after](parity/g-4-after.png)    | logged |

`lighting-default` shows both PL-006 and G-2, so `pl-006-*` and `g-2-*` are the same captures.

## Expected until the other Wave 2 branches are merged

- **Toolbar profile dropdown (worker F).** The stub renders nothing, which moves the keyboard and
  the page 16 px up in every capture (see Results).

## Known capture noise

- **Rounded corners.** One or two anti-aliased pixels per corner of some keycaps, of the travel
  badge and of slider thumbs, as worker E describes for the shell's keycap corners: they come
  and go with other differences on the page.
- **Raster glitches.** One capture (`lighting-base-mode-wave`, React) got a few small blocks of
  wrong pixels over text (roughly 7×7 px each); the same capture in the next run was clean.

## Kept on purpose (not deviations)

- Performance: the first key selected while the page is open (or already selected when it
  opens) is loaded, which writes nothing. Every change then writes the settings to all selected
  keys, and keys added to the selection take them at once (the brush), also after deselect-all
  (§1.4). Switching layers never writes.
- Performance: controls clamp on every keystroke (e.g. typing "0.5" into the travel badge ends at
  1.5 mm, because "0" clamps to 1.0 at once), and a loaded deactivation point within 0.1 mm of
  the actuation point is pulled down when the travel badge is edited.
- Lighting: after Apply, the key panel shows key 0's colour and speed again while keeping the
  chosen mode; the mode buttons never follow the panels' own Apply (Svelte: "initialize from prop
  but don't sync back"). A configuration the keyboard loads opens both panels again (G-2).

## Behavior change not visible in the captures

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
  never rendered them (blank keycaps, PL-005), so there is no baseline to match.
