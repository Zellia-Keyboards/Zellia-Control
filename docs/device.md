# Device layer

`src/features/device` is the only code that talks to the keyboard. It wraps the vendored
`emi-keyboard-controller` (`src-controller/`, see its `UPSTREAM.md`) behind one service,
`deviceSession`, and publishes what the keyboard holds as immutable snapshots in a Zustand store.
UI code reads the store through hooks and changes the keyboard only through session commands.
Design and decisions: [spec §5](superpowers/specs/2026-09-30-react-rewrite-design.md) (D1–D16).

```
UI components ──hooks──▶ device store (immutable DeviceState)
      │                        ▲ patched by
      └──commands──▶ DeviceSession ──▶ controller adapter ──▶ emi-keyboard-controller ──WebHID──▶ keyboard
                           │                                      (packets, transactions, events)
                           └──▶ debug stream (samples, outside React)
```

## Why it is built this way

- **The keyboard is the source of truth.** The Svelte app kept a second copy of the
  configuration in stores and showed controller defaults before the device answered. Here the
  store only ever holds what the device sent (`config` is `null` until the first complete load)
  plus the edits the session itself sent.
- **One adapter to a moving upstream.** `controller.ts` declares the structural
  `DeviceController` interface with exactly the members the app calls; each model's controller is
  checked against it with `satisfies`, so an upstream API change breaks one module at compile
  time. Workarounds for upstream bugs live there too (`withUpstreamFixes`).
- **Framework-agnostic session.** `session.ts` and everything it imports are free of React
  (enforced by `architecture.test.ts`); React appears only in `store.ts`'s hooks. The session can
  be tested with plain Vitest against the virtual keyboard.
- **No shared mutable state.** Controller caches are mutable arrays; snapshots are frozen copies.
  Every command writes fresh copies into the controller and patches the store immutably, so React
  never sees a value change under it.

## Public API (`features/device` index)

| Export                                                             | Use                                                                                       |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `deviceSession`                                                    | The app's session, bound lazily to `navigator.hid` on `connect()`.                        |
| `useConnection()`, `useIsReady()`, `useModel()`, `useDeviceName()` | Connection state slices.                                                                  |
| `useDeviceConfig()`                                                | The loaded `DeviceConfig` (`null` before the first load).                                 |
| `useDeviceStore(selector)`, `deviceStore`                          | Any other slice (`saving`, `reloading`, `lastError`, `feature`, `firmware`).              |
| `subscribeDebugSamples(listener)`                                  | Samples of the key being debugged (see _Debug stream_).                                   |
| `createDeviceSession(options)`                                     | A separate session (tests, tools); takes its own `hid`, store, models, timeouts.          |
| types                                                              | `DeviceConfig`, `DynamicKeySlot`, `KeyLocation`, `ConnectionState`, … (`model/types.ts`). |

The pure modules in `features/device/model/` may be imported directly by other features' pure
code: `types` (the shared domain types), `units` (fraction ↔ mm) and `mutex-mode` (null-bind
mode bytes). They never import React or the session.

### Values

- Distances and thresholds are **fractions of full travel** (0…1), exactly as on the wire.
  Convert for display with `model/units.ts` (`mm = fraction × 4.0`).
- Keymaps are `[layer][keyId]` with **0-based layers**; the UI's layer selector is 1-based.
- A `Keycode` is the 16-bit EMI code (`features/keycodes` encodes and names them).
- Dynamic keys are a discriminated union (`none`, `stroke`, `modTap`, `toggle`, `mutex`). Their
  targets are not returned by device reads; the session rebuilds them from the keymap
  (`DynamicKey | slot << 8` entries) on every load (D4).

## Connection

```
disconnected ──connect()──▶ selecting ──picked──▶ connecting ──opened──▶ loading ──first updateData──▶ ready
      ▲                          │ none / cancel         │ failure            │ updateDataError, or no
      │                          ▼                       ▼                    ▼ updateDataStart within 3 s
      └────── disconnect() ◀── error { message } ◀─────────────────────────────┘
ready ──deviceDisconnected / disconnect()──▶ disconnected
ready ──device-initiated reload (profile switch, on-board change)──▶ ready (reloading = true meanwhile)
```

