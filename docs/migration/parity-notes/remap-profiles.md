# Parity notes: remap and profiles (worker F)

Rows for [the parity log](../parity-log.md), in its table format. Scenarios:
`e2e/parity/scenarios/remap-profiles.ts`. Remap: each category tab, the "Select the key you want
to remap first" message, an assignment to three keys, select-all (Ctrl+A), a layer switch with
the brush loaded, the Profile tab's keys and the Extension tab's keyboard operations and joystick
axes assigned. Profiles: the page (default, a profile activated, the card menu of a local and of
the active profile, the Duplicate and Restore confirmations, the full-slots error, an imported
file, a file that is not a profile, a profile switched on the keyboard) and the toolbar dropdown
(over Remap, over Lighting, with a local profile active). Every scenario connects the virtual
keyboard with "Get Started" and drives both apps like a user; the setups rely on copy both
languages share (the Remap and Profiles pages are English-only in both apps; the sidebar link and
the dropdown's link are matched in en and zh).

## Results

Fast mode (product owner decision): captured in the `dark-en-1440x900` variant only, with
`E2E_PORT=4312 npm run parity -- --workers=2 --grep '(remap|profiles)-.*--dark-en-1440x900'`,
inside the merged shell. The lead captures the whole matrix (light/dark × en/zh ×
1440×900/2560×1440) at integration.

Run of 2026-10-01 (24 captures of these scenarios, strict comparison): 0 identical, every
difference listed. The page regions (category tabs, palettes, message, profile cards, menus,
dialogs, dropdown) are pixel-identical except where a row names F-1, F-2 or PL-013; all other
differences are keycaps of the shell's keyboard and the sidebar's Save button.

| Scenario                                                                                                                                     | Differences                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `remap-basic`, `remap-system`, `remap-layer`, `remap-profile`, `remap-extension`, `remap-toast`, `remap-assigned`, `remap-select-all`        | PL-002, PL-016, PL-022                                                                                |
| `remap-brush-layer`                                                                                                                          | PL-015, PL-002, PL-022                                                                                |
| `remap-profile-assigned`                                                                                                                     | PL-008, PL-017 (keys 1–5), PL-002, PL-016, PL-022                                                     |
| `remap-extension-assigned`                                                                                                                   | PL-008, PL-017 (key 2), PL-018 (keys 3–4), PL-002, PL-016, PL-022; `Recovery` (key 1) is identical    |
| `profiles-dropdown`                                                                                                                          | PL-002; the lower part of the dropdown's glass panel blurs the keycaps of PL-016 and PL-022 behind it |
| `profiles-dropdown-lighting`, `profiles-dropdown-local`                                                                                      | PL-002 (`-local`: keycap-corner noise)                                                                |
| `profiles-default`, `profiles-activated`, `profiles-menu`, `profiles-menu-active`, `profiles-duplicate`, `profiles-restore`, `profiles-full` | PL-002 (`-default`, `-menu-active`: one anti-aliased icon pixel)                                      |
| `profiles-imported`                                                                                                                          | F-2, PL-002                                                                                           |
| `profiles-import-invalid`                                                                                                                    | F-1, PL-002                                                                                           |
| `profiles-keyboard-switch`                                                                                                                   | PL-013, PL-002                                                                                        |

The pattern also matches the shell's `shell-remap-*` scenarios. With the profile dropdown in
place the shell's toolbar is identical there too (the shell notes expected the dropdown stub's
16 px offset until this branch is merged): `shell-remap-selection` and `-hover` differ by PL-002,
PL-016 and PL-022 (`-hover`: keycap-corner noise), `shell-remap-layer-2` and `-4` by PL-002 and
PL-022, `shell-remap-layer-3` by PL-002, PL-017 and PL-022.

## Existing deviations implemented here

Links are relative to `docs/migration/`, as in the log. Screenshots are the `dark-en-1440x900`
captures.

