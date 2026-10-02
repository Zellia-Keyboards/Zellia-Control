# Macros and Scripts

Status: implemented (plan: `docs/superpowers/plans/2026-10-01-macros-scripts.md`).

## Why

The upstream configurator (zhangqili/EMIKeyboardConfigurator) can edit a keyboard's macros and its
JavaScript script. Zellia Control has neither, although the vendored controller, our `save()` and
the virtual keyboard already handle both. This adds a Macros page, a Scripts page and their
keycodes, in the app's own style. These are new screens, so there is no Svelte original to match.

Decisions made with the product owner (2026-10-01):

- Build both together.
- Show each page only on keyboard models whose controller declares support.
- Use CodeMirror 6 as the script editor.
- Macros can be recorded in the browser and edited afterwards.
- Macros and Scripts are two separate sidebar pages.
- The script compiler is built locally from libamp with Homebrew's Emscripten.
- Where upstream already decides it, follow its implementation: macros are written by Save like
  everything else; recording takes the keyboard's keys and the mouse buttons; added actions have
  a delay reference, a delay and a duration. The controls stay our own (Record and Stop buttons,
  times in ms).

## Which keyboards

Support comes from the controller of the connected model. The keyboard cannot report it: libamp's
`PACKET_DATA_FEATURE` reply is a `//todo`.

- **Macros:** the controller's macro cache has slots (`get_macros().length`) and actions per slot
  (`get_macros()[0].length`). Trinity Pad and Oholeo have 4 × 128; the Zellia models have none.
- **Scripts:** the controller's `feature.script_level` is not `Disable`. Trinity Pad has AOT;
  the others are `Disable`.
- **Polling rate:** `feature.polling_rate` converts macro ticks to milliseconds (8000 on Trinity
  and the Starlight, 1000 by default).
- **Zellia keyboards:** the public firmware (ZelliaFW-Master `main`) has `//#define MACRO_ENABLE`
  and no `SCRIPT_ENABLE`, and the Zellia controllers declare neither. Its libamp (`ee9d947`)
  predates scripts entirely (no `src/script.c`, no `tools/mqjs`), so scripts on Zellia keyboards
  need a firmware update to a current libamp as well as both flags and an upstream
  emi-keyboard-controller change that declares them. That is out of scope here; the pages appear
  on Zellia keyboards as soon as their controller declares support.
- **Storage (known firmware limitation):** libamp does not store macros (`storage.c` saves the
  profiles, the script and the statistics, not the macros), so a keyboard keeps them only until
  it restarts. The app shows nothing about it, as upstream.

## Behaviour

### Saving

- Macro and script edits are staged like lighting edits: they change the app's copy and send
  nothing.
- The sidebar's Save writes them with everything else, as upstream does (`set_macros`, then
  `save()`). `controller.save()` already writes the macros, and the script source plus its
  bytecode for AOT.
- Every staged edit sets `unsaved` (the dot on Save).
- A device load drops unsaved macro and script edits, like any other, and starts both pages over
  (slot choice, drafts and a recording in progress).

### Macros page

