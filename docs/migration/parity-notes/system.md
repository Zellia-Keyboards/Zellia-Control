# Parity notes: debug, settings, about, firmware update (worker I)

Scenarios: `e2e/parity/scenarios/system.ts`, captured in both apps in dark/light × en/zh ×
1440×900/2560×1440 with `E2E_PORT=4315 npm run parity -- --workers=2 --grep system-`.

Connected scenarios click "Get Started", wait for Remap and open the page from the sidebar.
Before each capture they let the entry animations finish (both apps start them at slightly
different times), hide the sidebar's Save button (PL-002, the shell's deviation) and move the
pointer onto the sidebar title. The Key Tracking scenarios wait until Chart.js, which both apps
load on demand, has drawn the chart. The update scenarios drive both apps with the same steps:
where the baseline shows its DFU instructions, the keyboard is put into its bootloader by hand and
"Device is in DFU Mode" clicked; where the React app has rebooted it already, "Connect USB Device"
is clicked. Three scenarios make the virtual bootloader hold or fail one transfer to show a state
in the middle of a flash (`tamperBootloader`).

## Results

Final run of 2026-10-01 (168 captures, strict comparison): 39 identical, 129 different. 108
of the differences are the deviations below; the other 21 are capture noise (see below), in
regions that are identical in the other variants. A re-run of `system-debug` alone came out with
6 identical captures and the 1-pixel noise in the other two.

Review fix round of 2026-10-01, one variant only (`--grep 'system-.*--dark-en-1440x900'`, 22
captures): 2 identical (`system-about`, `system-update`) and 20 different, each by the deviations
below or the noise listed: `system-settings` 14 px of sidebar link corners, the four Debug
scenarios 1 px of the Theme Colors icon, the new `system-update-file-focus` 2 536 px (I-6 and
sidebar link corners). The other seven variants of `system-update-file-focus` are left to the
integration run.

| Scenario                                       | Identical         | Differences                                                                                                     |
| ---------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------- |
| `system-about`                                 | 8/8               |                                                                                                                 |
| `system-settings`                              | 5/8               | noise: sidebar link corners (12–14 px)                                                                          |
| `system-debug`                                 | 3/8 (re-run: 6/8) | noise: Theme Colors icon (1 px); at 2560×1440 the Key Tracking column's raster variant (~13 000 px, either app) |
| `system-debug-selector`, `-key-test`           | 6/8               | noise: Theme Colors icon (1 px)                                                                                 |
| `system-debug-key-test-events`                 | 3/8               | noise: round dots and card corners (4–30 px)                                                                    |
| `system-update`                                | 6/8               | noise: sidebar link corners (30–42 px)                                                                          |
| `system-update-file-focus`                     | 0/1 (dark-en)     | I-6; noise: sidebar link corners                                                                                |
| `system-about-donation`                        | 2/8               | PL-027 (en); zh: noise (sidebar corners, 20 px; the QR code image, 1 904 px)                                    |
| `system-debug-tracking`                        | 0/8               | PL-011                                                                                                          |
| `system-settings-bootloader`, `-factory-reset` | 0/8               | PL-012                                                                                                          |
| `system-settings-bootloader-confirmed`         | 0/8               | PL-026, PL-004 (sidebar)                                                                                        |
| `system-update-no-keyboard`                    | 0/8               | PL-025                                                                                                          |
| `system-update-wrong-file`, `-small-file`      | 0/8               | I-1                                                                                                             |
| `system-update-file-chosen`                    | 0/8               | I-1, I-2, PL-004 (sidebar)                                                                                      |
| `system-update-no-device`                      | 0/8               | I-1, PL-004 (sidebar: the keyboard was unplugged)                                                               |
| `system-update-flashing`                       | 0/8               | I-1, I-3, PL-004 (sidebar)                                                                                      |
| `system-update-erase-failed`                   | 0/8               | I-1, I-4, PL-004 (sidebar)                                                                                      |
| `system-update-reconnect`                      | 0/8               | I-1, I-5, PL-004 (sidebar)                                                                                      |
| `system-update-done`                           | 0/8               | I-1, PL-004 (sidebar)                                                                                           |