- `connect()` must run in a user gesture (it opens the browser's HID chooser). Calls during an
  attempt join it; calls while connected do nothing. Listeners are attached before the controller
  connects, so a fast load is never missed.
- The picked device is matched to a model with each controller's own `detect(true)` rules
  (`models.ts`, D1), so a Zellia 80 gets the Zellia 80 layout.
- Error messages (`CONNECTION_ERRORS`): "No compatible keyboards found", "No compatible
  controller found for detected device", "Failed to connect to keyboard", "Keyboard did not
  respond", "Unsupported firmware version …", "Failed to load keyboard configuration: …". A failed
  reload after the first load also ends in `error`, so the UI never edits a stale snapshot (D2).
- A physical unplug returns to `disconnected` (D3).

## Commands

All commands are methods of `deviceSession`. Each validates its input, updates the controller's
cache with fresh copies, sends the packets (the controller's queue serializes them) and patches
the store. None throws: a rejected or failed command sets `lastError` (`{ operation, message }`)
and logs it. Edits are rejected while disconnected or while the keyboard reloads its
configuration.

| Command                                                    | Effect                                                                                                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setKeycodes(layer, keyIds, keycode)`                      | Keymap entries; sent in contiguous runs of ≤ 27 codes. Overwriting a dynamic key's key releases that dynamic key (D4).                               |
| `setAdvancedKeys(keyIds, config)`                          | Advanced-key settings per key (calibration mode and sensor bounds are kept).                                                                         |
| `setRgbBase(config)` / `setRgbKeys(entries)`               | Lighting base config / per-key configs.                                                                                                              |
| `applyDynamicKey(draft)`                                   | Writes a dynamic key to its key's slot or the first free one and binds its keys (D6); returns the slot, or `null` when rejected (e.g. no free slot). |
| `removeDynamicKey(slot)` / `removeDynamicKeysOfKind(kind)` | Frees slots and restores each key to the dynamic key's own binding (D5).                                                                             |
| `save()`                                                   | `controller.save()` then `flash()` (D9); concurrent calls share one save; waits for a reload in progress.                                            |
| `switchProfile(index)`                                     | 0-based; resolves when the keyboard has reloaded that profile.                                                                                       |
| `systemReset()`, `enterBootloader()`, `factoryReset()`     | Keyboard operations; a factory reset waits for the keyboard to reload its defaults.                                                                  |
| `startDebug(keyId)` / `stopDebug()`                        | Debug streaming of one key (D16).                                                                                                                    |
| `detectBootloader(silent)`                                 | The DFU bootloader (see _Firmware update_).                                                                                                          |

**Slot numbers are not stable.** libamp stops scanning dynamic keys at the first empty slot, so
the session keeps the used slots contiguous from 0: freeing a slot moves the highest dynamic key
down into it. Never keep a slot number across commands; derive it from the store. UI-only
dynamic-key fields are keyed by the dynamic key's target `KeyLocation` for the same reason (D5).

## Debug stream

libamp only sends debug packets while its debug config bit is on. `startDebug(keyId)` turns it on
and subscribes the key in an async loop (`request_debug_at`, D16); samples of that key are
published to `subscribeDebugSamples` listeners — not to the store, so a chart can append points
without a React render per sample. `stopDebug()` turns the bit off again; switching keys is a
second `startDebug()`.

## Firmware update

`detectBootloader(silent)` returns the model's DFU device (`controller.detect_bootloader`): with
`silent` only already authorized devices, otherwise the browser's USB chooser (needs a user
gesture). It uses the connected model, else the last connected one (the keyboard has just
rebooted into its bootloader), else — no keyboard since the page loaded, e.g. after a reload
mid-flash — the bootloaders of every supported model in one chooser (`bootloader.ts`, spec §1.7).
The flashing itself (`WebDfuDevice`) belongs to `features/firmware-update`.

## Adding a keyboard model

1. Add its controller upstream (or check it exists in `src-controller/`).
2. Add a `ModelDefinition` to `MODELS` in `models.ts`: id, display name, the HID filter its
   `detect()` uses, product-name fallbacks and its bootloader filter. Add the id to `ModelId` in
   `model/types.ts`.
3. Add it to the virtual keyboard's `VIRTUAL_MODELS` (`src/testing/virtual-keyboard/state.ts`) and
   extend the model tests (`models.test.ts`, `controller.integration.test.ts`).

## Testing

The device layer is tested against the **virtual keyboard** (`src/testing/virtual-keyboard`), a
simulator of libamp's side of the protocol (replies echo `code | id | type`, config-changed
events, profiles, debug packets, a WebUSB DFU bootloader), driven by the real vendored
controllers — never by mocking our own modules.

- `src/features/device/testing/session-harness.ts`: a session with its own store on a virtual
  keyboard (`createHarness`), for session tests.
- `src/testing/app-keyboard.ts`: connects the app's `deviceSession` singleton, for page tests
  (`connectVirtualKeyboard()`).
- `e2e/fixtures.ts`: the same simulator injected into the browser (`virtualKeyboard` fixture,
  options via `virtualKeyboardOptions`).
