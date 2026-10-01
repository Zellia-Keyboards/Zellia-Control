# Macros and Scripts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keyboards whose controller declares macros or scripts (today the Trinity Pad; macros also the Oholeo) get a Macros page, a Scripts page and Remap's Macro and Script keys; macro and script edits are staged and written by the sidebar's Save.

**Architecture:** The device snapshot gains `macros` (one array per slot, without the end marker) and `script` (source and bytecode); `setMacro` / `setScript` are staged like `setRgbKeys`, and the mapping writes full-capacity controller macros. Pure capability helpers gate the sidebar entries, the pages and the Extension groups. The Scripts page compiles with libamp's mquickjs compiler, built with Emscripten into `vendor/mqjs/` and imported on the first compile, in a lazily loaded CodeMirror 6 editor.

**Tech Stack:** React 19, TypeScript 6 (strict), Zustand 5, Vite 8, Vitest 5 + Testing Library (jsdom) against the virtual libamp keyboard, CodeMirror 6, Emscripten 6 (Homebrew), Playwright (Chrome) for e2e and the parity harness.

**Spec:** `docs/superpowers/specs/2026-10-01-macros-scripts-design.md`

## Global Constraints

- Strict TypeScript: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. No `any`, no `as unknown as`, no non-null assertions (`!`).
- Never edit `src-controller/` (vendored upstream, `UPSTREAM.md` included). The app reaches the keyboard only through `src/features/device`; new controller members are added to the `DeviceController` interface in `controller.ts`.
- Pure `model/` code never imports React or the device session.
- Device behaviour is tested against the virtual keyboard (`connectVirtualKeyboard`, `createConnectedHarness`, model `trinity-pad`), never with mocks of our own code; scripts compile with the real compiler (`nodeCompiler`). Tests may stub browser APIs (`performance.now`, `URL.createObjectURL`, `HTMLAnchorElement.prototype.click`) and stand in for the Emscripten module's interface (`compiler.test.ts`).
- Gating: pages, sidebar entries and Extension groups appear only when the connected model's controller declares support: macros = slots > 0 with actions > 0, scripts = `script_level !== Disable`. Keyboards without them (every Zellia model; the parity harness's default Starlight) must look exactly as before.
- Copy: every new string in en and zh exactly as given in this plan; Chinese uses 宏 (macro), 脚本 (script), 按下 / 释放 (press / release). New dictionary keys are appended at the end of `en` (before `} satisfies Record<string, string>;`) and `zh` (before the closing `};`): `i18n.test.tsx` locks the first ten keys.
- `vendor/mqjs/` is generated and GPL-3.0: never edit it by hand (change `build.sh` and rebuild); it is excluded from ESLint and Prettier, and TypeScript never checks it.
- Package manager: npm; new packages at exact versions (`npm install --save-exact`). Checks: `npx vitest run <paths>`, `npm run typecheck`, `npx eslint <paths>`, `npx prettier --check <paths>` (or `--write`).
- Laptop load: at most 2 heavy jobs (Playwright, parity, builds, the Emscripten build) at a time, Playwright with `--workers=2`; this plan runs them one at a time. Unit tests of the touched files only, until the final validation (Task 13).
- Another plan (lighting redesign) may still be landing in this checkout: where a step says "add N to the number", read the current number first and add N to it.
- Commits: small, conventional (`feat(macros): …`), **no `Co-Authored-By` or "Generated with" trailers**. Stage only the files of the task (`git add <paths>`), never `git add -A`.

## File map

| File | Responsibility | Task |
| --- | --- | --- |
| `src/features/device/model/types.ts` | `MacroAction`, `ScriptConfig`, `DeviceConfig.macros/script`, `FeatureFlags.macroSlots/macroActions` | 1 |
| `src/features/device/controller.ts` (+ test) | macro/script members of `DeviceController`; `withUpstreamFixes` unshares the macro defaults | 1 |
| `src/features/device/mapping.ts` (+ test) | macro and script read/write, `readMacroCapacity`, `readFeatureFlags(controller)`; validation | 1, 2 |
| `src/features/device/session.ts` | cache sync of macros and the script; staged `setMacro` / `setScript` | 1, 2 |
| `src/features/device/session.{connection,commands}.test.ts`, `testing/session-harness.ts` | device tests | 1, 2 |
| `src/features/dynamic-keys/{model/configured-keys,store/ui-fields}.test.ts` | `DeviceConfig` literals | 1 |
| `src/features/device/model/capabilities.ts` (+ test) | `supportsMacros`, `supportsScripts`, `macroActionLimit` | 2 |
| `src/features/device/{store.ts,index.ts}` (+ tests) | `useFeatureFlags`, `useSupportsMacros`, `useSupportsScripts`, `useDeviceLoads` | 2, 3 |
| `docs/device.md`, `docs/architecture.md`, `CLAUDE.md` | device docs; the new features and `vendor/mqjs/` | 2, 3, 10 |
| `src/components/ui/KeycodePicker.tsx` (+ test, moved), `Modal.tsx`, `UnsupportedFeature.tsx`, `index.ts` | shared picker (categories as a prop), 3xl modal, "does not support" notice | 3, 6 |
| `src/features/dynamic-keys/components/{TapHoldMode,ToggleMode,dynamic/DKSParts}.tsx` | picker from `components/ui` | 3 |
| `src/features/lighting/LightingPage.tsx`, `hooks/use-device-loads.ts` (deleted) | `useDeviceLoads` from the device feature | 3 |
| `src/features/keycodes/{codec,display,palettes,index}.ts` (+ tests) | `kc.macro` / `kc.script`, script names, Macro/Script palettes | 4 |
| `src/features/remap/components/ExtensionTab.tsx`, `RemapPage.test.tsx` | gated Macro and Script groups | 4 |
| `src/lib/i18n/{en,zh,i18n.test}.ts(x)` | new copy | 4, 6, 9, 10 |
| `src/features/macros/model/*` | timing, actions, browser key table, recorder, key picker catalog | 5 |
| `src/features/macros/{MacrosPage.tsx,index.ts,commands.ts,hooks/use-macro-recorder.ts,components/*}` (+ test) | Macros page, staged edits, recorder | 6 |
| `vendor/mqjs/*`, `.gitattributes`, `package.json`, `vite.config.ts`, `eslint.config.js`, `.prettierignore`, `.github/workflows/web.yml`, `README.md`, `docs/development.md` | compiler build, alias, precache, tooling | 7 |
| `src/features/scripts/model/{mqjs-compiler.d.ts,compiler.ts,compiler-browser.ts,example.ts}`, `testing/node-compiler.ts` (+ test) | compiler wrapper | 7 |
| `package.json`, `package-lock.json`; `src/features/scripts/model/{libamp-api,hex,limits,index}.ts`, `components/ScriptEditor.tsx`, `components/script-editor/completions.ts`, `testing/codemirror-jsdom.ts` (+ tests) | CodeMirror; API list, editor, completions | 8 |
| `src/features/scripts/{ScriptsPage.tsx,index.ts,components/ScriptWorkspace.tsx,components/styles.ts}` (+ test) | Scripts page | 9 |
| `src/app/{navigation,pages}.ts`, `src/app/layout/Sidebar.tsx`, `src/app/testing/render-app.tsx`, `scripts/static-hosting.ts` (+ tests) | gated navigation, lazy routes, static routes | 10 |
| `src/testing/virtual-keyboard/handle.ts`, `e2e/macros-scripts.spec.ts` | e2e journeys | 11 |
| `e2e/parity/scenario.ts`, `scripts/parity/{scenarios,capture}.ts`, `scripts/parity/{compare,run}.mjs` (+ tests) | React-only parity scenarios | 12 |
| `e2e/parity/scenarios/macros-scripts.ts`, `docs/migration/*`, the spec's status line | new-screen parity rows | 13 |

---

### Task 1: Device — macros and the script in the snapshot

**Files:**
- Modify: `src/features/device/model/types.ts`
- Modify: `src/features/device/controller.ts`
- Modify: `src/features/device/mapping.ts`
- Modify: `src/features/device/session.ts`
- Modify: `src/features/device/controller.test.ts`
- Modify: `src/features/device/mapping.test.ts`
- Modify: `src/features/device/session.connection.test.ts`
- Modify: `src/features/dynamic-keys/model/configured-keys.test.ts`, `src/features/dynamic-keys/store/ui-fields.test.ts`

**Interfaces:**
- Produces (types, `features/device/model/types.ts`): `type MacroEvent = 'down' | 'up'`; `interface MacroAction { delay: number /* ticks from the macro start */; keycode: Keycode; event: MacroEvent; isVirtual: boolean; keyId: number }`; `interface ScriptConfig { source: string; bytecode: readonly number[] }`; `DeviceConfig.macros: readonly (readonly MacroAction[])[]`; `DeviceConfig.script: ScriptConfig | null`; `FeatureFlags.macroSlots: number`, `FeatureFlags.macroActions: number`.
- Produces (`DeviceController`): `get_macros(): IMacroAction[][]`, `set_macros(macros: IMacroAction[][]): void`, `get_script_source(): string`, `set_script_source(source: string): void`, `get_script_bytecode(): Uint8Array`, `set_script_bytecode(bytecode: Uint8Array): void`.
- Produces (`mapping.ts`): `interface MacroCapacity { slots: number; actions: number }`, `readMacroCapacity(controller: Pick<DeviceController, 'get_macros'>): MacroCapacity`, `toMacroAction(action: IMacroAction): MacroAction`, `readMacros(controller): MacroAction[][]`, `readScript(controller): ScriptConfig | null`, `toControllerMacroAction(action: MacroAction): ControllerMacroAction`, `toControllerMacros(macros, capacity): IMacroAction[][]`, `readFeatureFlags(controller: Pick<DeviceController, 'get_feature' | 'get_macros'>): FeatureFlags` (was `readFeatureFlags(feature)`).

Background (verified in the sources):
- libamp (`src/macro.c`, `src/packet.c`): an action's `delay` is in ticks from the macro start (`delay + begin_tick <= g_keyboard_tick`); playback stops at the first action whose keycode is `KEY_NO_EVENT` (0); events are `KEYBOARD_EVENT_KEY_DOWN` (3) and `KEYBOARD_EVENT_KEY_UP` (1); `MACRO_MAX_ACTIONS` is 128.
- The vendored controller reads every slot with `macros[0].length` entries (`read_macros`) and skips empty slots when writing (`write_macros`), so the cache must stay at full capacity. The base `LibampKeyboardController` keeps `macros = [[]]` (the Zellia models: no macros).
- `AT32KeyboardController`, `OholeoKeyboardController` and `TrinityPadController` build their cache with `Array(4).fill(Array(128).fill(new MacroAction()))`: every slot is one array of one shared action. `read_macros` assigns `macros[slot][index]`, so without a fix every slot ends up with the last slot's actions after the first load. The session cannot repair that after the load; the fix has to run when the controller is created.
- `read_script_source` stops at the first 0x00 or 0xFF; `write_script_source` appends a NUL. `save()` writes the source and, on AOT keyboards, the bytecode.

- [ ] **Step 1: Write the failing tests**

`src/features/device/controller.test.ts`: change the imports to

```ts
import {
  DynamicKeyStroke4x4,
  TrinityPadController,
  ZelliaStarlightController,
} from 'emi-keyboard-controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  encodeDynamicKeyReply,
  encodeHostPacket,
  encodeMacroReply,
  encodeReply,
  type WireDynamicKey,
  type WireMacroAction,
} from '../../testing/virtual-keyboard';
import { onControllerEvent, withUpstreamFixes, type DeviceController } from './controller';
```

add after `dynamicKeyReply`:

```ts
/** The keyboard's reply to a request for `actions` of macro `macroIndex`. */
function macroReply(macroIndex: number, actions: readonly WireMacroAction[]): Uint8Array {
  return encodeMacroReply(
    encodeHostPacket({
      op: 'get',
      id: 1,
      kind: 'macro',
      macroIndex,
      actionIndices: actions.map(action => action.index),
    }),
    actions
  );
}
```

and append at the end of the file:

```ts
describe('withUpstreamFixes: macros', () => {
  const PRESS: WireMacroAction = {
    index: 0,
    delay: 8,
    keyId: 0,
    isVirtual: true,
    event: 3,
    keycode: 0x04,
  };

  it('documents the vendored default: every macro slot is one shared array', () => {
    const controller = new TrinityPadController();
    const macros = controller.get_macros();
    expect(macros[1]).toBe(macros[0]);
    controller.packet_process(macroReply(2, [PRESS]));
    expect(controller.get_macros()[0]?.[0]).toMatchObject({ delay: 8, event: { keycode: 0x04 } });
  });

  it('gives every slot and every action an object of its own, at the same size', () => {
    const controller = withUpstreamFixes(new TrinityPadController());
    const macros = controller.get_macros();
    expect(macros.map(slot => slot.length)).toEqual([128, 128, 128, 128]);
    const actions = macros.flat();
    expect(new Set(actions).size).toBe(512);
    expect(new Set(actions.map(action => action.event)).size).toBe(512);

    controller.packet_process(macroReply(2, [PRESS]));
    expect(controller.get_macros()[2]?.[0]).toMatchObject({
      delay: 8,
      event: { keycode: 0x04, event: 3, is_virtual: true, key_id: 0 },
    });
    expect(controller.get_macros()[0]?.[0]).toMatchObject({ delay: 0, event: { keycode: 0 } });
  });

  it('keeps the empty macro cache of controllers without macros', () => {
    expect(withUpstreamFixes(new ZelliaStarlightController()).get_macros()).toEqual([[]]);
  });
});
```

`src/features/device/mapping.test.ts`:

1. Add `TrinityPadController` and `type IMacroAction` to the `emi-keyboard-controller` import; add `readMacroCapacity`, `readMacros`, `toControllerMacroAction`, `toControllerMacros` and `toMacroAction` to the `./mapping` import; add `import { withUpstreamFixes } from './controller';`; add `MacroAction` to the `./model/types` type import.
2. In `'maps every cache into plain, deeply frozen domain values'`, after `expect(config.dynamicKeys).toHaveLength(32);` add:

```ts
    // The Starlight's controller declares neither macros nor scripts.
    expect(config.macros).toEqual([]);
    expect(config.script).toBeNull();
```

3. In `describe('readDeviceConfig')`, add:

```ts
  it('reads the macros and the script of a keyboard that declares them', () => {
    const controller = withUpstreamFixes(new TrinityPadController());
    controller.set_script_source('keyboard.watch(2);');
    controller.set_script_bytecode(new Uint8Array([0xfb, 0xac, 0x01]));
    const config = readDeviceConfig(controller);
    expect(config.macros).toEqual([[], [], [], []]);
    expect(config.script).toEqual({ source: 'keyboard.watch(2);', bytecode: [0xfb, 0xac, 0x01] });
    expect(Object.isFrozen(config.script?.bytecode)).toBe(true);
  });
```

4. In `'reads feature flags, firmware version and model info'`, replace the `readFeatureFlags` expectation with:

```ts
    expect(readFeatureFlags(controller)).toEqual({
      advancedKeys: true,
      rgb: true,
      scriptLevel: ScriptLevel.Disable,
      pollingRate: 8000,
      macroSlots: 0,
      macroActions: 0,
      bootloader: { enabled: true, download: true, upload: true },
    });
    expect(readFeatureFlags(withUpstreamFixes(new TrinityPadController()))).toMatchObject({
      scriptLevel: ScriptLevel.AOT,
      pollingRate: 8000,
      macroSlots: 4,
      macroActions: 128,
    });
```

5. Add before `describe('metadata', …)`:

```ts
describe('macros', () => {
  const CAPACITY = { slots: 2, actions: 4 };
  const PRESS: MacroAction = {
    delay: 0,
    keycode: 0x04,
    event: 'down',
    isVirtual: true,
    keyId: 0,
  };
  const RELEASE: MacroAction = {
    delay: 800,
    keycode: 0x04,
    event: 'up',
    isVirtual: false,
    keyId: 3,
  };

  function controllerWith(macros: IMacroAction[][]) {
    return { get_macros: () => macros };
  }

  it('reads the capacity from the controller cache; no entries means no macros', () => {
    expect(readMacroCapacity(withUpstreamFixes(new TrinityPadController()))).toEqual({
      slots: 4,
      actions: 128,
    });
    expect(readMacroCapacity(new ZelliaStarlightController())).toEqual({ slots: 0, actions: 0 });
  });

  it('writes every slot at full size: its actions, the end marker, then empty actions', () => {
    const macros = toControllerMacros([[PRESS, RELEASE], []], CAPACITY);
    expect(macros.map(slot => slot.length)).toEqual([4, 4]);
    expect(macros[0]).toEqual([
      { delay: 0, event: { keycode: 0x04, event: 3, is_virtual: true, key_id: 0 } },
      { delay: 800, event: { keycode: 0x04, event: 1, is_virtual: false, key_id: 3 } },
      // The end marker: no keycode, at the last action's delay.
      { delay: 800, event: { keycode: 0, event: 0, is_virtual: false, key_id: 0 } },
      { delay: 0, event: { keycode: 0, event: 0, is_virtual: false, key_id: 0 } },
    ]);
    expect(macros[1]?.every(action => action.delay === 0 && action.event.keycode === 0)).toBe(
      true
    );
    expect(new Set(macros.flat()).size).toBe(8);
    expect(new Set(macros.flat().map(action => action.event)).size).toBe(8);
  });

  it('reads each slot up to its end marker', () => {
    const controller = controllerWith(toControllerMacros([[PRESS, RELEASE], []], CAPACITY));
    expect(readMacros(controller)).toEqual([[PRESS, RELEASE], []]);
  });

  it('keeps room for the end marker when a slot has none', () => {
    const full = Array.from({ length: 4 }, () => toControllerMacroAction(PRESS));
    expect(readMacros(controllerWith([full, []]))).toEqual([[PRESS, PRESS, PRESS], []]);
  });

  it('reads any event other than a press as a release (libamp plays it as one)', () => {
    const action = toControllerMacroAction(PRESS);
    action.event.event = 2;
    expect(toMacroAction(action).event).toBe('up');
  });
});
```

`src/features/device/session.connection.test.ts`: add to `describe('connect', …)`:

```ts
  it('loads the macros and the script of a keyboard that declares them (Trinity Pad)', async () => {
    const h = setup({ keyboard: { model: 'trinity-pad', seedDynamicKeys: false } });
    // jsdom's TextEncoder returns arrays from another realm; copy into this one.
    const source = Uint8Array.from(new TextEncoder().encode('keyboard.watch(2);\0'));
    h.vk.state.macros[1]?.splice(
      0,
      3,
      { index: 0, delay: 0, keyId: 0, isVirtual: true, event: 3, keycode: Keycode.A },
      { index: 1, delay: 800, keyId: 0, isVirtual: true, event: 1, keycode: Keycode.A },
      { index: 2, delay: 800, keyId: 0, isVirtual: false, event: 0, keycode: 0 }
    );
    h.vk.state.scripts = { source, bytecode: Uint8Array.from([0xfb, 0xac, 0x01, 0x00]) };

    await h.session.connect();

    expect(h.state().feature).toMatchObject({
      scriptLevel: ScriptLevel.AOT,
      pollingRate: 8000,
      macroSlots: 4,
      macroActions: 128,
    });
    // Slots 2 and 3 are read after slot 1: with shared slot arrays they would empty it again.
    expect(h.state().config?.macros).toEqual([
      [],
      [
        { delay: 0, keycode: Keycode.A, event: 'down', isVirtual: true, keyId: 0 },
        { delay: 800, keycode: Keycode.A, event: 'up', isVirtual: true, keyId: 0 },
      ],
      [],
      [],
    ]);
    expect(h.state().config?.script).toEqual({
      source: 'keyboard.watch(2);',
      bytecode: [0xfb, 0xac, 0x01, 0x00],
    });
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/device/controller.test.ts src/features/device/mapping.test.ts src/features/device/session.connection.test.ts`
Expected: FAIL — the new mapping functions do not exist (import errors), `readFeatureFlags(controller)` has no `macroSlots`, and the Trinity Pad test fails on `config.macros` (`undefined`).

- [ ] **Step 3: Add the domain types**

`src/features/device/model/types.ts`:

In `FeatureFlags`, after `readonly pollingRate: number;` add:

```ts
  /** Macro slots the controller declares; 0 without macros. */
  readonly macroSlots: number;
  /** Entries of each macro slot, its end marker included; 0 without macros. */
  readonly macroActions: number;
```

After `export type MutexModeByte = number;` add:

```ts
/** The key event of a macro action (libamp `KEYBOARD_EVENT_KEY_DOWN` / `KEYBOARD_EVENT_KEY_UP`). */
export type MacroEvent = 'down' | 'up';

/** One action of a macro (libamp `MacroAction`). */
export interface MacroAction {
  /** Ticks from the start of the macro: the keyboard ticks `pollingRate` times a second. */
  readonly delay: number;
  readonly keycode: Keycode;
  readonly event: MacroEvent;
  /** The event comes from no physical key (recorded and added events are virtual). */
  readonly isVirtual: boolean;
  /** The key the firmware plays the event as when it is not virtual. */
  readonly keyId: number;
}

/** The keyboard's script and, on AOT keyboards, its compiled bytecode. */
export interface ScriptConfig {
  readonly source: string;
  /** Bytes (0..255): a number array, so the snapshot stays freezable. */
  readonly bytecode: readonly number[];
}
```

In `DeviceConfig`, after `readonly dynamicKeys: readonly DynamicKeySlot[];` add:

```ts
  /** Each macro slot's actions, without its end marker; empty without macros. */
  readonly macros: readonly (readonly MacroAction[])[];
  /** Null when the controller declares no script support. */
  readonly script: ScriptConfig | null;
```

In `src/features/dynamic-keys/model/configured-keys.test.ts` and `src/features/dynamic-keys/store/ui-fields.test.ts`, add after `profileCount: 4,` in the `DeviceConfig` literal:

```ts
    macros: [],
    script: null,
```

- [ ] **Step 4: Declare the controller members and unshare the macro defaults**

`src/features/device/controller.ts`:

Replace the `emi-keyboard-controller` import with:

```ts
import {
  MacroAction,
  type FirmwareVersion,
  type IAdvancedKey,
  type IDynamicKey,
  type IFeature,
  type IMacroAction,
  type IRGBBaseConfig,
  type IRGBConfig,
  type USBDevice,
} from 'emi-keyboard-controller';
```

In `interface DeviceController`, after `set_dynamic_keys(keys: IDynamicKey[]): void;` add:

```ts
  get_macros(): IMacroAction[][];
  set_macros(macros: IMacroAction[][]): void;
  get_script_source(): string;
  set_script_source(source: string): void;
  get_script_bytecode(): Uint8Array;
  set_script_bytecode(bytecode: Uint8Array): void;
```

Before `withUpstreamFixes` add:

```ts
/**
 * Works around the vendored macro defaults (ac25c4e): the AT32, Oholeo and Trinity Pad
 * controllers fill their cache with `Array(4).fill(Array(128).fill(new MacroAction()))`, so every
 * slot is one array of one shared action. `read_macros` assigns `macros[slot][index]`, which then
 * writes every slot at once: after a load each slot would hold the last slot's actions. The cache
 * gets fresh arrays of fresh actions of the same size (`read_macros` sizes every slot by
 * `macros[0].length`) before the first load.
 */
function unshareMacros(controller: Pick<DeviceController, 'get_macros' | 'set_macros'>): void {
  controller.set_macros(controller.get_macros().map(slot => slot.map(() => new MacroAction())));
}
```

In the doc comment of `withUpstreamFixes`, replace its last sentence ("…so only that exact failure is swallowed. Remove once fixed upstream.") with:

```ts
 * when that throws, so only that exact failure is swallowed. It also unshares the macro defaults
 * (`unshareMacros`). Remove each workaround once fixed upstream.
```

and before `return controller;` add:

```ts
  unshareMacros(controller);
```

- [ ] **Step 5: Map macros and the script**

`src/features/device/mapping.ts`:

1. In the `emi-keyboard-controller` import add `MacroAction as ControllerMacroAction,` (after `KeyMode,`) and `type IMacroAction,` (after `type IFeature,`). In the `./model/types` type import add `MacroAction,` and `ScriptConfig,`.
2. After `const U32 = 0xffffffff;` add:

```ts
/** libamp `KeyboardEventType`s of macro actions. */
const KEY_DOWN = 0x03;
const KEY_UP = 0x01;
/** libamp `KEY_NO_EVENT`: the first action without a keycode ends a macro (`macro_process`). */
const END_MARKER_KEYCODE = 0;
/** Macro slots a keycode can address (`MACRO_KEYCODE_GET_INDEX`: the low nibble). */
const MAX_MACRO_SLOTS = 16;
```

3. Before `export function readKeymap` add:

```ts
/** A controller's macro slots and the entries of each, the end marker included. */
export interface MacroCapacity {
  readonly slots: number;
  readonly actions: number;
}

/**
 * The capacity of the controller's macro cache: `get_macros().length` slots of
 * `get_macros()[0].length` entries (`read_macros` sizes every slot by the first). No entries means
 * no macros: the Zellia controllers keep the base class's `[[]]`.
 */
export function readMacroCapacity(controller: Pick<DeviceController, 'get_macros'>): MacroCapacity {
  const macros = controller.get_macros();
  const actions = integer(macros[0]?.length ?? 0, U16);
  return { slots: actions > 0 ? integer(macros.length, MAX_MACRO_SLOTS) : 0, actions };
}

export function toMacroAction(action: IMacroAction): MacroAction {
  const { event } = action;
  return {
    delay: integer(action.delay, U32),
    keycode: keycode(event.keycode),
    // libamp plays anything but a press as a release (`macro_process`).
    event: event.event === KEY_DOWN ? 'down' : 'up',
    isVirtual: event.is_virtual,
    keyId: integer(event.key_id, U16),
  };
}

/**
 * Each slot's actions up to its end marker. A slot without one keeps at most `actions − 1`
 * actions: the end marker needs the last entry.
 */
export function readMacros(controller: Pick<DeviceController, 'get_macros'>): MacroAction[][] {
  const capacity = readMacroCapacity(controller);
  const limit = Math.max(capacity.actions - 1, 0);
  return controller
    .get_macros()
    .slice(0, capacity.slots)
    .map(slot => {
      const end = slot.findIndex(action => action.event.keycode === END_MARKER_KEYCODE);
      return slot.slice(0, Math.min(end < 0 ? slot.length : end, limit)).map(toMacroAction);
    });
}

/** The script and its bytecode; null when the controller declares no script support. */
export function readScript(
  controller: Pick<DeviceController, 'get_feature' | 'get_script_source' | 'get_script_bytecode'>
): ScriptConfig | null {
  const level = asEnum(SCRIPT_LEVELS, controller.get_feature().script_level, ScriptLevel.Disable);
  if (level === ScriptLevel.Disable) return null;
  return {
    source: controller.get_script_source(),
    bytecode: Array.from(controller.get_script_bytecode(), byte => integer(byte, BYTE)),
  };
}
```

4. In `readDeviceConfig`, after the `dynamicKeys:` line add:

```ts
    macros: readMacros(controller),
    script: readScript(controller),
```

5. Replace `readFeatureFlags` with:

```ts
export function readFeatureFlags(
  controller: Pick<DeviceController, 'get_feature' | 'get_macros'>
): FeatureFlags {
  const feature = controller.get_feature();
  const macros = readMacroCapacity(controller);
  return deepFreeze({
    advancedKeys: feature.advanced_key_flag,
    rgb: feature.rgb_flag,
    scriptLevel: asEnum(SCRIPT_LEVELS, feature.script_level, ScriptLevel.Disable),
    pollingRate: integer(feature.polling_rate, U32),
    macroSlots: macros.slots,
    macroActions: macros.actions,
    bootloader: {
      enabled: feature.bootloader.enable,
      download: feature.bootloader.download,
      upload: feature.bootloader.upload,
    },
  });
}
```

6. After `toControllerKeymap` add:

```ts
export function toControllerMacroAction(action: MacroAction): ControllerMacroAction {
  const result = new ControllerMacroAction();
  result.delay = action.delay;
  result.event.keycode = action.keycode;
  result.event.event = action.event === 'down' ? KEY_DOWN : KEY_UP;
  result.event.is_virtual = action.isVirtual;
  result.event.key_id = action.keyId;
  return result;
}

/**
 * Full-capacity controller macros: each slot's actions, its end marker (no keycode, at the last
 * action's delay) and empty actions up to the slot size. The controller reads every slot with
 * `macros[0].length` entries, so the cache must keep that size.
 */
export function toControllerMacros(
  macros: readonly (readonly MacroAction[])[],
  capacity: MacroCapacity
): IMacroAction[][] {
  const limit = Math.max(capacity.actions - 1, 0);
  return Array.from({ length: capacity.slots }, (_, slot) => {
    const actions = (macros[slot] ?? []).slice(0, limit).map(toControllerMacroAction);
    const end = new ControllerMacroAction();
    end.delay = actions.at(-1)?.delay ?? 0;
    const empty = Array.from(
      { length: capacity.actions - actions.length - 1 },
      () => new ControllerMacroAction()
    );
    return [...actions, end, ...empty];
  });
}
```

- [ ] **Step 6: Sync macros and the script with the cache**

`src/features/device/session.ts`:

1. Add `readMacroCapacity,` and `toControllerMacros,` to the `./mapping` import (keep it sorted).
2. In `#onLoaded`, replace `feature: readFeatureFlags(controller.get_feature()),` with `feature: readFeatureFlags(controller),`.
3. At the end of `#syncCache` add:

```ts
    // Full-capacity slots of fresh actions (the controller reads every slot by the first's size).
    const macroCapacity = readMacroCapacity(controller);
    if (macroCapacity.slots > 0) {
      controller.set_macros(toControllerMacros(config.macros, macroCapacity));
    }
    if (config.script) {
      controller.set_script_source(config.script.source);
      controller.set_script_bytecode(Uint8Array.from(config.script.bytecode));
    }
```

- [ ] **Step 7: Run the device and dynamic-key tests**

Run: `npx vitest run src/features/device src/features/dynamic-keys`
Expected: PASS.

- [ ] **Step 8: Check and commit**

Run: `npm run typecheck && npx eslint src/features/device src/features/dynamic-keys && npx prettier --check src/features/device src/features/dynamic-keys`
Expected: no errors.

```bash
git add src/features/device/model/types.ts src/features/device/controller.ts src/features/device/mapping.ts src/features/device/session.ts src/features/device/controller.test.ts src/features/device/mapping.test.ts src/features/device/session.connection.test.ts src/features/dynamic-keys/model/configured-keys.test.ts src/features/dynamic-keys/store/ui-fields.test.ts
git commit -m "feat(device): load macros and the script into the snapshot"
```

---

### Task 2: Device — staged `setMacro` / `setScript` and the capability helpers

**Files:**
- Create: `src/features/device/model/capabilities.ts`
- Create: `src/features/device/model/capabilities.test.ts`
- Modify: `src/features/device/mapping.ts`
- Modify: `src/features/device/session.ts`
- Modify: `src/features/device/store.ts`, `src/features/device/index.ts`
- Modify: `src/features/device/testing/session-harness.ts`
- Modify: `src/features/device/session.commands.test.ts`, `src/features/device/store.test.tsx`, `src/features/device/index.test.ts`
- Modify: `docs/device.md`, `docs/architecture.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: Task 1's types, `readMacroCapacity`, `toMacroAction`, `toControllerMacroAction`, `toControllerMacros`, `MacroCapacity`.
- Produces (`DeviceSession`): `setMacro(slot: number, actions: readonly MacroAction[]): void` and `setScript(script: ScriptConfig): void`, both staged (no packets) and setting `unsaved`; `COMMAND_ERRORS.noSuchMacro(slot)` = `` `Macro ${slot} does not exist` ``, `COMMAND_ERRORS.noScripts` = `'This keyboard does not support scripts'`.
- Produces (`features/device/model/capabilities`): `supportsMacros(feature: FeatureFlags | null): boolean`, `supportsScripts(feature: FeatureFlags | null): boolean`, `macroActionLimit(feature: FeatureFlags | null): number` (127 on the Trinity Pad).
- Produces (device index): `useFeatureFlags(): FeatureFlags | null`, `useSupportsMacros(): boolean`, `useSupportsScripts(): boolean`.

- [ ] **Step 1: Write the failing tests**

`src/features/device/model/capabilities.test.ts`:

```ts
import { ScriptLevel } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import { macroActionLimit, supportsMacros, supportsScripts } from './capabilities';
import type { FeatureFlags } from './types';