Everything else on these screens matches: the Debug page, both tabs and the key picker; the Key
Test log with the same times and deltas (`performance.now()` is pinned per event); Settings and
About; the updater's steps, panels and copy in every state both apps reach, including the error
panel for a missing bootloader and a refused file.

## Deviations

Rows for `docs/migration/parity-log.md` (same format; links are relative to
`docs/migration/`, as in the log). Screenshots are the `dark-en-1440x900` captures; every
variant shows the same difference.

| ID     | Screen / route            | State and captures                                                                                                                                                                                                 | Deviation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Reason                                                                                         | Before                             | After                            | Status |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------- | ------ |
| PL-011 | `/debug/`                 | Key Tracking, a key picked in the modal keyboard and recording; `system-debug-tracking--*`                                                                                                                         | The travel chart plots the key's live travel in millimetres, following the last 500 ms. The baseline's chart stayed empty (it listened to `updateData` instead of `updateDebugData`). Where the line lies depends on the moment of the capture.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | D16                                                                                            | [before](parity/pl-011-before.png) | [after](parity/pl-011-after.png) | logged |
| PL-012 | `/settings/`              | Enter Bootloader or Factory Reset clicked; `system-settings-bootloader--*`, `system-settings-factory-reset--*`                                                                                                     | A confirmation modal (the profiles `ConfirmationModal`) appears first, titled like the action: "Are you sure you want to enter bootloader mode? The keyboard will disconnect and wait for a firmware update." or "Are you sure you want to reset all settings to factory defaults? This action cannot be undone.", with Cancel and an "Enter Bootloader" or "Factory Reset" button. Nothing is sent until it is confirmed (Cancel, Escape and the backdrop send nothing); the baseline ran the action at once. Restart stays single-click (`system-settings` is identical). In Chinese the title and the confirm button show the translated action names (进入引导程序, 恢复出厂设置); the message and Cancel stay English, as in the profiles dialogs, until translation keys and a Cancel label on the shared `ConfirmationModal` exist (requested from the integrator). | §1.3, §8 Settings                                                                              | [before](parity/pl-012-before.png) | [after](parity/pl-012-after.png) | logged |
| PL-025 | `/update/`                | no keyboard connected; `system-update-no-keyboard--*`                                                                                                                                                              | The firmware updater is shown (the baseline showed _No Keyboard Connected_). With no keyboard to reboot, choosing a file skips step 2, and Connect USB Device opens the browser's chooser for the bootloaders of every supported model.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | §1.7 product owner decision                                                                    | [before](parity/pl-025-before.png) | [after](parity/pl-025-after.png) | logged |
| PL-026 | `/settings/` → `/update/` | Enter Bootloader confirmed; `system-settings-bootloader-confirmed--*`                                                                                                                                              | The app opens the Update page with the update session started: step 1 waits for the image, the keyboard waits in its bootloader and the sidebar shows "Waiting to connect" (PL-004). Once a file is chosen, the bootloader that appeared after the request is flashed, or Connect USB Device opens the chooser. The baseline stayed on Settings (and ignored the disconnect, PL-004).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | §1.8 product owner decision                                                                    | [before](parity/pl-026-before.png) | [after](parity/pl-026-after.png) | logged |
| PL-027 | `/about/`                 | English, the donation card; `system-about-donation--*-en-*` (the Chinese variants show the payment codes and are identical)                                                                                        | No "Support Development" button under the donation text: it linked to the placeholder `github.com/sponsors/your-username`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | §1.9 product owner decision                                                                    | [before](parity/pl-027-before.png) | [after](parity/pl-027-after.png) | logged |
| I-1    | `/update/`                | any state after a file was chosen; screenshots: a refused 512-byte `.bin`, `system-update-small-file--*`; also `-wrong-file`, `-file-chosen`, `-no-device`, `-flashing`, `-erase-failed`, `-reconnect` and `-done` | Choose Binary shows as completed and its drop zone is gone: one step is active and only its panel shows. The baseline kept Choose Binary active as well (two ringed steps, the progress line half a step short) and kept its drop zone next to the current step's panel, showing a chosen `.bin` as "✓ N KB - Ready" in green — "✓ 0 KB - Ready" for a refused 512-byte file. Its "auto-select first step on mount" `$effect` read `steps`, so it ran again after every step change and set step 1 back to active.                                                                                                                                                                                                                                                                                                                                                         | bug: the Svelte mount effect re-ran on every step change                                       | [before](parity/i-1-before.png)    | [after](parity/i-1-after.png)    | logged |
| I-2    | `/update/`                | keyboard connected, a `.bin` chosen; `system-update-file-chosen--*`                                                                                                                                                | The app asks the keyboard to reboot into its bootloader. Reboot to Recovery completes once the keyboard has left, and Connect Recovery asks for the USB device ("Connect USB Device"); the sidebar shows "Waiting to connect" (PL-004). If the keyboard does not leave, the DFU instructions and "Device is in DFU Mode" stay, as in the baseline, which only showed how to enter DFU mode by hand.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | §8 Update: choose `.bin` → `enter_bootloader()`                                                | [before](parity/i-2-before.png)    | [after](parity/i-2-after.png)    | logged |
| I-3    | `/update/`                | writing the image, its second block held; `system-update-flashing--*`                                                                                                                                              | The Flash Firmware bar and percentage show the share of the image written so far, 0–100 % (50 % here). The baseline showed its simulated sequence's overall numbers: 60 % when the step began, then 70–95 % during its write loop (83 % here), never 100 %.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | §8 Update: download with progress; the Svelte numbers belonged to the whole simulated sequence | [before](parity/i-3-before.png)    | [after](parity/i-3-after.png)    | logged |
| I-4    | `/update/`                | erasing fails; `system-update-erase-failed--*`                                                                                                                                                                     | Update Program is the bootloader's erase: when it fails, its circle shows the error icon, as any failed step does, with "Failed to flash firmware". The baseline's Update Program was a 1.5 s pause that could not fail; its capture shows the update completing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | §8 Update: erase with WebDFU                                                                   | [before](parity/i-4-before.png)    | [after](parity/i-4-after.png)    | logged |
| I-5    | `/update/`                | connecting and writing; `system-update-reconnect--*` (the baseline's second connection held)                                                                                                                       | Connect Flash completes at once: WebDFU writes over the first connection, so the second connection's panel ("Connect USB Device" / "Reconnect for firmware flashing") and a second browser chooser never appear. "Device is in DFU Mode" and "Connect USB Device" open the chooser (or take the bootloader that appeared after the reboot request) at once and go on with the update. The baseline waited 2 s before its first chooser, paused 1.5 s on Update Program, detached the bootloader and asked for it again; its Connect USB Device button only opened the device and did not continue the update.                                                                                                                                                                                                                                                              | §1.5, §8 Update: "connect step completes immediately"                                          | [before](parity/i-5-before.png)    | [after](parity/i-5-after.png)    | logged |
| I-6    | `/update/`                | keyboard focus on the file chooser, Tab pressed after a click on the drop zone's subtitle; `system-update-file-focus--*`                                                                                           | Tab reaches the firmware file input, which is visually hidden (`sr-only`) and named by the drop zone's label; Enter or Space opens the file dialog. While it has keyboard focus, the drop zone shows its hover border (`has-focus-visible:border-primary-500`). The baseline hid the input with `display: none`: Tab skipped it (in the capture the focus wrapped round to the sidebar's Profiles button), so a firmware file could only be chosen with a pointer.                                                                                                                                                                                                                                                                                                                                                                                                         | §7.4 accessibility (WCAG 2.1.1, 2.4.7)                                                         | [before](parity/i-6-before.png)    | [after](parity/i-6-after.png)    | logged |

## Behavior changes without a visible difference in the captures

- **Key Test** (inherited Svelte bug): starting to listen forgets the keys held so far. Releases
  are not seen while stopped, so a key held at Stop stayed "pressed" and its next press was taken
  for an auto-repeat and never logged.
- **Key Tracking**: the chart keeps the last 10 s of samples (Svelte kept every sample of a
  recording, although the axis follows the last 500 ms). After Stop, panning and zooming out reach
  10 s back.
- **Firmware file**: its size (1 KiB–1 MiB) is checked before it is read, so a huge file is never
  loaded; the messages are Svelte's.
- **Update session** (D3): the update lives outside the page. Leaving the page neither aborts a
  flash nor forgets it; coming back shows its progress or result. Svelte destroyed the page's
  state: its flash ran on unseen, and the page started over at step 1.
- **Keyboard connected again** (D3, D18): an update that has not started writing — waiting for
  its image (Settings), for the keyboard's reboot or for the bootloader — ends when a keyboard is
  connected from the connection screen: the updater starts over at step 1 and asks nothing of the
  keyboard, the shell returns to `/` again when it is unplugged, and app updates may apply. A
  running erase or download goes on.
- **Which bootloader is flashed** (§8 Update): without a click, only the one authorized
  bootloader that appeared after the app's reboot request (compared with a lookup taken before
  it). Every other device — one attached before, more than one new one, any device when no
  keyboard was connected — is flashed only after the user picks it in the browser's chooser. The
  silent lookup starts once the keyboard has left. Two quick clicks start one flash.
- **Accessibility** (§7.4; no visible change): Debug tabs are `tab`/`tabpanel`; the key picker
  is a labelled dialog (Escape, backdrop click, focus returns); the update steps are a list with
  `aria-current="step"`, the flash progress a `progressbar`, the error panel an `alert`; the
  confirmations are labelled dialogs with focus return.

## Expected until the other Wave 2 branches are merged

Nothing: these pages hide the toolbar and the keyboard, so no other worker's stub appears in
their captures. The sidebar's Save button is hidden (PL-002), and its status after the keyboard
left for its bootloader is the shell's PL-004.

## Known capture noise

- **Rounded corners.** As on the shell's keycaps, Chrome sometimes rasterizes a rounded corner
  or a small dot with one of two anti-aliasing patterns: up to a few dozen pixels at the corners
  of the sidebar links (`system-settings`, `system-update`, `system-about-donation`), or at the Key
  Test cards and the log's Press/Release dots (`system-debug-key-test-events`), in either app and
  not in every run.
- **Key Tracking column at 2560×1440.** In some runs the Key Tracking tab's left column (its two
  cards, their text and buttons) comes out about half a pixel lower, about 13 000 pixels, in
  either app: comparing two runs, the baseline's capture changed in two variants and the React
  app's in a third. A re-run of `system-debug` matched in all four 2560×1440 variants.