- **Slots:** four buttons ("Macro 1" … "Macro 4", or the model's slot count) choose the slot to
  edit. Each button shows its action count.
- **Action list:** one row per action, in the order the keyboard plays them: libamp plays the
  actions by index, each when its time has come. Recorded and added actions go in at their times;
  editing a time does not move its row, and "Sort by time" reorders the rows. The columns are:
  - **Time:** in ms from the start of the macro.
  - **Key:** the keycode's name.
  - **Event:** Press or Release.
  - **Virtual:** on for events that come from no physical key, as recorded events do.
  - **Key ID:** the physical key, used when Virtual is off.
  - A delete button.

  Time, the key (through the keycode picker Dynamic Keys uses, without "None", which would end the
  macro), the event and Virtual can be edited in place. A time is committed on Enter or when its
  field loses focus, rounded to the keyboard's ticks; an emptied field changes nothing.
- **Adding actions** (upstream's "Add macro action"): "Add key" adds a press and a release of a
  chosen key. The press comes a delay after a delay reference — "From macro start", "From first
  action" or "From last action" (the default) — and the release a duration after the press; both
  are virtual with key ID 0. Delay and duration are in ms (50 and 20 by default) and editable
  before adding. With fewer than two free entries the form says "Not enough space for a complete
  action." and Add key is disabled.
- **Recording:**
  - "Record" captures key presses and releases on this computer's keyboard and mouse-button
    presses and releases (left, right, middle, back and forward, as the Mouse keycodes), with
    their timing, until "Stop", until the slot is full, until the window loses focus, or until
    the page closes.
  - Recorded events continue after the slot's latest action and are staged as they come, so the
    table fills while recording.
  - Repeated keydown events from holding a key are ignored.
  - Recorded events are virtual, with key ID 0, as upstream records them.
  - While recording, keys and mouse buttons do nothing else in the page: their default actions,
    clicks, middle clicks and the context menu are suppressed, except on the Stop button, whose
    clicks are not recorded.
  - Browser key codes are mapped to HID keycodes; keys without a HID equivalent are skipped and
    counted ("2 keys could not be recorded.").
  - A press is recorded only if there is room for its release and for the releases of the keys
    still held. Stopping, for whatever reason, releases the keys still held, so playback never
    leaves a key held.
- **Other actions:** "Clear" empties the slot (with a confirmation if it has actions). "Sort by
  time" reorders the rows.
- **Limit:** a counter reads "N / 127 actions". One entry of the 128 is the end marker the
  firmware stops at, so 127 is the most a slot can hold. Adding or recording stops at the limit.
- The page says that macro changes reach the keyboard when Save is pressed, and nothing about how
  long the keyboard keeps them.

### Scripts page

- **Editor:** CodeMirror 6 with JavaScript highlighting, auto-indent and search. It completes the
  script API the firmware actually has (libamp `src/mquickjs/mqjs_libamp_stdlib.c` and
  `src/script.c` at the compiler's commit):
  - `keyboard.watch`, `getKey`, `tap`, `press`, `release`, `getLayerIndex`, `getTick`,
    `getTime`, `setProfile`, `command`, `save`, `reboot`, `enterBootloader`, `resetToDefault`
    and `factory_reset` (`keyboard.suspend` is commented out in the firmware);
  - `led.setRGB`, `setHSV` and `setMode` (the object is `led`);
  - `console.log`, `setTimeout`, `clearTimeout` and `Key` (`new Key(id)`);
  - the members of keys: `id`, `state`, `reportState`, `emit` and the analog values;
  - the callbacks `loop`, `onKeyDown`, `onKeyUp` and `onExit`.

  The completion list lives in one file. The editor loads only with this page.
- **Files:** "Open .js", "Save .js" (`script.js`) and "Load example". The example is written for
  this app and does what the upstream demo does: it watches key 2 and, when the key goes down,
  taps A for 100 ms and logs it.
- **Compiling (AOT keyboards):**
  - Nothing compiles until the first edit after the page opens; until then the page shows the
    keyboard's script and bytecode.
  - The page compiles the text 500 ms after the last edit; the status line says "Compiling…"
    meanwhile.
  - A script that compiles is staged together with its bytecode.
  - If it fails, the compiler's error output and its line show below the editor, and the
    staged script stays the last one that compiled.
  - The status line says which: "Compiled: 812 bytes — sent to the keyboard on Save" or
    "Errors: fix them to send this script".
  - A warning appears when the bytecode or the source (with the NUL the controller appends)
    exceeds 1 KB, libamp's default buffer size. A firmware may use other sizes, so this does not
    block anything.
- **JIT keyboards:** the source is staged as it is typed, and there is no compile step.
- **Bytecode:** a collapsible section shows the bytecode as hex.

### Keycodes

Remap's Extension tab gets two groups, shown only on keyboards that support them:

- **Macro:** for each slot, Record start, Record stop, Record toggle, Play once, Play loop, Play
  once without gaps, Play loop without gaps, Stop and Pause.
- **Script:** Watch, Start, Stop, Suspend, Restart and Toggle (libamp `ScriptKeycode`).

The keycode codec already decodes both categories. It gets constructors for them (`kc.macro`,
`kc.script`), and `display.ts` names the script keys like upstream (it showed them blank); the
palettes are new.

### Copy

All new copy is in English and Chinese. The plan lists the strings. The Chinese follows the
existing dictionary's terms: 宏 (macro), 脚本 (script), 按下 / 释放 (press / release).

### Navigation

- "Macros" and "Scripts" are sidebar entries after "Dynamic Keys", shown only while the connected
  keyboard supports them.
- Both pages hide the toolbar and the global keyboard, like Debug and Settings: neither edits
  keys of the layout.
- Opening either URL on a keyboard without support shows "This keyboard does not support macros"
  (or "… scripts").

## Design

### Device layer (`features/device`)

- `DeviceConfig` gains:
  - `macros: readonly (readonly MacroAction[])[]`: one array per slot, with the end marker and
    everything after it removed. Each `MacroAction` is `{ delay: number /* ticks from start */,
    keycode: Keycode, event: 'down' | 'up', isVirtual: boolean, keyId: number }`.
  - `script: { source: string; bytecode: readonly number[] } | null`: null without script
    support. The bytecode is a number array, so the snapshot stays freezable.
- `FeatureFlags` gains `macroSlots` and `macroActions`; `pollingRate` and `scriptLevel` already
  exist. Pure capability helpers (`supportsMacros`, `supportsScripts`, `macroActionLimit`) gate the
  pages, the sidebar entries and the Extension groups.
- **Mapping:** reading turns controller macros into actions and cuts each slot at the first
  `KeyNoEvent` keycode. Writing builds full-capacity arrays: the actions, an end marker (keycode
  `KeyNoEvent`, delay = the last action's delay), then empty actions up to the slot size. The
  controller derives its read size from `macros[0].length`, so the cache must stay at full
  capacity.
- **Vendored controller bug:** the AT32, Oholeo and Trinity Pad controllers fill their macro cache
  with `Array(4).fill(Array(128).fill(new MacroAction()))`, so all slots share one array. The
  device layer's upstream workaround (`withUpstreamFixes`) gives every slot and action its own
  object when the controller is created; `src-controller/` stays unedited.
- **Commands:** both are staged like `setRgbKeys`: they validate, update the cache and the
  snapshot, call `#commitEdit` and send nothing.
  - `setMacro(slot, actions)` validates the slot, the action count (at most `macroActions − 1`),
    the keycodes (keycode 0 is rejected: it would end the macro there), delay ≤ u32, key ID ≤ u16
    and key IDs that exist on the keyboard (libamp reads the key of every action it plays).
  - `setScript({ source, bytecode })` validates that scripts are supported and that the bytecode
    holds bytes (0..255).
- `#syncCache` and `readDeviceConfig` cover macros and the script. The load already reads them
  when the controller declares them (`read_data`).

### Compiler (`vendor/mqjs/`)

- **Contents:** `mqjs_wasm.js` and `mqjs_wasm.wasm` built from libamp's `tools/mqjs` (target
  `mqjs_wasm`, export `createMqjsCompiler`). Alongside them:
  - `LICENSE`: GPL-3.0, libamp's; `licenses/`: the licenses of the compiled submodules.
  - `PROVENANCE.md`: repository, commit, Emscripten version, build command, SHA-256 of both files.
  - `build.sh`: clones Zellia_libamp at the pinned commit with the submodules the compiler needs,
    runs `emcmake cmake tools/mqjs` and builds `mqjs_wasm`.
- **Commit:** pinned to libamp `8f9c439`, the newest commit (Zellia_libamp `main` and
  zhangqili/libamp `main` are the same commit). The commit the Zellia firmware uses (`ee9d947`)
  has no `tools/mqjs` and no script support, so it cannot be the pin; Zellia firmware needs a
  libamp update before it can run scripts (see Which keyboards).
- **License:** it is a separately licensed component. The app stays MIT, and `vendor/mqjs/` is
  excluded from lint and format like `src-controller/`.
- **Building:** `npm run build:mqjs` runs `build.sh` and needs Homebrew's `emscripten`. Normal
  builds and CI use the committed files. The service worker precaches the wasm, so compiling
  works offline.
- **`features/scripts/model/compiler.ts`:** loads the module lazily and runs
  `callMain(['--no-column', '-m32', '-o', '/out.bin', '/main.js'])` on the virtual FS, as upstream
  does, on a fresh instance for every compile (one instance cannot run twice). It returns
  `{ bytecode, stdout, stderr }` with the errors parsed into `{ line, message }` where the output
  allows.

### Features

- `features/macros/`:
  - `MacrosPage`.
  - Components: slot buttons, action table, add form, recorder controls; a recorder hook and the
    staged edits.
  - `model/`: ticks ↔ ms, the delay references and inserting by time, sorting, the end-marker
    rule, a browser `KeyboardEvent.code` → HID keycode table and the mouse buttons' Mouse
    keycodes, and the recorder.
- `features/scripts/`:
  - `ScriptsPage`.
  - `components/ScriptEditor` (CodeMirror, lazy).
  - `model/`: compiler, completions, error parsing.
- `features/keycodes/palettes.ts` gets macro and script entries. The Extension tab renders them
  when the store's capability flags allow.
- `app/navigation.ts` gets the two pages, gated by capability. Routes are lazy like the others.

## Parity

- The new pages and the gated sidebar entries appear only on models with support. The parity
  harness's default keyboard (Starlight) has none, so existing captures do not change.
- New React-only scenarios use the virtual Trinity Pad:
  - `macros-empty`, `macros-actions`, `macros-recording`;
  - `scripts-example`, `scripts-error`;
  - `remap-extension-macro` (Remap's Extension tab with both groups).

  A `reactOnly` scenario is captured in the React app only and reported as `new`, which passes.
  They are logged as new screens (PL-051 to PL-054, with after-screenshots only).

## Testing

- **Device**, against the virtual keyboard, model `trinity-pad`:
  - Macros and the script load from the keyboard.
  - `setMacro` and `setScript` stage without packets and set `unsaved`.
  - `save()` writes them. Afterwards the keyboard has the actions with the end marker and the
    script source and bytecode.
  - Out-of-range slots, too many actions and unsupported scripts are rejected.
- **Compiler** (Vitest, on Node with the wasm read from disk): the example compiles to non-empty
  bytecode; a syntax error returns stderr with its line.
- **Models:** ticks ↔ ms at 1000 and 8000 Hz; the end-marker trim and pad; the `code` → HID
  table and the mouse buttons; the delay references and inserting by time; sorting.
- **Components:**
  - The action table edits, add form, Clear with confirmation, and the limit counter.
  - The recorder records keys and mouse buttons, ignores repeats, skips unmapped keys, suppresses
    the context menu and stops when full.
  - The Scripts page's compile status, error display and staging only compiled scripts.
- **Navigation:** the entries and the Extension groups appear only with support (Trinity Pad
  yes, Starlight no).
- **e2e:** on the virtual Trinity Pad:
  - Record keys and a click, edit the macro, Save; the keyboard has it.
  - Write a script with an error, fix it, Save; the keyboard has the source and the bytecode.

## Later

- Declaring macros and scripts for the Zellia models (a firmware on a current libamp with both
  flags, plus an upstream controller change).
- A console panel showing the script's `console.log` output (`consoleData` events).
- Assigning a macro to a key from the Macros page.
