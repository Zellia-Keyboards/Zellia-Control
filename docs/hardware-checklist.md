# Hardware smoke checklist

CI only ever talks to the virtual libamp keyboard (`src/testing/virtual-keyboard`). Run this
checklist on real keyboards before a release, and after re-syncing `src-controller/`.

**Setup**

- A keyboard with firmware built on the current libamp (version 0.1.x). Older firmware is
  refused with "Unsupported firmware version …" — flash it first (step 9).
- Chrome or Edge, `npm run build && npm run preview` (or the deployed site), DevTools console
  open: any error printed during a step is a failure.
- Note the keyboard model, firmware version (Settings, or the console) and app commit.

| #   | Step                                                                                                                                | Expected                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | Click **Get Started**, pick the keyboard.                                                                                           | Loading overlay, then Remap with this model's layout (not another model's) and its own keycodes.                 |
| 2   | Remap: select a key, assign a keycode; select more keys (brush); switch layers.                                                     | The keys change on the keyboard at once (type to check); switching layers writes nothing.                        |
| 3   | Performance: select keys, change actuation; enable rapid trigger.                                                                   | Selected keys show their stored values first; the change is felt on the keyboard.                                |
| 4   | Lighting: apply a base effect; apply a per-key mode/colour to selected keys, then with no selection.                                | LEDs follow; speed shows a 1–100 % value.                                                                        |
| 5   | Dynamic Keys: create one Tap-Hold, Toggle, DKS and Null Bind; then delete each.                                                     | Each works on the keyboard; the configured list and counts match; deleting restores the key's own keycode.       |
| 6   | **Save**, unplug and replug the keyboard, connect again.                                                                            | Every change from steps 2–5 is still there.                                                                      |
| 7   | Profiles: activate profiles 1–4 from the page and from the toolbar dropdown; switch a profile on the keyboard itself.               | The keyboard switches; the app reloads that profile and marks it active in both places.                          |
| 8   | Debug: Key Tracking on a key, press it slowly; Key Test.                                                                            | The chart follows the key travel live; Key Test logs presses and releases.                                       |
| 9   | Update: choose a firmware `.bin`; follow the steps (the keyboard reboots into its bootloader, the browser asks for the DFU device). | Erase and download progress, then _Flashing Complete_; the keyboard restarts with the new firmware and connects. |
| 10  | Start a flash, navigate to another page and back.                                                                                   | The flash keeps running and the Update page shows its progress.                                                  |
| 11  | Settings → **Enter Bootloader** → confirm. Then reload the page while the keyboard waits in its bootloader.                         | The Update page opens ready to flash; after the reload, Update still finds the bootloader (no keyboard needed).  |
| 12  | Settings: **Restart**; **Factory Reset** → confirm.                                                                                 | Restart reconnects; factory reset shows the default configuration after reloading.                               |
| 13  | Unplug the keyboard while connected.                                                                                                | The app returns to the connection screen.                                                                        |
| 14  | Deploy a new build while a keyboard is connected (or simulate with two builds on `preview`).                                        | No reload while connected; the new version activates after disconnecting.                                        |
| 15  | Load the app once, go offline, reload.                                                                                              | The app loads and every page opens.                                                                              |

Record failures with the step number, console output and the keyboard's firmware version.
