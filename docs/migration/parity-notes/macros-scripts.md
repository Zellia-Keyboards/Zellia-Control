# Parity notes: Macros and Scripts

Scenarios: `e2e/parity/scenarios/macros-scripts.ts`, all `reactOnly`, on the virtual Trinity Pad
(`{ model: 'trinity-pad', seedDynamicKeys: false }`). The Svelte app has none of these screens, so
the harness captures the React app only and reports them as `new`.

| Scenario                | Shows                                                  | Log            |
| ----------------------- | ------------------------------------------------------ | -------------- |
| `macros-empty`          | the Macros page of an empty macro                      | PL-051, PL-052 |
| `macros-actions`        | a recorded Shift+A loaded from the keyboard            | PL-052         |
| `macros-recording`      | recording: Stop and the recording line                 | PL-052         |
| `scripts-example`       | the example, compiled, with its bytecode               | PL-053         |
| `scripts-error`         | a syntax error with its line                           | PL-053         |
| `remap-extension-macro` | Remap's Extension tab with the Macro and Script groups | PL-054         |

The existing scenarios run on the Zellia Starlight, which declares neither macros nor scripts:
their screens do not change.

## Results

Full run of 2026-10-02 (`npm run parity -- --workers=4`: all 142 scenarios in all eight variants,
Chrome 154, strict comparison): 1 136 captures, 188 identical, 900 different, 0 missing, 48 new.
The 48 new captures are these six scenarios in all eight variants; none of them logged a page error
or a console error. The parity log's [Per-feature results](../parity-log.md#per-feature-results)
explain the other captures' differences.

Before that run the six scenarios were captured in `dark-en-1440x900` alone (6 captures) and then
in all eight variants (48 captures): all `new`, without errors either.

In 7 of the full run's 24 captures at 1440×900 (`macros-empty`, `-actions` and `-recording`,
`scripts-example`), and in 2 of the earlier ones, the sidebar was scrolled 44 px down. With Macros
and Scripts the Trinity Pad's sidebar is 44 px taller than that viewport, and its links still move
while the Save and Disconnect buttons slide in: Playwright retries the click on a moving link and
scrolls it into view at another alignment on each retry, which at times scrolled the sidebar to
its end. The scenarios now scroll the sidebar back to its start before the capture
(`scrollSidebarToStart`). The 48 captures, taken twice more after that, show the sidebar at its
start in every variant, all `new` and without errors; `pl-051-after.png` to `pl-054-after.png` come
from the second of those runs.
