# Parity notes: remap and profiles (worker F)

Rows for [the parity log](../parity-log.md), in its table format. Stage 1
ported the Remap page, the Profiles page and the toolbar profile dropdown with
component tests against the virtual keyboard. The parity scenarios
(`e2e/parity/scenarios/remap-profiles.ts`) and the before/after captures follow
in stage 2, inside the merged shell; until then every row is **planned**.

## Existing deviations implemented here

| ID     | Screen / route                         | State and captures                                                       | Deviation                                                                                                                                                                                                                             | Reason                                        | Before  | After   | Status  |
| ------ | -------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------- | ------- | ------- |
| PL-008 | `/remap/`                              | Profile tab; Extension tab                                               | `↔ PF`, `↔ PF1`, `→ PF`, `← PF` stay visible but assign nothing (a click without a selected key still shows the "Select the key you want to remap first" message). `PF(0–3)` assign the profile keycodes, "NKRO Toggle" toggles NKRO. | D8                                            | pending | pending | planned |
| PL-013 | toolbar profile dropdown, `/profiles/` | connected, after a profile switch on the keyboard or from the UI         | Activating profile 1–4 (card or dropdown) switches the keyboard's profile; 5–16 are only marked active. After every completed keyboard load the active profile is the keyboard's, also when a local profile was active.               | D7                                            | pending | pending | planned |
| PL-015 | `/remap/`                              | keys selected, a keycode assigned (brush loaded), another layer selected | Switching layers writes nothing; keys added to the selection afterwards get the brush keycode on the selected layer, and only those keys.                                                                                             | §1.4                                          | pending | pending | planned |
| PL-016 | keycaps on `/remap/`                   | after assigning `L Shift`, `L Ctrl`, `L Win`, `L Alt`, `R Alt`, `R Ctrl` | The Basic tab assigns modifiers as `mod << 8` (as before); the keycaps name them (`describeKeycode`, rendered by the shell keyboard).                                                                                                 | intended UI                                   | pending | pending | planned |
| PL-017 | keycaps on `/remap/`                   | after assigning `Recovery`, `PF(0–3)`, `NKRO Toggle`                     | The assigned keycodes are libamp's keyboard operations and configs, so the keycaps name them.                                                                                                                                         | §2 API drift, D8                              | pending | pending | planned |
| PL-018 | `/remap/` Extension tab                | after assigning `Joy Positive` / `Joy Negative`                          | They assign joystick axis 0 (`0x20AA` / `0x40AA`); the keycap label changes accordingly.                                                                                                                                              | libamp `keycode.h` joystick sub-code bits 5–7 | pending | pending | planned |

PL-019 (action pickers of the dynamic-key editors) is not part of these
screens: the Remap palettes already assigned full keycodes with sub-codes.

## New deviations

| ID  | Screen / route | State and captures                                            | Deviation                                                                                                                                                                                                                    | Reason                                                                                                  | Before  | After   | Status  |
| --- | -------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------- | ------- | ------- |
| F-1 | `/profiles/`   | Import Profile with a file that is not a profile (or no JSON) | The "Notice" dialog reads "Failed to import profile: Invalid profile file" (or the JSON parser's message). The Svelte store swallowed the error, so the file was silently ignored and the page's error message never showed. | intended UI (the page's own error path); imported files are validated at the boundary (a string `name`) | pending | pending | planned |

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