const ZELLIA: FeatureFlags = {
  advancedKeys: true,
  rgb: true,
  scriptLevel: ScriptLevel.Disable,
  pollingRate: 8000,
  macroSlots: 0,
  macroActions: 0,
  bootloader: { enabled: true, download: true, upload: true },
};
const TRINITY: FeatureFlags = {
  ...ZELLIA,
  scriptLevel: ScriptLevel.AOT,
  macroSlots: 4,
  macroActions: 128,
};

describe('capabilities', () => {
  it('support macros when the controller declares slots with room for actions', () => {
    expect(supportsMacros(TRINITY)).toBe(true);
    expect(supportsMacros(ZELLIA)).toBe(false);
    expect(supportsMacros({ ...ZELLIA, macroSlots: 4 })).toBe(false);
    expect(supportsMacros(null)).toBe(false);
  });

  it('support scripts at every script level but Disable', () => {
    expect(supportsScripts(TRINITY)).toBe(true);
    expect(supportsScripts({ ...ZELLIA, scriptLevel: ScriptLevel.JIT })).toBe(true);
    expect(supportsScripts(ZELLIA)).toBe(false);
    expect(supportsScripts(null)).toBe(false);
  });

  it('keep the last entry of every slot for the end marker', () => {
    expect(macroActionLimit(TRINITY)).toBe(127);
    expect(macroActionLimit(ZELLIA)).toBe(0);
    expect(macroActionLimit(null)).toBe(0);
  });
});
```

`src/features/device/session.commands.test.ts`:

1. Add `MacroAction` and `ScriptConfig` to the `./model/types` type import.
2. Add after `describe('lighting', …)`:

```ts
describe('macros and the script (Trinity Pad)', () => {
  const TRINITY = { keyboard: { model: 'trinity-pad', seedDynamicKeys: false } } as const;
  const PRESS: MacroAction = {
    delay: 0,
    keycode: Keycode.A,
    event: 'down',
    isVirtual: true,
    keyId: 0,
  };
  const RELEASE: MacroAction = { ...PRESS, delay: 800, event: 'up' };
  const SCRIPT: ScriptConfig = { source: 'keyboard.watch(2);', bytecode: [0xfb, 0xac, 0x01, 0x00] };

  it('stages a macro until save(), which writes it with its end marker', async () => {
    const h = await connected(TRINITY);
    h.session.setMacro(1, [PRESS, RELEASE]);
    expect(configOf(h).macros[1]).toEqual([PRESS, RELEASE]);
    expect(readDeviceConfig(h.controller()).macros[1]).toEqual([PRESS, RELEASE]);
    expect(h.controller().get_macros().map(slot => slot.length)).toEqual([128, 128, 128, 128]);
    expect(h.state().unsaved).toBe(true);
    await settle();
    expect(wire(h)).toEqual([]);

    await h.session.save();
    await settle();
    expect(h.state()).toMatchObject({ unsaved: false, lastError: null });
    const slot = h.vk.state.macros[1] ?? [];
    expect(slot.slice(0, 3)).toEqual([
      { index: 0, delay: 0, keyId: 0, isVirtual: true, event: 3, keycode: Keycode.A },
      { index: 1, delay: 800, keyId: 0, isVirtual: true, event: 1, keycode: Keycode.A },
      { index: 2, delay: 800, keyId: 0, isVirtual: false, event: 0, keycode: 0 },
    ]);
    expect(slot.slice(3).every(action => action.keycode === 0 && action.delay === 0)).toBe(true);
    expect(h.vk.state.macros[0]?.[0]?.keycode).toBe(0);
  });

  it('stages the script until save(), which writes its source and its bytecode', async () => {
    const h = await connected(TRINITY);
    h.session.setScript(SCRIPT);
    expect(configOf(h).script).toEqual(SCRIPT);
    expect(h.controller().get_script_source()).toBe(SCRIPT.source);
    expect(Array.from(h.controller().get_script_bytecode())).toEqual(SCRIPT.bytecode);
    expect(h.state().unsaved).toBe(true);
    await settle();
    expect(wire(h)).toEqual([]);

    await h.session.save();
    await settle();
    expect(new TextDecoder().decode(h.vk.state.scripts.source)).toBe(`${SCRIPT.source}\0`);
    expect(Array.from(h.vk.state.scripts.bytecode)).toEqual(SCRIPT.bytecode);
  });

  it('changes nothing for an unchanged macro or script', async () => {
    const h = await connected(TRINITY);
    h.session.setMacro(0, []);
    h.session.setScript({ source: '', bytecode: [] });
    expect(h.state()).toMatchObject({ unsaved: false, lastError: null });
  });

  it('accepts 127 actions, the most a slot holds', async () => {
    const h = await connected(TRINITY);
    h.session.setMacro(3, Array.from({ length: 127 }, () => PRESS));
    expect(configOf(h).macros[3]).toHaveLength(127);
    expect(h.state().lastError).toBeNull();
  });

  it('rejects missing slots, too many actions and actions the firmware cannot play', async () => {
    const h = await connected(TRINITY);
    const rejects = (slot: number, actions: readonly MacroAction[], message: string) => {
      h.session.setMacro(slot, actions);
      expect(h.state().lastError).toEqual({ operation: 'setMacro', message });
    };
    const hold: Record<string, unknown> = { event: 'hold' };
    rejects(4, [], 'Macro 4 does not exist');
    rejects(-1, [], 'Macro -1 does not exist');
    rejects(
      0,
      Array.from({ length: 128 }, () => PRESS),
      'A macro holds at most 127 actions, got 128'
    );
    rejects(0, [{ ...PRESS, keycode: 0 }], 'Keycode 0 ends a macro');
    rejects(0, [{ ...PRESS, keycode: 0x10000 }], 'Keycode 65536 is out of range 0..65535');
    rejects(0, [{ ...PRESS, delay: 2 ** 32 }], 'Delay 4294967296 is out of range 0..4294967295');
    rejects(0, [{ ...PRESS, keyId: 13 }], 'Key 13 does not exist');
    rejects(0, [Object.assign({}, PRESS, hold)], 'Event hold is not supported');
    expect(configOf(h).macros).toEqual([[], [], [], []]);
    expect(h.state().unsaved).toBe(false);
  });

  it('rejects script bytes outside 0..255', async () => {
    const h = await connected(TRINITY);
    h.session.setScript({ source: 'x', bytecode: [256] });
    expect(h.state().lastError).toEqual({
      operation: 'setScript',
      message: 'Bytecode byte 256 is out of range 0..255',
    });
  });

  it('rejects macros and scripts on a keyboard without them (Starlight)', async () => {
    const h = await connected();
    h.session.setMacro(0, []);
    expect(h.state().lastError).toEqual({ operation: 'setMacro', message: 'Macro 0 does not exist' });
    h.session.setScript(SCRIPT);
    expect(h.state().lastError).toEqual({
      operation: 'setScript',
      message: COMMAND_ERRORS.noScripts,
    });
    expect(h.state().unsaved).toBe(false);
  });

  it('drops unsaved macro and script edits when the keyboard loads its configuration', async () => {
    const h = await connected(TRINITY);
    h.session.setMacro(1, [PRESS, RELEASE]);
    h.session.setScript(SCRIPT);
    h.vk.notifyConfigChanged();
    await waitForState(h.store, state => state.reloading);
    await waitForState(h.store, state => !state.reloading);
    expect(h.state().unsaved).toBe(false);
    expect(configOf(h).macros[1]).toEqual([]);
    expect(configOf(h).script).toEqual({ source: '', bytecode: [] });
    expect(readDeviceConfig(h.controller())).toEqual(configOf(h));
  });
});
```

3. In `describe('isolation of the store from the controller (no aliasing)', …)`, add after `'holds after the load and after every command'`:

```ts
  it('holds for macros and the script (Trinity Pad)', async () => {
    const h = await connected({ keyboard: { model: 'trinity-pad', seedDynamicKeys: false } });
    expectIsolated(h);
    h.session.setMacro(2, [
      { delay: 8, keycode: Keycode.B, event: 'down', isVirtual: true, keyId: 0 },
    ]);
    expectIsolated(h);
    h.session.setScript({ source: 'function loop() {}', bytecode: [1, 2, 3] });
    expectIsolated(h);
    await h.session.save();
    expectIsolated(h);
  });
```

`src/features/device/store.test.tsx`: add `ScriptLevel` (`import { ScriptLevel } from 'emi-keyboard-controller';`), add `FeatureFlags` to the `./model/types` type import, add `useFeatureFlags`, `useSupportsMacros` and `useSupportsScripts` to the `./store` import, add after `MODEL`:

```ts
const TRINITY_FEATURE: FeatureFlags = {
  advancedKeys: true,
  rgb: true,
  scriptLevel: ScriptLevel.AOT,
  pollingRate: 8000,
  macroSlots: 4,
  macroActions: 128,
  bootloader: { enabled: false, download: false, upload: false },
};
```

and add to `describe('hooks')`:

```ts
  it('tell what the connected keyboard supports', () => {
    const feature = renderHook(() => useFeatureFlags());
    const macros = renderHook(() => useSupportsMacros());
    const scripts = renderHook(() => useSupportsScripts());
    expect([feature.result.current, macros.result.current, scripts.result.current]).toEqual([
      null,
      false,
      false,
    ]);

    act(() => {
      deviceStore.setState({ feature: TRINITY_FEATURE });
    });
    expect(feature.result.current).toBe(TRINITY_FEATURE);
    expect([macros.result.current, scripts.result.current]).toEqual([true, true]);
  });
```

`src/features/device/index.test.ts`: the expected export list becomes

```ts
    expect(Object.keys(device).sort()).toEqual([
      'createDeviceSession',
      'deviceSession',
      'deviceStore',
      'subscribeDebugSamples',
      'useConnection',
      'useDeviceConfig',
      'useDeviceName',
      'useDeviceStore',
      'useFeatureFlags',
      'useIsReady',
      'useModel',
      'useSupportsMacros',
      'useSupportsScripts',
    ]);
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/device`
Expected: FAIL — `./capabilities` does not exist, `setMacro` / `setScript` are not functions, the hooks are missing.

- [ ] **Step 3: Add the capability helpers**

`src/features/device/model/capabilities.ts`:

```ts
/**
 * What the connected keyboard supports beyond the basics, from its controller's declarations:
 * libamp cannot report it (its `PACKET_DATA_FEATURE` reply is a `//todo`).
 */
import { ScriptLevel } from 'emi-keyboard-controller';
import type { FeatureFlags } from './types';

/** The controller declares macro slots with room for actions. */
export function supportsMacros(feature: FeatureFlags | null): boolean {
  return feature !== null && feature.macroSlots > 0 && feature.macroActions > 0;
}

/** The controller declares a script level: AOT (compiled by the app) or JIT (by the keyboard). */
export function supportsScripts(feature: FeatureFlags | null): boolean {
  return feature !== null && feature.scriptLevel !== ScriptLevel.Disable;
}

/** The most actions a macro slot holds: its last entry is the end marker the firmware stops at. */
export function macroActionLimit(feature: FeatureFlags | null): number {
  return feature !== null && feature.macroActions > 0 ? feature.macroActions - 1 : 0;
}
```

- [ ] **Step 4: Validate macros and scripts**

`src/features/device/mapping.ts`: after `MAX_MACRO_SLOTS` add

```ts
const MACRO_EVENTS: readonly string[] = ['down', 'up'];
```

and at the end of the file add:

```ts
/**
 * Actions the firmware can play: at most `capacity.actions − 1` (the end marker takes the last
 * entry), a keycode other than "no event" (it would end the macro there), a u32 delay, and a key
 * of the keyboard (libamp reads the key of every action it plays, virtual ones too).
 */
export function assertMacroActions(
  actions: readonly MacroAction[],
  capacity: MacroCapacity,
  keyCount: number
): void {
  const limit = Math.max(capacity.actions - 1, 0);
  if (actions.length > limit) {
    throw new RangeError(`A macro holds at most ${limit} actions, got ${actions.length}`);
  }
  for (const action of actions) {
    assertUint(action.delay, U32, 'Delay');
    assertUint(action.keycode, U16, 'Keycode');
    if (action.keycode === END_MARKER_KEYCODE) throw new RangeError('Keycode 0 ends a macro');
    if (!MACRO_EVENTS.includes(action.event)) {
      throw new RangeError(`Event ${action.event} is not supported`);
    }
    assertUint(action.keyId, U16, 'Key ID');
    if (action.keyId >= keyCount) throw new RangeError(`Key ${action.keyId} does not exist`);
  }
}

/** Bytecode bytes are bytes: `Uint8Array.from` would wrap other values silently. */
export function assertScriptConfig(script: ScriptConfig): void {
  for (const byte of script.bytecode) assertUint(byte, BYTE, 'Bytecode byte');
}
```

- [ ] **Step 5: Add the staged commands**

`src/features/device/session.ts`:

1. File comment: replace the bullet that starts with "Lighting edits are staged" with:

```ts
 * - Lighting, macro and script edits are staged: `setRgbBase`, `setRgbKeys`, `setMacro` and
 *   `setScript` update the cache and the snapshot and send nothing; `save()` writes them with
 *   everything else. Every other edit is sent at once. `unsaved` is set by every edit and cleared
 *   by a load or by a save that included the last one.
```

2. `COMMAND_ERRORS`: after `noSuchProfile` add

```ts
  noSuchMacro: (slot: number): string => `Macro ${slot} does not exist`,
  noScripts: 'This keyboard does not support scripts',
```

3. `DeviceSession` interface: after `setRgbKeys(…)` add

```ts
  /**
   * Staged until `save()`, like `setRgbBase`: the actions of macro `slot` (0-based), without the
   * end marker (the session writes it). At most `macroActions − 1` actions.
   */
  setMacro(slot: number, actions: readonly MacroAction[]): void;
  /** Staged until `save()`: the script source and, on AOT keyboards, its compiled bytecode. */
  setScript(script: ScriptConfig): void;
```

4. Imports: add `assertMacroActions,`, `assertScriptConfig,`, `toControllerMacroAction,` and `toMacroAction,` to the `./mapping` import (`readMacroCapacity` and `toControllerMacros` are there since Task 1), and `MacroAction,` and `ScriptConfig,` to the `./model/types` type import.

5. After `setRgbKeys(…) { … }` add:

```ts
  setMacro(slot: number, actions: readonly MacroAction[]): void {
    const target = this.#editable('setMacro');
    if (!target) return;
    const { connection, config: current } = target;
    const capacity = readMacroCapacity(connection.controller);
    let macro: MacroAction[];
    try {
      assertIndex(slot, capacity.slots, COMMAND_ERRORS.noSuchMacro);
      assertMacroActions(actions, capacity, current.keymap[0]?.length ?? 0);
      macro = actions.map(action => toMacroAction(toControllerMacroAction(action)));
    } catch (error) {
      this.#recordError('setMacro', error);
      return;
    }
    if (isEqual(current.macros[slot], macro)) return;

    const next = deepFreeze({
      ...current,
      macros: current.macros.map((actions, index) => (index === slot ? macro : actions)),
    });
    // Staged: save() writes every slot at full size.
    connection.controller.set_macros(toControllerMacros(next.macros, capacity));
    this.#commitEdit(connection, next);
  }

  setScript(script: ScriptConfig): void {
    const target = this.#editable('setScript');
    if (!target) return;
    const { connection, config: current } = target;
    if (current.script === null) {
      this.#reject('setScript', COMMAND_ERRORS.noScripts);
      return;
    }
    try {
      assertScriptConfig(script);
    } catch (error) {
      this.#recordError('setScript', error);
      return;
    }
    const staged: ScriptConfig = { source: script.source, bytecode: [...script.bytecode] };
    if (isEqual(current.script, staged)) return;

    const next = deepFreeze({ ...current, script: staged });
    // Staged: save() writes the source and, on AOT keyboards, the bytecode.
    connection.controller.set_script_source(staged.source);
    connection.controller.set_script_bytecode(Uint8Array.from(staged.bytecode));
    this.#commitEdit(connection, next);
  }
```

- [ ] **Step 6: Add the hooks**

`src/features/device/store.ts`: add the imports

```ts
import { supportsMacros, supportsScripts } from './model/capabilities';
```

and `FeatureFlags` to the `./model/types` type import; after `selectDeviceName` add

```ts
const selectFeature = (state: DeviceState): FeatureFlags | null => state.feature;
const selectSupportsMacros = (state: DeviceState): boolean => supportsMacros(state.feature);
const selectSupportsScripts = (state: DeviceState): boolean => supportsScripts(state.feature);
```

and at the end of the file:

```ts
/** The connected keyboard's feature flags; null until the first load. */
export function useFeatureFlags(): FeatureFlags | null {
  return useDeviceStore(selectFeature);
}

/** Whether the connected keyboard's controller declares macros. */
export function useSupportsMacros(): boolean {
  return useDeviceStore(selectSupportsMacros);
}

/** Whether the connected keyboard's controller declares scripts. */
export function useSupportsScripts(): boolean {
  return useDeviceStore(selectSupportsScripts);
}
```

`src/features/device/index.ts`: after the `useConnection, …` export line add

```ts
export { useFeatureFlags, useSupportsMacros, useSupportsScripts } from './store';
```

`src/features/device/testing/session-harness.ts`: in `controllerCacheObjects`, add `controller.get_macros(),` and `controller.get_script_bytecode(),` to the list of caches.

- [ ] **Step 7: Run the device tests**

Run: `npx vitest run src/features/device`
Expected: PASS.

- [ ] **Step 8: Update the docs**

`docs/device.md`:

- "Commands", second paragraph: replace "Lighting edits are the exception: `setRgbBase` and `setRgbKeys` are staged and send nothing," with "Lighting, macro and script edits are the exception: `setRgbBase`, `setRgbKeys`, `setMacro` and `setScript` are staged and send nothing,".
- Command table: after the `setRgbBase(config)` / `setRgbKeys(entries)` row add the rows

```markdown
| `setMacro(slot, actions)`                                  | The actions of a macro slot (0-based), without its end marker (≤ `macroActions − 1`); staged until `save()`, which writes every slot at full size with the end marker. |
| `setScript({ source, bytecode })`                          | The script source and, on AOT keyboards, its compiled bytecode; staged until `save()`.                                                                             |
```

- "Public API" table: after the `useConnection()` row add

```markdown
| `useFeatureFlags()`, `useSupportsMacros()`, `useSupportsScripts()` | The keyboard's feature flags and what its controller declares (`model/capabilities.ts`). |
```

- The paragraph under the table: "…`types` (the shared domain types), `units` (fraction ↔ mm) and `mutex-mode` (null-bind mode bytes)." becomes "…`types` (the shared domain types), `units` (fraction ↔ mm), `mutex-mode` (null-bind mode bytes) and `capabilities` (macros, scripts and the macro action limit a controller declares)."
- "Values": add the bullet

```markdown
- Macro actions are `{ delay, keycode, event, isVirtual, keyId }`; `delay` is in ticks from the
  start of the macro (the keyboard ticks `pollingRate` times a second). A slot is stored without
  its end marker; the session writes full-size slots (`readMacroCapacity`), because the
  controller reads every slot with the first slot's size. The script's bytecode is a number array.
