# Parity notes: performance + lighting (worker G)

Rows for [parity-log.md](../parity-log.md), in its table format. PL ids are
the planned deviations this worker implements; `G-n` ids are new deviations
found while porting (temporary ids, renumbered by the lead). Captures are added
in stage 2, after the shell is merged and the parity scenarios run in it.

| ID     | Screen / route                 | State and captures                                                    | Deviation                                                                                                                                                                                                                                                                                                                                     | Reason                                                                             | Before  | After   | Status  |
| ------ | ------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------- | ------- | ------- |
| PL-005 | `/performance/`                | connected, keys selected (normal and rapid trigger)                   | Selecting keys shows every value of the first selected key (actuation, deactivation, rapid trigger, sensitivities, deadzones), rounded to 0.001 mm, and writes nothing to it; the Svelte page kept its 2.000 / 1.500 mm defaults and wrote them to the key. The keycap values themselves are the shell's (`performanceLabels`).               | §2, D12                                                                            | pending | pending | planned |
| PL-006 | `/lighting/`                   | connected, base and key panels                                        | Both panels show the speed as the device value `{n}%` (1–100) with the slider thumb at that value; Svelte showed ×1000 ("20000%", thumb at the end) and sent `speed / 1000`.                                                                                                                                                                  | D11                                                                                | pending | pending | planned |
| PL-007 | `/lighting/`                   | Rainbow Preset open, Apply Settings clicked                           | Each key gets its own colour from its position in the layout (upstream formula): the selected keys, or every visible key when none is selected, with the panel's mode and speed. Svelte changed nothing (the page never passed a layout to the panel).                                                                                        | D11                                                                                | pending | pending | planned |
| G-1    | `/performance/`                | connected, keys selected                                              | "N keys selected" follows the selection. Svelte froze it at the count when the page opened (`$derived: keysSelected = $selectedCount` is a plain labelled statement that runs once), so it read "0 keys selected" with keys selected.                                                                                                         | intended UI (the statement's comment: "Update local count from store"); Svelte bug | pending | pending | planned |
| G-2    | `/lighting/`                   | connected: key panel (base panel too when the base mode is not Blank) | The mode buttons open on the keyboard's modes: the base mode, and the first key's mode (Static on the virtual keyboard). Svelte always highlighted Blank and Linear: the panels took their mode from the page's `new RGBBaseConfig()` / `new RGBConfig()` before the device values arrived, and Apply then wrote those modes to the keyboard. | intended UI ("initialize from prop"); Svelte initialization-order bug              | pending | pending | planned |
| G-3    | `/performance/` (travel badge) | a lone "." typed into the switch travel                               | Treated like an empty input (4.0 mm). Svelte set the travel to NaN: the badge showed "NaN" and the sliders lost their bounds.                                                                                                                                                                                                                 | intended UI (the badge clamps to 1.0–4.0); Svelte bug                              | —       | —       | planned |
| G-4    | `/performance/`                | rapid trigger on (sensitivity sliders, joint and separate)            | The sensitivity sliders open with the thumb at the value their label shows (0.50 mm: a quarter along the 0.01–2 mm track). Svelte's `ThemedSlider` set `value` before `min`/`max`/`step`, so the browser snapped 0.5 to the default whole-number step and the thumb opened at about 1.01 mm; React sets `value` after the other attributes.   | Svelte bug (attribute order in `ui/ThemedSlider.svelte`)                           | pending | pending | planned |

## Kept on purpose (not deviations)

- Performance: the first key selected while the page is open (or already
  selected when it opens) is loaded; every change and every selection change
  then writes the settings to all selected keys, so keys added to the selection
  take the brush, also after deselect-all (§1.4). Opening the page with several
  keys selected therefore copies the first key's settings to the others, as the
  Svelte effect did on mount. Switching layers never writes.
- Performance: controls clamp on every keystroke (e.g. typing "0.5" into the
  travel badge ends at 1.5 mm, because "0" clamps to 1.0 at once), and a loaded
  deactivation point within 0.1 mm of the actuation point is pulled down when the
  travel badge is edited.
- Lighting: after Apply (and after any change of the per-key configurations),
  the key panel shows key 0's colour and speed again while keeping the chosen
  mode; the mode buttons of both panels never follow device reloads (Svelte:
  "initialize from prop but don't sync back").