| ID     | Screen / route                         | State and captures                                                                                                                                             | Deviation                                                                                                                                                                                                                                                                                                                                                                                                               | Reason                                        | Before                             | After                            | Status |
| ------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------- | -------------------------------- | ------ |
| PL-008 | `/remap/`                              | Profile tab: key 5 given `↔ PF1`, then keys 1–4 `PF(0)`–`PF(3)`; `remap-profile-assigned--*` (also `remap-extension-assigned--*`: `NKRO Toggle` on key 2)      | `↔ PF`, `↔ PF1`, `→ PF`, `← PF` stay visible but assign nothing and load no brush (without a selected key they still show the "Select the key you want to remap first" message); `PF(0)`–`PF(3)` assign libamp's profile operations and `NKRO Toggle` toggles NKRO. The baseline assigned Reboot for `↔ PF1`, `PF(0)`–`PF(3)` and `NKRO Toggle` (removed enums), so key 5 and every key painted after it read "Reboot". | D8                                            | [before](parity/pl-008-before.png) | [after](parity/pl-008-after.png) | logged |
| PL-013 | toolbar profile dropdown, `/profiles/` | the keyboard switches to its profile 3 while Profiles is open; `profiles-keyboard-switch--*`                                                                   | The active profile follows the keyboard: Profile 3 is marked Active after the keyboard's reload (the baseline kept Profile 1). Activating profile 1–4 (card or dropdown) switches the keyboard's profile; 5–16 are only marked active. After every completed keyboard load the active profile is the keyboard's, also when a local profile was active.                                                                  | D7                                            | [before](parity/pl-013-before.png) | [after](parity/pl-013-after.png) | logged |
| PL-015 | `/remap/`                              | Escape selected, `Q` assigned (brush loaded), Layer 2 selected; `remap-brush-layer--*`                                                                         | Layer 2's Escape keeps its own keycode (`` ` ``); the baseline wrote the brush keycode `Q` to it on the layer switch. Keys added to the selection afterwards get the brush keycode on the selected layer, and only those keys.                                                                                                                                                                                          | §1.4                                          | [before](parity/pl-015-before.png) | [after](parity/pl-015-after.png) | logged |
| PL-016 | keycaps on `/remap/`                   | connected: the default Shift, Ctrl, GUI and Alt keys on every `remap-*` capture, e.g. `remap-basic--*`                                                         | Keys whose keycode is a modifier only show the modifier's name ("Left Shift", "Left Ctrl", "Left GUI", "Left Alt", "Right Alt", "Right Shift"); the baseline showed "No Event" with the modifier name overlapping it in the top-left label. The Basic tab still assigns modifiers as `mod << 8`.                                                                                                                        | intended UI                                   | [before](parity/pl-016-before.png) | [after](parity/pl-016-after.png) | logged |
| PL-017 | keycaps on `/remap/`                   | layer 3 of the keyboard's keymap (keyboard operations and configs); `shell-remap-layer-3--*` (also `remap-profile-assigned--*`, `remap-extension-assigned--*`) | Keyboard operations and configs are named: "Profile 0"–"Profile 3", "Toggle Debug", "Toggle Winlock", and "Toggle NKRO" after assigning `NKRO Toggle`; the baseline showed "Keyboard" and a bare "Toggle". `Recovery` ("Jump to Bootloader"), Reboot, Factory Reset and the other operations read the same in both apps.                                                                                                | §2 API drift, D8                              | [before](parity/pl-017-before.png) | [after](parity/pl-017-after.png) | logged |
| PL-018 | `/remap/` Extension tab                | `Joy Positive` on key 3, `Joy Negative` on key 4; `remap-extension-assigned--*`                                                                                | They assign joystick axis 0 (`0x20AA` / `0x40AA`), so the keycaps read "Joystick" with "Positive0" / "Negative0"; the baseline values were joystick buttons 1 and 2 ("Joystick Button1", "Joystick Button2").                                                                                                                                                                                                           | libamp `keycode.h` joystick sub-code bits 5–7 | [before](parity/pl-018-before.png) | [after](parity/pl-018-after.png) | logged |

PL-019 (action pickers of the dynamic-key editors) is not part of these screens: the Remap
palettes already assigned full keycodes with sub-codes.

## New deviations

| ID  | Screen / route | State and captures                                                                           | Deviation                                                                                                                                                                                                                                                                                                             | Reason                                                                                                                          | Before                          | After                         | Status |
| --- | -------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------- | ------ |
| F-1 | `/profiles/`   | Import Profile with a file that is not JSON (or not a profile); `profiles-import-invalid--*` | The "Notice" dialog reads "Failed to import profile: " with the JSON parser's message (or "Invalid profile file" for JSON without a string `name`). The baseline's store caught and logged the error itself, so the page's error message never showed and the file was silently ignored (or a broken profile stored). | intended UI (the page's own error path); imported files are validated at the boundary                                           | [before](parity/f-1-before.png) | [after](parity/f-1-after.png) | logged |
| F-2 | `/profiles/`   | Import Profile with a valid file (`{ "name": "Travel Setup" }`); `profiles-imported--*`      | The imported profile's card appears at once in the first free slot (5), and Add Profile moves to the next cell. The baseline stored the profile but showed nothing: its store wrote it into the existing list in place, so the page's derived list did not change until another action replaced the list.             | bug: in-place store update in `importProfile` (Restore Default updates in place too, but shows no visible change in either app) | [before](parity/f-2-before.png) | [after](parity/f-2-after.png) | logged |

## Also visible in these captures

Logged with screenshots by the shell (worker E): PL-002 (the sidebar's Save label, every capture)
and PL-022 (key 64 is blank, every Remap capture).

## Known capture noise

- **Keycap corners.** As described in the shell notes: while the Save label (PL-002) differs,
  Chrome rasterizes the rounded corners of a few keycaps differently (2 px per corner);
  `profiles-dropdown-local` and `shell-remap-hover` show five and four such corners.
- **Icon anti-aliasing.** In `profiles-default` and `profiles-menu-active` one pixel of the
  sidebar's Theme Colors icon is one colour level off (47 against 48, in opposite directions in
  the two captures); an earlier run of the same scenarios gave the same pixel counts.

## Not visible (no log row)

- Profile cards: Enter or Space on a card's menu button opens its menu (the
  Svelte card handler cancelled the button and activated the card instead).
  Hold-to-delete also works with Enter/Space held for 1.5 s.
- Semantics only: `type="button"`, `aria-pressed` on the category tabs and the
  profile cards, cards named by their profile name, `role="menuitem"` in the
  profile menu, `aria-haspopup`/`aria-expanded` on the menu and dropdown
  buttons, a labelled category navigation, decorative SVGs hidden.
- The import file input is reset after every outcome (Svelte kept the file
  after "No available profile slots", so the same file could not be chosen
  again).
- Profile names in the confirmation messages are text; the Svelte page
  interpolated them into `{@html}`.
- `keyboard-profiles` is validated when read: entries that are not profiles
  are dropped (slots 1–4 are recreated, as before), every profile's `id` is its
  slot, an invalid active id falls back to 1. Valid Svelte data reads back
  unchanged.
- An imported file keeps the schema's fields only (`name` and the four
  configuration fields); the Svelte store also kept any unknown fields.
- Choosing the already active profile in the dropdown does not switch the
  keyboard again (a switch reloads the profile from flash).
