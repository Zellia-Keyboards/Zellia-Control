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
  `detect()` name filter only accepts `ZelliaKB`. Zellia Control's CI excludes this file (see
  `vitest.config.ts` at the repo root) and the app's device matcher handles the
  `Zellia Starlight` name explicitly (`src/features/device/models.ts`). Remove both once
  upstream is fixed.

## Re-syncing

1. Download `emi-keyboard-controller/` at the desired upstream commit.
2. Replace this directory's contents (keep this file), e.g.
   `rsync -a --delete --exclude node_modules --exclude UPSTREAM.md <download>/ src-controller/`.
3. Update the table above and re-check the known issues.
4. Run `corepack yarn typecheck` and `corepack yarn test`; fix `src/features/device/controller.ts`
   (the app's only adapter to this package) if the API changed.

Do not edit files in this directory; changes belong upstream.