- **QR code.** Right after the About page is scrolled to the donation card, Chrome may still draw
  the Alipay code at its lower image quality (1 904 pixels inside the image in one run); the
  scenario waits 500 ms after the scroll, which removed it in the other runs.
- **Theme Colors icon.** On the Debug page at 1440×900 in English, one pixel of the sidebar's
  Theme Colors icon differs by one colour level, in every run.
- **Pulsing dots.** "Recording" and "Listening Active" pulse forever; the capture stops the pulse
  at its start in both apps.
- **Chart samples.** In `system-debug-tracking` the React line depends on when the samples arrived
  (the baseline plots nothing, PL-011).

## Implementation notes

- The Svelte page's `<style>` rules that never matched (the lucide icons never received Svelte's
  scoping class; `.dark .icon-wrapper-*` needed a scoped `dark` element) are left out of
  `SettingsPage.module.css`, so nothing changes visually.
- The Debug page's Start/Stop and Key Test's Start/Stop Listening buttons are separate elements,
  like Svelte's `{#if}`/`{:else}` branches, so the clicked button's focus is not carried over.
- The chart's dataset label, axis titles and theme colours follow Svelte: labels are fixed when the
  chart is created (the tick unit is read whenever the ticks are drawn), and a theme change re-reads
  the colours 50 ms later. Tracking follows the key selection as in Svelte: picking one key starts
  the keyboard's debug stream; Stop, Clear, another selection and leaving the tab stop it.
- The update steps are derived from one flasher state (`model/flash-steps.ts`): every step before
  the current one is completed, the ones after it pending. A refused file keeps step 2 active next
  to the error panel, as in Svelte.
