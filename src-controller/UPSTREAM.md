# Vendored package: emi-keyboard-controller

This directory is an unmodified copy of the `emi-keyboard-controller` package from
[zhangqili/EMIKeyboardConfigurator](https://github.com/zhangqili/EMIKeyboardConfigurator)
(directory `emi-keyboard-controller/`). Zellia Control uses only this API package, not the
upstream Vue frontend. It speaks the current upstream libamp protocol
([zhangqili/libamp](https://github.com/zhangqili/libamp), transaction-id packet framing since
2026-08-09); `Zellia-Keyboards/Zellia_libamp` is a fork that is upstreamed, so no older
protocol is supported.

| Field | Value |
| --- | --- |
| Upstream commit | `ac25c4e74fb02362c22f6fe9619f85e2e677a54f` (2026-09-09, "update ui") |
| Synced on | 2026-09-30 |
| Local modifications | none |

## Known upstream issues

- `test/device-detection.test.ts` fails 2 of its cases at this commit: the test expects a
  device named `Zellia Starlight` to match `ZelliaStarlightController`, but the controller's
  `detect()` name filter only accepts `ZelliaKB`. Zellia Control's CI excludes this file (the
  `controller` test project in the root `vite.config.ts`) and the app's device matcher handles the
  `Zellia Starlight` name explicitly (`src/features/device/models.ts`). Remove both once
  upstream is fixed.
- `LibampKeyboardController.packet_process_dynamic_key()` ends its GET branch with
  `else (buf[0] == PacketCode.PacketCodeSet) { … }`: the `else` has no `if`, so the SET
  serializer also runs after every GET and throws on the (always empty) `target_keys_location`
  of a freshly read dynamic key. Unpatched, any keyboard with a configured dynamic key fails to
  load. `src/features/device/controller.ts` (`withUpstreamFixes`) swallows exactly that failure
  for every model; remove it once upstream is fixed.
- libamp's `QK_DEBUG_TOGGLE` alias sets keyboard-config action bits 3, which the firmware's
  operation handler ignores (FYI; the app encodes toggles with action 2).
- `ZelliaStarlightController`'s default keymap has 64 entries per layer, written for another
  physical layout (arrow cluster, no split keys), while `ADVANCED_KEY_NUM` and its layout JSON
  have 70 keys. `read_keymap`/`write_keymap` transfer exactly `keymap[layer].length` entries, so
  keys 64–69 (the default layout's last bottom-row key and the split/7u space bar variants) are
  never read or written, and have no keycode in the app. The app does not pad the keymap: libamp's
  keymap handler has no bounds check, so transferring more entries than the firmware's
  `TOTAL_KEY_NUM` would read or corrupt unrelated firmware memory. Confirm the firmware key
  count upstream, then fix the default keymap there. The virtual keyboard seeds the Starlight
  keymap in layout order (`src/testing/virtual-keyboard/state.ts`), as the firmware stores it.

## Re-syncing

1. Download `emi-keyboard-controller/` at the desired upstream commit.
2. Replace this directory's contents (keep this file), e.g.
   `rsync -a --delete --exclude node_modules --exclude UPSTREAM.md <download>/ src-controller/`.
3. Update the table above and re-check the known issues.
4. Run `corepack yarn typecheck` and `corepack yarn test`; fix `src/features/device/controller.ts`
   (the app's only adapter to this package) if the API changed.

Do not edit files in this directory; changes belong upstream.
