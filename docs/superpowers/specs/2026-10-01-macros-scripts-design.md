# Macros and Scripts

Status: proposed 2026-10-01, awaiting review.

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
  and no `SCRIPT_ENABLE`, and the Zellia controllers declare neither. Turning them on needs a
  firmware build with both flags and an upstream emi-keyboard-controller change that declares
  them. That is out of scope here; the pages appear on Zellia keyboards as soon as their
  controller declares support.

## Behaviour

### Saving

- Macro and script edits are staged like lighting edits: they change the app's copy and send
  nothing.
- The sidebar's Save writes them with everything else. `controller.save()` already writes the
  macros, and the script source plus its bytecode for AOT.
- Every staged edit sets `unsaved` (the dot on Save).
- A device load drops unsaved macro and script edits, like any other.

### Macros page

- **Slots:** four buttons ("Macro 1" … "Macro 4", or the model's slot count) choose the slot to
  edit. Each button shows its action count.
- **Action list:** one row per action, in time order. The columns are:
  - **Time:** in ms from the start of the macro.
  - **Key:** the keycode's name.
  - **Event:** Press or Release.
  - **Virtual:** on for events that come from no physical key, as recorded events do.
  - **Key ID:** the physical key, used when Virtual is off.
  - A delete button.

  Time, the key (through the keycode picker Dynamic Keys uses), the event and Virtual can be
  edited in place.
- **Adding actions:** "Add key" adds a press and a release of a chosen key, 50 ms after the last
  action, 20 ms apart. Both values are editable before adding.
- **Recording:**
  - "Record" captures key presses and releases on this computer's keyboard, with their timing,
    until "Stop" or until the slot is full.
  - Repeated keydown events from holding a key are ignored.
  - Recorded events are virtual, with key ID 0, as upstream records them. Mouse buttons are not
    recorded.
  - Browser key codes are mapped to HID keycodes; keys without a HID equivalent are skipped and
    counted ("2 keys could not be recorded").
- **Other actions:** "Clear" empties the slot (with a confirmation if it has actions). "Sort by
  time" reorders the rows.
- **Limit:** a counter reads "N / 127 actions". One entry of the 128 is the end marker the
  firmware stops at, so 127 is the most a slot can hold. Adding or recording stops at the limit.

### Scripts page

- **Editor:** CodeMirror 6 with JavaScript highlighting, auto-indent and search. It completes the
  libamp script API: `keyboard.emit`, `keyboard.tap`, `keyboard.watch`, `keyboard.getKey`,
  `keyboard.suspend`, `keyboard.getLayerIndex`, `LED.setMode`, `console.log`, and the callbacks
  `loop`, `onKeyDown` and `onKeyUp`. The completion list is generated from libamp's
  `mqjs_libamp_stdlib.c` and lives in one file. The editor loads only with this page.
- **Files:** "Open .js", "Save .js" and "Load example". The example is the upstream demo script.
- **Compiling (AOT keyboards):**
  - The page compiles the text 500 ms after the last edit.
  - A script that compiles is staged together with its bytecode.
  - If it fails, the compiler's error output and its line show below the editor, and the
    staged script stays the last one that compiled.
  - The status line says which: "Compiled: 812 bytes — sent to the keyboard on Save" or
    "Errors: fix them to send this script".
  - A warning appears when the bytecode or the source exceeds 1 KB, libamp's default buffer size.
    A firmware may use other sizes, so this does not block anything.
- **JIT keyboards:** the source is staged as it is typed, and there is no compile step.
- **Bytecode:** a collapsible section shows the bytecode as hex.

### Keycodes

Remap's Extension tab gets two groups, shown only on keyboards that support them:

- **Macro:** for each slot, Record start, Record stop, Record toggle, Play once, Play loop, Play
  once without gaps, Play loop without gaps, Stop and Pause.
- **Script:** Watch, Start, Stop, Suspend, Restart and Toggle (libamp `ScriptKeycode`).

The keycode encoder (`features/keycodes/codec.ts`) and the names (`display.ts`) already handle both
categories, so only the palettes are new.

### Copy

All new copy is in English and Chinese. The plan lists the strings. The Chinese follows the
existing dictionary's terms: 宏 (macro), 脚本 (script), 按下 / 释放 (press / release).

### Navigation

- "Macros" and "Scripts" are sidebar entries after "Dynamic Keys", shown only while the connected
  keyboard supports them.
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
- `FeatureFlags` gains `macroSlots`, `macroActions` and `pollingRate`. `scriptLevel` already exists.
- **Mapping:** reading turns controller macros into actions and cuts each slot at the first
  `KeyNoEvent` keycode. Writing builds full-capacity arrays: the actions, an end marker (keycode
  `KeyNoEvent`, delay = the last action's delay), then empty actions up to the slot size. The
  controller derives its read size from `macros[0].length`, so the cache must stay at full
  capacity.
- **Commands:** both are staged like `setRgbKeys`: they validate, update the cache and the
  snapshot, call `#commitEdit` and send nothing.
  - `setMacro(slot, actions)` validates the slot, the action count (at most `macroActions − 1`),
    the keycodes, delay ≤ u32 and key ID ≤ u16.
  - `setScript({ source, bytecode })` validates that scripts are supported.
- `#syncCache` and `readDeviceConfig` cover macros and the script. The load already reads them
  when the controller declares them (`read_data`).

### Compiler (`vendor/mqjs/`)

- **Contents:** `mqjs_wasm.js` and `mqjs_wasm.wasm` built from libamp's `tools/mqjs` (target
  `mqjs_wasm`, export `createMqjsCompiler`). Alongside them:
  - `LICENSE`: GPL-3.0, libamp's.
  - `PROVENANCE.md`: repository, commit, Emscripten version, build command, SHA-256 of both files.
  - `build.sh`: clones Zellia_libamp at the pinned commit with submodules, runs
    `emcmake cmake tools/mqjs` and builds `mqjs_wasm`.
- **Commit:** pinned to the libamp commit the Zellia firmware uses (ZelliaFW-Master
  `lib/Zellia_libamp` → `ee9d947` today), so the bytecode matches that firmware.
- **License:** it is a separately licensed component. The app stays MIT, and `vendor/mqjs/` is
  excluded from lint and format like `src-controller/`.
- **Building:** `npm run build:mqjs` runs `build.sh` and needs Homebrew's `emscripten`. Normal
  builds and CI use the committed files.
- **`features/scripts/model/compiler.ts`:** loads the module lazily and runs
  `callMain(['--no-column', '-m32', '-o', '/out.bin', '/main.js'])` on the virtual FS, as upstream
  does. It returns `{ bytecode, stdout, stderr }`. Errors are parsed into `{ line, message }`
  where the output allows.

### Features

- `features/macros/`:
  - `MacrosPage`.
  - Components: slot buttons, action table, add form, recorder.
  - `model/`: ticks ↔ ms, sorting, the end-marker rule, and a browser `KeyboardEvent.code` → HID
    keycode table.
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

  They are logged as new screens (PL rows with after-screenshots only).

## Testing

- **Device**, against the virtual keyboard, model `trinity-pad`:
  - Macros and the script load from the keyboard.
  - `setMacro` and `setScript` stage without packets and set `unsaved`.
  - `save()` writes them. Afterwards the keyboard has the actions with the end marker and the
    script source and bytecode.
  - Out-of-range slots, too many actions and unsupported scripts are rejected.
- **Compiler** (Vitest, Node): the example compiles to non-empty bytecode; a syntax error returns
  stderr with its line.
- **Models:** ticks ↔ ms at 1000 and 8000 Hz; the end-marker trim and pad; the `code` → HID
  table; sorting.
- **Components:**
  - The action table edits, add form, Clear with confirmation, and the limit counter.
  - The recorder ignores repeats, skips unmapped keys and stops when full.
  - The Scripts page's compile status, error display and staging only compiled scripts.
- **Navigation:** the entries and the Extension groups appear only with support (Trinity Pad
  yes, Starlight no).
- **e2e:** on the virtual Trinity Pad:
  - Record and edit a macro, Save; the keyboard has it.
  - Write a script with an error, fix it, Save; the keyboard has the source and the bytecode.

## Later

- Declaring macros and scripts for the Zellia models (firmware flags plus an upstream controller
  change).
- A console panel showing the script's `console.log` output (`consoleData` events).
- Assigning a macro to a key from the Macros page.
