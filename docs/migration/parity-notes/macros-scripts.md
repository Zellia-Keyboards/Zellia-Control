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
start in every variant, all `new` and without errors; `pl-053-after.png` and `pl-054-after.png` come
from the second of those runs.

The three `macros-*` scenarios were re-taken on 2026-10-02 (`npm run parity -- --workers=4 --grep
"macros-"`: 24 captures, all `new`, without errors) after the chosen slot gained its ring. The glass
theme sets every `glassmorphism-button`'s background, border and colour, so the chosen slot's own
background and border never showed and the four slots looked the same; it is now ringed in the
theme colour (`ring-2 ring-primary-400`), like the toolbar's layer buttons. Against the earlier
captures only the first slot's rectangle changed (688–696 px at 1440×900, 804–815 px at 2560×1440:
the ring), plus at most 24 px of the usual noise in four captures. `pl-051-after.png` and
`pl-052-after.png` come from this run.