```

- "Why it is built this way", the bullet "One adapter to a moving upstream": after "Workarounds for upstream bugs live there too (`withUpstreamFixes`)." add " One of them gives the AT32, Oholeo and Trinity Pad controllers macro slots of their own: their defaults share one array between all slots."

Run: `npx prettier --write docs/device.md` (realigns the tables).

`docs/architecture.md`: "…which update the controller, send the packets (lighting edits wait for `save()`) and patch the store." becomes "…which update the controller, send the packets (lighting, macro and script edits wait for `save()`) and patch the store."; in the Layers paragraph, "`types`, `units`, `mutex-mode`, …" becomes "`types`, `units`, `mutex-mode`, `capabilities`, …".

`CLAUDE.md`: "send packets (lighting edits are staged until `save()`)" becomes "send packets (lighting, macro and script edits are staged until `save()`)"; "such as `types`, `units` and `mutex-mode`" becomes "such as `types`, `units`, `mutex-mode` and `capabilities`".

- [ ] **Step 9: Check and commit**

Run: `npm run typecheck && npx eslint src/features/device && npx prettier --check src/features/device docs CLAUDE.md`
Expected: no errors.

```bash
git add src/features/device/model/capabilities.ts src/features/device/model/capabilities.test.ts src/features/device/mapping.ts src/features/device/session.ts src/features/device/store.ts src/features/device/index.ts src/features/device/testing/session-harness.ts src/features/device/session.commands.test.ts src/features/device/store.test.tsx src/features/device/index.test.ts docs/device.md docs/architecture.md CLAUDE.md
git commit -m "feat(device): stage macro and script edits until save"
```

---

### Task 3: Share the keycode picker and the load counter

The Macros page reuses two pieces another feature owns. By the project rules a primitive with two real users moves to `src/components/ui`, which may not import features, so the picker takes its catalog as a prop. `useDeviceLoads` (lighting) is a device-store hook and moves to the device feature. No visible change.

**Files:**
- Create: `src/components/ui/KeycodePicker.tsx` (from `src/features/dynamic-keys/components/shared/KeycodePicker.tsx`)
- Create: `src/components/ui/KeycodePicker.test.tsx` (from `…/shared/KeycodePicker.test.tsx`)
- Delete: `src/features/dynamic-keys/components/shared/KeycodePicker.tsx`, `src/features/dynamic-keys/components/shared/KeycodePicker.test.tsx`
- Modify: `src/components/ui/index.ts`, `src/components/ui/Modal.tsx`, `src/components/ui/Modal.test.tsx`
- Modify: `src/features/dynamic-keys/components/TapHoldMode.tsx`, `ToggleMode.tsx`, `dynamic/DKSParts.tsx`
- Modify: `src/features/device/store.ts`, `src/features/device/index.ts`, `src/features/device/store.test.tsx`, `src/features/device/index.test.ts`
- Modify: `src/features/lighting/LightingPage.tsx`; Delete: `src/features/lighting/hooks/use-device-loads.ts`
- Modify: `docs/device.md`

**Interfaces:**
- Produces (`components/ui`): `KeycodePicker` with `KeycodePickerProps { categories: readonly KeycodePickerCategory[]; title?: string; description?: string; selectedAction: number | null; onActionSelect: (keycode: number) => void; defaultExpandedSection?: string }`, `KeycodePickerCategory { name: string; actions: readonly KeycodePickerAction[] }`, `KeycodePickerAction { name: string; keycode: number }`; `ModalMaxWidth` gains `'3xl'`.
- Produces (device index): `useDeviceLoads(): number`.

- [ ] **Step 1: Move the picker test and make it data-driven**

```bash
git mv src/features/dynamic-keys/components/shared/KeycodePicker.test.tsx src/components/ui/KeycodePicker.test.tsx
git mv src/features/dynamic-keys/components/shared/KeycodePicker.tsx src/components/ui/KeycodePicker.tsx
```

In `src/components/ui/KeycodePicker.test.tsx`, replace the imports with

```tsx
import { KeyModifier, LayerControlKeycode, MouseKeycode } from 'emi-keyboard-controller';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTION_CATEGORIES, kc } from '../../features/keycodes';
import { installFakeAnimations, type FakeAnimations } from '../../lib/transitions/testing';
import { KeycodePicker, type KeycodePickerCategory } from './KeycodePicker';
```

add `categories={ACTION_CATEGORIES}` as the first prop of every `<KeycodePicker …>` in the file (five elements: one in each test, two in the card-classes test), and add to `describe('KeycodePicker')`:

```tsx
  it('shows the categories it is given, the first one open', () => {
    const categories: readonly KeycodePickerCategory[] = [
      { name: 'Letters', actions: [{ name: 'A', keycode: 0x04 }] },
      { name: 'Digits', actions: [{ name: '1', keycode: 0x1e }] },
    ];
    const onActionSelect = vi.fn();
    render(
      <KeycodePicker categories={categories} selectedAction={null} onActionSelect={onActionSelect} />
    );
    expect(screen.getByRole('button', { name: 'Letters' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Digits' })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(onActionSelect).toHaveBeenCalledWith(0x04);
  });
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/components/ui/KeycodePicker.test.tsx`
Expected: FAIL (type errors on `categories`; the moved component still imports `../../../device`, which no longer resolves).

- [ ] **Step 3: Rewrite the picker as a primitive**

Replace `src/components/ui/KeycodePicker.tsx` with:

```tsx
/**
 * Action picker (port of `advancedkey/shared/KeycodePicker.svelte`): collapsible categories, each
 * action emitting its full encoded keycode (D15). Shared by the Dynamic Keys editors and the
 * Macros page, which pass the catalog (`features/keycodes` `ACTION_CATEGORIES`).
 *
 * With glassmorphism always on (the Svelte `glassmorphismMode` store was a constant `true`), every
 * action button carried `glassmorphism-button` and the picked-action highlight classes never
 * applied, so `highlightColor` had no visible effect and is not ported; the picked action is
 * exposed as `aria-pressed` instead.
 */
import { useState } from 'react';
import { Transition, slide } from '../../lib/transitions';

export interface KeycodePickerAction {
  readonly name: string;
  /** The full 16-bit keycode the action assigns. */
  readonly keycode: number;
}

export interface KeycodePickerCategory {
  readonly name: string;
  readonly actions: readonly KeycodePickerAction[];
}

export interface KeycodePickerProps {
  readonly categories: readonly KeycodePickerCategory[];
  readonly title?: string;
  readonly description?: string;
  /** The action currently assigned, if any. */
  readonly selectedAction: number | null;
  readonly onActionSelect: (keycode: number) => void;
  /** The category open at first; the first category by default. */
  readonly defaultExpandedSection?: string;
}

export function KeycodePicker({
  categories,
  title,
  description,
  selectedAction,
  onActionSelect,
  defaultExpandedSection,
}: KeycodePickerProps) {
  const [expandedSections, setExpandedSections] = useState<ReadonlySet<string>>(
    () => new Set([defaultExpandedSection ?? categories[0]?.name ?? ''])
  );

  const cardClasses = description
    ? 'rounded-lg border p-4 sm:p-6 ' + 'glassmorphism-card'
    : 'rounded-lg border border-gray-200 dark:border-gray-600 p-4 sm:p-6 bg-white dark:bg-gray-900 ' +
      'glassmorphism-card';

  return (
    <div className={cardClasses}>
      {title && <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>}

      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>
      )}

      <div className="space-y-2">
        {categories.map(category => {
          const expanded = expandedSections.has(category.name);
          return (
            <div key={category.name} className="border rounded-lg glassmorphism-card">
              <button
                type="button"
                className="w-full px-4 py-3 flex items-center justify-between glassmorphism-button rounded-lg transition-colors"
                aria-expanded={expanded}
                onClick={() => {
                  setExpandedSections(sections => {
                    const next = new Set(sections);
                    if (next.has(category.name)) next.delete(category.name);
                    else next.add(category.name);
                    return next;
                  });
                }}
              >
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {category.name}
                </h4>
                <svg
                  className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <Transition show={expanded} transition={[slide, { duration: 300, axis: 'y' }]}>
                <div className="px-4 pb-4 pt-2">
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                    {category.actions.map(action => (
                      <button
                        key={action.name}
                        type="button"
                        className="aspect-square min-w-12 text-xs rounded-md border transition-all flex items-center justify-center p-1 whitespace-pre-line leading-tight glassmorphism-button"
                        aria-pressed={selectedAction === action.keycode}
                        onClick={() => {
                          onActionSelect(action.keycode);
                        }}
                        title={action.name}
                      >
                        {action.name}
                      </button>
                    ))}
                  </div>
                </div>
              </Transition>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

`src/components/ui/index.ts`: add

```ts
// The action picker of the Dynamic Keys editors and the Macros page.
export {
  KeycodePicker,
  type KeycodePickerAction,
  type KeycodePickerCategory,
  type KeycodePickerProps,
} from './KeycodePicker';
```

- [ ] **Step 4: Point the Dynamic Keys editors at it**

- `src/features/dynamic-keys/components/TapHoldMode.tsx` and `ToggleMode.tsx`: replace `import { NoKeySelected } from '../../../components/ui';` with `import { KeycodePicker, NoKeySelected } from '../../../components/ui';`, delete `import { KeycodePicker } from './shared/KeycodePicker';`, add `import { ACTION_CATEGORIES } from '../../keycodes';`, and add `categories={ACTION_CATEGORIES}` as the first prop of every `<KeycodePicker` (two in TapHoldMode, one in ToggleMode).
- `src/features/dynamic-keys/components/dynamic/DKSParts.tsx`: replace `import { KeycodePicker } from '../shared/KeycodePicker';` with `import { KeycodePicker } from '../../../../components/ui';`, add `import { ACTION_CATEGORIES } from '../../../keycodes';`, and add `categories={ACTION_CATEGORIES}` to its `<KeycodePicker`.

- [ ] **Step 5: Add a wide modal**

`src/components/ui/Modal.tsx`: `export type ModalMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '3xl';` and add `'3xl': 'max-w-3xl',` to `maxWidthClasses`.

`src/components/ui/Modal.test.tsx`: add to its `describe`:

```tsx
  it('offers a 3xl width for wide content (the Macros key picker)', () => {
    render(
      <Modal open onClose={vi.fn()} maxWidth="3xl">
        <p>content</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toHaveClass('max-w-3xl');
  });
```

- [ ] **Step 6: Move `useDeviceLoads` to the device feature**

`src/features/device/store.test.tsx`: add `useDeviceLoads` to the `./store` import, `RGBBaseMode` to the `emi-keyboard-controller` import, `DeviceConfig` to the `./model/types` type import, add after `TRINITY_FEATURE`:

```ts
const CONFIG: DeviceConfig = {
  advancedKeys: [],
  keymap: [],
  rgbBase: {
    mode: RGBBaseMode.RgbBaseModeOff,
    color: { red: 0, green: 0, blue: 0 },
    secondaryColor: { red: 0, green: 0, blue: 0 },
    speed: 0,
    direction: 0,
    density: 0,
    brightness: 0,
  },
  rgbKeys: [],
  dynamicKeys: [],
  profileIndex: 0,
  profileCount: 1,
  macros: [],
  script: null,
};
```

and to `describe('hooks')`:

```ts
  it('count the configurations the keyboard loads while mounted (useDeviceLoads)', () => {
    const loads = renderHook(() => useDeviceLoads());
    expect(loads.result.current).toBe(0);
    act(() => {
      deviceStore.setState({ reloading: true });
    });
    expect(loads.result.current).toBe(0);
    // A load replaces the configuration while the store is reloading.
    act(() => {
      deviceStore.setState({ config: CONFIG });
    });
    expect(loads.result.current).toBe(1);
    // An edit afterwards is no load.
    act(() => {
      deviceStore.setState({ reloading: false, config: { ...CONFIG, profileCount: 2 } });
    });
    expect(loads.result.current).toBe(1);
  });
```

`src/features/device/index.test.ts`: add `'useDeviceLoads',` after `'useDeviceConfig',` in the expected list.

`src/features/device/store.ts`: replace `import { useStore } from 'zustand';` with

```ts
import { useState, useSyncExternalStore } from 'react';
import { useStore } from 'zustand';
```

and append (the code of `src/features/lighting/hooks/use-device-loads.ts`, unchanged except the comment):

```ts
/**
 * Whether the keyboard has just loaded a configuration (a profile switch, a reset): it replaces
 * the configuration while the store is `reloading`, when the session rejects every edit.
 */
function isDeviceLoad(state: DeviceState, previous: DeviceState): boolean {
  return state.reloading && state.config !== previous.config;
}

function createLoadCounter() {
  let loads = 0;
  return {
    subscribe: (onLoad: () => void): (() => void) =>
      deviceStore.subscribe((state, previous) => {
        if (!isDeviceLoad(state, previous)) return;
        loads += 1;
        onLoad();
      }),
    count: () => loads,
  };
}

/**
 * How many configurations the keyboard has loaded while the component is mounted: a `key` for
 * components whose drafts start over on every load (Lighting, Macros, Scripts). Read like the
 * store's slices, so the render that shows a new configuration already has its count.
 */
export function useDeviceLoads(): number {
  const [counter] = useState(createLoadCounter);
  return useSyncExternalStore(counter.subscribe, counter.count);
}
```

`src/features/device/index.ts`: the line added in Task 2 becomes

```ts
export { useDeviceLoads, useFeatureFlags, useSupportsMacros, useSupportsScripts } from './store';
```

`src/features/lighting/LightingPage.tsx`: delete the line `import { useDeviceLoads } from './hooks/use-device-loads';` and add `useDeviceLoads,` to its named imports from `'../device'`. Then:

```bash
git rm src/features/lighting/hooks/use-device-loads.ts
```

`docs/device.md`, "Public API" table: after the `useFeatureFlags()` row add

```markdown
| `useDeviceLoads()` | Counts the configurations the keyboard loads while mounted: a `key` for drafts that start over on a load. |
```

Run: `npx prettier --write docs/device.md`

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/components/ui src/features/dynamic-keys src/features/device src/features/lighting`
Expected: PASS.

- [ ] **Step 8: Check and commit**

Run: `npm run typecheck && npx eslint src/components/ui src/features/dynamic-keys src/features/device src/features/lighting && npx prettier --check src/components/ui src/features docs/device.md`
Expected: no errors.

```bash
git add src/components/ui/KeycodePicker.tsx src/components/ui/KeycodePicker.test.tsx src/components/ui/index.ts src/components/ui/Modal.tsx src/components/ui/Modal.test.tsx src/features/dynamic-keys/components/TapHoldMode.tsx src/features/dynamic-keys/components/ToggleMode.tsx src/features/dynamic-keys/components/dynamic/DKSParts.tsx src/features/device/store.ts src/features/device/index.ts src/features/device/store.test.tsx src/features/device/index.test.ts src/features/lighting/LightingPage.tsx docs/device.md
git commit -m "refactor: share the keycode picker and the device load counter"
```

(`git mv` / `git rm` already staged the moved and deleted files.)

---

### Task 4: Macro and script keycodes in Remap's Extension tab

The codec already decodes both categories, but `display.ts` names script keycodes with empty labels (the Svelte table had no `ScriptCollection` entry), so a key bound to a script operation would show a blank keycap. This task names them like upstream's `keyCodeToString` (main "Watch" … "Toggle", sub-label "Script"); macro names stay the Svelte port's ("Start Recording0", sub-label "Macro").

**Files:**
- Modify: `src/features/keycodes/codec.ts`, `codec.test.ts`
- Modify: `src/features/keycodes/display.ts`, `display.test.ts`
- Modify: `src/features/keycodes/palettes.ts`, `catalogs.test.ts`
- Modify: `src/features/keycodes/index.ts`
- Modify: `src/features/remap/components/ExtensionTab.tsx`, `src/features/remap/RemapPage.test.tsx`
- Modify: `src/lib/i18n/en.ts`, `zh.ts`, `i18n.test.tsx`

**Interfaces:**
- Consumes: `useFeatureFlags`, `useSupportsMacros`, `useSupportsScripts` (Task 2).
- Produces: `kc.macro(op: MacroKeycode, index: number): Keycode` (`0xAD | (op << 4 | index) << 8`), `kc.script(op: ScriptKeycode): Keycode` (`0xAE | op << 8`); `interface GroupPaletteKey { label: TranslationKey; keycode: Keycode }`, `macroPalette(slots: number): readonly (readonly GroupPaletteKey[])[]`, `SCRIPT_PALETTE: readonly GroupPaletteKey[]`; translation keys `remap.macroGroup`, `remap.scriptGroup`, `macros.slot` (`'Macro {0}'`, 1-based), `remap.macro*`, `remap.script*`.

- [ ] **Step 1: Write the failing tests**

`src/features/keycodes/codec.test.ts`: add `MacroKeycode` and `ScriptKeycode` to the `emi-keyboard-controller` import and add to `describe('kc constructors: firmware examples …')`:

```ts
  it('encodes macro and script keys as MACRO_COLLECTION / SCRIPT_COLLECTION (keycode.h, macro.h)', () => {
    // MACRO_KEYCODE_GET_KEYCODE = sub >> 4, MACRO_KEYCODE_GET_INDEX = sub & 0x0F
    expect(kc.macro(MacroKeycode.MacroRecordingStart, 0)).toBe(0x10ad);
    expect(kc.macro(MacroKeycode.MacroPlayingStartOnce, 1)).toBe(0x41ad);
    expect(kc.script(ScriptKeycode.ScriptToggle)).toBe(0x05ae);
    expect(decodeKeycode(kc.macro(MacroKeycode.MacroPlayingPause, 3))).toEqual({
      category: 'macro',
      op: 9,
      index: 3,
    });
    expect(decodeKeycode(kc.script(ScriptKeycode.ScriptWatch))).toEqual({
      category: 'script',
      sub: 0,
    });
    expect(() => kc.macro(MacroKeycode.MacroPlayingStop, 16)).toThrow(RangeError);
  });
```

`src/features/keycodes/display.test.ts`:

1. At the top of `asSvelteRendered` add:

```ts
  // Script keycodes: the Svelte table had no ScriptCollection names (named since the macros and
  // scripts spec, like upstream's keyCodeToString).
  if ((keycode & 0xff) === 0xae) return { main: '', sub: '' };
```

2. In the explicit cases, replace `[0x00ae, '', ''],` with

```ts
      [0x00ae, 'Watch', 'Script'],
      [0x05ae, 'Toggle', 'Script'],
      [0x06ae, '', 'Script'],
```

`src/features/keycodes/catalogs.test.ts`: add `import { en } from '../../lib/i18n/en';`, add `SCRIPT_PALETTE` and `macroPalette` to the `./palettes` import, and append:

```ts
describe('the Extension tab’s Macro and Script groups', () => {
  it('give every macro slot its record, play, stop and pause keys', () => {
    const rows = macroPalette(4);
    expect(rows.map(row => row.map(key => decodeKeycode(key.keycode)))).toEqual(
      [0, 1, 2, 3].map(index =>
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map(op => ({ category: 'macro', op, index }))
      )
    );
    expect(rows[0]?.map(key => en[key.label])).toEqual([
      'Record\nStart',
      'Record\nStop',
      'Record\nToggle',
      'Play\nOnce',
      'Play\nLoop',
      'Play Once\nNo Gaps',
      'Play Loop\nNo Gaps',
      'Stop',
      'Pause',
    ]);
  });

  it('list the six libamp script operations, named on the keycaps', () => {
    expect(SCRIPT_PALETTE.map(key => decodeKeycode(key.keycode))).toEqual(
      [0, 1, 2, 3, 4, 5].map(sub => ({ category: 'script', sub }))
    );
    expect(SCRIPT_PALETTE.map(key => describeKeycode(key.keycode))).toEqual(
      ['Watch', 'Start', 'Stop', 'Suspend', 'Restart', 'Toggle'].map(main => ({
        main,
        sub: 'Script',
      }))
    );
  });
});
```

`src/features/remap/RemapPage.test.tsx`: add after the helper functions (before `beforeEach`):

```ts
/** `list[index]`, which the test expects to exist. */
function item<T>(list: readonly T[], index: number): T {
  const value = list[index];
  if (value === undefined) throw new Error(`no item ${index}`);
  return value;
}

const MACRO_KEYS = [
  'Record\nStart',
  'Record\nStop',
  'Record\nToggle',
  'Play\nOnce',
  'Play\nLoop',
  'Play Once\nNo Gaps',
  'Play Loop\nNo Gaps',
  'Stop',
  'Pause',
];
```

and add to `describe('RemapPage')`:

```ts
  describe('Extension groups', () => {
    it('add the Macro and Script keys on a keyboard that supports them (Trinity Pad)', async () => {
      const keyboard = await connectVirtualKeyboard({
        model: 'trinity-pad',
        seedDynamicKeys: false,
      });
      onTestFinished(keyboard.dispose);
      renderPage();
      fireEvent.click(tab('Extension'));

      const macro = screen.getByRole('region', { name: 'Macro' });
      const rows = within(macro).getAllByRole('group');
      expect(rows.map(row => row.getAttribute('aria-label'))).toEqual([
        'Macro 1',
        'Macro 2',
        'Macro 3',
        'Macro 4',
      ]);
      for (const row of rows) {
        expect(within(row).getAllByRole('button').map(button => button.textContent)).toEqual(
          MACRO_KEYS
        );
      }
      const script = screen.getByRole('region', { name: 'Script' });
      expect(within(script).getAllByRole('button').map(button => button.textContent)).toEqual([
        'Watch',
        'Start',
        'Stop',
        'Suspend',
        'Restart',
        'Toggle',
      ]);

      select(0);
      fireEvent.click(within(item(rows, 1)).getByRole('button', { name: 'Play\nOnce' }));
      await vi.waitFor(() => {
        expect(deviceKeycode(keyboard, 0, 0)).toBe(0x41ad);
      });
      select(1);
      fireEvent.click(within(script).getByRole('button', { name: 'Toggle' }));
      await vi.waitFor(() => {
        expect(deviceKeycode(keyboard, 0, 1)).toBe(0x05ae);
      });
    });

    it('show neither group on a keyboard without macros and scripts (Starlight)', async () => {
      await connect();
      renderPage();
      fireEvent.click(tab('Extension'));
      expect(screen.queryByRole('region', { name: 'Macro' })).toBeNull();
      expect(screen.queryByRole('region', { name: 'Script' })).toBeNull();
      expect(paletteButtons().map(button => button.textContent)).toEqual(
        REMAP_PALETTES.extension.map(key => key.label)
      );
    });
  });
```

`src/lib/i18n/i18n.test.tsx`: in the key-count test add the comment line `// + 18: Remap's Macro and Script groups (macros and scripts spec).` and add 18 to the number in `toHaveLength(…)` (read it first: 293 when this plan was written, which makes 311). Add:

```ts
  it('add the Extension tab’s Macro and Script groups (macros and scripts spec)', () => {
    expect(en).toMatchObject({
      'remap.macroGroup': 'Macro',
      'macros.slot': 'Macro {0}',
      'remap.macroPlayOnceNoGap': 'Play Once\nNo Gaps',
      'remap.scriptSuspend': 'Suspend',
    });
    expect(zh).toMatchObject({
      'remap.macroGroup': '宏',
      'remap.scriptGroup': '脚本',
      'macros.slot': '宏 {0}',
      'remap.macroPlayOnceNoGap': '播放一次\n无间隔',
    });
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/keycodes src/features/remap src/lib/i18n`
Expected: FAIL (`kc.macro` is not a function; no script names; no groups; missing keys).

- [ ] **Step 3: Add the copy**

`src/lib/i18n/en.ts`, appended at the end of the object:

```ts

  // Remap: the Extension tab's Macro and Script groups (macros and scripts spec)
  'remap.macroGroup': 'Macro',
  'remap.scriptGroup': 'Script',
  'macros.slot': 'Macro {0}',
  'remap.macroRecordStart': 'Record\nStart',
  'remap.macroRecordStop': 'Record\nStop',
  'remap.macroRecordToggle': 'Record\nToggle',
  'remap.macroPlayOnce': 'Play\nOnce',
  'remap.macroPlayLoop': 'Play\nLoop',
  'remap.macroPlayOnceNoGap': 'Play Once\nNo Gaps',
  'remap.macroPlayLoopNoGap': 'Play Loop\nNo Gaps',
  'remap.macroStop': 'Stop',
  'remap.macroPause': 'Pause',
  'remap.scriptWatch': 'Watch',
  'remap.scriptStart': 'Start',
  'remap.scriptStop': 'Stop',
  'remap.scriptSuspend': 'Suspend',
  'remap.scriptRestart': 'Restart',
  'remap.scriptToggle': 'Toggle',
```

`src/lib/i18n/zh.ts`, appended at the end of the object:

```ts

  // Remap: the Extension tab's Macro and Script groups (macros and scripts spec)
  'remap.macroGroup': '宏',
  'remap.scriptGroup': '脚本',
  'macros.slot': '宏 {0}',
  'remap.macroRecordStart': '开始\n录制',
  'remap.macroRecordStop': '停止\n录制',
  'remap.macroRecordToggle': '切换\n录制',
  'remap.macroPlayOnce': '播放\n一次',
  'remap.macroPlayLoop': '循环\n播放',
  'remap.macroPlayOnceNoGap': '播放一次\n无间隔',
  'remap.macroPlayLoopNoGap': '循环播放\n无间隔',
  'remap.macroStop': '停止',
  'remap.macroPause': '暂停',
  'remap.scriptWatch': '监视',
  'remap.scriptStart': '启动',
  'remap.scriptStop': '停止',
  'remap.scriptSuspend': '挂起',
  'remap.scriptRestart': '重启',
  'remap.scriptToggle': '切换',
```

- [ ] **Step 4: Encode and name the keycodes**

`src/features/keycodes/codec.ts`:

1. Add `type MacroKeycode,` and `type ScriptKeycode,` to the `emi-keyboard-controller` import.
2. In `KeycodeConstructors`, after `readonly user: (n: number) => Keycode;` add

```ts
  /** `op` of macro slot `index` (0-based, at most 15). */
  readonly macro: (op: MacroKeycode, index: number) => Keycode;
  readonly script: (op: ScriptKeycode) => Keycode;
```

3. In `kc`, after `user: …,` add

```ts
  macro: (op: MacroKeycode, index: number): Keycode =>
    collection(MACRO, 'sub', (nibble('op', op) << 4) | nibble('index', index)),
  script: (op: ScriptKeycode): Keycode => collection(SCRIPT, 'sub', op),
```

`src/features/keycodes/display.ts`:

1. Header comment: after "(the Svelte app showed "Keyboard" and an empty name for them)." add " Script keycodes are named like upstream's `keyCodeToString`; the Svelte app had no names for them."
2. Add `ScriptKeycode,` to the `emi-keyboard-controller` import.
3. After `MACRO_NAMES` add

```ts
const SCRIPT_NAMES = {
  [ScriptKeycode.ScriptWatch]: 'Watch',
  [ScriptKeycode.ScriptStart]: 'Start',
  [ScriptKeycode.ScriptStop]: 'Stop',
  [ScriptKeycode.ScriptSuspend]: 'Suspend',
  [ScriptKeycode.ScriptRestart]: 'Restart',
  [ScriptKeycode.ScriptToggle]: 'Toggle',
} satisfies Record<ScriptKeycode, string>;
```

4. In `DESCRIBERS`, after the `MacroCollection` entry add

```ts
  [EmiKeycode.ScriptCollection]: m => ({ main: nameOf(SCRIPT_NAMES, m) ?? '', sub: 'Script' }),
```

- [ ] **Step 5: Add the palettes**

`src/features/keycodes/palettes.ts`:

1. Add `MacroKeycode,` and `ScriptKeycode,` to the `emi-keyboard-controller` import and `import type { TranslationKey } from '../../lib/i18n/en';`.
2. Append:

```ts
/** A key of the Extension tab's Macro and Script groups; its label is translated. */
export interface GroupPaletteKey {
  readonly label: TranslationKey;
  readonly keycode: Keycode;
}

/** Each macro slot's keys (libamp `MacroKeycode`), in column order. */
const MACRO_KEYS: readonly (readonly [MacroKeycode, TranslationKey])[] = [
  [MacroKeycode.MacroRecordingStart, 'remap.macroRecordStart'],
  [MacroKeycode.MacroRecordingStop, 'remap.macroRecordStop'],
  [MacroKeycode.MacroRecordingToggle, 'remap.macroRecordToggle'],
  [MacroKeycode.MacroPlayingStartOnce, 'remap.macroPlayOnce'],
  [MacroKeycode.MacroPlayingStartCircularly, 'remap.macroPlayLoop'],
  [MacroKeycode.MacroPlayingStartOnceNoGap, 'remap.macroPlayOnceNoGap'],
  [MacroKeycode.MacroPlayingStartCircularlyNoGap, 'remap.macroPlayLoopNoGap'],
  [MacroKeycode.MacroPlayingStop, 'remap.macroStop'],
  [MacroKeycode.MacroPlayingPause, 'remap.macroPause'],
];

/** The Macro group: one row of keys per macro slot (0-based). */
export function macroPalette(slots: number): readonly (readonly GroupPaletteKey[])[] {
  return Array.from({ length: slots }, (_, slot) =>
    MACRO_KEYS.map(([op, label]) => ({ label, keycode: kc.macro(op, slot) }))
  );
}

/** The Script group (libamp `ScriptKeycode`). */
export const SCRIPT_PALETTE: readonly GroupPaletteKey[] = [
  { label: 'remap.scriptWatch', keycode: kc.script(ScriptKeycode.ScriptWatch) },
  { label: 'remap.scriptStart', keycode: kc.script(ScriptKeycode.ScriptStart) },
  { label: 'remap.scriptStop', keycode: kc.script(ScriptKeycode.ScriptStop) },
  { label: 'remap.scriptSuspend', keycode: kc.script(ScriptKeycode.ScriptSuspend) },
  { label: 'remap.scriptRestart', keycode: kc.script(ScriptKeycode.ScriptRestart) },
  { label: 'remap.scriptToggle', keycode: kc.script(ScriptKeycode.ScriptToggle) },
];
```

`src/features/keycodes/index.ts`: the palettes line becomes

```ts
export {
  REMAP_PALETTES,
  SCRIPT_PALETTE,
  macroPalette,
  type GroupPaletteKey,
  type PaletteKey,
  type RemapPalettes,
} from './palettes';
```

- [ ] **Step 6: Render the gated groups**

Replace `src/features/remap/components/ExtensionTab.tsx` with:

```tsx
import { useId } from 'react';
import { useT } from '../../../lib/i18n';
import { useFeatureFlags, useSupportsMacros, useSupportsScripts } from '../../device';
import {
  REMAP_PALETTES,
  SCRIPT_PALETTE,
  macroPalette,
  type GroupPaletteKey,
  type PaletteKey,
} from '../../keycodes';
import { KeySlots, type PaletteTabProps } from './KeySlots';

const GROUP_HEADING = 'text-sm font-semibold text-gray-600 dark:text-gray-300 mt-6 mb-2';

/**
 * Mouse, joystick, keyboard operation and special keys (port of `remap/Extension.svelte`), then
 * the Macro and Script groups on keyboards whose controller declares them (macros and scripts
 * spec). Without them the tab is the Svelte one.
 */
export function ExtensionTab({ keyslot }: PaletteTabProps) {
  const t = useT();
  const feature = useFeatureFlags();
  const macros = useSupportsMacros();
  const scripts = useSupportsScripts();
  const macroId = useId();
  const scriptId = useId();
  const translated = (key: GroupPaletteKey): PaletteKey => ({
    label: t(key.label),
    keycode: key.keycode,
  });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <KeySlots keys={REMAP_PALETTES.extension} keyslot={keyslot} />
      </div>

      {macros && feature && (
        <div role="region" aria-labelledby={macroId}>
          <h3 id={macroId} className={GROUP_HEADING}>
            {t('remap.macroGroup')}
          </h3>
          <div className="space-y-2">
            {macroPalette(feature.macroSlots).map((row, slot) => {
              const name = t('macros.slot', String(slot + 1));
              return (
                <div key={slot} role="group" aria-label={name} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-sm text-gray-500 dark:text-gray-400">
                    {name}
                  </span>
                  <div className="flex flex-wrap gap-2 *:w-20">
                    <KeySlots keys={row.map(translated)} keyslot={keyslot} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {scripts && (
        <div role="region" aria-labelledby={scriptId}>
          <h3 id={scriptId} className={GROUP_HEADING}>
            {t('remap.scriptGroup')}
          </h3>
          <div className="flex flex-wrap gap-2 *:w-20">
            <KeySlots keys={SCRIPT_PALETTE.map(translated)} keyslot={keyslot} />
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/features/keycodes src/features/remap src/lib/i18n`
Expected: PASS.

- [ ] **Step 8: Check and commit**

Run: `npm run typecheck && npx eslint src/features/keycodes src/features/remap src/lib/i18n && npx prettier --check src/features/keycodes src/features/remap src/lib/i18n`
Expected: no errors.

```bash
git add src/features/keycodes/codec.ts src/features/keycodes/codec.test.ts src/features/keycodes/display.ts src/features/keycodes/display.test.ts src/features/keycodes/palettes.ts src/features/keycodes/catalogs.test.ts src/features/keycodes/index.ts src/features/remap/components/ExtensionTab.tsx src/features/remap/RemapPage.test.tsx src/lib/i18n/en.ts src/lib/i18n/zh.ts src/lib/i18n/i18n.test.tsx
git commit -m "feat(remap): macro and script keys in the Extension tab"
```

---

### Task 5: Macros model — timing, edits, browser keys, recorder

**Files:**
- Create: `src/features/macros/model/timing.ts`, `timing.test.ts`
- Create: `src/features/macros/model/actions.ts`, `actions.test.ts`
- Create: `src/features/macros/model/browser-keys.ts`, `browser-keys.test.ts`
- Create: `src/features/macros/model/recorder.ts`, `recorder.test.ts`
- Create: `src/features/macros/model/key-picker.ts`, `key-picker.test.ts`
- Create: `src/features/macros/model/index.ts`

**Interfaces:**
- Consumes: `MacroAction`, `Keycode` (`features/device/model/types`); `kc`, `ACTION_CATEGORIES`, `findAction`, `describeKeycode` (`features/keycodes`).
- Produces (`features/macros/model`):
  - `DEFAULT_POLLING_RATE = 1000`, `ticksToMs(ticks: number, pollingRate: number): number`, `msToTicks(ms: number, pollingRate: number): number`, `formatMs(ms: number): string`
  - `lastTicks(actions): number`, `withKeyTap(actions, keycode, gap: number, hold: number): MacroAction[]` (ticks), `sortByTime(actions): MacroAction[]`, `replaceAction(actions, index, patch: Partial<MacroAction>): MacroAction[]`, `removeAction(actions, index): MacroAction[]`, `hasRoom(actions, count: number, limit: number): boolean`
  - `BROWSER_KEYCODES: ReadonlyMap<string, Keycode>`, `hidKeycodeOf(code: string): Keycode | null`
  - `interface Recording { startedAt; baseTicks; pollingRate; limit; held: readonly Keycode[]; skipped: number; full: boolean }`, `interface RecordedKey { code: string; repeat: boolean; now: number }`, `interface RecordingStep { recording: Recording; actions: readonly MacroAction[] }`, `startRecording(actions, now, pollingRate, limit): Recording`, `recordKeyDown(recording, actions, key: RecordedKey): RecordingStep`, `recordKeyUp(recording, actions, key: Omit<RecordedKey, 'repeat'>): RecordingStep`, `stopRecording(recording, actions, now): RecordingStep` (steps return the same `actions` array when nothing changed)
  - `MACRO_KEY_CATEGORIES: readonly ActionCategory[]` (the Dynamic Keys catalog without "None"), `macroKeyName(keycode: Keycode): string`

- [ ] **Step 1: Write the failing tests**

`src/features/macros/model/timing.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatMs, msToTicks, ticksToMs } from './timing';

describe('macro timing', () => {
  it('converts ticks to milliseconds at the polling rate', () => {
    expect(ticksToMs(400, 8000)).toBe(50);
    expect(ticksToMs(1, 8000)).toBe(0.125);
    expect(ticksToMs(50, 1000)).toBe(50);
    // A model without a polling rate ticks at the controller default, 1000 Hz.
    expect(ticksToMs(5, 0)).toBe(5);
  });

  it('rounds milliseconds to the nearest tick, within 0..u32', () => {
    expect(msToTicks(50, 8000)).toBe(400);
    expect(msToTicks(0.1, 8000)).toBe(1);
    expect(msToTicks(20, 1000)).toBe(20);
    expect(msToTicks(-3, 1000)).toBe(0);
    expect(msToTicks(Number.NaN, 1000)).toBe(0);
    expect(msToTicks(1e12, 8000)).toBe(0xffffffff);
  });

  it('shows at most three decimals', () => {
    expect(formatMs(0.125)).toBe('0.125');
    expect(formatMs(50)).toBe('50');
    expect(formatMs(1 / 3)).toBe('0.333');
  });
});
```

`src/features/macros/model/actions.test.ts`:

```ts
import { Keycode } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import type { MacroAction } from '../../device/model/types';
import { hasRoom, lastTicks, removeAction, replaceAction, sortByTime, withKeyTap } from './actions';

const press = (delay: number, keycode: number = Keycode.A): MacroAction => ({
  delay,
  keycode,
  event: 'down',
  isVirtual: true,
  keyId: 0,
});

describe('macro actions', () => {
  it('find the time of the latest action', () => {
    expect(lastTicks([press(100), press(40)])).toBe(100);
    expect(lastTicks([])).toBe(0);
  });

  it('add a virtual press and release of a key after the latest action', () => {
    expect(withKeyTap([press(100), press(40)], Keycode.B, 400, 160)).toEqual([
      press(100),
      press(40),
      { delay: 500, keycode: Keycode.B, event: 'down', isVirtual: true, keyId: 0 },
      { delay: 660, keycode: Keycode.B, event: 'up', isVirtual: true, keyId: 0 },
    ]);
    expect(withKeyTap([], Keycode.A, 400, 160).map(action => action.delay)).toEqual([400, 560]);
  });

  it('sort by time, keeping the order of actions at the same time', () => {
    const late = press(300, Keycode.C);
    const first = press(100, Keycode.A);
    const second = press(100, Keycode.B);
    expect(sortByTime([late, first, second])).toEqual([first, second, late]);
  });

  it('replace one field of one action and remove actions', () => {
    expect(replaceAction([press(0), press(8)], 1, { event: 'up' })).toEqual([
      press(0),
      { ...press(8), event: 'up' },
    ]);
    expect(removeAction([press(0), press(8)], 0)).toEqual([press(8)]);
  });

  it('tell whether more actions fit', () => {
    const actions = (count: number) => Array.from({ length: count }, () => press(0));
    expect(hasRoom(actions(125), 2, 127)).toBe(true);
    expect(hasRoom(actions(126), 2, 127)).toBe(false);
    expect(hasRoom([], 2, 0)).toBe(false);
  });
});
```

`src/features/macros/model/browser-keys.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BROWSER_KEYCODES, hidKeycodeOf } from './browser-keys';

describe('browser keys', () => {
  it('map letters, digits, function keys and the numpad to their HID usages', () => {
    expect(hidKeycodeOf('KeyA')).toBe(0x04);
    expect(hidKeycodeOf('KeyZ')).toBe(0x1d);
    expect(hidKeycodeOf('Digit1')).toBe(0x1e);
    expect(hidKeycodeOf('Digit0')).toBe(0x27);
    expect(hidKeycodeOf('F1')).toBe(0x3a);
    expect(hidKeycodeOf('F12')).toBe(0x45);
    expect(hidKeycodeOf('F13')).toBe(0x68);
    expect(hidKeycodeOf('F24')).toBe(0x73);
    expect(hidKeycodeOf('Numpad1')).toBe(0x59);
    expect(hidKeycodeOf('Numpad0')).toBe(0x62);
    expect(hidKeycodeOf('NumpadEnter')).toBe(0x58);
  });

  it('map the other keys of the keyboard page', () => {
    expect(hidKeycodeOf('Space')).toBe(0x2c);
    expect(hidKeycodeOf('Quote')).toBe(0x34);
    expect(hidKeycodeOf('Backquote')).toBe(0x35);
    expect(hidKeycodeOf('IntlBackslash')).toBe(0x64);
    expect(hidKeycodeOf('ArrowUp')).toBe(0x52);
    expect(hidKeycodeOf('ContextMenu')).toBe(0x65);
    expect(hidKeycodeOf('AudioVolumeMute')).toBe(0x7f);
    expect(hidKeycodeOf('Lang1')).toBe(0x90);
  });

  it('map modifiers to libamp modifier-only keycodes', () => {
    expect(hidKeycodeOf('ControlLeft')).toBe(0x0100);
    expect(hidKeycodeOf('ShiftLeft')).toBe(0x0200);
    expect(hidKeycodeOf('AltRight')).toBe(0x4000);
    expect(hidKeycodeOf('MetaRight')).toBe(0x8000);
  });

  it('have no keycode for keys without a HID usage', () => {
    for (const code of ['', 'Fn', 'BrowserBack', 'MediaPlayPause', 'Unidentified', 'constructor']) {
      expect(hidKeycodeOf(code), code).toBeNull();
    }
  });

  it('give every key its own keycode', () => {
    expect(new Set(BROWSER_KEYCODES.values()).size).toBe(BROWSER_KEYCODES.size);
  });
});
```

`src/features/macros/model/recorder.test.ts`:

```ts
import { Keycode } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import type { MacroAction } from '../../device/model/types';
import {
  recordKeyDown,
  recordKeyUp,
  startRecording,
  stopRecording,
  type RecordingStep,
} from './recorder';

const RATE = 8000;
const LIMIT = 127;

const recorded = (delay: number, keycode: number, event: 'down' | 'up'): MacroAction => ({
  delay,
  keycode,
  event,
  isVirtual: true,
  keyId: 0,
});

function down(step: RecordingStep, code: string, now: number, repeat = false): RecordingStep {
  return recordKeyDown(step.recording, step.actions, { code, now, repeat });
}

function up(step: RecordingStep, code: string, now: number): RecordingStep {
  return recordKeyUp(step.recording, step.actions, { code, now });
}

function start(actions: readonly MacroAction[] = [], limit = LIMIT): RecordingStep {
  return { recording: startRecording(actions, 1000, RATE, limit), actions };
}

describe('macro recorder', () => {
  it('records presses and releases as virtual actions timed from the start', () => {
    let step = start();
    step = down(step, 'KeyA', 1100);
    step = up(step, 'KeyA', 1180);
    expect(step.actions).toEqual([
      recorded(800, Keycode.A, 'down'),
      recorded(1440, Keycode.A, 'up'),
    ]);
    expect(step.recording.held).toEqual([]);
  });

  it('continues after the latest action of the slot', () => {
    const existing = [recorded(4000, Keycode.B, 'down')];
    const step = down(start(existing), 'KeyA', 1100);
    expect(step.actions.at(-1)).toEqual(recorded(4800, Keycode.A, 'down'));
  });

  it('ignores repeated keydowns of a held key', () => {
    let step = down(start(), 'KeyA', 1100);
    const held = step;
    step = down(step, 'KeyA', 1150, true);
    step = down(step, 'KeyA', 1160);
    expect(step.actions).toBe(held.actions);
  });

  it('skips and counts presses of keys without a HID keycode', () => {
    let step = down(start(), 'Fn', 1100);
    step = down(step, 'BrowserBack', 1110);
    step = down(step, 'BrowserBack', 1120, true);
    expect(step.actions).toEqual([]);
    expect(step.recording.skipped).toBe(2);
  });

  it('ignores releases of keys it did not see pressed', () => {
    const before = start();
    expect(up(before, 'KeyA', 1100).actions).toBe(before.actions);
  });

  it('stops when the slot is full, releasing the keys still held', () => {
    let step = start([], 4);
    step = down(step, 'KeyA', 1100);
    step = down(step, 'KeyB', 1200);
    step = down(step, 'KeyC', 1300);
    expect(step.recording.full).toBe(true);
    expect(step.actions).toEqual([
      recorded(800, Keycode.A, 'down'),
      recorded(1600, Keycode.B, 'down'),
      recorded(2400, Keycode.A, 'up'),
      recorded(2400, Keycode.B, 'up'),
    ]);
    expect(down(step, 'KeyD', 1400).actions).toBe(step.actions);
  });

  it('releases the held keys when it stops', () => {
    const step = down(start(), 'ShiftLeft', 1100);
    const stopped = stopRecording(step.recording, step.actions, 1250);
    expect(stopped.actions.at(-1)).toEqual(recorded(2000, 0x0200, 'up'));
    expect(stopped.recording.held).toEqual([]);
    const idle = start();
    expect(stopRecording(idle.recording, idle.actions, 1300).actions).toBe(idle.actions);
  });
});
```

`src/features/macros/model/key-picker.test.ts`:

```ts
import { Keycode, KeyModifier } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import { ACTION_CATEGORIES, kc } from '../../keycodes';
import { MACRO_KEY_CATEGORIES, macroKeyName } from './key-picker';

describe('macro key picker', () => {
  it('offers the Dynamic Keys catalog without "None" (keycode 0 ends a macro)', () => {
    expect(MACRO_KEY_CATEGORIES.map(category => category.name)).toEqual(
      ACTION_CATEGORIES.map(category => category.name)
    );
    const keycodes = MACRO_KEY_CATEGORIES.flatMap(category =>
      category.actions.map(action => action.keycode)
    );
    expect(keycodes).not.toContain(0);
    expect(keycodes).toContain(Keycode.A);
  });

  it('names keys by the picker, else by their keycap with modifiers, else in hex', () => {
    expect(macroKeyName(Keycode.A)).toBe('A');
    expect(macroKeyName(kc.modifier(KeyModifier.KeyLeftShift))).toBe('Left Shift');
    expect(macroKeyName(kc.withModifiers(Keycode.C, KeyModifier.KeyLeftCtrl))).toBe('Left Ctrl C');
    expect(macroKeyName(0x00b5)).toBe('0x00B5');
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/macros/model`
Expected: FAIL ("Cannot find module './timing'" and the others).

- [ ] **Step 3: Implement the timing and the edits**

`src/features/macros/model/timing.ts`:

```ts
/**
 * Macro timing (libamp `macro.c`): an action's delay is in ticks from the start of the macro, and
 * the keyboard ticks at its polling rate. The page shows and takes milliseconds.
 */
const U32 = 0xffffffff;

/** The controller's default when a model declares no polling rate (`Feature.polling_rate`). */
export const DEFAULT_POLLING_RATE = 1000;

function ticksPerSecond(pollingRate: number): number {
  return Number.isFinite(pollingRate) && pollingRate > 0 ? pollingRate : DEFAULT_POLLING_RATE;
}

export function ticksToMs(ticks: number, pollingRate: number): number {
  return (ticks * 1000) / ticksPerSecond(pollingRate);
}

/** The nearest whole tick; negative and non-finite times are 0 (delays are u32). */
export function msToTicks(ms: number, pollingRate: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.min(Math.round((ms * ticksPerSecond(pollingRate)) / 1000), U32);
}

/** At most three decimals: a tick of an 8 kHz keyboard is 0.125 ms. */
export function formatMs(ms: number): string {
  return String(Math.round(ms * 1000) / 1000);
}
```

`src/features/macros/model/actions.ts`:

```ts
/**
 * Edits of a macro slot's actions (delays in ticks). The list is in the order the keyboard plays
 * it: libamp plays actions by index, each when its time has come, so editing a time does not move
 * the action; `sortByTime` does.
 */
import type { Keycode, MacroAction } from '../../device/model/types';

/** The time of the latest action; 0 without actions. */
export function lastTicks(actions: readonly MacroAction[]): number {
  return actions.reduce((latest, action) => Math.max(latest, action.delay), 0);
}

/**
 * A press of `keycode` `gap` ticks after the latest action and its release `hold` ticks later,
 * both virtual (from no physical key, key ID 0) like recorded events.
 */
export function withKeyTap(
  actions: readonly MacroAction[],
  keycode: Keycode,
  gap: number,
  hold: number
): MacroAction[] {
  const press = lastTicks(actions) + gap;
  return [
    ...actions,
    { delay: press, keycode, event: 'down', isVirtual: true, keyId: 0 },
    { delay: press + hold, keycode, event: 'up', isVirtual: true, keyId: 0 },
  ];
}

/** Ordered by time; actions at the same time keep their order. */
export function sortByTime(actions: readonly MacroAction[]): MacroAction[] {
  return actions.toSorted((a, b) => a.delay - b.delay);
}

export function replaceAction(
  actions: readonly MacroAction[],
  index: number,
  patch: Partial<MacroAction>
): MacroAction[] {
  return actions.map((action, at) => (at === index ? { ...action, ...patch } : action));
}

export function removeAction(actions: readonly MacroAction[], index: number): MacroAction[] {
  return actions.filter((_, at) => at !== index);
}

/** Whether `count` more actions fit into a slot of `limit` actions. */
export function hasRoom(actions: readonly MacroAction[], count: number, limit: number): boolean {
  return actions.length + count <= limit;
}
```

- [ ] **Step 4: Implement the browser key table**

`src/features/macros/model/browser-keys.ts`:

```ts
/**
 * Browser keys (`KeyboardEvent.code`, UI Events) and the keycodes libamp plays for them: HID
 * Keyboard/Keypad usages (page 0x07) and libamp's modifier-only keycodes (`mask << 8`). Keys
 * without a HID usage (Fn, media and browser keys) are missing: the recorder skips them.
 */
import { Keycode as EmiKeycode, KeyModifier } from 'emi-keyboard-controller';
import type { Keycode } from '../../device/model/types';
import { kc } from '../../keycodes';

type Entry = readonly [code: string, usage: number];

const LETTERS = Array.from(
  { length: 26 },
  (_, index): Entry => [`Key${String.fromCharCode(0x41 + index)}`, EmiKeycode.A + index]
);

const DIGITS: readonly Entry[] = [
  ...Array.from({ length: 9 }, (_, index): Entry => [`Digit${index + 1}`, EmiKeycode.Key1 + index]),
  ['Digit0', EmiKeycode.Key0],
];

const FUNCTION_KEYS: readonly Entry[] = [
  ...Array.from({ length: 12 }, (_, index): Entry => [`F${index + 1}`, EmiKeycode.F1 + index]),
  ...Array.from({ length: 12 }, (_, index): Entry => [`F${index + 13}`, EmiKeycode.F13 + index]),
];

const NUMPAD_DIGITS: readonly Entry[] = [
  ...Array.from(
    { length: 9 },
    (_, index): Entry => [`Numpad${index + 1}`, EmiKeycode.Keypad1 + index]
  ),
  ['Numpad0', EmiKeycode.Keypad0],
];

const OTHER_KEYS: readonly Entry[] = [
  ['Enter', EmiKeycode.Enter],
  ['Escape', EmiKeycode.Escape],
  ['Backspace', EmiKeycode.Backspace],
  ['Tab', EmiKeycode.Tab],
  ['Space', EmiKeycode.Spacebar],
  ['Minus', EmiKeycode.Minus],
  ['Equal', EmiKeycode.Equal],
  ['BracketLeft', EmiKeycode.LeftBrace],
  ['BracketRight', EmiKeycode.RightBrace],
  ['Backslash', EmiKeycode.Backslash],
  ['Semicolon', EmiKeycode.Semicolon],
  ['Quote', EmiKeycode.Apostrophe],
  ['Backquote', EmiKeycode.Grave],
  ['Comma', EmiKeycode.Comma],
  ['Period', EmiKeycode.Dot],
  ['Slash', EmiKeycode.Slash],
  ['CapsLock', EmiKeycode.CapsLock],
  ['PrintScreen', EmiKeycode.PrintScreen],
  ['ScrollLock', EmiKeycode.ScrollLock],
  ['Pause', EmiKeycode.Pause],
  ['Insert', EmiKeycode.Insert],
  ['Home', EmiKeycode.Home],
  ['PageUp', EmiKeycode.PageUp],
  ['Delete', EmiKeycode.Delete],
  ['End', EmiKeycode.End],
  ['PageDown', EmiKeycode.PageDown],
  ['ArrowRight', EmiKeycode.RightArrow],
  ['ArrowLeft', EmiKeycode.LeftArrow],
  ['ArrowDown', EmiKeycode.DownArrow],
  ['ArrowUp', EmiKeycode.UpArrow],
  ['NumLock', EmiKeycode.NumLock],
  ['NumpadDivide', EmiKeycode.KeypadDivide],
  ['NumpadMultiply', EmiKeycode.KeypadMultiply],
  ['NumpadSubtract', EmiKeycode.KeypadMinus],
  ['NumpadAdd', EmiKeycode.KeypadPlus],
  ['NumpadEnter', EmiKeycode.KeypadEnter],
  ['NumpadDecimal', EmiKeycode.KeypadDot],
  ['NumpadEqual', EmiKeycode.KeypadEqual],
  ['NumpadComma', EmiKeycode.KeypadComma],
  ['IntlBackslash', EmiKeycode.NonUsBackslash],
  ['ContextMenu', EmiKeycode.Application],
  ['Power', EmiKeycode.Power],
  ['Help', EmiKeycode.Help],
  ['Again', EmiKeycode.Again],
  ['Undo', EmiKeycode.Undo],
  ['Cut', EmiKeycode.Cut],
  ['Copy', EmiKeycode.Copy],
  ['Paste', EmiKeycode.Paste],
  ['Find', EmiKeycode.Find],
  ['AudioVolumeMute', EmiKeycode.Mute],
  ['AudioVolumeUp', EmiKeycode.VolumeUp],
  ['AudioVolumeDown', EmiKeycode.VolumeDown],
  ['IntlRo', EmiKeycode.Intl1],
  ['KanaMode', EmiKeycode.Intl2],
  ['IntlYen', EmiKeycode.Intl3],
  ['Convert', EmiKeycode.Intl4],
  ['NonConvert', EmiKeycode.Intl5],
  ['Lang1', EmiKeycode.Lang1],
  ['Lang2', EmiKeycode.Lang2],
  ['Lang3', EmiKeycode.Lang3],
  ['Lang4', EmiKeycode.Lang4],
  ['Lang5', EmiKeycode.Lang5],
];

const MODIFIERS: readonly (readonly [code: string, mask: KeyModifier])[] = [
  ['ControlLeft', KeyModifier.KeyLeftCtrl],
  ['ShiftLeft', KeyModifier.KeyLeftShift],
  ['AltLeft', KeyModifier.KeyLeftAlt],
  ['MetaLeft', KeyModifier.KeyLeftGui],
  ['ControlRight', KeyModifier.KeyRightCtrl],
  ['ShiftRight', KeyModifier.KeyRightShift],
  ['AltRight', KeyModifier.KeyRightAlt],
  ['MetaRight', KeyModifier.KeyRightGui],
];

/** `KeyboardEvent.code` → the keycode the recorder records. */
export const BROWSER_KEYCODES: ReadonlyMap<string, Keycode> = new Map<string, Keycode>([
  ...[...LETTERS, ...DIGITS, ...FUNCTION_KEYS, ...NUMPAD_DIGITS, ...OTHER_KEYS].map(
    ([code, usage]): [string, Keycode] => [code, kc.key(usage)]
  ),
  ...MODIFIERS.map(([code, mask]): [string, Keycode] => [code, kc.modifier(mask)]),
]);

/** The keycode of a browser key, or null when it has no HID usage. */
export function hidKeycodeOf(code: string): Keycode | null {
  return BROWSER_KEYCODES.get(code) ?? null;
}
```

- [ ] **Step 5: Implement the recorder and the key picker catalog**

`src/features/macros/model/recorder.ts`:

```ts
/**
 * Recording a macro from this computer's keyboard: browser key events become virtual actions with
 * key ID 0, as upstream records them, timed from the moment recording started and continuing
 * after the slot's latest action. Each press keeps room for its release, and stopping releases
 * the keys still held, so playback never leaves a key stuck. Pure: the page passes the events and
 * `performance.now()`.
 */
import type { Keycode, MacroAction, MacroEvent } from '../../device/model/types';
import { lastTicks } from './actions';
import { hidKeycodeOf } from './browser-keys';
import { msToTicks } from './timing';

export interface Recording {
  /** `performance.now()` when recording started. */
  readonly startedAt: number;
  /** The slot's latest action time when recording started: recorded times continue from it. */
  readonly baseTicks: number;
  readonly pollingRate: number;
  /** The most actions the slot holds. */
  readonly limit: number;
  /** Keys pressed and not released yet. */
  readonly held: readonly Keycode[];
  /** Presses of keys without a HID keycode, which were not recorded. */
  readonly skipped: number;
  /** Recording ended because the slot is full. */
  readonly full: boolean;
}

export interface RecordedKey {
  /** `KeyboardEvent.code`. */
  readonly code: string;
  /** An auto-repeated keydown (`KeyboardEvent.repeat`). */
  readonly repeat: boolean;
  /** `performance.now()` of the event. */
  readonly now: number;
}

/** A recording and the slot's actions after an event; `actions` is unchanged when nothing was recorded. */
export interface RecordingStep {
  readonly recording: Recording;
  readonly actions: readonly MacroAction[];
}

export function startRecording(
  actions: readonly MacroAction[],
  now: number,
  pollingRate: number,
  limit: number
): Recording {
  return {
    startedAt: now,
    baseTicks: lastTicks(actions),
    pollingRate,
    limit,
    held: [],
    skipped: 0,
    full: false,
  };
}

function recordedAction(
  recording: Recording,
  keycode: Keycode,
  event: MacroEvent,
  now: number
): MacroAction {
  return {
    delay: recording.baseTicks + msToTicks(now - recording.startedAt, recording.pollingRate),
    keycode,
    event,
    isVirtual: true,
    keyId: 0,
  };
}

/** Releases the keys still held. */
export function stopRecording(
  recording: Recording,
  actions: readonly MacroAction[],
  now: number
): RecordingStep {
  if (recording.held.length === 0) return { recording, actions };
  return {
    recording: { ...recording, held: [] },
    actions: [
      ...actions,
      ...recording.held.map(keycode => recordedAction(recording, keycode, 'up', now)),
    ],
  };
}

/** A press: recorded unless it repeats a held key; when the slot is full, recording ends. */
export function recordKeyDown(
  recording: Recording,
  actions: readonly MacroAction[],
  key: RecordedKey
): RecordingStep {
  if (key.repeat || recording.full) return { recording, actions };
  const keycode = hidKeycodeOf(key.code);
  if (keycode === null) {
    return { recording: { ...recording, skipped: recording.skipped + 1 }, actions };
  }
  if (recording.held.includes(keycode)) return { recording, actions };
  // Room for this press and its release, and for the releases of the keys still held.
  if (actions.length + recording.held.length + 2 > recording.limit) {
    const stopped = stopRecording(recording, actions, key.now);
    return { recording: { ...stopped.recording, full: true }, actions: stopped.actions };
  }
  return {
    recording: { ...recording, held: [...recording.held, keycode] },
    actions: [...actions, recordedAction(recording, keycode, 'down', key.now)],
  };
}

/** A release of a held key. */
export function recordKeyUp(
  recording: Recording,
  actions: readonly MacroAction[],
  key: Omit<RecordedKey, 'repeat'>
): RecordingStep {
  const keycode = hidKeycodeOf(key.code);
  if (recording.full || keycode === null || !recording.held.includes(keycode)) {
    return { recording, actions };
  }
  return {
    recording: { ...recording, held: recording.held.filter(held => held !== keycode) },
    actions: [...actions, recordedAction(recording, keycode, 'up', key.now)],
  };
}
```

`src/features/macros/model/key-picker.ts`:

```ts
/** The keys a macro action can play, and their names in the action table. */
import type { Keycode } from '../../device/model/types';
import { ACTION_CATEGORIES, describeKeycode, findAction, type ActionCategory } from '../../keycodes';

/** The Dynamic Keys picker's catalog without "None": keycode 0 ends a macro (`macro_process`). */
export const MACRO_KEY_CATEGORIES: readonly ActionCategory[] = ACTION_CATEGORIES.map(category => ({
  ...category,
  actions: category.actions.filter(action => action.keycode !== 0),
}));

/** The picker's name of a key, else its keycap name with modifiers, else its keycode in hex. */
export function macroKeyName(keycode: Keycode): string {
  const action = findAction(keycode);
  if (action) return action.name;
  const { main, sub } = describeKeycode(keycode);
  const name = [sub.trim(), main.trim()].filter(part => part !== '').join(' ');
  return name || `0x${keycode.toString(16).toUpperCase().padStart(4, '0')}`;
}
```

`src/features/macros/model/index.ts`:

```ts
export { DEFAULT_POLLING_RATE, formatMs, msToTicks, ticksToMs } from './timing';
export {
  hasRoom,
  lastTicks,
  removeAction,
  replaceAction,
  sortByTime,
  withKeyTap,
} from './actions';
export { BROWSER_KEYCODES, hidKeycodeOf } from './browser-keys';
export {
  recordKeyDown,
  recordKeyUp,
  startRecording,
  stopRecording,
  type RecordedKey,
  type Recording,
  type RecordingStep,
} from './recorder';
export { MACRO_KEY_CATEGORIES, macroKeyName } from './key-picker';
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/features/macros/model`
Expected: PASS.

- [ ] **Step 7: Check and commit**

Run: `npm run typecheck && npx eslint src/features/macros && npx prettier --check src/features/macros`
Expected: no errors.

```bash
git add src/features/macros/model
git commit -m "feat(macros): model macro timing, edits, browser keys and recording"
```

---

### Task 6: The Macros page

The page and its components, reachable from Task 10 on. It edits the staged macros through `deviceSession.setMacro`, reading the slot from the store at the time of each edit (two inputs can arrive before the next render, as on the Lighting page).

**Files:**
- Create: `src/components/ui/UnsupportedFeature.tsx`, `src/components/ui/UnsupportedFeature.test.tsx`; Modify: `src/components/ui/index.ts`
- Create: `src/features/macros/commands.ts`
- Create: `src/features/macros/hooks/use-macro-recorder.ts`
- Create: `src/features/macros/components/styles.ts`, `MsInput.tsx`, `MacroKeyPicker.tsx`, `MacroSlots.tsx`, `AddKeyForm.tsx`, `ActionTable.tsx`, `MacroEditor.tsx`
- Create: `src/features/macros/MacrosPage.tsx`, `src/features/macros/MacrosPage.test.tsx`, `src/features/macros/index.ts`
- Modify: `src/lib/i18n/en.ts`, `zh.ts`, `i18n.test.tsx`

**Interfaces:**
- Consumes: `deviceSession.setMacro`, `useFeatureFlags`, `useDeviceStore`, `useDeviceLoads`, `supportsMacros`, `macroActionLimit` (Tasks 2–3); `KeycodePicker`, `Modal` `'3xl'` (Task 3); `macros.slot` (Task 4); the Task 5 model.
- Produces: `MacrosPage` (`features/macros` index); `UnsupportedFeature({ message })` (`components/ui`); translation keys `macros.*` below.

- [ ] **Step 1: Write the failing tests**

`src/components/ui/UnsupportedFeature.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UnsupportedFeature } from './UnsupportedFeature';

describe('UnsupportedFeature', () => {
  it('names what the keyboard does not support, with a decorative icon', () => {
    const { container } = render(
      <UnsupportedFeature message="This keyboard does not support macros" />
    );
    expect(
      screen.getByRole('heading', { name: 'This keyboard does not support macros' })
    ).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
```

`src/features/macros/MacrosPage.test.tsx`:

```tsx
/**
 * Macros page against the real device layer: the app's `deviceSession` connected to a virtual
 * Trinity Pad, whose controller declares 4 macro slots of 128 entries at 8000 Hz (a tick is
 * 0.125 ms). Macro edits are staged; they reach the keyboard on Save.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Keycode } from 'emi-keyboard-controller';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { connectVirtualKeyboard, type ConnectedKeyboard } from '../../testing/app-keyboard';
import { deviceSession, deviceStore, type MacroAction } from '../device';
import { MacrosPage } from './MacrosPage';

/** libamp's modifier-only keycode of Left Shift. */
const LEFT_SHIFT = 0x0200;

function action(delay: number, keycode: number, event: 'down' | 'up'): MacroAction {
  return { delay, keycode, event, isVirtual: true, keyId: 0 };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MacrosPage />
    </MemoryRouter>
  );
}

/** A slot as the store has it. */
function macro(slot = 0): readonly MacroAction[] | undefined {
  return deviceStore.getState().config?.macros[slot];
}

/** The action rows of the table, without its header row. */
function rows(): HTMLElement[] {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1);
}

/** Dispatches a key event on the window like a physical key; returns whether it was cancelled. */
function key(type: 'keydown' | 'keyup', code: string, repeat = false): boolean {
  const event = new KeyboardEvent(type, { code, repeat, bubbles: true, cancelable: true });
  fireEvent(window, event);
  return event.defaultPrevented;
}

it('renders nothing until a keyboard configuration is loaded', () => {
  const { container } = renderPage();
  expect(container).toBeEmptyDOMElement();
});

it('says when the keyboard does not support macros (Zellia Starlight)', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false });
  onTestFinished(keyboard.dispose);

  renderPage();

  expect(
    screen.getByRole('heading', { name: 'This keyboard does not support macros' })
  ).toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Macro slots' })).not.toBeInTheDocument();
});

// Page renders and role queries are slow in jsdom on a busy machine.
describe('MacrosPage (Trinity Pad)', { timeout: 20_000 }, () => {
  let keyboard: ConnectedKeyboard;

  beforeEach(async () => {
    // The vendored controller logs every load step.
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    keyboard = await connectVirtualKeyboard({ model: 'trinity-pad', seedDynamicKeys: false });
  });

  afterEach(() => {
    keyboard.dispose();
  });

  it('shows the slots with their action counts and the chosen slot with its limit', async () => {
    deviceSession.setMacro(1, [action(0, Keycode.A, 'down')]);
    const user = userEvent.setup();
    renderPage();

    const slots = within(screen.getByRole('group', { name: 'Macro slots' })).getAllByRole(
      'button'
    );
    expect(slots.map(slot => slot.textContent)).toEqual([
      'Macro 1 0 actions',
      'Macro 2 1 action',
      'Macro 3 0 actions',
      'Macro 4 0 actions',
    ]);
    expect(slots[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('0 / 127 actions')).toBeInTheDocument();
    expect(
      screen.getByText('This macro has no actions yet. Record them or add keys.')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Macro 2 1 action' }));

    expect(screen.getByText('1 / 127 actions')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Macro 2' })).toBeInTheDocument();
    expect(rows()).toHaveLength(1);
  });

  it('adds a press and a release of a chosen key after the last action', async () => {
    deviceSession.setMacro(0, [action(0, Keycode.A, 'down'), action(160, Keycode.A, 'up')]);
    const user = userEvent.setup();
    renderPage();

    const after = screen.getByLabelText('After (ms)');
    expect(after).toHaveValue(50);
    expect(screen.getByLabelText('Hold (ms)')).toHaveValue(20);
    fireEvent.change(after, { target: { value: '12.5' } });
    await user.click(screen.getByRole('button', { name: 'Add key' }));
    const dialog = screen.getByRole('dialog', { name: 'Choose a key' });
    // Keycode 0 ends a macro: the picker has no "None".
    expect(within(dialog).queryByRole('button', { name: 'None' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'B' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // 12.5 ms and 20 ms at 8000 Hz: 100 ticks after the last action, released 160 ticks later.
    expect(macro()).toEqual([
      action(0, Keycode.A, 'down'),
      action(160, Keycode.A, 'up'),
      action(260, Keycode.B, 'down'),
      action(420, Keycode.B, 'up'),
    ]);
    expect(deviceStore.getState().unsaved).toBe(true);
    expect(screen.getByLabelText('Time of action 3')).toHaveValue(32.5);
    expect(screen.getByLabelText('Time of action 4')).toHaveValue(52.5);
    expect(screen.getByText('4 / 127 actions')).toBeInTheDocument();
  });

  it('edits the time, the key, the event and the virtual flag in place', async () => {
    deviceSession.setMacro(0, [action(0, Keycode.A, 'down'), action(400, Keycode.A, 'up')]);
    const user = userEvent.setup();
    renderPage();

    const second = screen.getByLabelText('Time of action 2');
    expect(second).toHaveValue(50);
    fireEvent.change(second, { target: { value: '20' } });
    fireEvent.keyDown(second, { key: 'Enter' });
    expect(macro()?.[1]?.delay).toBe(160);

    // Times snap to the keyboard's ticks (0.125 ms at 8000 Hz); an emptied field changes nothing.
    const first = screen.getByLabelText('Time of action 1');
    fireEvent.change(first, { target: { value: '0.1' } });
    fireEvent.blur(first);
    expect(macro()?.[0]?.delay).toBe(1);
    expect(first).toHaveValue(0.125);
    fireEvent.change(first, { target: { value: '' } });
    fireEvent.blur(first);
    expect(macro()?.[0]?.delay).toBe(1);
    expect(first).toHaveValue(0.125);

    await user.selectOptions(screen.getByLabelText('Event of action 1'), 'Release');
    expect(macro()?.[0]?.event).toBe('up');

    await user.click(screen.getByRole('switch', { name: 'Action 2 is virtual' }));
    expect(macro()?.[1]?.isVirtual).toBe(false);

    const keyButton = within(rows()[1] ?? document.body).getByRole('button', { name: 'A' });
    expect(keyButton).toHaveAccessibleDescription('Change the key');
    await user.click(keyButton);
    await user.click(
      within(screen.getByRole('dialog', { name: 'Choose a key' })).getByRole('button', {
        name: 'Left Shift',
      })
    );
    expect(macro()?.[1]).toEqual({
      delay: 160,
      keycode: LEFT_SHIFT,
      event: 'up',
      isVirtual: false,
      keyId: 0,
    });
    expect(
      within(rows()[1] ?? document.body).getByRole('button', { name: 'Left Shift' })
    ).toBeInTheDocument();
  });

  it('deletes actions, sorts them by time and clears the macro after a confirmation', async () => {
    deviceSession.setMacro(0, [
      action(400, Keycode.B, 'down'),
      action(0, Keycode.A, 'down'),
      action(800, Keycode.A, 'up'),
      action(900, Keycode.B, 'up'),
    ]);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Sort by time' }));
    expect(macro()?.map(entry => entry.delay)).toEqual([0, 400, 800, 900]);

    await user.click(screen.getByRole('button', { name: 'Delete action 2' }));
    expect(macro()).toEqual([
      action(0, Keycode.A, 'down'),
      action(800, Keycode.A, 'up'),
      action(900, Keycode.B, 'up'),
    ]);

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    const dialog = screen.getByRole('dialog', { name: 'Clear Macro 1?' });
    expect(dialog).toHaveAccessibleDescription('Every action of this macro will be removed.');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(macro()).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Clear Macro 1?' })).getByRole('button', {
        name: 'Clear',
      })
    );
    expect(macro()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sort by time' })).toBeDisabled();
  });

  it('records key presses and releases with their timing until Stop', async () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Record' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      "Recording: press keys on this computer's keyboard. Mouse buttons are not recorded."
    );
    expect(screen.getByRole('button', { name: 'Macro 2 0 actions' })).toBeDisabled();

    now.mockReturnValue(1100);
    expect(key('keydown', 'ShiftLeft')).toBe(true);
    now.mockReturnValue(1150);
    expect(key('keydown', 'ShiftLeft', true)).toBe(true); // auto-repeat: not recorded
    expect(key('keydown', 'KeyA')).toBe(true);
    expect(key('keydown', 'BrowserBack')).toBe(true); // no HID keycode: skipped
    now.mockReturnValue(1200);
    expect(key('keyup', 'KeyA')).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent('1 key could not be recorded.');

    now.mockReturnValue(1300);
    await user.click(screen.getByRole('button', { name: 'Stop' }));

    // Ticks from the start of the recording; the key still held is released at Stop.
    expect(macro()).toEqual([
      action(800, LEFT_SHIFT, 'down'),
      action(1200, Keycode.A, 'down'),
      action(1600, Keycode.A, 'up'),
      action(2400, LEFT_SHIFT, 'up'),
    ]);
    expect(screen.getByRole('status')).toHaveTextContent('1 key could not be recorded.');
    expect(key('keydown', 'KeyB')).toBe(false);
    expect(macro()).toHaveLength(4);
  });

  it('stops recording when the macro is full, releasing the keys still held', async () => {
    const filler = Array.from({ length: 125 }, (_, index) =>
      action(index, Keycode.Z, index % 2 === 0 ? 'down' : 'up')
    );
    deviceSession.setMacro(0, filler);
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText('125 / 127 actions')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Record' }));
    now.mockReturnValue(1100);
    key('keydown', 'KeyA');
    now.mockReturnValue(1200);
    // B and its release no longer fit next to A's release: the recording ends with A released.
    key('keydown', 'KeyB');

    expect(macro()?.slice(125)).toEqual([
      action(124 + 800, Keycode.A, 'down'),
      action(124 + 1600, Keycode.A, 'up'),
    ]);
    expect(screen.getByText('127 / 127 actions')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('The macro is full.');
    expect(screen.getByRole('button', { name: 'Record' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add key' })).toBeDisabled();
  });
});
```

`src/lib/i18n/i18n.test.tsx`: in the key-count test add the comment line `// + 34: the Macros page (macros and scripts spec).` and add 34 to the number in `toHaveLength(…)`. Add:

```ts
  it('add the Macros page copy (macros and scripts spec)', () => {
    expect(en).toMatchObject({
      'macros.title': 'Macros',
      'macros.limit': '{0} / {1} actions',
      'macros.skipped': '{0} keys could not be recorded.',
      'macros.unsupported': 'This keyboard does not support macros',
    });
    expect(zh).toMatchObject({
      'macros.title': '宏',
      'macros.press': '按下',
      'macros.release': '释放',
      'macros.unsupported': '此键盘不支持宏',
    });
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/components/ui/UnsupportedFeature.test.tsx src/features/macros src/lib/i18n`
Expected: FAIL ("Cannot find module './UnsupportedFeature'", "Cannot find module './MacrosPage'", missing keys).

- [ ] **Step 3: Add the copy**

`src/lib/i18n/en.ts`, appended at the end of the object:

```ts

  // Macros page (macros and scripts spec)
  'macros.title': 'Macros',
  'macros.saveHint': 'Macro changes reach the keyboard when you press Save.',
  'macros.unsupported': 'This keyboard does not support macros',
  'macros.slots': 'Macro slots',
  'macros.oneAction': '1 action',
  'macros.actionCount': '{0} actions',
  'macros.limit': '{0} / {1} actions',
  'macros.time': 'Time (ms)',
  'macros.key': 'Key',
  'macros.event': 'Event',
  'macros.virtual': 'Virtual',
  'macros.keyId': 'Key ID',
  'macros.press': 'Press',
  'macros.release': 'Release',
  'macros.timeOf': 'Time of action {0}',
  'macros.eventOf': 'Event of action {0}',
  'macros.virtualOf': 'Action {0} is virtual',
  'macros.changeKey': 'Change the key',
  'macros.deleteAction': 'Delete action {0}',
  'macros.empty': 'This macro has no actions yet. Record them or add keys.',
  'macros.after': 'After (ms)',
  'macros.hold': 'Hold (ms)',
  'macros.addKey': 'Add key',
  'macros.chooseKey': 'Choose a key',
  'macros.record': 'Record',
  'macros.stop': 'Stop',
  'macros.recording':
    "Recording: press keys on this computer's keyboard. Mouse buttons are not recorded.",
  'macros.skippedOne': '1 key could not be recorded.',
  'macros.skipped': '{0} keys could not be recorded.',
  'macros.full': 'The macro is full.',
  'macros.sort': 'Sort by time',
  'macros.clear': 'Clear',
  'macros.clearTitle': 'Clear Macro {0}?',
  'macros.clearConfirm': 'Every action of this macro will be removed.',
```

`src/lib/i18n/zh.ts`, appended at the end of the object:

```ts

  // Macros page (macros and scripts spec)
  'macros.title': '宏',
  'macros.saveHint': '按下「保存」后，宏的更改才会发送到键盘。',
  'macros.unsupported': '此键盘不支持宏',
  'macros.slots': '宏槽位',
  'macros.oneAction': '1 个动作',
  'macros.actionCount': '{0} 个动作',
  'macros.limit': '{0} / {1} 个动作',
  'macros.time': '时间（毫秒）',
  'macros.key': '按键',
  'macros.event': '事件',
  'macros.virtual': '虚拟',
  'macros.keyId': '按键 ID',
  'macros.press': '按下',
  'macros.release': '释放',
  'macros.timeOf': '动作 {0} 的时间',
  'macros.eventOf': '动作 {0} 的事件',
  'macros.virtualOf': '动作 {0} 为虚拟事件',
  'macros.changeKey': '更换按键',
  'macros.deleteAction': '删除动作 {0}',
  'macros.empty': '此宏还没有动作。可以录制或添加按键。',
  'macros.after': '间隔（毫秒）',
  'macros.hold': '按住（毫秒）',
  'macros.addKey': '添加按键',
  'macros.chooseKey': '选择按键',
  'macros.record': '录制',
  'macros.stop': '停止',
  'macros.recording': '录制中：请按下此电脑键盘上的按键。鼠标按键不会被录制。',
  'macros.skippedOne': '有 1 个按键无法录制。',
  'macros.skipped': '有 {0} 个按键无法录制。',
  'macros.full': '宏已满。',
  'macros.sort': '按时间排序',
  'macros.clear': '清除',
  'macros.clearTitle': '清除宏 {0}？',
  'macros.clearConfirm': '此宏的所有动作都将被删除。',
```

- [ ] **Step 4: Add the "does not support" notice**

`src/components/ui/UnsupportedFeature.tsx`:

```tsx
export interface UnsupportedFeatureProps {
  /** "This keyboard does not support …" */
  readonly message: string;
}

/**
 * Shown instead of a page whose feature the connected keyboard lacks (Macros, Scripts), in the
 * style of the not-connected fallback.
 */
export function UnsupportedFeature({ message }: UnsupportedFeatureProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="mb-6">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
            <path strokeLinecap="round" strokeWidth="1.5" d="M5.64 5.64l12.72 12.72" />
          </svg>
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{message}</h3>
      </div>
    </div>
  );
}
```

`src/components/ui/index.ts`: add

```ts
// The Macros and Scripts pages on keyboards without the feature.
export { UnsupportedFeature, type UnsupportedFeatureProps } from './UnsupportedFeature';
```

- [ ] **Step 5: Add the edit helpers and the recorder hook**

`src/features/macros/commands.ts`:

```ts
/**
 * Macro edits of the page. They read the slot from the store at the time of the edit (two inputs
 * can arrive before the next render) and stage the result.
 */
import { deviceSession, deviceStore, type MacroAction } from '../device';

/** The slot's actions as the store has them now; empty without a configuration. */
export function slotActions(slot: number): readonly MacroAction[] {
  return deviceStore.getState().config?.macros[slot] ?? [];
}

/** Stages `edit` of the slot's current actions. */
export function editMacro(
  slot: number,
  edit: (actions: readonly MacroAction[]) => readonly MacroAction[]
): void {
  const actions = deviceStore.getState().config?.macros[slot];
  if (actions) deviceSession.setMacro(slot, edit(actions));
}
```

`src/features/macros/hooks/use-macro-recorder.ts`:

```ts
/**
 * Recording a macro slot from this computer's keyboard: window key events while recording. Every
 * recorded event is staged at once, so the table fills while recording. Recording ends with
 * Stop, when the macro is full, when the window loses focus (its releases would be missed) and
 * when the editor unmounts (leaving the page, a device load); keys still held are released then.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { deviceSession, deviceStore, type MacroAction } from '../../device';
import { slotActions } from '../commands';
import {
  recordKeyDown,
  recordKeyUp,
  startRecording,
  stopRecording,
  type Recording,
  type RecordingStep,
} from '../model';

export interface RecorderState {
  readonly recording: boolean;
  /** Presses of keys without a HID keycode, which were not recorded. */
  readonly skipped: number;
  /** The last recording ended because the macro was full. */
  readonly full: boolean;
}

export interface MacroRecorder extends RecorderState {
  readonly start: () => void;
  readonly stop: () => void;
}

/** What the page shows, for the slot it was recorded in. */
interface Shown extends RecorderState {
  readonly slot: number;
}

const IDLE: RecorderState = { recording: false, skipped: 0, full: false };

export function useMacroRecorder(slot: number, pollingRate: number, limit: number): MacroRecorder {
  // The recording in progress, for the window listeners; null while not recording.
  const recording = useRef<Recording | null>(null);
  const [shown, setShown] = useState<Shown>({ ...IDLE, slot });

  /** Stages a step's actions; the recording ends when `ended` or when the macro is full. */
  const apply = useCallback(
    (before: readonly MacroAction[], step: RecordingStep, ended: boolean) => {
      if (step.actions !== before) deviceSession.setMacro(slot, step.actions);
      const done = ended || step.recording.full;
      recording.current = done ? null : step.recording;
      setShown({
        slot,
        recording: !done,
        skipped: step.recording.skipped,
        full: step.recording.full,
      });
    },
    [slot]
  );

  const start = useCallback(() => {
    recording.current = startRecording(slotActions(slot), performance.now(), pollingRate, limit);
    setShown({ slot, recording: true, skipped: 0, full: false });
  }, [slot, pollingRate, limit]);

  const stop = useCallback(() => {
    const current = recording.current;
    if (!current) return;
    const before = slotActions(slot);
    apply(before, stopRecording(current, before, performance.now()), true);
  }, [slot, apply]);

  const active = shown.slot === slot && shown.recording;
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      const current = recording.current;
      if (!current) return;
      // A recorded key does nothing else: Space or Enter would press the focused Stop button.
      event.preventDefault();
      const before = slotActions(slot);
      const now = performance.now();
      apply(
        before,
        event.type === 'keydown'
          ? recordKeyDown(current, before, { code: event.code, repeat: event.repeat, now })
          : recordKeyUp(current, before, { code: event.code, now }),
        false
      );
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
      window.removeEventListener('blur', stop);
    };
  }, [active, slot, apply, stop]);

  // Unmounting ends the recording. Keys still held are released where the session takes edits:
  // not while the keyboard loads a configuration, and not once it is gone.
  useEffect(
    () => () => {
      const current = recording.current;
      recording.current = null;
      const { connection, reloading } = deviceStore.getState();
      if (current && current.held.length > 0 && connection.status === 'ready' && !reloading) {
        deviceSession.setMacro(
          slot,
          stopRecording(current, slotActions(slot), performance.now()).actions
        );
      }
    },
    [slot]
  );

  const state = shown.slot === slot ? shown : IDLE;
  return { recording: state.recording, skipped: state.skipped, full: state.full, start, stop };
}
```

- [ ] **Step 6: Add the components**

`src/features/macros/components/styles.ts`:

```ts
/** Class names the Macros page's components share (the app's button and field styles). */
export const PRIMARY_BUTTON =
  'px-4 py-2 text-white bg-primary-500 hover:bg-primary-600 rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed glassmorphism-button';
export const SECONDARY_BUTTON =
  'px-4 py-2 rounded-md border transition-colors text-sm font-medium text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed glassmorphism-button';
export const STOP_BUTTON =
  'px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors text-sm font-medium glassmorphism-button';
export const FIELD =
  'px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-white border-gray-300 text-gray-900 disabled:opacity-50';
```

`src/features/macros/components/MsInput.tsx`:

```tsx
import { useState } from 'react';
import { formatMs, msToTicks, ticksToMs } from '../model';
import { FIELD } from './styles';

export interface MsInputProps {
  readonly ticks: number;
  readonly pollingRate: number;
  readonly label: string;
  readonly disabled: boolean;
  readonly onCommit: (ticks: number) => void;
}

/**
 * A time in milliseconds, kept as typed while it is edited and committed (in ticks) on Enter or
 * when the field loses focus; Escape restores it, and an empty field changes nothing.
 */
export function MsInput({ ticks, pollingRate, label, disabled, onCommit }: MsInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    const ms = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(ms)) return;
    const next = msToTicks(ms, pollingRate);
    if (next !== ticks) onCommit(next);
  };

  return (
    <input
      type="number"
      min="0"
      step="any"
      aria-label={label}
      disabled={disabled}
      value={draft ?? formatMs(ticksToMs(ticks, pollingRate))}
      onChange={event => {
        setDraft(event.currentTarget.value);
      }}
      onBlur={commit}
      onKeyDown={event => {
        if (event.key === 'Enter') commit();
        else if (event.key === 'Escape') setDraft(null);
      }}
      className={`w-24 ${FIELD}`}
    />
  );
}
```

`src/features/macros/components/MacroKeyPicker.tsx`:

```tsx
import { useId } from 'react';
import { KeycodePicker, Modal } from '../../../components/ui';
import { useT } from '../../../lib/i18n';
import type { Keycode } from '../../device';
import { MACRO_KEY_CATEGORIES } from '../model';
import { SECONDARY_BUTTON } from './styles';

export interface MacroKeyPickerProps {
  readonly open: boolean;
  /** The key the edited action plays, if one is edited. */
  readonly selected: Keycode | null;
  readonly onPick: (keycode: Keycode) => void;
  readonly onClose: () => void;
}

/** The Dynamic Keys action picker in a dialog, without "None" (keycode 0 ends a macro). */
export function MacroKeyPicker({ open, selected, onPick, onClose }: MacroKeyPickerProps) {
  const t = useT();
  const titleId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="3xl"
      labelledBy={titleId}
      className="max-h-[90vh] overflow-y-auto"
    >
      <h3 id={titleId} className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        {t('macros.chooseKey')}
      </h3>
      <KeycodePicker
        categories={MACRO_KEY_CATEGORIES}
        selectedAction={selected}
        onActionSelect={onPick}
      />
      <div className="flex justify-end mt-4">
        <button type="button" className={SECONDARY_BUTTON} onClick={onClose}>
          {t('common.cancel')}
        </button>
      </div>
    </Modal>
  );
}
```

`src/features/macros/components/MacroSlots.tsx`:

```tsx
import { useT } from '../../../lib/i18n';
import type { MacroAction } from '../../device';

export interface MacroSlotsProps {
  readonly macros: readonly (readonly MacroAction[])[];
  readonly selected: number;
  readonly disabled: boolean;
  readonly onSelect: (slot: number) => void;
}

/** One button per slot ("Macro 1" …) with its action count. */
export function MacroSlots({ macros, selected, disabled, onSelect }: MacroSlotsProps) {
  const t = useT();
  return (
    <div role="group" aria-label={t('macros.slots')} className="flex flex-wrap gap-2">
      {macros.map((actions, slot) => {
        const active = slot === selected;
        return (
          <button
            key={slot}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            className={`min-w-28 px-4 py-2 rounded-lg border text-left transition-colors glassmorphism-button disabled:opacity-50 disabled:cursor-not-allowed ${
              active
                ? 'bg-primary-500 border-primary-500 text-white'
                : 'border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'
            }`}
            onClick={() => {
              onSelect(slot);
            }}
          >
            <span className="block text-sm font-medium">
              {t('macros.slot', String(slot + 1))}
            </span>{' '}
            <span className="block text-xs opacity-80">
              {actions.length === 1
                ? t('macros.oneAction')
                : t('macros.actionCount', String(actions.length))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

`src/features/macros/components/AddKeyForm.tsx`:

```tsx
import { useState } from 'react';
import { useT } from '../../../lib/i18n';
import type { Keycode } from '../../device';
import { msToTicks } from '../model';
import { MacroKeyPicker } from './MacroKeyPicker';
import { FIELD, PRIMARY_BUTTON } from './styles';

export interface AddKeyFormProps {
  readonly pollingRate: number;
  readonly disabled: boolean;
  /** `gap` and `hold` in ticks. */
  readonly onAdd: (keycode: Keycode, gap: number, hold: number) => void;
}

/** "Add key": a press of a chosen key `After` ms after the last action, released `Hold` ms later. */
export function AddKeyForm({ pollingRate, disabled, onAdd }: AddKeyFormProps) {
  const t = useT();
  const [after, setAfter] = useState('50');
  const [hold, setHold] = useState('20');
  const [picking, setPicking] = useState(false);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
        {t('macros.after')}
        <input
          type="number"
          min="0"
          step="any"
          value={after}
          disabled={disabled}
          onChange={event => {
            setAfter(event.currentTarget.value);
          }}
          className={`w-24 ${FIELD}`}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
        {t('macros.hold')}
        <input
          type="number"
          min="0"
          step="any"
          value={hold}
          disabled={disabled}
          onChange={event => {
            setHold(event.currentTarget.value);
          }}
          className={`w-24 ${FIELD}`}
        />
      </label>
      <button
        type="button"
        className={PRIMARY_BUTTON}
        disabled={disabled}
        onClick={() => {
          setPicking(true);
        }}
      >
        {t('macros.addKey')}
      </button>
      <MacroKeyPicker
        open={picking}
        selected={null}
        onPick={keycode => {
          setPicking(false);
          onAdd(keycode, msToTicks(Number(after), pollingRate), msToTicks(Number(hold), pollingRate));
        }}
        onClose={() => {
          setPicking(false);
        }}
      />
    </div>
  );
}
```

`src/features/macros/components/ActionTable.tsx`:

```tsx
import { TrashIcon } from 'lucide-react';
import { useState } from 'react';
import { Toggle } from '../../../components/ui';
import { useT } from '../../../lib/i18n';
import type { MacroAction } from '../../device';
import { macroKeyName } from '../model';
import { MacroKeyPicker } from './MacroKeyPicker';
import { MsInput } from './MsInput';
import { FIELD } from './styles';

const HEADER = 'text-left py-3 px-4 font-medium text-gray-900 dark:text-white';

export interface ActionTableProps {
  /** The table's accessible name (the slot's name). */
  readonly name: string;
  readonly actions: readonly MacroAction[];
  readonly pollingRate: number;
  readonly disabled: boolean;
  readonly onChange: (index: number, patch: Partial<MacroAction>) => void;
  readonly onDelete: (index: number) => void;
}

/**
 * One row per action in the order the keyboard plays them: the time (ms from the start of the
 * macro), the key, the event and Virtual are edited in place; the key ID is shown.
 */
export function ActionTable({
  name,
  actions,
  pollingRate,
  disabled,
  onChange,
  onDelete,
}: ActionTableProps) {
  const t = useT();
  // The row whose key is being picked.
  const [picking, setPicking] = useState<number | null>(null);

  if (actions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-600 dark:text-gray-400">
        {t('macros.empty')}
      </p>
    );
  }

  const pickingAction = picking === null ? undefined : actions[picking];
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full" aria-label={name}>
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className={HEADER}>{t('macros.time')}</th>
            <th className={HEADER}>{t('macros.key')}</th>
            <th className={HEADER}>{t('macros.event')}</th>
            <th className={HEADER}>{t('macros.virtual')}</th>
            <th className={HEADER}>{t('macros.keyId')}</th>
            <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
              {t('common.actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {actions.map((action, index) => {
            const number = String(index + 1);
            return (
              <tr
                key={index}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <td className="py-2 px-4">
                  <MsInput
                    ticks={action.delay}
                    pollingRate={pollingRate}
                    label={t('macros.timeOf', number)}
                    disabled={disabled}
                    onCommit={delay => {
                      onChange(index, { delay });
                    }}
                  />
                </td>
                <td className="py-2 px-4">
                  <button
                    type="button"
                    className="px-3 py-1 text-sm rounded-md border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white glassmorphism-button disabled:opacity-50"
                    title={t('macros.changeKey')}
                    disabled={disabled}
                    onClick={() => {
                      setPicking(index);
                    }}
                  >
                    {macroKeyName(action.keycode)}
                  </button>
                </td>
                <td className="py-2 px-4">
                  <select
                    aria-label={t('macros.eventOf', number)}
                    value={action.event}
                    disabled={disabled}
                    className={FIELD}
                    onChange={event => {
                      onChange(index, { event: event.currentTarget.value === 'up' ? 'up' : 'down' });
                    }}
                  >
                    <option value="down">{t('macros.press')}</option>
                    <option value="up">{t('macros.release')}</option>
                  </select>
                </td>
                <td className="py-2 px-4">
                  <Toggle
                    size="sm"
                    checked={action.isVirtual}
                    disabled={disabled}
                    ariaLabel={t('macros.virtualOf', number)}
                    onToggle={isVirtual => {
                      onChange(index, { isVirtual });
                    }}
                  />
                </td>
                <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-400">
                  {action.keyId}
                </td>
                <td className="py-2 px-4 text-center">
                  <button
                    type="button"
                    className="p-1.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    aria-label={t('macros.deleteAction', number)}
                    title={t('macros.deleteAction', number)}
                    disabled={disabled}
                    onClick={() => {
                      onDelete(index);
                    }}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <MacroKeyPicker
        open={pickingAction !== undefined}
        selected={pickingAction?.keycode ?? null}
        onPick={keycode => {
          if (picking !== null) onChange(picking, { keycode });
          setPicking(null);
        }}
        onClose={() => {
          setPicking(null);
        }}
      />
    </div>
  );
}
```

`src/features/macros/components/MacroEditor.tsx`:

```tsx
import { useState } from 'react';
import { ConfirmationModal } from '../../../components/ui';
import { useT, type TranslationKey } from '../../../lib/i18n';
import type { MacroAction } from '../../device';
import { editMacro } from '../commands';
import { useMacroRecorder, type MacroRecorder } from '../hooks/use-macro-recorder';
import { hasRoom, removeAction, replaceAction, sortByTime, withKeyTap } from '../model';
import { ActionTable } from './ActionTable';
import { AddKeyForm } from './AddKeyForm';
import { MacroSlots } from './MacroSlots';
import { PRIMARY_BUTTON, SECONDARY_BUTTON, STOP_BUTTON } from './styles';

type Translate = (key: TranslationKey, ...args: string[]) => string;

/** The recorder's line: recording, or how the last recording ended, and the keys it skipped. */
function recorderMessage(t: Translate, recorder: MacroRecorder): string {
  const parts: string[] = [];
  if (recorder.recording) parts.push(t('macros.recording'));
  else if (recorder.full) parts.push(t('macros.full'));
  if (recorder.skipped === 1) parts.push(t('macros.skippedOne'));
  else if (recorder.skipped > 1) parts.push(t('macros.skipped', String(recorder.skipped)));
  return parts.join(' ');
}

export interface MacroEditorProps {
  readonly macros: readonly (readonly MacroAction[])[];
  readonly pollingRate: number;
  /** The most actions a slot holds (the slot's last entry is the end marker). */
  readonly limit: number;
}

/** The slots, the chosen slot's tools and its actions. Every edit is staged. */
export function MacroEditor({ macros, pollingRate, limit }: MacroEditorProps) {
  const t = useT();
  const [slot, setSlot] = useState(0);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const recorder = useMacroRecorder(slot, pollingRate, limit);
  const actions = macros[slot] ?? [];
  const { recording } = recorder;
  // A press and its release.
  const roomForKey = hasRoom(actions, 2, limit);

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <MacroSlots macros={macros} selected={slot} disabled={recording} onSelect={setSlot} />
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('macros.limit', String(actions.length), String(limit))}
        </p>
        <div className="flex-1" />
        {recording ? (
          <button type="button" className={STOP_BUTTON} onClick={recorder.stop}>
            {t('macros.stop')}
          </button>
        ) : (
          <button
            type="button"
            className={PRIMARY_BUTTON}
            disabled={!roomForKey}
            onClick={recorder.start}
          >
            {t('macros.record')}
          </button>
        )}
        <button
          type="button"
          className={SECONDARY_BUTTON}
          disabled={recording || actions.length < 2}
          onClick={() => {
            editMacro(slot, sortByTime);
          }}
        >
          {t('macros.sort')}
        </button>
        <button
          type="button"
          className={SECONDARY_BUTTON}
          disabled={recording || actions.length === 0}
          onClick={() => {
            setConfirmingClear(true);
          }}
        >
          {t('macros.clear')}
        </button>
      </div>
      <p
        role="status"
        className={`min-h-5 text-sm ${recording ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}
      >
        {recorderMessage(t, recorder)}
      </p>
      <AddKeyForm
        pollingRate={pollingRate}
        disabled={recording || !roomForKey}
        onAdd={(keycode, gap, hold) => {
          editMacro(slot, current => withKeyTap(current, keycode, gap, hold));
        }}
      />
      <ActionTable
        name={t('macros.slot', String(slot + 1))}
        actions={actions}
        pollingRate={pollingRate}
        disabled={recording}
        onChange={(index, patch) => {
          editMacro(slot, current => replaceAction(current, index, patch));
        }}
        onDelete={index => {
          editMacro(slot, current => removeAction(current, index));
        }}
      />
      <ConfirmationModal
        open={confirmingClear}
        title={t('macros.clearTitle', String(slot + 1))}
        message={t('macros.clearConfirm')}
        confirmText={t('macros.clear')}
        cancelText={t('common.cancel')}
        confirmColor="red"
        onConfirm={() => {
          editMacro(slot, () => []);
          setConfirmingClear(false);
        }}
        onCancel={() => {
          setConfirmingClear(false);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 7: Add the page**

`src/features/macros/MacrosPage.tsx`:

```tsx
import { UnsupportedFeature } from '../../components/ui';
import { useT } from '../../lib/i18n';
import { useDeviceLoads, useDeviceStore, useFeatureFlags } from '../device';
import { macroActionLimit, supportsMacros } from '../device/model/capabilities';
import { MacroEditor } from './components/MacroEditor';

/**
 * Macros route (macros and scripts spec): the keyboard's macro slots, edited in place, added to
 * key by key or recorded from this computer's keyboard, and sent to the keyboard by Save. Shown
 * in the sidebar only for keyboards whose controller declares macros.
 */
export function MacrosPage() {
  const t = useT();
  const feature = useFeatureFlags();
  const macros = useDeviceStore(state => state.config?.macros);
  // Each configuration the keyboard loads (profile switch, reset) starts the editor over on it.
  const loads = useDeviceLoads();

  if (!feature || !macros) return null;
  if (!supportsMacros(feature)) {
    return <UnsupportedFeature message={t('macros.unsupported')} />;
  }

  return (
    <div
      className="rounded-2xl shadow mt-2 mb-4 grow bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col glassmorphism-card"
      style={{ padding: 'calc(2rem * var(--ui-scale, 1))' }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-4"
        style={{ marginBottom: 'calc(1rem * var(--ui-scale, 1))' }}
      >
        <h2
          className="font-bold text-black dark:text-white"
          style={{ fontSize: 'calc(1.5rem * var(--ui-scale, 1))' }}
        >
          {t('macros.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('macros.saveHint')}</p>
      </div>
      <MacroEditor
        key={loads}
        macros={macros}
        pollingRate={feature.pollingRate}
        limit={macroActionLimit(feature)}
      />
    </div>
  );
}
```

`src/features/macros/index.ts`:

```ts
/** Macros feature: the Macros page (macros and scripts spec). */
export { MacrosPage } from './MacrosPage';
```

- [ ] **Step 8: Run the tests**

Run: `npx vitest run src/components/ui/UnsupportedFeature.test.tsx src/features/macros src/lib/i18n`
Expected: PASS.

- [ ] **Step 9: Check and commit**

Run: `npm run typecheck && npx eslint src/components/ui src/features/macros src/lib/i18n && npx prettier --check src/components/ui src/features/macros src/lib/i18n`
Expected: no errors (run `npx prettier --write` on the new files first if the check reports them).

```bash
git add src/components/ui/UnsupportedFeature.tsx src/components/ui/UnsupportedFeature.test.tsx src/components/ui/index.ts src/features/macros src/lib/i18n/en.ts src/lib/i18n/zh.ts src/lib/i18n/i18n.test.tsx
git commit -m "feat(macros): the Macros page"
```

---

### Task 7: libamp's script compiler in `vendor/mqjs/`

Two commits: the generated compiler with its build script and tooling, then the app's wrapper. The spec pins the compiler to the commit the Zellia firmware uses (`ee9d947`), but that commit has no script support at all (no `tools/mqjs`, no `lib/mquickjs`, no `src/script.c`), so `build.sh` pins `8f9c439`, the newest libamp: `Zellia-Keyboards/Zellia_libamp` main and `zhangqili/libamp` main are both that commit.

**Files:**
- Create: `vendor/mqjs/build.sh`; generated by it and committed: `vendor/mqjs/mqjs_wasm.js`, `vendor/mqjs/mqjs_wasm.wasm`, `vendor/mqjs/LICENSE`, `vendor/mqjs/PROVENANCE.md`, `vendor/mqjs/licenses/*`
- Create: `.gitattributes`
- Modify: `package.json`, `eslint.config.js`, `.prettierignore`, `.github/workflows/web.yml`, `README.md`, `docs/development.md`
- Modify: `vite.config.ts`
- Create: `src/features/scripts/model/mqjs-compiler.d.ts`, `compiler.ts`, `compiler-browser.ts`, `example.ts`, `compiler.test.ts`
- Create: `src/features/scripts/testing/node-compiler.ts`

**Interfaces:**
- Produces (`features/scripts/model/compiler`): `MqjsInstance`, `MqjsOptions`, `MqjsFactory`, `CompileError { line: number | null; message: string }`, `CompileResult { bytecode: Uint8Array | null; stdout: string; stderr: string; errors: readonly CompileError[] }`, `type Compile = (source: string) => Promise<CompileResult>`, `COMPILER_ARGS`, `stripAnsi(text)`, `parseCompileErrors(stderr)`, `createCompiler(load: () => Promise<MqjsFactory>): Compile`.
- Produces: `compileScript: Compile` (`features/scripts/model/compiler-browser`, the app's compiler); `nodeCompiler: Compile` (`features/scripts/testing/node-compiler`, for tests); `EXAMPLE_SCRIPT` (`features/scripts/model/example`); the module `'mqjs-compiler'` (Vite alias, typed by `mqjs-compiler.d.ts`).

- [ ] **Step 1: Add the build script**

`vendor/mqjs/build.sh` (then `chmod +x vendor/mqjs/build.sh`):

```bash
#!/usr/bin/env bash
# Builds libamp's script compiler (tools/mqjs, CMake target mqjs_wasm) to WebAssembly with
# Emscripten and copies it here with libamp's license, the licenses of the compiled submodules
# and a provenance record.
#
#   npm run build:mqjs        (needs git, CMake and Emscripten: brew install emscripten cmake)
#
# The output is committed: normal builds and CI never run this. Never edit it by hand.
set -euo pipefail

LIBAMP_REPOSITORY='https://github.com/Zellia-Keyboards/Zellia_libamp.git'
# The newest libamp (zhangqili/libamp main is the same commit). The commit the Zellia firmware
# pins, ee9d947, predates scripts: it has no tools/mqjs.
LIBAMP_COMMIT='8f9c439551427a4b29d6f716601509b3d422da75'
# The submodules the compiler compiles (googletest is only for libamp's own tests).
SUBMODULES=(lib/mquickjs lib/littlefs lib/filex lib/levelx)

out="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for tool in git cmake emcmake emcc shasum; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "build.sh: $tool not found (brew install emscripten cmake)" >&2
    exit 1
  fi
done

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

git init --quiet "$work/libamp"
git -C "$work/libamp" fetch --quiet --depth 1 "$LIBAMP_REPOSITORY" "$LIBAMP_COMMIT"
git -C "$work/libamp" checkout --quiet FETCH_HEAD
git -C "$work/libamp" submodule update --quiet --init --depth 1 -- "${SUBMODULES[@]}"

emcmake cmake -S "$work/libamp/tools/mqjs" -B "$work/build" -DCMAKE_BUILD_TYPE=Release
cmake --build "$work/build" --target mqjs_wasm --parallel

cp "$work/build/mqjs_wasm.js" "$work/build/mqjs_wasm.wasm" "$out/"
cp "$work/libamp/LICENSE" "$out/LICENSE"
rm -rf "$out/licenses"
mkdir -p "$out/licenses"
for module in "${SUBMODULES[@]}"; do
  name="$(basename "$module")"
  for file in "$work/libamp/$module"/LICENSE* "$work/libamp/$module"/COPYING*; do
    if [ -f "$file" ]; then
      cp "$file" "$out/licenses/$name-$(basename "$file")"
    fi
  done
done

# sed reads all of the output: with pipefail, head could fail the script on SIGPIPE.
emscripten="$(emcc --version 2>/dev/null | sed -n 1p)"
js_sha="$(shasum -a 256 "$out/mqjs_wasm.js" | cut -d ' ' -f 1)"
wasm_sha="$(shasum -a 256 "$out/mqjs_wasm.wasm" | cut -d ' ' -f 1)"
cat >"$out/PROVENANCE.md" <<EOF
# libamp script compiler (generated)

Built by \`vendor/mqjs/build.sh\` (\`npm run build:mqjs\`). Do not edit these files.

- Source: $LIBAMP_REPOSITORY at \`$LIBAMP_COMMIT\`, \`tools/mqjs\`, CMake target
  \`mqjs_wasm\` (export \`createMqjsCompiler\`), with the submodules ${SUBMODULES[*]}.
- Emscripten: $emscripten
- Build: \`emcmake cmake -S tools/mqjs -B build -DCMAKE_BUILD_TYPE=Release\`, then
  \`cmake --build build --target mqjs_wasm\`.
- License: GPL-3.0 (\`LICENSE\`, libamp's); \`licenses/\` holds the licenses of the compiled
  submodules. A separately licensed component of this MIT app.
- SHA-256: \`mqjs_wasm.js\` $js_sha, \`mqjs_wasm.wasm\` $wasm_sha.
EOF

echo "build.sh: mqjs_wasm from libamp $LIBAMP_COMMIT ($emscripten)"
```

`package.json`, `"scripts"`: add after `"preview": "vite preview",`:

```json
    "build:mqjs": "bash vendor/mqjs/build.sh",
```

- [ ] **Step 2: Build the compiler**

Run (alone: it is a heavy job): `npm run build:mqjs`
Expected: ends with `build.sh: mqjs_wasm from libamp 8f9c439551427a4b29d6f716601509b3d422da75 (emcc …)`; `vendor/mqjs/` holds `mqjs_wasm.js` (about 60 KB), `mqjs_wasm.wasm` (about 350 KB), `LICENSE` (GPL-3.0), `licenses/` and `PROVENANCE.md`.
If the build fails, stop and report the error: do not change libamp, the build flags or the outputs by hand.

Run: `grep -c "createMqjsCompiler" vendor/mqjs/mqjs_wasm.js && grep -o 'new URL("mqjs_wasm.wasm",import.meta.url)' vendor/mqjs/mqjs_wasm.js`
Expected: a count of at least 1, and the `new URL(…)` the Vite build turns into the wasm asset.

- [ ] **Step 3: Keep the generated files out of the tools and the diffs**

`eslint.config.js`, the global `ignores` list: add `'vendor/mqjs',` after `'src-controller',`.

`.prettierignore`: add the line `vendor/mqjs` after `src-controller`.

`.gitattributes` (new):

```gitattributes
# Generated by vendor/mqjs/build.sh: no text diffs.
vendor/mqjs/mqjs_wasm.js -diff linguist-generated
vendor/mqjs/mqjs_wasm.wasm binary
```

`.github/workflows/web.yml`: in both `paths:` lists (`push` and `pull_request`), add `      - 'vendor/**'` after `      - 'src-controller/**'`.

`README.md`:
- Development table: after the `npm run validate` row add `| \`npm run build:mqjs\` | Rebuilds the script compiler in \`vendor/mqjs/\` (Emscripten) |`.
- Project layout block: after the `src-controller/` line add `vendor/mqjs/      libamp's script compiler (generated, GPL-3.0; see PROVENANCE.md)`.
- License section: after "Distributed under the MIT License. See [`LICENSE`](LICENSE)." add the paragraph "The script compiler in `vendor/mqjs/` is built from [libamp](https://github.com/zhangqili/libamp) and licensed under the GPL-3.0 (`vendor/mqjs/LICENSE`). It is a separate component, which the Scripts page loads when it compiles a script."

`docs/development.md`:
- Commands table: after the `npm run parity` row add `| \`npm run build:mqjs\` | Rebuilds the script compiler in \`vendor/mqjs/\` (see below) |`.
- Project layout block: after the `src-controller/` line add `vendor/mqjs/                Generated: libamp's script compiler (wasm, GPL-3.0), see PROVENANCE.md`.
- Before `## PWA` add:

```markdown
## Script compiler

The Scripts page compiles scripts for AOT keyboards with libamp's own compiler (`tools/mqjs`,
mquickjs), built to WebAssembly in `vendor/mqjs/`:

- `mqjs_wasm.js` and `mqjs_wasm.wasm` are generated by `vendor/mqjs/build.sh`
  (`npm run build:mqjs`): it clones libamp at the pinned commit with the submodules the compiler
  needs and builds the `mqjs_wasm` target with Emscripten (`brew install emscripten cmake`).
  Normal builds and CI use the committed files; never edit them by hand.
- `PROVENANCE.md` records the repository, the commit, the Emscripten version and the SHA-256 of
  both files. `LICENSE` is libamp's GPL-3.0 and `licenses/` holds the licenses of the compiled
  submodules: the compiler is a separately licensed component, the app stays MIT. ESLint and
  Prettier skip the directory; TypeScript sees it only through
  `src/features/scripts/model/mqjs-compiler.d.ts`.
- Vite aliases `mqjs-compiler` to the module. `compileScript`
  (`src/features/scripts/model/compiler-browser.ts`) imports it on the first compile, so the
  module and its wasm (a build asset the service worker precaches) load only on the Scripts
  page. Tests compile with `src/features/scripts/testing/node-compiler.ts`, which reads the wasm
  from disk.
```

Run: `npx prettier --write README.md docs/development.md && npx prettier --check README.md docs/development.md package.json .github/workflows/web.yml && npx eslint eslint.config.js && npx prettier --file-info vendor/mqjs/mqjs_wasm.js`
Expected: no errors, and the file info reads `"ignored": true`.

```bash
git add vendor/mqjs .gitattributes package.json eslint.config.js .prettierignore .github/workflows/web.yml README.md docs/development.md
git commit -m "build(scripts): vendor libamp's script compiler"
```

- [ ] **Step 4: Write the failing compiler tests**

`src/features/scripts/model/compiler.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { nodeCompiler } from '../testing/node-compiler';
import {
  createCompiler,
  parseCompileErrors,
  stripAnsi,
  type MqjsFactory,
  type MqjsInstance,
} from './compiler';
import { EXAMPLE_SCRIPT } from './example';

describe('parseCompileErrors', () => {
  it('reads each error with the line of the location after it', () => {
    expect(
      parseCompileErrors('Error: unexpected character in expression\n    at /main.js:2:3\n')
    ).toEqual([{ line: 2, message: 'unexpected character in expression' }]);
    expect(parseCompileErrors('SyntaxError: first\nError: second\n    at /main.js:7\n')).toEqual([
      { line: null, message: 'first' },
      { line: 7, message: 'second' },
    ]);
  });

  it('keeps output it cannot read as one error without a line', () => {
    expect(parseCompileErrors('out of memory\n')).toEqual([
      { line: null, message: 'out of memory' },
    ]);
    expect(parseCompileErrors('')).toEqual([]);
  });
});

describe('stripAnsi', () => {
  it('removes the colour codes', () => {
    expect(stripAnsi('\u001b[31;1mError: x\u001b[0m\n')).toBe('Error: x\n');
  });
});

describe('createCompiler', () => {
  interface Run {
    args: string[] | null;
    readonly files: Map<string, string | Uint8Array>;
  }

  it("compiles each script on a fresh instance with upstream's arguments", async () => {
    const runs: Run[] = [];
    // A stand-in for the Emscripten module: it "compiles" anything but `broken`.
    const createInstance: MqjsFactory = ({ printErr }) => {
      const run: Run = { args: null, files: new Map() };
      runs.push(run);
      const instance: MqjsInstance = {
        FS: {
          writeFile: (path, data) => {
            run.files.set(path, data);
          },
          readFile: path => {
            const file = run.files.get(path);
            if (!(file instanceof Uint8Array)) throw new Error(`ENOENT: ${path}`);
            return file;
          },
        },
        callMain: args => {
          run.args = args;
          if (run.files.get('/main.js') === 'broken') {
            printErr('\u001b[31;1mError: nope\n    at /main.js:1:7\u001b[0m');
          } else {
            run.files.set('/out.bin', Uint8Array.of(0xfb, 0xac));
          }
          return 0;
        },
      };
      return Promise.resolve(instance);
    };
    const compile = createCompiler(() => Promise.resolve(createInstance));

    expect(await compile('fine')).toEqual({
      bytecode: Uint8Array.of(0xfb, 0xac),
      stdout: '',
      stderr: '',
      errors: [],
    });
    expect(await compile('broken')).toEqual({
      bytecode: null,
      stdout: '',
      stderr: 'Error: nope\n    at /main.js:1:7\n',
      errors: [{ line: 1, message: 'nope' }],
    });
    expect(runs).toHaveLength(2);
    expect(runs[0]?.args).toEqual(['--no-column', '-m32', '-o', '/out.bin', '/main.js']);
  });
});

// The real compiler (vendor/mqjs). The messages are mquickjs's: if a rebuilt compiler words them
// differently, use its words here and in ScriptsPage.test.tsx.
describe("libamp's compiler", () => {
  it('compiles the example to bytecode', async () => {
    const result = await nodeCompiler(EXAMPLE_SCRIPT);
    expect(result.errors).toEqual([]);
    expect(result.stderr).toBe('');
    expect(Array.from(result.bytecode?.subarray(0, 2) ?? [])).toEqual([0xfb, 0xac]);
  });

  it('reports a syntax error with its line and writes no bytecode', async () => {
    const result = await nodeCompiler('function loop() {\n  let x = ;\n}\n');
    expect(result.bytecode).toBeNull();
    expect(result.stderr).toBe('Error: unexpected character in expression\n    at /main.js:2:3\n');
    expect(result.errors).toEqual([{ line: 2, message: 'unexpected character in expression' }]);
  });

  it('compiles again after a failure', async () => {
    await nodeCompiler('let = ;');
    expect((await nodeCompiler('function loop() {}\n')).bytecode).not.toBeNull();
  });
});
```

`src/features/scripts/model/mqjs-compiler.d.ts`:

```ts
/**
 * libamp's script compiler: vendor/mqjs/mqjs_wasm.js, an Emscripten ES module that Vite aliases
 * as `mqjs-compiler`. Generated code is never type-checked; this is the part of its API the app
 * uses.
 */
declare module 'mqjs-compiler' {
  export interface MqjsModule {
    readonly FS: {
      writeFile(path: string, data: string | Uint8Array): void;
      readFile(path: string): Uint8Array;
    };
    callMain(args: string[]): number;
  }

  export interface MqjsModuleOptions {
    print?: (text: string) => void;
    printErr?: (text: string) => void;
    /** Where `mqjs_wasm.wasm` is; next to the module (`import.meta.url`) by default. */
    locateFile?: (path: string, scriptDirectory: string) => string;
  }

  export default function createMqjsCompiler(options?: MqjsModuleOptions): Promise<MqjsModule>;
}
```

`src/features/scripts/testing/node-compiler.ts`:

```ts
/**
 * The real compiler in Vitest (jsdom or node): the Emscripten module reads its wasm from disk,
 * next to vendor/mqjs/mqjs_wasm.js. The app's build finds it through Vite (`compileScript`).
 */
import createMqjsCompiler from 'mqjs-compiler';
import { createCompiler, type Compile, type MqjsFactory } from '../model/compiler';

const createInstance: MqjsFactory = options =>
  createMqjsCompiler({ ...options, locateFile: (path, directory) => directory + path });

export const nodeCompiler: Compile = createCompiler(() => Promise.resolve(createInstance));
```

`vite.config.ts`: after the `controllerEntry` constant add

```ts
// libamp's script compiler (generated, see vendor/mqjs/PROVENANCE.md).
const mqjsEntry = fileURLToPath(new URL('./vendor/mqjs/mqjs_wasm.js', import.meta.url));
```

and make the alias `alias: { 'emi-keyboard-controller': controllerEntry, 'mqjs-compiler': mqjsEntry },`. In `workbox.globPatterns`, add `wasm` to the extensions: `'**/*.{js,css,html,svg,png,ico,json,woff,woff2,jpg,wasm}'` (the compiler works offline once the app is installed).

- [ ] **Step 5: Run them to see them fail**

Run: `npx vitest run src/features/scripts`
Expected: FAIL ("Cannot find module './compiler'", "./example").

- [ ] **Step 6: Implement the compiler wrapper and the example**

`src/features/scripts/model/compiler.ts`:

```ts
/**
 * libamp's script compiler (mqjs, vendor/mqjs): compiles a script to the bytecode AOT keyboards
 * run. Every compile gets a fresh instance (a second `callMain` on one instance fails) and runs it
 * as upstream does: `--no-column -m32 -o /out.bin /main.js` on its virtual file system. A failed
 * compile writes no `/out.bin` and prints ANSI-coloured errors such as
 * `Error: unexpected character in expression` and `    at /main.js:2:3`.
 */

/** The part of the Emscripten module the compiler uses. */
export interface MqjsInstance {
  readonly FS: {
    writeFile(path: string, data: string): void;
    readFile(path: string): Uint8Array;
  };
  callMain(args: string[]): number;
}

export interface MqjsOptions {
  readonly print: (text: string) => void;
  readonly printErr: (text: string) => void;
}

/** `createMqjsCompiler` of vendor/mqjs/mqjs_wasm.js, or a stand-in. */
export type MqjsFactory = (options: MqjsOptions) => Promise<MqjsInstance>;

export interface CompileError {
  /** 1-based line of the script, when the compiler names one. */
  readonly line: number | null;
  readonly message: string;
}

export interface CompileResult {
  /** Null when the script did not compile. */
  readonly bytecode: Uint8Array | null;
  readonly stdout: string;
  /** The compiler's error output, without colour codes. */
  readonly stderr: string;
  /** The errors of a failed compile; empty when it compiled. */
  readonly errors: readonly CompileError[];
}

export type Compile = (source: string) => Promise<CompileResult>;

export const COMPILER_ARGS: readonly string[] = [
  '--no-column',
  '-m32',
  '-o',
  '/out.bin',
  '/main.js',
];

// eslint-disable-next-line no-control-regex -- ANSI colour codes start with ESC (0x1b)
const ANSI_CODES = /\x1b\[[0-9;]*m/g;
const ERROR_LINE = /^[A-Za-z]*Error: (.*)$/;
const LOCATION_LINE = /^\s+at \/main\.js:(\d+)/;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_CODES, '');
}

/** Each `…Error: message` line, with the line of the `at /main.js:L` that follows it. */
export function parseCompileErrors(stderr: string): CompileError[] {
  const errors: CompileError[] = [];
  for (const text of stderr.split('\n')) {
    const error = ERROR_LINE.exec(text);
    if (error) {
      errors.push({ line: null, message: error[1] ?? '' });
      continue;
    }
    const location = LOCATION_LINE.exec(text);
    const last = errors.at(-1);
    if (location && last?.line === null) {
      errors[errors.length - 1] = { ...last, line: Number(location[1]) };
    }
  }
  if (errors.length === 0 && stderr.trim() !== '') {
    errors.push({ line: null, message: stderr.trim() });
  }
  return errors;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  // Emscripten's ExitStatus is no Error, but has a message.
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return String(error);
}

/** A compiler that loads the Emscripten module with `load` (once it is needed). */
export function createCompiler(load: () => Promise<MqjsFactory>): Compile {
  return async source => {
    const createInstance = await load();
    let stdout = '';
    let stderr = '';
    const instance = await createInstance({
      print: text => {
        stdout += `${text}\n`;
      },
      printErr: text => {
        stderr += `${text}\n`;
      },
    });
    instance.FS.writeFile('/main.js', source);
    try {
      instance.callMain([...COMPILER_ARGS]);
    } catch (error) {
      stderr += `${messageOf(error)}\n`;
    }
    let bytecode: Uint8Array | null;
    try {
      bytecode = instance.FS.readFile('/out.bin');
    } catch {
      bytecode = null;
    }
    const output = stripAnsi(stderr);
    return { bytecode, stdout, stderr: output, errors: bytecode ? [] : parseCompileErrors(output) };
  };
}
```

`src/features/scripts/model/example.ts`:

```ts
/**
 * The Scripts page's example ("Load example"): it does what the upstream configurator's demo
 * does — watch key 2 and, when it goes down, tap A for 100 ms and log it — in our own words.
 */
export const EXAMPLE_SCRIPT = `// Runs once when the script starts: report the presses of key 2.
keyboard.watch(2);

// Runs on every keyboard tick.
function loop() {}

// A watched key went down.
function onKeyDown(key) {
  if (key.id == 2) {
    // Tap A (keycode 0x04) for 100 ms and say so in the keyboard's console.
    keyboard.tap(0x0004, 100);
    console.log("Key " + key.id + " pressed");
  }
}

// A watched key went up.
function onKeyUp(key) {}
`;
```

`src/features/scripts/model/compiler-browser.ts`:

```ts
/** The app's compiler: vendor/mqjs, fetched with its wasm on the first compile. */
import { createCompiler, type Compile } from './compiler';

export const compileScript: Compile = createCompiler(
  async () => (await import('mqjs-compiler')).default
);
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/features/scripts`
Expected: PASS.

- [ ] **Step 8: Check and commit**

Run: `npm run typecheck && npx eslint src/features/scripts vite.config.ts && npx prettier --check src/features/scripts vite.config.ts`
Expected: no errors.

```bash
git add src/features/scripts vite.config.ts
git commit -m "feat(scripts): compile scripts with libamp's compiler"
```

---

### Task 8: Scripts model and the CodeMirror editor

The editor and its completions, the hex view and the buffer sizes. The completion list follows libamp's `mqjs_libamp_stdlib.c` at the compiler's commit rather than the spec's list where they differ: the firmware has no `keyboard.suspend` (commented out), `emit` is a method of keys (`key.emit`), the lighting object is `led` (not `LED`), and `script.c` also calls `onExit`.

**Files:**
- Modify: `package.json`, `package-lock.json` (CodeMirror)
- Create: `src/features/scripts/model/libamp-api.ts`, `libamp-api.test.ts`, `hex.ts`, `hex.test.ts`, `limits.ts`, `limits.test.ts`, `index.ts`
- Create: `src/features/scripts/components/script-editor/completions.ts`, `completions.test.ts`
- Create: `src/features/scripts/components/ScriptEditor.tsx`, `ScriptEditor.test.tsx`
- Create: `src/features/scripts/testing/codemirror-jsdom.ts`
- Modify: `docs/development.md`

**Interfaces:**
- Consumes: Task 7's compiler module.
- Produces (`features/scripts/model`): everything of `compiler.ts` and `example.ts`; `ScriptApiEntry { label; kind: ScriptApiKind; detail; info }`, `SCRIPT_GLOBALS`, `SCRIPT_CALLBACKS`, `SCRIPT_MEMBERS: Record<'keyboard' | 'led' | 'console', readonly ScriptApiEntry[]>`, `KEY_MEMBERS`; `formatHex(bytes: readonly number[], perLine = 16): string`; `SCRIPT_BUFFER_BYTES = 1024`, `scriptSourceBytes(source): number`, `exceedsScriptBuffer(bytes): boolean`.
- Produces: `libampCompletions(context: CompletionContext): CompletionResult | null`; `ScriptEditor` (default export) with `ScriptEditorProps { value; onChange(source); label; dark }`; testing helpers `installCodeMirrorShims(): () => void`, `setEditorText(element: HTMLElement, text: string): void`.

- [ ] **Step 1: Install CodeMirror**

Run: `npm install --save-exact codemirror@6.0.2 @codemirror/state@6.7.6 @codemirror/autocomplete@6.20.3 @codemirror/lang-javascript@6.2.5 @codemirror/theme-one-dark@6.1.3`
Expected: `package.json` `dependencies` list the five packages at exactly these versions; `package-lock.json` is updated (no install scripts run).

- [ ] **Step 2: Write the failing tests**

`src/features/scripts/model/libamp-api.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { KEY_MEMBERS, SCRIPT_CALLBACKS, SCRIPT_GLOBALS, SCRIPT_MEMBERS } from './libamp-api';

describe("libamp's script API", () => {
  it('lists the callbacks script.c calls', () => {
    expect(SCRIPT_CALLBACKS.map(entry => entry.label)).toEqual([
      'loop',
      'onKeyDown',
      'onKeyUp',
      'onExit',
    ]);
  });

  it('has the members of every global object', () => {
    const objects = SCRIPT_GLOBALS.filter(entry => entry.kind === 'variable').map(
      entry => entry.label
    );
    expect(objects).toEqual(['keyboard', 'led', 'console']);
    expect(Object.keys(SCRIPT_MEMBERS)).toEqual(objects);
  });

  it('follows the firmware where the spec named other functions', () => {
    const keyboard = SCRIPT_MEMBERS.keyboard.map(entry => entry.label);
    expect(keyboard).toEqual(expect.arrayContaining(['watch', 'getKey', 'tap', 'getLayerIndex']));
    // Commented out in mqjs_libamp_stdlib.c; `emit` is a method of keys.
    expect(keyboard).not.toContain('suspend');
    expect(keyboard).not.toContain('emit');
    expect(KEY_MEMBERS.map(entry => entry.label)).toContain('emit');
    expect(SCRIPT_MEMBERS.led.map(entry => entry.label)).toEqual(['setRGB', 'setHSV', 'setMode']);
    expect(SCRIPT_MEMBERS.console.map(entry => entry.label)).toEqual(['log']);
  });

  it('names every entry once in its scope', () => {
    const scopes = [
      [...SCRIPT_GLOBALS, ...SCRIPT_CALLBACKS],
      ...Object.values(SCRIPT_MEMBERS),
      KEY_MEMBERS,
    ];
    for (const entries of scopes) {
      const labels = entries.map(entry => entry.label);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });
});
```

`src/features/scripts/model/hex.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatHex } from './hex';

describe('formatHex', () => {
  it('writes 16 bytes a line after their offset', () => {
    const bytes = [0xfb, 0xac, 0x01, 0x00, ...Array.from({ length: 12 }, () => 0x0a), 0xff];
    expect(formatHex(bytes)).toBe(
      '0000  fb ac 01 00 0a 0a 0a 0a 0a 0a 0a 0a 0a 0a 0a 0a\n0010  ff'
    );
    expect(formatHex([1, 2, 3], 2)).toBe('0000  01 02\n0002  03');
    expect(formatHex([])).toBe('');
  });
});
```

`src/features/scripts/model/limits.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SCRIPT_BUFFER_BYTES, exceedsScriptBuffer, scriptSourceBytes } from './limits';

describe('script limits', () => {
  it("count the source in UTF-8 with the controller's terminating NUL", () => {
    expect(scriptSourceBytes('')).toBe(1);
    expect(scriptSourceBytes('abc')).toBe(4);
    expect(scriptSourceBytes('é')).toBe(3);
  });

  it("compare with libamp's default 1 KB buffers", () => {
    expect(SCRIPT_BUFFER_BYTES).toBe(1024);
    expect(exceedsScriptBuffer(1024)).toBe(false);
    expect(exceedsScriptBuffer(1025)).toBe(true);
  });
});
```

`src/features/scripts/components/script-editor/completions.test.ts`:

```ts
import { CompletionContext } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { libampCompletions } from './completions';

/** The completions at the end of `doc`. */
function complete(doc: string, explicit = false) {
  const state = EditorState.create({ doc, extensions: [javascript()] });
  return libampCompletions(new CompletionContext(state, doc.length, explicit));
}

function labels(doc: string, explicit = false): string[] | undefined {
  return complete(doc, explicit)?.options.map(option => option.label);
}

describe('libampCompletions', () => {
  it('completes the members of keyboard, led and console after their dot', () => {
    expect(labels('keyboard.')).toEqual(
      expect.arrayContaining(['watch', 'getKey', 'tap', 'press', 'release', 'getLayerIndex'])
    );
    expect(complete('  keyboard.ta')?.from).toBe('  keyboard.'.length);
    expect(labels('led.')).toEqual(['setRGB', 'setHSV', 'setMode']);
    expect(labels('console.')).toEqual(['log']);
  });

  it("completes a key's members after key.", () => {
    expect(labels('function onKeyDown(key) { key.')).toEqual(
      expect.arrayContaining(['id', 'state', 'reportState', 'emit', 'value'])
    );
  });

  it('completes the globals and callbacks at the start of a name', () => {
    expect(labels('ke')).toEqual([
      'keyboard',
      'led',
      'console',
      'Key',
      'setTimeout',
      'clearTimeout',
      'loop',
      'onKeyDown',
      'onKeyUp',
      'onExit',
    ]);
    expect(complete('function ke')?.from).toBe('function '.length);
  });

  it('offers nothing for other objects, nor unasked without a name', () => {
    expect(complete('foo.')).toBeNull();
    expect(complete('')).toBeNull();
    expect(complete('x = ')).toBeNull();
    expect(labels('', true)).toContain('keyboard');
  });
});
```

`src/features/scripts/components/ScriptEditor.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { EditorView } from 'codemirror';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { installCodeMirrorShims, setEditorText } from '../testing/codemirror-jsdom';
import ScriptEditor from './ScriptEditor';

let uninstallShims: () => void;
beforeAll(() => {
  uninstallShims = installCodeMirrorShims();
});
afterAll(() => {
  uninstallShims();
});

function viewOf(content: HTMLElement): EditorView {
  const root = content.closest<HTMLElement>('.cm-editor');
  const view = root ? EditorView.findFromDOM(root) : null;
  if (!view) throw new Error('no editor');
  return view;
}

describe('ScriptEditor', () => {
  it('shows the text in a textbox named by its label', () => {
    render(
      <ScriptEditor value="keyboard.watch(2);" onChange={vi.fn()} label="Script" dark={false} />
    );
    const content = screen.getByRole('textbox', { name: 'Script' });
    expect(viewOf(content).state.doc.toString()).toBe('keyboard.watch(2);');
  });

  it('reports edits, but not the values it is given', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ScriptEditor value="a" onChange={onChange} label="Script" dark={false} />
    );
    const content = screen.getByRole('textbox', { name: 'Script' });

    setEditorText(content, 'function loop() {}');
    expect(onChange).toHaveBeenCalledWith('function loop() {}');

    onChange.mockClear();
    rerender(<ScriptEditor value="b" onChange={onChange} label="Script" dark={false} />);
    expect(viewOf(content).state.doc.toString()).toBe('b');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('follows the dark mode and the label', () => {
    const { rerender } = render(
      <ScriptEditor value="" onChange={vi.fn()} label="Script" dark={false} />
    );
    const content = screen.getByRole('textbox', { name: 'Script' });
    expect(viewOf(content).state.facet(EditorView.darkTheme)).toBe(false);

    rerender(<ScriptEditor value="" onChange={vi.fn()} label="脚本" dark />);

    expect(viewOf(content).state.facet(EditorView.darkTheme)).toBe(true);
    expect(screen.getByRole('textbox', { name: '脚本' })).toBe(content);
  });
});
```

`src/features/scripts/testing/codemirror-jsdom.ts`:

```ts
/**
 * CodeMirror in jsdom: jsdom has no layout, and its Range lacks the geometry CodeMirror measures.
 * `installCodeMirrorShims` adds empty rectangles (call it in `beforeAll`, its undo in
 * `afterAll`); `setEditorText` replaces an editor's text as typing would.
 */
import { EditorView } from 'codemirror';

export function installCodeMirrorShims(): () => void {
  const rects = Object.getOwnPropertyDescriptor(Range.prototype, 'getClientRects');
  const box = Object.getOwnPropertyDescriptor(Range.prototype, 'getBoundingClientRect');
  Range.prototype.getClientRects = function getClientRects() {
    return document.createElement('div').getClientRects();
  };
  Range.prototype.getBoundingClientRect = function getBoundingClientRect() {
    return document.createElement('div').getBoundingClientRect();
  };
  return () => {
    const originals = [
      ['getClientRects', rects],
      ['getBoundingClientRect', box],
    ] as const;
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(Range.prototype, name, descriptor);
      else Reflect.deleteProperty(Range.prototype, name);
    }
  };
}

/** Replaces the text of the editor that `element` is part of, as typing it would. */
export function setEditorText(element: HTMLElement, text: string): void {
  const root = element.closest<HTMLElement>('.cm-editor');
  const view = root ? EditorView.findFromDOM(root) : null;
  if (!view) throw new Error('setEditorText: the element is not in a CodeMirror editor');
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
    userEvent: 'input.type',
  });
}
```

- [ ] **Step 3: Run them to see them fail**

Run: `npx vitest run src/features/scripts`
Expected: FAIL (missing modules `./libamp-api`, `./hex`, `./limits`, `./completions`, `./ScriptEditor`); the Task 7 tests still pass.

- [ ] **Step 4: Implement the model**

`src/features/scripts/model/libamp-api.ts`:

```ts
/**
 * The script API of libamp's firmware, which the editor completes: the globals and members of
 * `src/mquickjs/mqjs_libamp_stdlib.c` and `mqjs_stdlib.c`, and the callbacks `src/script.c`
 * calls, at the commit vendor/mqjs is built from (8f9c439). There `keyboard.suspend` is commented
 * out, `emit` is a method of keys and the lighting object is `led`. Building the compiler from
 * another commit means checking this list against that commit.
 */
export type ScriptApiKind = 'variable' | 'class' | 'function' | 'method' | 'property';

export interface ScriptApiEntry {
  /** The name as typed at the top level or after its object. */
  readonly label: string;
  readonly kind: ScriptApiKind;
  /** The parameters, e.g. `(keycode, ms = 100)`; empty for values. */
  readonly detail: string;
  readonly info: string;
}

/** Globals of a script. */
export const SCRIPT_GLOBALS: readonly ScriptApiEntry[] = [
  {
    label: 'keyboard',
    kind: 'variable',
    detail: '',
    info: 'The keyboard: keys, keycodes, layers and commands.',
  },
  { label: 'led', kind: 'variable', detail: '', info: 'The lighting of each key (RGB keyboards).' },
  { label: 'console', kind: 'variable', detail: '', info: "Output to the keyboard's console." },
  { label: 'Key', kind: 'class', detail: '(id)', info: 'The key with this ID: new Key(2).' },
  {
    label: 'setTimeout',
    kind: 'function',
    detail: '(callback, ms)',
    info: 'Calls callback once, ms milliseconds later; returns the timer ID.',
  },
  { label: 'clearTimeout', kind: 'function', detail: '(id)', info: 'Cancels a setTimeout timer.' },
];

/** Functions the firmware calls when a script defines them. */
export const SCRIPT_CALLBACKS: readonly ScriptApiEntry[] = [
  { label: 'loop', kind: 'function', detail: '()', info: 'Runs on every keyboard tick.' },
  { label: 'onKeyDown', kind: 'function', detail: '(key)', info: 'A watched key went down.' },
  { label: 'onKeyUp', kind: 'function', detail: '(key)', info: 'A watched key went up.' },
  { label: 'onExit', kind: 'function', detail: '()', info: 'The script is stopped or restarted.' },
];

/** Members of the global objects. */
export const SCRIPT_MEMBERS: Readonly<
  Record<'keyboard' | 'led' | 'console', readonly ScriptApiEntry[]>
> = {
  keyboard: [
    {
      label: 'watch',
      kind: 'method',
      detail: '(...ids)',
      info: 'Calls onKeyDown and onKeyUp for these keys (IDs or arrays of IDs).',
    },
    { label: 'getKey', kind: 'method', detail: '(id)', info: 'The key with this ID.' },
    {
      label: 'tap',
      kind: 'method',
      detail: '(keycode, ms = 100)',
      info: 'Presses keycode and releases it ms milliseconds later.',
    },
    {
      label: 'press',
      kind: 'method',
      detail: '(keycode)',
      info: 'Presses keycode until release(keycode).',
    },
    { label: 'release', kind: 'method', detail: '(keycode)', info: 'Releases keycode.' },
    { label: 'getLayerIndex', kind: 'method', detail: '()', info: 'The current layer.' },
    { label: 'getTick', kind: 'method', detail: '()', info: 'Ticks since the keyboard started.' },
    {
      label: 'getTime',
      kind: 'method',
      detail: '()',
      info: 'Milliseconds since the keyboard started.',
    },
    { label: 'setProfile', kind: 'method', detail: '(index)', info: 'Switches to profile index.' },
    {
      label: 'command',
      kind: 'method',
      detail: '(code)',
      info: 'Runs a keyboard operation by its code.',
    },
    { label: 'save', kind: 'method', detail: '()', info: 'Saves the configuration.' },
    { label: 'reboot', kind: 'method', detail: '()', info: 'Restarts the keyboard.' },
    {
      label: 'enterBootloader',
      kind: 'method',
      detail: '()',
      info: 'Restarts the keyboard into its bootloader.',
    },
    {
      label: 'resetToDefault',
      kind: 'method',
      detail: '()',
      info: 'Resets the configuration to its defaults.',
    },
    { label: 'factory_reset', kind: 'method', detail: '()', info: 'Erases every setting.' },
  ],
  led: [
    {
      label: 'setRGB',
      kind: 'method',
      detail: '(index, r, g, b)',
      info: 'Sets the colour of LED index.',
    },
    {
      label: 'setHSV',
      kind: 'method',
      detail: '(index, h, s, v)',
      info: 'Sets the colour of LED index from hue, saturation and value.',
    },
    {
      label: 'setMode',
      kind: 'method',
      detail: '(index, mode)',
      info: 'Sets the lighting mode of LED index.',
    },
  ],
  console: [
    {
      label: 'log',
      kind: 'method',
      detail: '(...values)',
      info: "Prints the values to the keyboard's console.",
    },
  ],
};

const ANALOG_PROPERTIES = [
  'value',
  'raw',
  'extremum',
  'difference',
  'mode',
  'calibrationMode',
  'activationValue',
  'deactivationValue',
  'triggerDistance',
  'releaseDistance',
  'triggerSpeed',
  'releaseSpeed',
  'upperDeadzone',
  'lowerDeadzone',
  'upperBound',
  'lowerBound',
] as const;

/** Members of keys: `onKeyDown(key)`, `onKeyUp(key)`, `keyboard.getKey(id)`, `new Key(id)`. */
export const KEY_MEMBERS: readonly ScriptApiEntry[] = [
  { label: 'id', kind: 'property', detail: '', info: 'The key ID.' },
  // The firmware's `state` reads the report state and `reportState` the switch state.
  { label: 'state', kind: 'property', detail: '', info: 'Whether the key is reported pressed.' },
  { label: 'reportState', kind: 'property', detail: '', info: 'Whether the switch is pressed.' },
  {
    label: 'emit',
    kind: 'method',
    detail: '(event = 3, keycode)',
    info: "Sends a key event (3 press, 1 release) with the key's keycode, or keycode.",
  },
  ...ANALOG_PROPERTIES.map(
    (label): ScriptApiEntry => ({ label, kind: 'property', detail: '', info: 'Analog keys only.' })
  ),
];
```

`src/features/scripts/model/hex.ts`:

```ts
/** Bytes as lines of `perLine`: the offset, then the bytes, e.g. `0000  fb ac 01 00`. */
export function formatHex(bytes: readonly number[], perLine = 16): string {
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += perLine) {
    const row = bytes
      .slice(offset, offset + perLine)
      .map(byte => byte.toString(16).padStart(2, '0'));
    lines.push(`${offset.toString(16).padStart(4, '0')}  ${row.join(' ')}`);
  }
  return lines.join('\n');
}
```

`src/features/scripts/model/limits.ts`:

```ts
/** libamp's default script buffers (`SCRIPT_SOURCE_BUFFER_SIZE`, `SCRIPT_BYTECODE_BUFFER_SIZE`). */
export const SCRIPT_BUFFER_BYTES = 1024;

/** The bytes a source takes on the keyboard: UTF-8 and the NUL the controller appends. */
export function scriptSourceBytes(source: string): number {
  return new TextEncoder().encode(source).length + 1;
}

/** More than libamp's default buffer holds; a firmware may use other sizes, so only a warning. */
export function exceedsScriptBuffer(bytes: number): boolean {
  return bytes > SCRIPT_BUFFER_BYTES;
}
```

`src/features/scripts/model/index.ts`:

```ts
export {
  COMPILER_ARGS,
  createCompiler,
  parseCompileErrors,
  stripAnsi,
  type Compile,
  type CompileError,
  type CompileResult,
  type MqjsFactory,
  type MqjsInstance,
  type MqjsOptions,
} from './compiler';
export { EXAMPLE_SCRIPT } from './example';
export { formatHex } from './hex';
export {
  KEY_MEMBERS,
  SCRIPT_CALLBACKS,
  SCRIPT_GLOBALS,
  SCRIPT_MEMBERS,
  type ScriptApiEntry,
  type ScriptApiKind,
} from './libamp-api';
export { SCRIPT_BUFFER_BYTES, exceedsScriptBuffer, scriptSourceBytes } from './limits';
```

(`compiler-browser.ts` stays out of the index: importing the model never pulls in the compiler.)

- [ ] **Step 5: Implement the completions and the editor**

`src/features/scripts/components/script-editor/completions.ts`:

```ts
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import {
  KEY_MEMBERS,
  SCRIPT_CALLBACKS,
  SCRIPT_GLOBALS,
  SCRIPT_MEMBERS,
  type ScriptApiEntry,
} from '../../model';

const IDENTIFIER = /^[\w$]*$/;

function completion(entry: ScriptApiEntry): Completion {
  return { label: entry.label, type: entry.kind, detail: entry.detail, info: entry.info };
}

const TOP_LEVEL: readonly Completion[] = [...SCRIPT_GLOBALS, ...SCRIPT_CALLBACKS].map(completion);
const MEMBERS: ReadonlyMap<string, readonly Completion[]> = new Map([
  ...Object.entries(SCRIPT_MEMBERS).map(
    ([object, entries]): [string, readonly Completion[]] => [object, entries.map(completion)]
  ),
  // Keys, by the callbacks' parameter name in the example.
  ['key', KEY_MEMBERS.map(completion)],
]);

/**
 * Completes libamp's script API: the globals and callbacks at the start of a name, the members of
 * `keyboard.`, `led.` and `console.`, and the members of keys after `key.`.
 */
export function libampCompletions(context: CompletionContext): CompletionResult | null {
  const member = context.matchBefore(/[A-Za-z_$][\w$]*\.[\w$]*/);
  if (member) {
    const dot = member.text.indexOf('.');
    const options = MEMBERS.get(member.text.slice(0, dot));
    return options ? { from: member.from + dot + 1, options, validFor: IDENTIFIER } : null;
  }
  const word = context.matchBefore(/[A-Za-z_$][\w$]*/);
  if (!word && !context.explicit) return null;
  return { from: word ? word.from : context.pos, options: TOP_LEVEL, validFor: IDENTIFIER };
}
```

`src/features/scripts/components/ScriptEditor.tsx`:

```tsx
/**
 * The script editor: CodeMirror 6 with JavaScript highlighting, auto-indent, search and the
 * completion of libamp's script API. The Scripts page loads it lazily, so CodeMirror is fetched
 * with that page only.
 */
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { Compartment, EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, basicSetup } from 'codemirror';
import { useEffect, useRef, useState } from 'react';
import { libampCompletions } from './script-editor/completions';

export interface ScriptEditorProps {
  readonly value: string;
  /** Called with the text after each edit made in the editor (not for new `value`s). */
  readonly onChange: (source: string) => void;
  /** The editor's accessible name. */
  readonly label: string;
  readonly dark: boolean;
}

export default function ScriptEditor({ value, onChange, label, dark }: ScriptEditorProps) {
  const parent = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const [theme] = useState(() => new Compartment());
  const [name] = useState(() => new Compartment());
  // The editor is created once: its first state and its listener read the latest props here.
  const latest = useRef({ value, onChange, label, dark });
  useEffect(() => {
    latest.current = { value, onChange, label, dark };
  });

  useEffect(() => {
    const element = parent.current;
    if (!element) return;
    const initial = latest.current;
    const editor = new EditorView({
      parent: element,
      state: EditorState.create({
        doc: initial.value,
        extensions: [
          basicSetup,
          javascript(),
          javascriptLanguage.data.of({ autocomplete: libampCompletions }),
          name.of(EditorView.contentAttributes.of({ 'aria-label': initial.label })),
          theme.of(initial.dark ? oneDark : []),
          EditorView.updateListener.of(update => {
            if (!update.docChanged) return;
            const text = update.state.doc.toString();
            // A new `value` is no edit.
            if (text !== latest.current.value) latest.current.onChange(text);
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, [theme, name]);

  // A new `value` (an opened file, the example) replaces the text.
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: theme.reconfigure(dark ? oneDark : []) });
  }, [dark, theme]);

  useEffect(() => {
    view.current?.dispatch({
      effects: name.reconfigure(EditorView.contentAttributes.of({ 'aria-label': label })),
    });
  }, [label, name]);

  return (
    <div
      ref={parent}
      className="min-h-[24rem] flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm [&_.cm-editor]:h-full"
    />
  );
}
```

`docs/development.md`, section "Script compiler": add the bullet

```markdown
- The editor completes libamp's script API from `src/features/scripts/model/libamp-api.ts`,
  taken from the pinned commit's `src/mquickjs/mqjs_libamp_stdlib.c` and `src/script.c`.
  Moving `build.sh` to another commit means checking that list against it.
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/features/scripts`
Expected: PASS.

- [ ] **Step 7: Check and commit**

Run: `npm run typecheck && npx eslint src/features/scripts && npx prettier --check src/features/scripts docs/development.md package.json`
Expected: no errors.

```bash
git add package.json package-lock.json src/features/scripts docs/development.md
git commit -m "feat(scripts): CodeMirror editor that completes libamp's script API"
```

---

### Task 9: The Scripts page

**Files:**
- Create: `src/features/scripts/components/styles.ts`, `src/features/scripts/components/ScriptWorkspace.tsx`
- Create: `src/features/scripts/ScriptsPage.tsx`, `src/features/scripts/ScriptsPage.test.tsx`, `src/features/scripts/index.ts`
- Modify: `src/lib/i18n/en.ts`, `zh.ts`, `i18n.test.tsx`

**Interfaces:**
- Consumes: `deviceSession.setScript`, `useFeatureFlags`, `useDeviceStore`, `useDeviceLoads`, `supportsScripts` (Tasks 2–3); `UnsupportedFeature` (Task 6); the scripts model, `compileScript`, `ScriptEditor` and the test helpers (Tasks 7–8).
- Produces: `ScriptsPage` with `ScriptsPageProps { compile?: Compile }` (`features/scripts` index; the route renders it without props, so it compiles with `compileScript`); `ScriptWorkspace` with `ScriptWorkspaceProps { initialSource; bytecode; aot; compile }`; translation keys `scripts.*` below.

- [ ] **Step 1: Write the failing tests**

`src/features/scripts/ScriptsPage.test.tsx`:

```tsx
/**
 * Scripts page against the real device layer (a virtual Trinity Pad, an AOT keyboard) and the
 * real compiler (vendor/mqjs, read from disk). The editor is CodeMirror in jsdom.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest';
import { connectVirtualKeyboard, type ConnectedKeyboard } from '../../testing/app-keyboard';
import { deviceStore } from '../device';
import { ScriptWorkspace } from './components/ScriptWorkspace';
import { EXAMPLE_SCRIPT, type Compile } from './model';
import { ScriptsPage } from './ScriptsPage';
import { installCodeMirrorShims, setEditorText } from './testing/codemirror-jsdom';
import { nodeCompiler } from './testing/node-compiler';

const BROKEN = 'function loop() {\n  let x = ;\n}\n';
/** Compiling waits 500 ms for the edits to pause; a busy machine needs more. */
const COMPILED = { timeout: 5_000 };

let uninstallShims: () => void;
beforeAll(() => {
  uninstallShims = installCodeMirrorShims();
});
afterAll(() => {
  uninstallShims();
});

function renderPage(compile: Compile = nodeCompiler) {
  return render(
    <MemoryRouter>
      <ScriptsPage compile={compile} />
    </MemoryRouter>
  );
}

/** The editor, once its chunk has loaded. */
function editor(): Promise<HTMLElement> {
  return screen.findByRole('textbox', { name: 'Script' });
}

function staged() {
  return deviceStore.getState().config?.script;
}

it('renders nothing until a keyboard configuration is loaded', () => {
  const { container } = renderPage();
  expect(container).toBeEmptyDOMElement();
});

it('says when the keyboard does not support scripts (Zellia Starlight)', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false });
  onTestFinished(keyboard.dispose);

  renderPage();

  expect(
    screen.getByRole('heading', { name: 'This keyboard does not support scripts' })
  ).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

describe('ScriptsPage (Trinity Pad, AOT)', { timeout: 20_000 }, () => {
  let keyboard: ConnectedKeyboard;

  beforeEach(async () => {
    // The vendored controller logs every load step.
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    keyboard = await connectVirtualKeyboard({ model: 'trinity-pad', seedDynamicKeys: false });
  });

  afterEach(() => {
    keyboard.dispose();
  });

  it('compiles the example after the edit and stages it with its bytecode', async () => {
    const user = userEvent.setup();
    renderPage();
    await editor();
    expect(staged()).toEqual({ source: '', bytecode: [] });

    await user.click(screen.getByRole('button', { name: 'Load example' }));

    expect(screen.getByRole('status')).toHaveTextContent('Compiling…');
    await screen.findByText(/^Compiled: \d+ bytes — sent to the keyboard on Save$/, {}, COMPILED);
    expect(staged()?.source).toBe(EXAMPLE_SCRIPT);
    expect(staged()?.bytecode.slice(0, 2)).toEqual([0xfb, 0xac]);
    const bytes = staged()?.bytecode.length ?? 0;
    expect(screen.getByRole('status')).toHaveTextContent(
      `Compiled: ${bytes} bytes — sent to the keyboard on Save`
    );
    expect(screen.getByText(`Bytecode (${bytes} bytes)`)).toBeInTheDocument();
    expect(deviceStore.getState().unsaved).toBe(true);
  });

  it('shows the errors with their lines and keeps the last compiled script staged', async () => {
    renderPage();
    const content = await editor();
    act(() => {
      setEditorText(content, 'function loop() {}\n');
    });
    await screen.findByText(/^Compiled: \d+ bytes/, {}, COMPILED);
    const compiled = staged();

    act(() => {
      setEditorText(content, BROKEN);
    });

    await screen.findByText('Errors: fix them to send this script', {}, COMPILED);
    expect(screen.getByText('Line 2: unexpected character in expression')).toBeInTheDocument();
    expect(staged()).toEqual(compiled);
    expect(compiled?.source).toBe('function loop() {}\n');
  });

  it('compiles once the edits pause', async () => {
    const compile = vi.fn<Compile>(nodeCompiler);
    renderPage(compile);
    const content = await editor();

    act(() => {
      setEditorText(content, 'function loop() {');
    });
    act(() => {
      setEditorText(content, 'function loop() {}');
    });

    await screen.findByText(/^Compiled: \d+ bytes/, {}, COMPILED);
    expect(compile).toHaveBeenCalledTimes(1);
    expect(compile).toHaveBeenCalledWith('function loop() {}');
  });

  it("warns when the script or its bytecode exceed libamp's default 1 KB buffers", async () => {
    renderPage();
    const content = await editor();

    // 1117 bytes and the terminating NUL; the bytecode holds the 1100-character string as well.
    act(() => {
      setEditorText(content, `console.log("${'x'.repeat(1100)}");\n`);
    });

    await screen.findByText(/^Compiled: \d+ bytes/, {}, COMPILED);
    expect(
      screen.getByText('The script is 1118 bytes; libamp keyboards hold 1024 by default.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/^The bytecode is \d+ bytes; libamp keyboards hold 1024 by default\.$/)
    ).toBeInTheDocument();
  });

  it('opens a .js file in the editor and saves the text as script.js', async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation(object => {
      if (object instanceof Blob) blobs.push(object);
      return 'blob:script';
    });
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const downloads: { href: string; download: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloads.push({ href: this.href, download: this.download });
    });
    renderPage();
    const content = await editor();

    await user.upload(
      screen.getByLabelText('Open .js'),
      new File(['function loop() {}\n'], 'mine.js', { type: 'text/javascript' })
    );
    await waitFor(() => {
      expect(content).toHaveTextContent('function loop() {}');
    });
    await user.click(screen.getByRole('button', { name: 'Save .js' }));

    expect(downloads).toEqual([{ href: 'blob:script', download: 'script.js' }]);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:script');
    expect(blobs[0]?.type).toBe('text/javascript');
    expect(await blobs[0]?.text()).toBe('function loop() {}\n');
  });

  it('stages the text as it is typed on keyboards that compile scripts themselves (JIT)', async () => {
    const compile = vi.fn<Compile>(nodeCompiler);
    render(<ScriptWorkspace initialSource="" bytecode={[]} aot={false} compile={compile} />);
    const content = await editor();
    expect(screen.getByRole('status')).toHaveTextContent(
      'This keyboard compiles scripts itself: the text is sent to it on Save.'
    );

    act(() => {
      setEditorText(content, 'function loop() {}');
    });

    expect(staged()).toEqual({ source: 'function loop() {}', bytecode: [] });
    expect(compile).not.toHaveBeenCalled();
    expect(screen.queryByText(/^Bytecode/)).not.toBeInTheDocument();
  });
});
```

`src/lib/i18n/i18n.test.tsx`: in the key-count test add the comment line `// + 16: the Scripts page (macros and scripts spec).` and add 16 to the number in `toHaveLength(…)`. Add:

```ts
  it('add the Scripts page copy (macros and scripts spec)', () => {
    expect(en).toMatchObject({
      'scripts.title': 'Scripts',
      'scripts.compiled': 'Compiled: {0} bytes — sent to the keyboard on Save',
      'scripts.failed': 'Errors: fix them to send this script',
    });
    expect(zh).toMatchObject({
      'scripts.title': '脚本',
      'scripts.unsupported': '此键盘不支持脚本',
    });
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/scripts/ScriptsPage.test.tsx src/lib/i18n`
Expected: FAIL ("Cannot find module './ScriptsPage'", missing keys).

- [ ] **Step 3: Add the copy**

`src/lib/i18n/en.ts`, appended at the end of the object:

```ts

  // Scripts page (macros and scripts spec)
  'scripts.title': 'Scripts',
  'scripts.saveHint': 'Script changes reach the keyboard when you press Save.',
  'scripts.unsupported': 'This keyboard does not support scripts',
  'scripts.editor': 'Script',
  'scripts.loadingEditor': 'Loading the editor…',
  'scripts.open': 'Open .js',
  'scripts.save': 'Save .js',
  'scripts.example': 'Load example',
  'scripts.compiling': 'Compiling…',
  'scripts.compiled': 'Compiled: {0} bytes — sent to the keyboard on Save',
  'scripts.failed': 'Errors: fix them to send this script',
  'scripts.errorLine': 'Line {0}: {1}',
  'scripts.jit': 'This keyboard compiles scripts itself: the text is sent to it on Save.',
  'scripts.sourceTooLarge': 'The script is {0} bytes; libamp keyboards hold {1} by default.',
  'scripts.bytecodeTooLarge': 'The bytecode is {0} bytes; libamp keyboards hold {1} by default.',
  'scripts.bytecode': 'Bytecode ({0} bytes)',
```

`src/lib/i18n/zh.ts`, appended at the end of the object:

```ts

  // Scripts page (macros and scripts spec)
  'scripts.title': '脚本',
  'scripts.saveHint': '按下「保存」后，脚本的更改才会发送到键盘。',
  'scripts.unsupported': '此键盘不支持脚本',
  'scripts.editor': '脚本',
  'scripts.loadingEditor': '正在加载编辑器…',
  'scripts.open': '打开 .js',
  'scripts.save': '保存 .js',
  'scripts.example': '加载示例',
  'scripts.compiling': '正在编译…',
  'scripts.compiled': '已编译：{0} 字节，按下「保存」后发送到键盘',
  'scripts.failed': '有错误：修正后才能发送此脚本',
  'scripts.errorLine': '第 {0} 行：{1}',
  'scripts.jit': '此键盘会自行编译脚本：按下「保存」后发送脚本文本。',
  'scripts.sourceTooLarge': '脚本为 {0} 字节；libamp 键盘默认最多容纳 {1} 字节。',
  'scripts.bytecodeTooLarge': '字节码为 {0} 字节；libamp 键盘默认最多容纳 {1} 字节。',
  'scripts.bytecode': '字节码（{0} 字节）',
```

- [ ] **Step 4: Implement the workspace and the page**

`src/features/scripts/components/styles.ts`:

```ts
/** Class names the Scripts page's components share (the app's secondary button). */
export const SECONDARY_BUTTON =
  'px-4 py-2 rounded-md border transition-colors text-sm font-medium text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed glassmorphism-button';
```

`src/features/scripts/components/ScriptWorkspace.tsx`:

```tsx
import { Suspense, lazy, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useT, type TranslationKey } from '../../../lib/i18n';
import { useDarkMode } from '../../../lib/theme';
import { deviceSession } from '../../device';
import {
  EXAMPLE_SCRIPT,
  SCRIPT_BUFFER_BYTES,
  exceedsScriptBuffer,
  formatHex,
  scriptSourceBytes,
  type Compile,
  type CompileError,
} from '../model';
import { SECONDARY_BUTTON } from './styles';

const ScriptEditor = lazy(() => import('./ScriptEditor'));

/** The pause after the last edit before the page compiles (spec). */
const COMPILE_DELAY_MS = 500;

type CompileStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'compiling' }
  | { readonly kind: 'compiled'; readonly bytes: number }
  | { readonly kind: 'failed'; readonly errors: readonly CompileError[] };

type Translate = (key: TranslationKey, ...args: string[]) => string;

function statusText(t: Translate, aot: boolean, status: CompileStatus): string {
  if (!aot) return t('scripts.jit');
  switch (status.kind) {
    case 'idle':
      return '';
    case 'compiling':
      return t('scripts.compiling');
    case 'compiled':
      return t('scripts.compiled', String(status.bytes));
    case 'failed':
      return t('scripts.failed');
  }
}

function downloadScript(source: string): void {
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'script.js';
  link.click();
  URL.revokeObjectURL(url);
}

export interface ScriptWorkspaceProps {
  /** The staged script's source: the editor's first text. */
  readonly initialSource: string;
  /** The staged bytecode. */
  readonly bytecode: readonly number[];
  /** An ahead-of-time keyboard: the page compiles; otherwise the keyboard does. */
  readonly aot: boolean;
  readonly compile: Compile;
}

/**
 * The editor, its file buttons, the compile status and the bytecode. AOT keyboards: the text is
 * compiled 500 ms after the last edit, and only a script that compiles is staged, with its
 * bytecode. JIT keyboards: the text is staged as it is typed.
 */
export function ScriptWorkspace({ initialSource, bytecode, aot, compile }: ScriptWorkspaceProps) {
  const t = useT();
  const { isDark } = useDarkMode();
  const fileInput = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState(initialSource);
  // The text waiting to be compiled; a new object for every edit, so each edit compiles.
  const [pending, setPending] = useState<{ readonly source: string } | null>(null);
  const [status, setStatus] = useState<CompileStatus>({ kind: 'idle' });

  useEffect(() => {
    if (pending === null) return;
    let current = true;
    const timer = setTimeout(() => {
      compile(pending.source).then(
        result => {
          if (!current) return;
          if (result.bytecode) {
            deviceSession.setScript({
              source: pending.source,
              bytecode: Array.from(result.bytecode),
            });
            setStatus({ kind: 'compiled', bytes: result.bytecode.length });
          } else {
            setStatus({ kind: 'failed', errors: result.errors });
          }
        },
        (error: unknown) => {
          if (!current) return;
          const message = error instanceof Error ? error.message : String(error);
          setStatus({ kind: 'failed', errors: [{ line: null, message }] });
        }
      );
    }, COMPILE_DELAY_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [pending, compile]);

  const edit = (next: string) => {
    setSource(next);
    if (aot) {
      setPending({ source: next });
      setStatus({ kind: 'compiling' });
    } else {
      deviceSession.setScript({ source: next, bytecode: [] });
    }
  };

  const openFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // The same file can be opened again.
    input.value = '';
    if (file) edit(await file.text());
  };

  const sourceBytes = scriptSourceBytes(source);
  const warnings: string[] = [];
  if (exceedsScriptBuffer(sourceBytes)) {
    warnings.push(
      t('scripts.sourceTooLarge', String(sourceBytes), String(SCRIPT_BUFFER_BYTES))
    );
  }
  if (aot && exceedsScriptBuffer(bytecode.length)) {
    warnings.push(
      t('scripts.bytecodeTooLarge', String(bytecode.length), String(SCRIPT_BUFFER_BYTES))
    );
  }

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={SECONDARY_BUTTON}
          onClick={() => {
            fileInput.current?.click();
          }}
        >
          {t('scripts.open')}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".js,text/javascript"
          className="hidden"
          aria-label={t('scripts.open')}
          onChange={event => {
            void openFile(event);
          }}
        />
        <button
          type="button"
          className={SECONDARY_BUTTON}
          onClick={() => {
            downloadScript(source);
          }}
        >
          {t('scripts.save')}
        </button>
        <button
          type="button"
          className={SECONDARY_BUTTON}
          onClick={() => {
            edit(EXAMPLE_SCRIPT);
          }}
        >
          {t('scripts.example')}
        </button>
      </div>
      <Suspense
        fallback={
          <div className="min-h-[24rem] flex-1 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">
            {t('scripts.loadingEditor')}
          </div>
        }
      >
        <ScriptEditor value={source} onChange={edit} label={t('scripts.editor')} dark={isDark} />
      </Suspense>
      <p
        role="status"
        className={`min-h-5 text-sm ${aot && status.kind === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}
      >
        {statusText(t, aot, status)}
      </p>
      {aot && status.kind === 'failed' && (
        <ul className="space-y-1 font-mono text-sm text-red-600 dark:text-red-400">
          {status.errors.map((error, index) => (
            <li key={index}>
              {error.line === null
                ? error.message
                : t('scripts.errorLine', String(error.line), error.message)}
            </li>
          ))}
        </ul>
      )}
      {warnings.map(warning => (
        <p key={warning} className="text-sm text-amber-600 dark:text-amber-400">
          {warning}
        </p>
      ))}
      {aot && bytecode.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-700 dark:text-gray-300">
            {t('scripts.bytecode', String(bytecode.length))}
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-100 dark:bg-gray-800 p-3 font-mono text-xs text-gray-800 dark:text-gray-200">
            {formatHex(bytecode)}
          </pre>
        </details>
      )}
    </div>
  );
}
```

`src/features/scripts/ScriptsPage.tsx`:

```tsx
import { ScriptLevel } from 'emi-keyboard-controller';
import { UnsupportedFeature } from '../../components/ui';
import { useT } from '../../lib/i18n';
import { useDeviceLoads, useDeviceStore, useFeatureFlags } from '../device';
import { supportsScripts } from '../device/model/capabilities';
import { ScriptWorkspace } from './components/ScriptWorkspace';
import type { Compile } from './model';
import { compileScript } from './model/compiler-browser';

export interface ScriptsPageProps {
  /** The compiler; by default the app's (vendor/mqjs, loaded on the first compile). */
  readonly compile?: Compile;
}

/**
 * Scripts route (macros and scripts spec): the keyboard's JavaScript in CodeMirror, compiled for
 * AOT keyboards with libamp's compiler and sent to the keyboard by Save. Shown in the sidebar
 * only for keyboards whose controller declares scripts.
 */
export function ScriptsPage({ compile = compileScript }: ScriptsPageProps) {
  const t = useT();
  const feature = useFeatureFlags();
  const script = useDeviceStore(state => state.config?.script);
  // Each configuration the keyboard loads (profile switch, reset) starts the editor over on it.
  const loads = useDeviceLoads();

  if (!feature || script === undefined) return null;
  if (!supportsScripts(feature) || !script) {
    return <UnsupportedFeature message={t('scripts.unsupported')} />;
  }

  return (
    <div
      className="rounded-2xl shadow mt-2 mb-4 grow bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col glassmorphism-card"
      style={{ padding: 'calc(2rem * var(--ui-scale, 1))' }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-4"
        style={{ marginBottom: 'calc(1rem * var(--ui-scale, 1))' }}
      >
        <h2
          className="font-bold text-black dark:text-white"
          style={{ fontSize: 'calc(1.5rem * var(--ui-scale, 1))' }}
        >
          {t('scripts.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('scripts.saveHint')}</p>
      </div>
      <ScriptWorkspace
        key={loads}
        initialSource={script.source}
        bytecode={script.bytecode}
        aot={feature.scriptLevel === ScriptLevel.AOT}
        compile={compile}
      />
    </div>
  );
}
```

`src/features/scripts/index.ts`:

```ts
/** Scripts feature: the Scripts page (macros and scripts spec). */
export { ScriptsPage, type ScriptsPageProps } from './ScriptsPage';
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/features/scripts src/lib/i18n`
Expected: PASS.

- [ ] **Step 6: Check and commit**

Run: `npm run typecheck && npx eslint src/features/scripts src/lib/i18n && npx prettier --check src/features/scripts src/lib/i18n`
Expected: no errors.

```bash
git add src/features/scripts src/lib/i18n/en.ts src/lib/i18n/zh.ts src/lib/i18n/i18n.test.tsx
git commit -m "feat(scripts): the Scripts page"
```

---

### Task 10: Sidebar entries and routes

"Macros" and "Scripts" follow "Dynamic Keys" in the sidebar while the connected keyboard supports them. Both pages hide the toolbar and the global keyboard, like Debug and Settings: neither edits keys of the layout, and the editor and the action table need the height.

**Files:**
- Modify: `src/app/navigation.ts`, `src/app/navigation.test.ts`
- Modify: `src/app/layout/Sidebar.tsx`, `src/app/layout/Sidebar.test.tsx`
- Modify: `src/app/pages.ts`, `src/app/pages.test.ts`, `src/app/routes.test.tsx`, `src/app/testing/render-app.tsx`
- Modify: `scripts/static-hosting.ts`, `scripts/static-hosting.test.ts`
- Modify: `src/lib/i18n/en.ts`, `zh.ts`, `i18n.test.tsx`
- Modify: `docs/architecture.md`, `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: `MacrosPage`, `ScriptsPage` (Tasks 6, 9); `useSupportsMacros`, `useSupportsScripts` (Task 2).
- Produces: `PageSupport { macros: boolean; scripts: boolean }`, `navigationFor(support: PageSupport)` (`app/navigation`); page paths `macros`, `scripts` (`PAGE_PATHS`, `STATIC_ROUTES`); `connectShellKeyboard(options?: VirtualKeyboardOptions)`; translation keys `nav.macros`, `nav.scripts`.

- [ ] **Step 1: Write the failing tests**

`src/app/navigation.test.ts`:

1. Add `navigationFor` and `type PageSupport` to the `./navigation` import.
2. In `usesSidebarLayout`'s first test, make the second list `['/settings/', '/about/', '/update/', '/profiles/', '/macros/', '/scripts/']`.
3. In `hidesToolbarAndKeyboard`, rename the test to "hides them on About, Profiles, Debug, Settings, Update, Macros and Scripts" and make the first list `['/about/', '/profiles/', '/debug/', '/settings/', '/update/', '/macros/', '/scripts/']`.
4. Add:

```ts
describe('navigationFor', () => {
  const hrefs = (support: PageSupport) => navigationFor(support).map(([href]) => href);

  it('lists Macros and Scripts after Dynamic Keys for keyboards that support them', () => {
    expect(hrefs({ macros: true, scripts: true })).toEqual([
      '/performance',
      '/remap',
      '/lighting',
      '/dynamic',
      '/macros',
      '/scripts',
      '/debug',
      '/settings',
      '/update',
      '/about',
    ]);
    expect(hrefs({ macros: true, scripts: false })).toContain('/macros');
    expect(hrefs({ macros: true, scripts: false })).not.toContain('/scripts');
  });

  it('leaves them out for keyboards without them', () => {
    expect(hrefs({ macros: false, scripts: false })).toEqual([
      '/performance',
      '/remap',
      '/lighting',
      '/dynamic',
      '/debug',
      '/settings',
      '/update',
      '/about',
    ]);
  });
});
```

`src/app/layout/Sidebar.test.tsx`, add to `describe('Sidebar')`:

```tsx
  it('shows Macros and Scripts after Dynamic Keys for keyboards that support them', async () => {
    await connectShellKeyboard({ model: 'trinity-pad' });
    renderApp('/remap/');

    expect(await screen.findByText('Trinity Pad')).toBeInTheDocument();
    const links = within(screen.getByRole('navigation')).getAllByRole('link');
    expect(links.map(link => link.textContent)).toEqual([
      'Performance',
      'Remap',
      'Lighting',
      'Dynamic Keys',
      'Macros',
      'Scripts',
      'Debug',
      'Settings',
      'Update',
      'About',
    ]);
  });

  it('shows neither for keyboards without them (Zellia Starlight)', async () => {
    await connectShellKeyboard();
    renderApp('/remap/');

    expect(await screen.findByText('ZelliaKB')).toBeInTheDocument();
    const navigation = within(screen.getByRole('navigation'));
    expect(navigation.queryByRole('link', { name: 'Macros' })).not.toBeInTheDocument();
    expect(navigation.queryByRole('link', { name: 'Scripts' })).not.toBeInTheDocument();
  });
```

`src/app/pages.test.ts`: in `spyLoaders`, add `macros: loader(),` and `scripts: loader(),` after `dynamic: loader(),`.

`src/app/routes.test.tsx`:

1. Add the imports `import { MacrosPage } from '../features/macros';` and `import { ScriptsPage } from '../features/scripts';` (after the `LightingPage` import).
2. In the expected object of `APP_PAGES`, add `macros: MacrosPage,` and `scripts: ScriptsPage,` after `dynamic: DynamicKeysPage,`.
3. Add to `describe('routes')`:

```tsx
  it('opens Macros and Scripts without the toolbar and the keyboard', async () => {
    await connectShellKeyboard({ model: 'trinity-pad' });
    const { container, router } = renderApp('/macros/');

    expect(await screen.findByTestId('page')).toHaveTextContent('macros page');
    expect(container.querySelector('.keycap')).toBeNull();

    await act(async () => {
      await router.navigate('/scripts/');
    });
    expect(await screen.findByTestId('page')).toHaveTextContent('scripts page');
    expect(container.querySelector('.keycap')).toBeNull();
  });
```

`scripts/static-hosting.test.ts`: in `STATIC_ROUTES`' expected list, add `'macros',` and `'scripts',` after `'dynamic',`.

`src/lib/i18n/i18n.test.tsx`: in the key-count test add the comment line `// + 2: the sidebar entries of the Macros and Scripts pages.` and add 2 to the number in `toHaveLength(…)`. Add:

```ts
  it('add the sidebar entries of the Macros and Scripts pages (macros and scripts spec)', () => {
    expect([en['nav.macros'], en['nav.scripts']]).toEqual(['Macros', 'Scripts']);
    expect([zh['nav.macros'], zh['nav.scripts']]).toEqual(['宏', '脚本']);
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/app src/lib/i18n scripts/static-hosting.test.ts`
Expected: FAIL (`navigationFor` is not exported, no Macros link, no `macros` loader or route, missing keys).

- [ ] **Step 3: Gate the sidebar entries**

`src/app/navigation.ts`:

1. In `NAVIGATE`, add `['/macros', 'nav.macros'],` and `['/scripts', 'nav.scripts'],` after `['/dynamic', 'nav.advancedkey'],`.
2. After `NAVIGATE` add:

```ts
/** What the connected keyboard supports, for the sidebar entries that need it. */
export interface PageSupport {
  readonly macros: boolean;
  readonly scripts: boolean;
}

/** Entries shown only while the keyboard supports their feature (macros and scripts spec). */
const REQUIRES: Readonly<Partial<Record<(typeof NAVIGATE)[number][0], keyof PageSupport>>> = {
  '/macros': 'macros',
  '/scripts': 'scripts',
};

/** The sidebar entries for a keyboard that supports `support`. */
export function navigationFor(support: PageSupport): readonly (typeof NAVIGATE)[number][] {
  return NAVIGATE.filter(([href]) => {
    const feature = REQUIRES[href];
    return feature === undefined || support[feature];
  });
}
```

3. In `SIDEBAR_PAGES`, add `'/macros',` and `'/scripts',` after `'/dynamic',`.
4. In `TOOLBAR_HIDDEN_PAGES`, add `'/macros',` and `'/scripts',` after `'/update',`.

`src/app/layout/Sidebar.tsx`:

1. Replace `import { deviceSession, useDeviceName, useDeviceStore, useIsReady } from '../../features/device';` with

```ts
import {
  deviceSession,
  useDeviceName,
  useDeviceStore,
  useIsReady,
  useSupportsMacros,
  useSupportsScripts,
} from '../../features/device';
```

2. Replace `import { NAVIGATE, isActivePage } from '../navigation';` with `import { isActivePage, navigationFor } from '../navigation';`.
3. After `const unsavedId = useId();` add:

```ts
  // Macros and Scripts only while the keyboard's controller declares them.
  const macros = useSupportsMacros();
  const scripts = useSupportsScripts();
```

4. Replace `{NAVIGATE.map(([href, name]) => {` with `{navigationFor({ macros, scripts }).map(([href, name]) => {`.

- [ ] **Step 4: Add the routes**

`src/app/pages.ts`:

1. In `PAGE_PATHS`, add `'macros',` and `'scripts',` after `'dynamic',`.
2. In `APP_PAGES`, add after the `dynamic` loader:

```ts
  macros: async () => (await import('../features/macros')).MacrosPage,
  scripts: async () => (await import('../features/scripts')).ScriptsPage,
```

`scripts/static-hosting.ts`: in `STATIC_ROUTES`, add `'macros',` and `'scripts',` after `'dynamic',`.

`src/app/testing/render-app.tsx`:

1. Replace `import { connectVirtualKeyboard, type ConnectedKeyboard } from '../../testing/app-keyboard';` with

```ts
import { connectVirtualKeyboard, type ConnectedKeyboard } from '../../testing/app-keyboard';
import type { VirtualKeyboardOptions } from '../../testing/virtual-keyboard';
```

2. In `standInPages()`, add `macros: standInPage('macros'),` and `scripts: standInPage('scripts'),` after `dynamic: standInPage('dynamic'),`.
3. Replace `connectShellKeyboard` with:

```ts
/**
 * Connects the app's session to a virtual keyboard (by default a Zellia Starlight) without seeded
 * dynamic keys; the keyboard is disconnected and removed when the test finishes.
 */
export async function connectShellKeyboard(
  options: VirtualKeyboardOptions = {}
): Promise<ConnectedKeyboard> {
  const keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false, ...options });
  onTestFinished(keyboard.dispose);
  return keyboard;
}
```

(`VirtualKeyboardOptions` is exported by `src/testing/virtual-keyboard/index.ts`, as `app-keyboard.ts` imports it.)

`src/lib/i18n/en.ts`, appended at the end of the object:

```ts

  // Sidebar: the Macros and Scripts pages (macros and scripts spec)
  'nav.macros': 'Macros',
  'nav.scripts': 'Scripts',
```

`src/lib/i18n/zh.ts`, appended at the end of the object:

```ts

  // Sidebar: the Macros and Scripts pages (macros and scripts spec)
  'nav.macros': '宏',
  'nav.scripts': '脚本',
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/app src/lib/i18n scripts/static-hosting.test.ts`
Expected: PASS.

- [ ] **Step 6: Update the docs**

`docs/architecture.md`:
- Layers block: after the `src-controller/` line add `vendor/mqjs/            libamp's script compiler, generated by npm run build:mqjs (never edited)`.
- Feature table: after the `dynamic-keys` row add

```markdown
| `macros`          | Macros page (slots, action table, recording), for keyboards that declare macros       |
| `scripts`         | Scripts page (CodeMirror, libamp's compiler in `vendor/mqjs/`), for script keyboards |
```

`README.md`:
- Key Features: after the "Dynamic keys" bullet add

```markdown
- **📜 Macros and scripts:** record macros on this computer's keyboard or build them key by key,
  and write JavaScript scripts that libamp's own compiler turns into bytecode, on keyboards whose
  firmware supports them (today the Trinity Pad; macros also the Oholeo).
```

- Project layout block: the `features/` lines become

```text
  features/       device (keyboard session), keyboard, keycodes, remap, performance, lighting,
                  dynamic-keys, macros, scripts, debug, profiles, settings, firmware-update,
                  about
```

`CLAUDE.md`, "Architecture":
- In the `src/features/<feature>/` bullet, "`dynamic-keys`, `debug`," becomes "`dynamic-keys`, `macros`, `scripts`, `debug`,".
- After the `src-controller/` bullet add: "- `vendor/mqjs/` — libamp's script compiler (WebAssembly, GPL-3.0), generated by `npm run build:mqjs` (see `vendor/mqjs/PROVENANCE.md`). **Do not edit it**; the Scripts page loads it through the `mqjs-compiler` alias."

Run: `npx prettier --write docs/architecture.md README.md CLAUDE.md`

- [ ] **Step 7: Check and commit**

Run: `npm run typecheck && npx eslint src/app src/lib/i18n scripts && npx prettier --check src/app src/lib/i18n scripts docs README.md CLAUDE.md`
Expected: no errors.

```bash
git add src/app/navigation.ts src/app/navigation.test.ts src/app/layout/Sidebar.tsx src/app/layout/Sidebar.test.tsx src/app/pages.ts src/app/pages.test.ts src/app/routes.test.tsx src/app/testing/render-app.tsx scripts/static-hosting.ts scripts/static-hosting.test.ts src/lib/i18n/en.ts src/lib/i18n/zh.ts src/lib/i18n/i18n.test.tsx docs/architecture.md README.md CLAUDE.md
git commit -m "feat(app): Macros and Scripts in the sidebar for keyboards that support them"
```

---

### Task 11: e2e journeys on the virtual Trinity Pad

**Files:**
- Modify: `src/testing/virtual-keyboard/handle.ts`
- Create: `e2e/macros-scripts.spec.ts`

**Interfaces:**
- Consumes: the pages and routes (Tasks 6–10).
- Produces: `VirtualKeyboardStateData.macros: WireMacroAction[][]` and `.scripts: { source: Uint8Array; bytecode: Uint8Array }` on the e2e handle (the device state already has both; the handle now types them).

- [ ] **Step 1: Type the macros and the script on the e2e handle**

`src/testing/virtual-keyboard/handle.ts`:

1. Add `WireMacroAction,` to the `./protocol` type import (after `WireDynamicKey,`).
2. In `VirtualKeyboardStateData`, after `profiles: VirtualProfileData[];` add:

```ts
  /** `[macro][entry]` as the firmware keeps them, end markers and empty entries included. */
  macros: WireMacroAction[][];
  /** The script source (with the NUL the controller appends) and bytecode as uploaded. */
  scripts: { source: Uint8Array; bytecode: Uint8Array };
```

Run: `npm run typecheck`
Expected: no errors (`VirtualKeyboard`'s state, `VirtualKeyboardState`, has both fields).

- [ ] **Step 2: Write the journeys**

`e2e/macros-scripts.spec.ts`:

```ts
import type { JSHandle, Page } from '@playwright/test';
import { expect, test, type VirtualKeyboard, type VirtualKeyboardHandle } from './fixtures';

type Keyboard = JSHandle<VirtualKeyboardHandle>;

/** libamp's key events on the wire and the keycodes of the journeys. */
const PRESS = 3;
const RELEASE = 1;
const LEFT_SHIFT = 0x0200;
const B = 0x05;

// The Trinity Pad's controller declares 4 macro slots and AOT scripts.
test.use({ virtualKeyboardOptions: { model: 'trinity-pad', seedDynamicKeys: false } });

/** Opens the app with the injected keyboard, clicks "Get Started" and waits for its keymap. */
async function connect(page: Page, virtualKeyboard: VirtualKeyboard): Promise<Keyboard> {
  await page.goto('/');
  const keyboard = await virtualKeyboard.handle();
  await page.getByRole('button', { name: 'Get Started' }).click();
  await page.waitForURL('**/remap/');
  await expect(page.locator('.keycap[data-key-id="0"]')).toHaveText('Z');
  return keyboard;
}

async function openSidebarPage(page: Page, name: string, path: string): Promise<void> {
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
}

async function save(page: Page): Promise<void> {
  await page.locator('.sidebar').getByRole('button', { name: 'Save' }).click();
}

test.describe('macros', () => {
  test('records a macro, edits it and saves it to the keyboard', async ({
    page,
    virtualKeyboard,
  }) => {
    const keyboard = await connect(page, virtualKeyboard);
    await openSidebarPage(page, 'Macros', '/macros/');
    await expect(page.getByText('0 / 127 actions')).toBeVisible();

    await page.getByRole('button', { name: 'Record' }).click();
    await page.keyboard.down('Shift');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Shift');
    await page.getByRole('button', { name: 'Stop' }).click();

    const rows = page.getByRole('table', { name: 'Macro 1' }).getByRole('row');
    // The header and Shift down, A down, A up, Shift up.
    await expect(rows).toHaveCount(5);
    for (const row of [2, 3]) {
      await rows.nth(row).getByRole('button', { name: 'A', exact: true }).click();
      await page
        .getByRole('dialog', { name: 'Choose a key' })
        .getByRole('button', { name: 'B', exact: true })
        .click();
    }
    await expect(page.getByLabel('Event of action 2')).toHaveValue('down');
    await save(page);

    await expect
      .poll(() =>
        keyboard.evaluate(vk =>
          vk.state.macros[0]
            ?.slice(0, 5)
            .map(entry => [entry.event, entry.keycode, entry.isVirtual] as const)
        )
      )
      .toEqual([
        [PRESS, LEFT_SHIFT, true],
        [PRESS, B, true],
        [RELEASE, B, true],
        [RELEASE, LEFT_SHIFT, true],
        // The end marker the firmware stops at.
        [0, 0, false],
      ]);
    const delays = await keyboard.evaluate(
      vk => vk.state.macros[0]?.slice(0, 5).map(entry => entry.delay) ?? []
    );
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(delays[4]).toBe(delays[3]);
  });
});

test.describe('scripts', () => {
  test('shows a compile error, compiles the fix and saves the source with its bytecode', async ({
    page,
    virtualKeyboard,
  }) => {
    const keyboard = await connect(page, virtualKeyboard);
    await openSidebarPage(page, 'Scripts', '/scripts/');
    const editor = page.getByRole('textbox', { name: 'Script' });

    await editor.fill('function loop() {\n  let x = ;\n}\n');
    await expect(page.getByText('Errors: fix them to send this script')).toBeVisible();
    await expect(page.getByText('Line 2: unexpected character in expression')).toBeVisible();

    await editor.fill('function loop() {\n  let x = 1;\n}\n');
    const status = page.getByRole('status');
    await expect(status).toHaveText(/^Compiled: \d+ bytes — sent to the keyboard on Save$/);
    const bytes = Number(/(\d+) bytes/.exec((await status.textContent()) ?? '')?.[1]);
    await save(page);

    await expect
      .poll(() =>
        keyboard.evaluate(vk =>
          new TextDecoder()
            .decode(vk.state.scripts.source)
            .replace(/\0$/, '')
            .replace(/\s+/g, ' ')
            .trim()
        )
      )
      .toBe('function loop() { let x = 1; }');
    const bytecode = await keyboard.evaluate(vk => Array.from(vk.state.scripts.bytecode));
    expect(bytecode).toHaveLength(bytes);
    expect(bytecode.slice(0, 2)).toEqual([0xfb, 0xac]);
  });
});
```

- [ ] **Step 3: Run the journeys**

Run (alone: it builds the app): `npm run test:e2e -- --workers=2 e2e/macros-scripts.spec.ts`
Expected: 2 passed.

- [ ] **Step 4: Check and commit**

Run: `npx eslint e2e src/testing && npx prettier --check e2e src/testing`
Expected: no errors.

```bash
git add src/testing/virtual-keyboard/handle.ts e2e/macros-scripts.spec.ts
git commit -m "test(e2e): record and save a macro, compile and save a script"
```

---

### Task 12: React-only parity scenarios

The Svelte app has no Macros or Scripts screens, so their parity scenarios cannot compare. A scenario marked `reactOnly` is captured in the React app only and reported as `new`, which the pipeline accepts.

**Files:**
- Modify: `e2e/parity/scenario.ts`
- Modify: `scripts/parity/scenarios.ts`, `scripts/parity/scenarios.test.ts`
- Modify: `scripts/parity/capture.ts`
- Modify: `scripts/parity/compare.mjs`, `scripts/parity/compare.test.ts`, `scripts/parity/run.mjs`
- Modify: `docs/development.md`

**Interfaces:**
- Produces: `ParityScenario.reactOnly?: boolean`; capture records with `reactOnly` and without `apps.baseline` for such scenarios; compare status `'new'`, `summary.totals.new`, `isParity(summary): boolean` (`compare.mjs`).

- [ ] **Step 1: Write the failing tests**

`scripts/parity/scenarios.test.ts`:

1. In "rejects malformed scenarios with their location", add `{ name: 'welcome', path: '/', reactOnly: 'yes' },` to `invalid`.
2. Add to `describe('validateScenarios')`:

```ts
  it('accepts React-only scenarios', () => {
    const [scenario] = validateScenarios([
      module('a.ts', { default: [{ name: 'macros-empty', path: '/', reactOnly: true }] }),
    ]);
    expect(scenario?.reactOnly).toBe(true);
  });
```

`scripts/parity/compare.test.ts`:

1. In `interface CaptureFixture`, add `reactOnly?: boolean;`.
2. In `parityDir`, replace the `const record = { … };` statement with

```ts
    const errors = (app: 'baseline' | 'react') => capture.errors?.[app] ?? [];
    const record = {
      id: capture.id,
      scenario,
      path: '/',
      ...(capture.reactOnly ? { reactOnly: true } : {}),
      theme: 'dark',
      language: 'en',
      viewport: { width: 1440, height: 900 },
      browser: { name: 'chromium', channel: 'chrome', version: '153.0.0.0' },
      capturedAt: '2026-09-30T00:00:00.000Z',
      apps: {
        ...(capture.reactOnly
          ? {}
          : {
              baseline: { url: 'http://localhost:4180/', status: 200, errors: errors('baseline') },
            }),
        react: { url: 'http://localhost:4273/', status: 200, errors: errors('react') },
      },
    };
```

3. In `interface Summary`, `totals` becomes `{ captures: number; identical: number; different: number; missing: number; new: number };`.
4. Add `new: 0` to the three `expect(summary.totals).toEqual({ … })` objects ("reports identical captures", "reports a capture missing on one side", "counts every changed pixel by default").
5. Add to `describe('compare.mjs')`:

```ts
  it('reports React-only screens as new and exits 0', async () => {
    const image = solid(4, 4, WHITE);
    const dir = await parityDir([
      { id: 'macros-empty--dark-en-1440x900', react: image, reactOnly: true },
      { id: 'welcome--dark-en-1440x900', baseline: image, react: image },
    ]);

    const { code, output } = await compare(dir);

    expect(code).toBe(0);
    expect(output).toContain('1 new');
    const summary = await readSummary(dir);
    expect(summary.totals).toEqual({
      captures: 2,
      identical: 1,
      different: 0,
      missing: 0,
      new: 1,
    });
    expect(summary.results[0]).toMatchObject({
      id: 'macros-empty--dark-en-1440x900',
      status: 'new',
      diff: null,
    });
    expect(await readFile(path.join(dir, 'index.html'), 'utf8')).toContain('React only');
  });

  it('reports a React-only screen without its capture as missing', async () => {
    const dir = await parityDir([{ id: 'macros-empty--dark-en-1440x900', reactOnly: true }]);

    const { code } = await compare(dir);

    expect(code).toBe(1);
    expect((await readSummary(dir)).results[0]?.status).toBe('missing');
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run scripts/parity/scenarios.test.ts scripts/parity/compare.test.ts`
Expected: FAIL (`reactOnly: 'yes'` is accepted; no `new` totals; the React-only capture is `missing`).

- [ ] **Step 3: Implement**

`e2e/parity/scenario.ts`: in the interface's comment, "One screen state captured in both the Svelte baseline and the React app" becomes "One screen state captured in both the Svelte baseline and the React app (or the React app only, `reactOnly`)"; add after `storage`:

```ts
  /**
   * A screen the Svelte app does not have (macros and scripts spec): captured in the React app
   * only and reported as `new`. Its parity-log row has an after-screenshot only.
   */
  readonly reactOnly?: boolean;
```

`scripts/parity/scenarios.ts`, `assertScenario`: destructure `reactOnly` as well (`const { name, path: scenarioPath, setup, virtualKeyboard, storage, reactOnly } = value;`) and add before `if (storage !== undefined) assertStorage(storage, where);`:

```ts
  if (reactOnly !== undefined && typeof reactOnly !== 'boolean') {
    throw new Error(`${where}: reactOnly must be a boolean`);
  }
```

`scripts/parity/capture.ts`:

1. The file comment's first sentence ends "…and writes one screenshot per app plus a JSON record per capture" — add after it: "React-only scenarios (`reactOnly`) are captured in this app only."
2. In `interface CaptureRecord`, add after `path: string;`:

```ts
  /** A screen only this app has: there is no baseline capture. */
  reactOnly: boolean;
```

and make `apps: Record<AppName, AppCapture>;` `apps: { baseline?: AppCapture; react: AppCapture };`.
3. In the test body, replace

```ts
      // One after the other with the same browser instance.
      const baseline = await captureAndStore('baseline');
      const react = await captureAndStore('react');
```

with

```ts
      // One after the other with the same browser instance; React-only screens have no baseline.
      const baseline = scenario.reactOnly ? undefined : await captureAndStore('baseline');
      const react = await captureAndStore('react');
```

and in `record`, add `reactOnly: scenario.reactOnly === true,` after `path: scenario.path,` and replace `apps: { baseline, react },` with `apps: baseline ? { baseline, react } : { react },`.

`scripts/parity/compare.mjs`:

1. Header comment: replace the exit-code line with `// Exit code: 0 every capture identical or new (a React-only screen), 1 differences or missing captures,` and `// 2 nothing to compare / bad input.`; add after the paragraph on strictness: `// React-only scenarios (\`reactOnly\` in their record) have no baseline: they are reported as new.`
2. `const STATUS_ORDER = { missing: 0, different: 1, new: 2, identical: 3 };`
3. In `compareCaptures`, right after the `const base = { … };` statement:

```js
    if (record?.reactOnly) {
      // A screen only the React app has: nothing to compare.
      return {
        ...base,
        status: base.react ? 'new' : 'missing',
        mismatchedPixels: null,
        totalPixels: null,
        mismatchRatio: null,
        sizeMismatch: false,
        diff: null,
      };
    }
```

4. In `totals`, add `new: count('new'),` after `missing: count('missing'),`.
5. After `compareCaptures` add:

```js
/** Whether the comparison establishes parity: every capture identical, or new (React only). */
export function isParity(summary) {
  const { captures, identical } = summary.totals;
  return identical + summary.totals.new === captures;
}
```

6. `function image(src, label)` becomes:

```js
function image(src, label, absent = 'missing') {
  if (!src) return `<td class="absent">${escapeHtml(absent)}</td>`;
  const safe = escapeHtml(src);
  return `<td><a href="${safe}"><img src="${safe}" alt="${escapeHtml(label)}" loading="lazy"></a></td>`;
}
```

7. In `renderRow`, add `const absent = result.status === 'new' ? 'React only' : 'missing';` after the `pixels` constant, and pass `absent` as the third argument of the baseline and diff `image(…)` calls.
8. In `renderReport`: add `  tr.new .status { color: #1d4ed8; }` after the `tr.different` rule; the totals line becomes `<p>${totals.captures} captures · ${totals.identical} identical · ${totals.different} different · ${totals.missing} missing · ${totals.new} new</p>`; the line "Every difference must be fixed or recorded in docs/migration/parity-log.md." becomes "Every difference must be fixed or recorded in docs/migration/parity-log.md; every new (React-only) screen needs a row there with its after-screenshot."
9. In `main`, `return summary.totals.identical === summary.totals.captures ? 0 : 1;` becomes `return isParity(summary) ? 0 : 1;`.
10. In `printSummary`, the first message becomes `` `[parity:compare] ${totals.captures} captures: ${totals.identical} identical, ` + `${totals.different} different, ${totals.missing} missing, ${totals.new} new` ``.

`scripts/parity/run.mjs`: import `isParity` with the others from `./compare.mjs` and replace `return summary.totals.identical === summary.totals.captures ? 0 : 1;` with `return isParity(summary) ? 0 : 1;`; in the header comment, "Exit code: 0 when every capture is identical" becomes "Exit code: 0 when every capture is identical or new (React only)".

`docs/development.md`, "### Scenarios": add the bullet after `storage`:

```markdown
- `reactOnly`: a screen the Svelte app does not have (the Macros and Scripts pages). It is
  captured in the React app only and reported as `new`, which passes; its row in the parity log
  has an after-screenshot only.
```

and in "### Running", "`compare` exits 1 when any capture differs or is missing." becomes "`compare` exits 1 when any capture differs or is missing (React-only captures are `new` and pass)."

- [ ] **Step 4: Run the tests**

Run: `npx vitest run scripts/parity`
Expected: PASS.

- [ ] **Step 5: Check and commit**

Run: `npm run typecheck && npx eslint scripts/parity e2e/parity && npx prettier --check scripts/parity e2e/parity docs/development.md`
Expected: no errors.

```bash
git add e2e/parity/scenario.ts scripts/parity/scenarios.ts scripts/parity/scenarios.test.ts scripts/parity/capture.ts scripts/parity/compare.mjs scripts/parity/compare.test.ts scripts/parity/run.mjs docs/development.md
git commit -m "test(parity): React-only scenarios for screens the Svelte app does not have"
```

---

### Task 13: New-screen parity scenarios, the parity log and the final validation

**Files:**
- Create: `e2e/parity/scenarios/macros-scripts.ts`
- Modify: `docs/migration/parity-log.md`; Create: `docs/migration/parity-notes/macros-scripts.md`; Add: `docs/migration/parity/pl-051-after.png` … `pl-054-after.png`
- Modify: `docs/superpowers/specs/2026-10-01-macros-scripts-design.md` (status line)

**Interfaces:**
- Consumes: everything above (`reactOnly` from Task 12, the e2e handle's `macros` from Task 11).

- [ ] **Step 1: Add the scenarios**

`e2e/parity/scenarios/macros-scripts.ts`:

```ts
import type { Page } from '@playwright/test';
import type { ParityScenario } from '../scenario';

/**
 * The Macros and Scripts pages and Remap's Macro and Script groups (macros and scripts spec) on
 * the virtual Trinity Pad, whose controller declares 4 macro slots and AOT scripts. The Svelte
 * app has none of these screens: every scenario is React-only (`new`; PL-051 to PL-054).
 */

const GET_STARTED = /Get Started|开始使用/;
const KEYBOARD = { model: 'trinity-pad', seedDynamicKeys: false } as const;
const MACROS = /^(Macros|宏)$/;
const SCRIPTS = /^(Scripts|脚本)$/;

/** Moves the pointer onto the sidebar title, where nothing reacts to hovering. */
async function parkPointer(page: Page): Promise<void> {
  await page.mouse.move(100, 30);
}

/** Clicks "Get Started" and waits for the Trinity Pad's keymap on Remap (key 0 is Z). */
async function connect(page: Page): Promise<void> {
  await page.getByRole('button', { name: GET_STARTED }).click();
  await page.waitForURL('**/remap/');
  await page.locator('.keycap', { hasText: /^Z$/ }).waitFor();
}

async function openPage(page: Page, name: RegExp, path: string): Promise<void> {
  await page.getByRole('navigation').getByRole('link', { name }).click();
  await page.waitForURL(`**${path}`);
}

/** Gives macro 1 a recorded Shift+A (ticks at 8000 Hz) before the app connects. */
async function seedMacro(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__virtualKeyboard !== undefined);
  await page.evaluate(() => {
    const slot = window.__virtualKeyboard?.state.macros[0];
    if (!slot) throw new Error('the keyboard has no macro 1');
    const entries = [
      { delay: 0, keycode: 0x0200, event: 3 },
      { delay: 400, keycode: 0x04, event: 3 },
      { delay: 1200, keycode: 0x04, event: 1 },
      { delay: 1600, keycode: 0x0200, event: 1 },
      // The end marker.
      { delay: 1600, keycode: 0, event: 0 },
    ];
    entries.forEach((entry, index) => {
      slot[index] = { index, keyId: 0, isVirtual: entry.keycode !== 0, ...entry };
    });
  });
}

function trinity(name: string, setup: (page: Page) => Promise<void>): ParityScenario {
  return {
    name,
    path: '/',
    reactOnly: true,
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await setup(page);
      await parkPointer(page);
    },
  };
}

const scenarios: readonly ParityScenario[] = [
  // The four slots, the limit, the tools and the empty macro.
  trinity('macros-empty', async page => {
    await connect(page);
    await openPage(page, MACROS, '/macros/');
    await page.getByText(/^0 \/ 127/).waitFor();
  }),
  // A recorded Shift+A, loaded from the keyboard.
  trinity('macros-actions', async page => {
    await seedMacro(page);
    await connect(page);
    await openPage(page, MACROS, '/macros/');
    await page.getByRole('table').waitFor();
  }),
  // Recording: Stop and the recording line.
  trinity('macros-recording', async page => {
    await seedMacro(page);
    await connect(page);
    await openPage(page, MACROS, '/macros/');
    await page.getByRole('button', { name: /^(Record|录制)$/ }).click();
    await page.getByRole('button', { name: /^(Stop|停止)$/ }).waitFor();
  }),
  // The example, compiled: the status and the bytecode section.
  trinity('scripts-example', async page => {
    await connect(page);
    await openPage(page, SCRIPTS, '/scripts/');
    await page.getByRole('textbox').waitFor();
    await page.getByRole('button', { name: /^(Load example|加载示例)$/ }).click();
    await page.getByText(/^(Compiled|已编译)/).waitFor();
  }),
  // A syntax error: the status, the error and its line.
  trinity('scripts-error', async page => {
    await connect(page);
    await openPage(page, SCRIPTS, '/scripts/');
    await page.getByRole('textbox').fill('function loop() {\n  let x = ;\n}\n');
    await page.getByText(/^(Errors|有错误)/).waitFor();
  }),
  // Remap's Extension tab with the Macro and Script groups (the tab names are English in both
  // languages, as in the Svelte app).
  trinity('remap-extension-macro', async page => {
    await connect(page);
    const remap = page.getByRole('application');
    await remap.getByRole('button', { name: 'Extension', exact: true }).click();
    const macroGroup = remap.getByRole('heading', { name: /^(Macro|宏)$/ });
    await macroGroup.waitFor();
    await remap.locator('main .absolute.inset-0').nth(1).waitFor({ state: 'detached' });
    await macroGroup.scrollIntoViewIfNeeded();
  }),
];

export default scenarios;
```

Run: `npx eslint e2e/parity && npx prettier --check e2e/parity && npx vitest run scripts/parity/scenarios.test.ts`
Expected: no errors; PASS (the loader validates the new file).

- [ ] **Step 2: Capture the new screens in one variant**

Run (alone): `npm run parity -- --workers=2 --grep "(macros-|scripts-|remap-extension-macro).*--dark-en-1440x900"`
Expected: 6 captures, all `new`, no page errors; exit code 0. Open `e2e/.artifacts/parity/index.html` (or the PNGs in `captures/react/`) and check each screen against the spec: four slot buttons with counts, the "N / 127 actions" counter, Record/Stop, Sort by time, Clear, Add key with After and Hold, the table columns (Time, Key, Event, Virtual, Key ID, delete); the editor with highlighting, the status line, the error with its line, the bytecode section; the Macro and Script groups on Remap. Fix and re-run until the screens are right.

- [ ] **Step 3: Full parity run**

Run (alone; about an hour): `npm run parity -- --workers=2`
Expected: the 48 new captures (6 scenarios × 8 variants) are `new`; every other capture is unchanged from the last run recorded in the parity log (the Zellia Starlight declares neither feature, so no existing screen changes). Each difference in `summary.json` must be explained by an existing parity-log row or the known capture noise; anything else is a bug to fix before going on.

- [ ] **Step 4: Write the parity log rows and notes**

Copy the `dark-en-1440x900` captures from `e2e/.artifacts/parity/captures/react/` to `docs/migration/parity/`:

```bash
cp e2e/.artifacts/parity/captures/react/macros-empty--dark-en-1440x900.png docs/migration/parity/pl-051-after.png
cp e2e/.artifacts/parity/captures/react/macros-actions--dark-en-1440x900.png docs/migration/parity/pl-052-after.png
cp e2e/.artifacts/parity/captures/react/scripts-example--dark-en-1440x900.png docs/migration/parity/pl-053-after.png
cp e2e/.artifacts/parity/captures/react/remap-extension-macro--dark-en-1440x900.png docs/migration/parity/pl-054-after.png
```

In `docs/migration/parity-log.md`, add four rows after the last row of the "Deviations" table (PL-050 once the lighting plan's rows are in; take the next free ids if they are not PL-051 to PL-054, and use them everywhere in this task), in the table's format, Before "— (new screen)", Status `logged`:

- **PL-051** sidebar — every `macros-*`, `scripts-*` and `remap-extension-macro` capture (virtual Trinity Pad): "Macros" and "Scripts" follow "Dynamic Keys" while the connected keyboard's controller declares macros or scripts; the Zellia models declare neither, so no baseline screen changes. Reason: macros and scripts spec (Navigation). After: `parity/pl-051-after.png`.
- **PL-052** `/macros/` — `macros-empty--*`, `macros-actions--*`, `macros-recording--*`: the new Macros page: slot buttons with their action counts, the "N / 127 actions" counter, Record (Stop while recording, with the recording line), Sort by time, Clear, Add key with After and Hold, and the action table (Time in ms, Key, Event, Virtual, Key ID, delete). Edits wait for Save. Reason: macros and scripts spec (Macros page). After: `parity/pl-052-after.png`.
- **PL-053** `/scripts/` — `scripts-example--*`, `scripts-error--*`: the new Scripts page: the CodeMirror editor, Open .js, Save .js and Load example, the compile status ("Compiled: N bytes — sent to the keyboard on Save" or "Errors: fix them to send this script" with "Line L: message") and the collapsible bytecode. Reason: macros and scripts spec (Scripts page). After: `parity/pl-053-after.png`.
- **PL-054** `/remap/` — `remap-extension-macro--*`: on keyboards that support them, the Extension tab gains the Macro group (record, play, stop and pause keys of each slot) and the Script group (Watch, Start, Stop, Suspend, Restart, Toggle). Reason: macros and scripts spec (Keycodes). After: `parity/pl-054-after.png`.

In the paragraph above the "Deviations" table, add the sentence: "PL-051 to PL-054 are the new screens of the [macros and scripts spec](../superpowers/specs/2026-10-01-macros-scripts-design.md): the Svelte app has no such screens, so their scenarios are React-only and the rows have after-screenshots only."

In "Per-feature results", add the bullet:

```markdown
- [Macros and Scripts](parity-notes/macros-scripts.md) (`macros-*`, `scripts-*`,
  `remap-extension-macro`): React-only screens, all eight variants.
```

`docs/migration/parity-notes/macros-scripts.md` (new):

```markdown
# Parity notes: Macros and Scripts

Scenarios: `e2e/parity/scenarios/macros-scripts.ts`, all `reactOnly`, on the virtual Trinity Pad
(`{ model: 'trinity-pad', seedDynamicKeys: false }`). The Svelte app has none of these screens, so
the harness captures the React app only and reports them as `new`.

| Scenario                | Shows                                                    | Log            |
| ----------------------- | -------------------------------------------------------- | -------------- |
| `macros-empty`          | the Macros page of an empty macro                        | PL-051, PL-052 |
| `macros-actions`        | a recorded Shift+A loaded from the keyboard              | PL-052         |
| `macros-recording`      | recording: Stop and the recording line                   | PL-052         |
| `scripts-example`       | the example, compiled, with its bytecode                 | PL-053         |
| `scripts-error`         | a syntax error with its line                             | PL-053         |
| `remap-extension-macro` | Remap's Extension tab with the Macro and Script groups   | PL-054         |

The existing scenarios run on the Zellia Starlight, which declares neither macros nor scripts:
their screens do not change.
```

Then add to that file a section `## Results` with the date of the Step 3 run and its totals from `summary.json` (captures, identical, different, missing, new) and any page errors seen in the new captures.

In `docs/superpowers/specs/2026-10-01-macros-scripts-design.md`, set the status line to "Status: implemented (plan: `docs/superpowers/plans/2026-10-01-macros-scripts.md`)."

Run: `npx prettier --write docs/migration/parity-log.md docs/migration/parity-notes/macros-scripts.md`

- [ ] **Step 5: Final validation**

Run, one at a time:

1. `npm run validate`
   Expected: PASS. The build may warn that the compiler glue's Node-only `import("node:module")` "has been externalized for browser compatibility"; any other new warning or error is a failure. Do not edit `vendor/mqjs` to silence it.
2. Bundle check, on the `build/` that step 1 wrote:
   `ls build/assets | grep -c '\.wasm$'` → `1` (the compiler's wasm);
   `grep -l 'cm-content' build/assets/*.js` → one chunk, not `index-*.js` (CodeMirror loads with the Scripts page only);
   `grep -l 'createMqjsCompiler' build/assets/*.js` → one chunk, not `index-*.js` (the compiler loads on the first compile);
   `grep -c 'mqjs_wasm' build/sw.js` → at least 1 (precached for offline use).
3. `npm run test:e2e -- --workers=2`
   Expected: PASS (the existing journeys and the two new ones).

- [ ] **Step 6: Commit**

```bash
git add e2e/parity/scenarios/macros-scripts.ts docs/migration/parity-log.md docs/migration/parity-notes/macros-scripts.md docs/migration/parity/pl-051-after.png docs/migration/parity/pl-052-after.png docs/migration/parity/pl-053-after.png docs/migration/parity/pl-054-after.png docs/superpowers/specs/2026-10-01-macros-scripts-design.md
git commit -m "docs(parity): log the Macros and Scripts screens"
```
