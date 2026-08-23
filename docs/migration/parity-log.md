# Visual parity log

The React app must look, read and animate exactly like the intended Svelte UI
(baseline commit `4f232a2`). Every visible difference between the two is either
fixed or recorded here, with before/after screenshots from the parity harness
(see [Visual parity](../development.md#visual-parity)).

## How to record a deviation

1. Run `corepack yarn parity` (or `--grep <scenario>`) and open
   `e2e/.artifacts/parity/index.html`.
2. For a difference that is intended, copy its captures into
   `docs/migration/parity/` as `<id>-before.png` (from `captures/baseline/`) and
   `<id>-after.png` (from `captures/react/`), where `<id>` is the log id in
   lower case, e.g. `pl-007-before.png`.
3. Add or update a row below: the capture id(s) it covers, what differs and why
   (spec decision or bug), and the screenshots. Anything not listed here is a
   bug in the React app.

Status values: **planned** (decided, screen not ported yet), **logged**
(ported, screenshots attached), **reverted** (parity restored).

## Template

| ID     | Screen / route | State and captures                         | Deviation                     | Reason                  | Before                             | After                            | Status |
| ------ | -------------- | ------------------------------------------ | ----------------------------- | ----------------------- | ---------------------------------- | -------------------------------- | ------ |
| PL-NNN | `/route/`      | state; `scenario--theme-lang-WxH` captures | what is visibly different now | spec ref, bug or ticket | [before](parity/pl-nnn-before.png) | [after](parity/pl-nnn-after.png) | logged |

## Deviations

Decided in the design spec
([§1, §3, §8](../superpowers/specs/2026-09-30-react-rewrite-design.md)). Most
rows are screens the Svelte app shows wrong because of bugs; the React app
shows what they were built to show. PL-012 and PL-015 are product owner
decisions (§1.3, §1.4). Screenshots are added when the screen is ported.

| ID     | Screen / route                         | State and captures                                                             | Deviation                                                                                                                                                      | Reason                                                  | Before  | After   | Status  |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------- | ------- | ------- |
| PL-001 | all routes                             | any                                                                            | Raw i18n keys (e.g. `ui.save`, `advancedkey.deleteKey`, `advancedkey.trigger`) render as text instead of their translation.                                    | §1.1, D17: six missing keys added (en, zh)              | pending | pending | planned |
| PL-002 | sidebar                                | connected                                                                      | The Save button reads "Save" / "保存" (was the raw key `ui.save`) and actually saves.                                                                          | §8 Shell, D9, D17                                       | pending | pending | planned |
| PL-003 | `/` → `/remap/`                        | connecting                                                                     | "Loading configurator…" stays until the keyboard's first configuration arrives (no flash of controller defaults); no reply within 3 s shows the error message. | D2                                                      | pending | pending | planned |
| PL-004 | `/`                                    | device unplugged while connected                                               | Returns to the connection screen (was ignored).                                                                                                                | D3                                                      | pending | pending | planned |
| PL-005 | `/performance/`                        | connected, keys selected                                                       | Keycaps show each key's values (were blank); selecting a key shows its stored actuation instead of overwriting it with 2.0 mm.                                 | §2, D12                                                 | pending | pending | planned |
| PL-006 | `/lighting/`                           | connected, base panel                                                          | Speed shows the device value as `{n}%` (1–100; was ×1000, e.g. "20000%").                                                                                      | D11                                                     | pending | pending | planned |
| PL-007 | `/lighting/`                           | rainbow preset applied                                                         | Per-key rainbow colours follow the real layout geometry (upstream formula).                                                                                    | D11                                                     | pending | pending | planned |
| PL-008 | `/remap/`                              | Profile tab                                                                    | `↔ PF`, `↔ PF1`, `→ PF`, `← PF` stay visible but are inert; "NKRO Toggle" and `↔ PF1` no longer assign Reboot, so keycap labels show the intended action.      | D8                                                      | pending | pending | planned |
| PL-009 | `/dynamic/`                            | dashboard and each mode's configured table                                     | Configured keys and counts come from the keyboard's dynamic keys (were an in-memory list); delete/reset remove them from the device.                           | §8 Dynamic keys, D5                                     | pending | pending | planned |
| PL-010 | `/dynamic/` tap-hold                   | new tap-hold key                                                               | Default hold action is Left Ctrl (was the invalid code `0xE0`).                                                                                                | D15                                                     | pending | pending | planned |
| PL-011 | `/debug/`                              | Key Tracking with a key selected                                               | The travel chart plots live samples (never plotted).                                                                                                           | D16                                                     | pending | pending | planned |
| PL-012 | `/settings/`                           | Bootloader or Factory Reset clicked                                            | A confirmation modal (styled like the profiles `ConfirmationModal`) appears first; Restart stays single-click.                                                 | §1.3, §8 Settings                                       | pending | pending | planned |
| PL-013 | toolbar profile dropdown, `/profiles/` | connected, after a device profile switch                                       | The active profile follows the keyboard's profile index (1–4); activating 1–4 switches the keyboard's profile.                                                 | D7                                                      | pending | pending | planned |
| PL-014 | keyboard, on every route showing it    | Zellia 60 or 80 connected (hardware only: the virtual keyboard is a Starlight) | The keyboard shows the connected model's own layout; the Svelte app drove every `0xFEED:22319` device with the Zellia Starlight controller and layout.         | D1: per-model `detect(true)` matching                   | pending | pending | planned |
| PL-015 | `/remap/`                              | keys selected, a keycode assigned (brush loaded), another layer selected       | The newly selected layer's keycaps keep their own keycodes; the Svelte app wrote the brush keycode to the selected keys of every layer switched to.            | §1.4: switching layers never writes                     | pending | pending | planned |
| PL-016 | keycaps on `/remap/`                   | keys whose keycode is a modifier only (default Shift, Ctrl, Alt, GUI)          | The modifier is shown as the key name (was "No Event" with the modifier in the top-left label).                                                                | intended UI: "No Event" on a Shift key is a display bug | pending | pending | planned |
| PL-017 | keycaps on `/remap/`                   | keyboard operations and configs assigned                                       | Calibrate, Recovery, Profile 0–3 and config names (Debug, NKRO, …) are named (Svelte showed "Keyboard" or nothing, using removed enums).                       | §2 API drift, D8                                        | pending | pending | planned |
| PL-018 | `/remap/` Extension tab                | Joy Positive / Joy Negative assigned                                           | They encode joystick axis 0 (`0x20AA`/`0x40AA`); the Svelte values were Joystick Button 1/2, so the keycap label changes accordingly.                          | libamp `keycode.h` joystick sub-code bits 5–7           | pending | pending | planned |
| PL-019 | `/dynamic/` editors                    | action pickers                                                                 | Layer, System and Mouse actions assign their full keycodes (Svelte dropped the sub-code, so every action of a category assigned the same code).                | D15                                                     | pending | pending | planned |
| PL-020 | `/dynamic/` DKS                        | Reset clicked                                                                  | The preset bindings show Esc / Enter / Space / Backspace (Svelte showed the literal strings `esc`, `enter`, …).                                                | intended UI                                             | pending | pending | planned |
| PL-021 | `/dynamic/` DKS                        | a DKS with a tap at the end of an interval, after reload                       | Reloads normalized (the firmware cannot release and tap at the same stage; e.g. the Reset preset's Space `[0,1]+[1,3]` reloads as `[0,3]`).                    | firmware encoding limit, spec §11                       | pending | pending | planned |

## Known capture noise

Differences that come from the capture itself rather than from the apps. The
comparison counts every changed pixel, anti-aliasing included, so such noise
would show up as a difference and must be explained here. None so far.
