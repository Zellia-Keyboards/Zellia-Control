# Lighting Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lighting edits are staged and sent by the sidebar Save (which shows unsaved changes), and the key panel edits the selected keys in place with Mixed values and mode explanations.

**Architecture:** `DeviceSession.setRgbBase` / `setRgbKeys` stop sending packets: they update the controller cache and the snapshot, and the existing `save()` writes them. The store gets an `unsaved` flag (set by every edit command, cleared by loads and by saves that included the last edit), which the sidebar's Save button shows. The Lighting panels become controlled views of the store: pure model functions compute the key panel's targets, shared values and edits.

**Tech Stack:** React 19, TypeScript 6 (strict), Zustand 5, Vitest + Testing Library (jsdom) against the virtual libamp keyboard, Playwright (Chrome) for e2e and the parity harness.

**Spec:** `docs/superpowers/specs/2026-10-01-lighting-redesign-design.md`

## Global Constraints

- Strict TypeScript: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. No `any`, no `as unknown as`, no non-null assertions (`!`).
- Never edit `src-controller/` (vendored upstream). The app reaches the keyboard only through `src/features/device`.
- Pure `model/` code never imports React or the device session.
- Device behaviour is tested against the virtual keyboard (`connectVirtualKeyboard`, `createConnectedHarness`), never with mocks of our own code.
- Copy: use the en/zh strings exactly as given in this plan (they are the spec's, with American spelling in en: "colors").
- Every visible deviation from the Svelte baseline gets a row in `docs/migration/parity-log.md` (Task 8).
- Package manager: npm. Checks: `npx vitest run <paths>`, `npm run typecheck`, `npx eslint <paths>`, `npx prettier --check <paths>` (or `--write`).
- Laptop load: at most 2 heavy jobs (Playwright, parity, builds) at a time, Playwright with `--workers=2`. Unit tests of the touched files only, until the final validation.
- Commits: small, conventional (`feat(lighting): …`), **no `Co-Authored-By` or "Generated with" trailers**. Stage only the files of the task (`git add <paths>`), never `git add -A`.

## File map

| File | Responsibility | Task |
| --- | --- | --- |
| `src/features/device/device-store.ts` | `DeviceState.unsaved` | 1 |
| `src/features/device/session.ts` | staged lighting edits, edit counting, `unsaved` | 1 |
| `src/features/device/{store.test.tsx,session.commands.test.ts,session.operations.test.ts}` | device tests | 1 |
| `src/features/lighting/LightingPage.test.tsx` | page tests (save before reading the keyboard in 1; rewritten in 5–6) | 1, 5, 6 |
| `docs/device.md`, `docs/architecture.md`, `CLAUDE.md` | staged lighting, `unsaved` | 1 |
| `src/app/layout/Sidebar.tsx` (+ test) | unsaved dot and description on Save | 2 |
| `src/lib/i18n/{en.ts,zh.ts,i18n.test.tsx}` | new copy, `lighting.apply` removed | 2, 4, 6 |
| `src/features/lighting/model/key-edits.ts` (+ test), `model/index.ts` | targets, shared values, edits | 3 |
| `src/features/lighting/components/modes.ts` (+ test) | mode lists with labels and explanations | 4 |
| `src/features/lighting/components/panel-header.ts` | header style keeping the old height | 5 |
| `src/features/lighting/components/RGBPanel.tsx` (+ test) | base panel, controlled | 5 |
| `src/features/lighting/components/RGBSubPanel.tsx` (+ test) | key panel, controlled, Mixed | 6 |
| `src/features/lighting/LightingPage.tsx` | wiring, save hint | 5, 6 |
| `e2e/performance-lighting.spec.ts` | lighting journeys | 7 |
| `e2e/parity/scenarios/performance-lighting.ts` | parity scenarios | 8 |
| `docs/migration/parity-log.md`, `docs/migration/parity/*.png`, `docs/migration/parity-notes/performance-lighting.md` | PL-047–PL-050, refreshed screenshots | 8 |

---

### Task 1: Device session — staged lighting edits and `unsaved`

**Files:**
- Modify: `src/features/device/device-store.ts`
- Modify: `src/features/device/session.ts`
- Modify: `src/features/device/store.test.tsx`
- Modify: `src/features/device/session.commands.test.ts`
- Modify: `src/features/device/session.operations.test.ts`
- Modify: `src/features/lighting/LightingPage.test.tsx`
- Modify: `docs/device.md`, `docs/architecture.md`, `CLAUDE.md`

**Interfaces:**
- Produces: `DeviceState.unsaved: boolean` (initially `false`); `setRgbBase` / `setRgbKeys` send no packet; `save()` clears `unsaved` when no edit came in after it read the snapshot; every load clears it.

- [ ] **Step 1: Write the failing device tests**

In `src/features/device/store.test.tsx`, test `'starts disconnected with no data'`, add `unsaved: false,` after `saving: false,` in the expected object.

In `src/features/device/session.commands.test.ts`, inside `describe('lighting', …)`, replace the tests `'sends the base configuration'` and `'sends one packet per changed key; the last entry for a key wins'` with:

```ts
  it('stages the base configuration until save()', async () => {
    const h = await connected();
    const before = structuredClone(h.vk.state.active.rgbBase);
    h.session.setRgbBase(BASE);
    expect(configOf(h).rgbBase).toEqual(BASE);
    expect(readDeviceConfig(h.controller()).rgbBase).toEqual(BASE);
    expect(h.state().unsaved).toBe(true);
    await settle();
    expect(wire(h)).toEqual([]);
    expect(h.vk.state.active.rgbBase).toEqual(before);

    await h.session.save();
    await settle();
    expect(h.vk.state.active.rgbBase).toEqual(BASE);
    expect(h.vk.state.profiles[0]?.rgbBase).toEqual(BASE);
  });

  it('stages per-key configurations until save(); the last entry for a key wins', async () => {
    const h = await connected();
    const trigger: RgbKeyConfig = {
      mode: RGBMode.RgbModeTrigger,
      color: { red: 9, green: 8, blue: 7 },
      speed: 3,
    };
    const jelly: RgbKeyConfig = {
      mode: RGBMode.RgbModeJelly,
      color: { red: 1, green: 1, blue: 1 },
      speed: 5,
    };
    const before = structuredClone(h.vk.state.active.rgbKeys);
    const unchanged = configOf(h).rgbKeys[12];
    h.session.setRgbKeys([
      { keyId: 4, config: trigger },
      { keyId: 8, config: trigger },
      { keyId: 4, config: jelly },
      ...(unchanged ? [{ keyId: 12, config: unchanged }] : []),
    ]);
    expect(configOf(h).rgbKeys[4]).toEqual(jelly);
    expect(configOf(h).rgbKeys[8]).toEqual(trigger);
    expect(readDeviceConfig(h.controller()).rgbKeys).toEqual(configOf(h).rgbKeys);
    await settle();
    expect(wire(h)).toEqual([]);
    expect(h.vk.state.active.rgbKeys).toEqual(before);

    await h.session.save();
    await settle();
    expect(h.vk.state.active.rgbKeys[4]).toEqual(jelly);
    expect(h.vk.state.active.rgbKeys[8]).toEqual(trigger);
    expect(h.vk.state.active.rgbKeys[12]).toEqual(before[12]);
  });

  it('changes nothing for an unchanged configuration', async () => {
    const h = await connected();
    const key = configOf(h).rgbKeys[3];
    if (!key) throw new Error('No RGB key 3');
    h.session.setRgbBase({ ...configOf(h).rgbBase });
    h.session.setRgbKeys([{ keyId: 3, config: { ...key } }]);
    expect(h.state().unsaved).toBe(false);
  });
```

In the same describe, at the end of `'rejects invalid colours and unknown keys'`, add:

```ts
    expect(h.state().unsaved).toBe(false);
```

In `src/features/device/session.operations.test.ts`, add after `describe('save (D9)', …)`:

```ts
describe('unsaved changes', () => {
  it('are marked by every edit command and cleared by a successful save', async () => {
    const h = await connected();
    expect(h.state().unsaved).toBe(false);
    const advancedKey = configOf(h).advancedKeys[3];
    const rgbKey = configOf(h).rgbKeys[5];
    if (!advancedKey || !rgbKey) throw new Error('Missing fixture data');
    let slot: number | null = null;
    const edits: readonly (readonly [string, () => void])[] = [
      ['setKeycodes', () => h.session.setKeycodes(2, [10], Keycode.Tab)],
      ['setAdvancedKeys', () => h.session.setAdvancedKeys([3], { ...advancedKey, activation: 0.5 })],
      ['setRgbBase', () => h.session.setRgbBase({ ...configOf(h).rgbBase, brightness: 10 })],
      ['setRgbKeys', () => h.session.setRgbKeys([{ keyId: 5, config: { ...rgbKey, speed: 99 } }])],
      [
        'applyDynamicKey',
        () => {
          slot = h.session.applyDynamicKey({
            kind: 'toggle',
            target: { layer: 2, id: 7 },
            binding: Keycode.Tab,
          });
        },
      ],
      [
        'removeDynamicKey',
        () => {
          if (slot !== null) h.session.removeDynamicKey(slot);
        },
      ],
    ];
    for (const [name, edit] of edits) {
      edit();
      expect(h.state().unsaved, name).toBe(true);
      await h.session.save();
      expect(h.state(), name).toMatchObject({ unsaved: false, lastError: null });
    }
  });

  it('stay marked when an edit lands while the save writes', async () => {
    const h = await connected({ keyboard: { latencyMs: 1 } });
    h.session.setKeycodes(2, [10], Keycode.Tab);
    const saving = h.session.save();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(h.state().saving).toBe(true);
    h.session.setKeycodes(2, [11], Keycode.Tab);
    await saving;
    expect(h.state()).toMatchObject({ saving: false, lastError: null, unsaved: true });
  });

  it('stay marked when the save fails', async () => {
    const h = await connected();
    h.session.setKeycodes(2, [10], Keycode.Tab);
    await settle();
    h.vk.dropReplies(
      packet => packet.op === 'set' && packet.kind === 'advancedKey' && packet.index === 5
    );
    await h.session.save();
    expect(h.state().lastError?.operation).toBe('save');
    expect(h.state().unsaved).toBe(true);
  });

  it('are dropped with the configuration when the keyboard loads another one', async () => {
    const h = await connected();
    h.session.setRgbBase({ ...configOf(h).rgbBase, brightness: 10 });
    expect(h.state().unsaved).toBe(true);
    await h.session.switchProfile(1);
    expect(h.state()).toMatchObject({ unsaved: false, config: { profileIndex: 1 } });
    expect(configOf(h).rgbBase).toEqual(h.vk.state.active.rgbBase);
  });
});
```

(`setKeycodes` etc. return `void`; arrow bodies without braces are fine for the `() => void` tuple type. If ESLint's `no-confusing-void-expression` objects, wrap the call in braces.)

In the same file, replace the body of `'streams while the keyboard stays usable for edits'` (in `describe('debug tracking (D16)')`) so it uses an edit that is still sent at once:

```ts
  it('streams while the keyboard stays usable for edits', async () => {
    const h = await connected({ keyboard: { debugIntervalMs: 5 } });
    h.session.startDebug(2);
    h.session.setKeycodes(1, [2], Keycode.A);
    await vi.waitFor(() => {
      expect(h.vk.state.active.keymap[1]?.[2]).toBe(Keycode.A);
    });
    expect(h.state().lastError).toBeNull();
  });
```

and drop `RGBMode` from that file's `emi-keyboard-controller` import (it has no other use).

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/device`
Expected: FAIL. The new `unsaved` expectations fail (`undefined`), and the staged-lighting tests fail on `wire(h)` (an `rgbBase` / `rgbConfig` packet was sent).

- [ ] **Step 3: Implement `unsaved` in the store**

In `src/features/device/device-store.ts`, add to `DeviceState` after `saving`:

```ts
  /**
   * An edit changed the configuration since the keyboard last loaded or saved it: Save has
   * something to store (lighting edits are not even on the keyboard before it).
   */
  readonly unsaved: boolean;
```

and `unsaved: false,` after `saving: false,` in `INITIAL_DEVICE_STATE`.

- [ ] **Step 4: Stage lighting edits and count edits in the session**

In `src/features/device/session.ts`:

1. File comment, after the bullet that starts with "Outside of reloads, the controller cache equals the store snapshot", add:

```ts
 * - Lighting edits are staged: `setRgbBase` / `setRgbKeys` update the cache and the snapshot and
 *   send nothing; `save()` writes them with everything else. Every other edit is sent at once.
 *   `unsaved` is set by every edit and cleared by a load or by a save that included the last one.
```

2. `DeviceSession` interface: replace the `save()` doc comment and the two lighting declarations with:

```ts
  /**
   * `controller.save()` then `controller.flash()` (D9), after any reload in progress; concurrent
   * calls share one save. Clears `unsaved` unless an edit came in after the save read the
   * configuration. Never rejects: failures are recorded in `lastError`.
   */
  save(): Promise<void>;
```

```ts
  /** Staged until `save()`: updates the snapshot and the controller cache, sends nothing. */
  setRgbBase(config: RgbBaseConfig): void;
  /** Staged until `save()`, like `setRgbBase`; the last entry for a key wins. */
  setRgbKeys(entries: readonly { keyId: number; config: RgbKeyConfig }[]): void;
```

3. `interface Connection`: after `loads: number;` add

```ts
  /** Edits that changed the snapshot, to tell whether a save included the last one. */
  edits: number;
```

and in `#attach`'s `connection` literal add `edits: 0,` after `loads: 0,`.

4. After `#patch(…)`, add:

```ts
  /** Publishes an edited snapshot, which the keyboard does not store yet. */
  #commitEdit(connection: Connection, next: DeviceConfig): void {
    connection.edits += 1;
    this.#patch({ config: next, unsaved: true });
  }
```

5. Replace the final `this.#patch({ config: next });` of `setAdvancedKeys` and of `#applyDynamicKeyChange` with `this.#commitEdit(connection, next);`.

6. Replace the end of `setRgbBase` (from `const next = deepFreeze({ ...current, rgbBase });`) with:

```ts
    const next = deepFreeze({ ...current, rgbBase });
    // Staged: save() writes it, with the per-key lighting (7 keys per packet).
    connection.controller.set_rgb_base_config(toControllerRgbBase(next.rgbBase));
    this.#commitEdit(connection, next);
  }
```

7. Replace the end of `setRgbKeys` (from `const { controller } = connection;`) with:

```ts
    // Staged: save() writes it.
    connection.controller.set_rgb_configs(next.rgbKeys.map(toControllerRgbConfig));
    this.#commitEdit(connection, next);
  }
```

8. `#onLoaded`: change the patch to `this.#patch({ connection: ready.state, config, ...snapshot, unsaved: false });`.

9. `#save`: after `if (!config) return;` add

```ts
      // An edit after this point may miss the save: it keeps `unsaved`.
      const edits = connection.edits;
```

and after `connection.controller.flash();` add

```ts
      if (connection.edits === edits) this.#patch({ unsaved: false });
```

- [ ] **Step 5: Run the device tests**

Run: `npx vitest run src/features/device`
Expected: PASS.

- [ ] **Step 6: Keep the Lighting page tests reading the keyboard after a save**

The page's Apply buttons now only stage. In `src/features/lighting/LightingPage.test.tsx`, add inside `describe('LightingPage')` after the `rgb` helper:

```ts
  /** Lighting edits reach the keyboard on Save (PL-047). */
  async function saveToKeyboard(): Promise<void> {
    await act(async () => {
      await deviceSession.save();
    });
  }
```

Then call `await saveToKeyboard();` right before the first assertion that reads the keyboard (`keyboard.vk.state…` or `deviceRgbKeys()`) after an Apply in: `'applies the base configuration'`, `'applies the key configuration to every key when none is selected'`, `'applies the key configuration to the selected keys, then shows the first key again'`, both tests of `describe('rainbow preset (D11, PL-007)')`, `'applies the new configuration’s modes, not the ones picked before the load'` (after each of its two Apply clicks) and `'works under StrictMode, which renders and runs its effects twice'`. In `'opens with the keyboard’s own modes selected'`, replace the `await expect.poll(() => keyboard.vk.state.active.rgbBase.mode).toBe(RGBBaseMode.RgbBaseModeRainbow);` with:

```ts
    await saveToKeyboard();
    expect(keyboard.vk.state.active.rgbBase.mode).toBe(RGBBaseMode.RgbBaseModeRainbow);
```

Run: `npx vitest run src/features/lighting`
Expected: PASS.

- [ ] **Step 7: Update the docs**

`docs/device.md`, section "Commands", first paragraph: after "…and patches the store." insert:

> Lighting edits are the exception: `setRgbBase` and `setRgbKeys` are staged and send nothing, and `save()` writes them with the rest of the configuration (as upstream's toolbar Apply does). Every edit that changes the configuration sets `unsaved`; a load clears it, and so does a successful save that included the last edit.

In its command table, the `setRgbBase(config)` / `setRgbKeys(entries)` row becomes "Lighting base config / per-key configs; staged until `save()`.", and the `save()` row ends with "; clears `unsaved` unless an edit came in during the save." In "Public API", the `useDeviceStore(selector)` row lists `` (`saving`, `unsaved`, `reloading`, `lastError`, `feature`, `firmware`) ``. (Re-run `npx prettier --write docs/device.md` to realign the tables.)

`docs/architecture.md`: "…which update the controller, send the packets and patch the store." becomes "…which update the controller, send the packets (lighting edits wait for `save()`) and patch the store."

`CLAUDE.md`, "State:" line: "`DeviceSession` commands update the controller cache, send packets and patch an immutable Zustand snapshot store" becomes "`DeviceSession` commands update the controller cache, send packets (lighting edits are staged until `save()`) and patch an immutable Zustand snapshot store".

- [ ] **Step 8: Check and commit**

Run: `npm run typecheck && npx eslint src/features/device src/features/lighting && npx prettier --check src/features/device src/features/lighting docs CLAUDE.md`
Expected: no errors.

```bash
git add src/features/device/device-store.ts src/features/device/session.ts src/features/device/store.test.tsx src/features/device/session.commands.test.ts src/features/device/session.operations.test.ts src/features/lighting/LightingPage.test.tsx docs/device.md docs/architecture.md CLAUDE.md
git commit -m "feat(device): stage lighting edits until save and track unsaved changes"
```

(The e2e lighting journeys fail from here until Task 7.)

---

### Task 2: Unsaved changes on the sidebar's Save

**Files:**
- Modify: `src/app/layout/Sidebar.tsx`
- Modify: `src/app/layout/Sidebar.test.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/zh.ts`, `src/lib/i18n/i18n.test.tsx`

**Interfaces:**
- Consumes: `DeviceState.unsaved` (Task 1) through `useDeviceStore` from `../../features/device`.
- Produces: translation key `ui.unsavedChanges`.

- [ ] **Step 1: Write the failing tests**

`src/app/layout/Sidebar.test.tsx`, add to `describe('Sidebar')`:

```tsx
  it('shows unsaved changes on Save until they are saved (PL-050)', async () => {
    await connectShellKeyboard();
    const user = userEvent.setup();
    renderApp('/remap/');
    const save = await screen.findByRole('button', { name: 'Save' });
    const dot = () => save.querySelector('span[aria-hidden="true"]');
    expect(save).toHaveAccessibleDescription('Save configuration');
    expect(dot()).toBeNull();

    act(() => {
      deviceSession.setKeycodes(0, [1], 0x04);
    });
    expect(save).toHaveAccessibleDescription('Unsaved changes');
    expect(dot()).toHaveClass('bg-amber-400');

    await user.click(save);
    await waitFor(() => {
      expect(save).toHaveAccessibleDescription('Save configuration');
    });
    expect(dot()).toBeNull();
  });
```

`src/lib/i18n/i18n.test.tsx`: replace the test `'keep the ported key set: 263 keys used by the Svelte app, the six missing ones and the confirmation copy'` with

```ts
  it('keep the ported key set plus the React additions', () => {
    // 263 keys used by the Svelte app, the six it referenced but never defined, the Settings
    // confirmations (PL-012) and the Save button's unsaved-changes label (PL-050).
    expect(Object.keys(en)).toHaveLength(273);
  });

  it('add the unsaved-changes label of the Save button (PL-050)', () => {
    expect(en['ui.unsavedChanges']).toBe('Unsaved changes');
    expect(zh['ui.unsavedChanges']).toBe('有未保存的更改');
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/app/layout/Sidebar.test.tsx src/lib/i18n`
Expected: FAIL (no description change; 272 keys; `ui.unsavedChanges` undefined — also a type error the test runner ignores).

- [ ] **Step 3: Add the copy**

`src/lib/i18n/en.ts`: after `'ui.language': 'Language',` add `'ui.unsavedChanges': 'Unsaved changes',`.
`src/lib/i18n/zh.ts`: after `'ui.language': '语言',` add `'ui.unsavedChanges': '有未保存的更改',`.

- [ ] **Step 4: Show the dot**

`src/app/layout/Sidebar.tsx`:

```tsx
import { LogOut, Save } from 'lucide-react';
import { useId } from 'react';
import { Link, useLocation } from 'react-router';
import { deviceSession, useDeviceName, useDeviceStore, useIsReady } from '../../features/device';
```

In `Sidebar`, after `const { pathname } = useLocation();`:

```tsx
  // Edits the keyboard does not store yet (lighting edits are not even on it before Save).
  const unsaved = useDeviceStore(state => state.unsaved);
  const unsavedId = useId();
```

Replace the Save button block inside its `<Transition>`'s `<div>` with:

```tsx
            <button
              type="button"
              className="relative w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 text-white shadow-lg hover:shadow-xl glassmorphism-button flex items-center justify-center gap-2 active:scale-95 hover:animate-none"
              onClick={() => {
                void deviceSession.save();
              }}
              title="Save configuration"
              aria-describedby={unsaved ? unsavedId : undefined}
            >
              <div className="flex items-center justify-center gap-1">
                <Save className="w-3 h-3" />
                <i>{t('ui.save')}</i>
              </div>
              {/* PL-050: unsaved changes */}
              {unsaved && (
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400"
                />
              )}
            </button>
            <span id={unsavedId} hidden>
              {t('ui.unsavedChanges')}
            </span>
```

(The description element sits outside the button so it does not join the button's name.)

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/app/layout src/lib/i18n`
Expected: PASS.

- [ ] **Step 6: Check and commit**

Run: `npm run typecheck && npx eslint src/app/layout src/lib/i18n && npx prettier --check src/app/layout src/lib/i18n`

```bash
git add src/app/layout/Sidebar.tsx src/app/layout/Sidebar.test.tsx src/lib/i18n/en.ts src/lib/i18n/zh.ts src/lib/i18n/i18n.test.tsx
git commit -m "feat(shell): show unsaved changes on the Save button"
```

---

### Task 3: Lighting model — targets, shared values, edits

**Files:**
- Create: `src/features/lighting/model/key-edits.ts`
- Create: `src/features/lighting/model/key-edits.test.ts`
- Modify: `src/features/lighting/model/index.ts`

**Interfaces:**
- Produces (from `src/features/lighting/model`):
  - `MIXED: 'mixed'`, `type Mixed`
  - `interface KeyConfigEntry { keyId: number; config: RgbKeyConfig }`
  - `interface SharedKeyValues { mode: RGBMode | Mixed; color: Rgb | Mixed; speed: number | Mixed; first: RgbKeyConfig }`
  - `lightingTargets(selected: readonly number[], keyCount: number): number[]`
  - `sharedKeyValues(rgbKeys: readonly RgbKeyConfig[], targets: readonly number[]): SharedKeyValues | null`
  - `editKeys(rgbKeys: readonly RgbKeyConfig[], targets: readonly number[], patch: Partial<RgbKeyConfig>): KeyConfigEntry[]`
  - `recolorKeys(rgbKeys: readonly RgbKeyConfig[], colors: ReadonlyMap<number, Rgb>): KeyConfigEntry[]`

- [ ] **Step 1: Write the failing tests**

`src/features/lighting/model/key-edits.test.ts`:

```ts
import { RGBMode } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import type { RgbKeyConfig } from '../../device/model/types';
import { MIXED, editKeys, lightingTargets, recolorKeys, sharedKeyValues } from './key-edits';

const red = { red: 255, green: 0, blue: 0 };
const blue = { red: 0, green: 0, blue: 255 };
const green = { red: 0, green: 255, blue: 0 };

const STATIC_RED: RgbKeyConfig = { mode: RGBMode.RgbModeStatic, color: red, speed: 20 };
const LINEAR_RED: RgbKeyConfig = { mode: RGBMode.RgbModeLinear, color: red, speed: 20 };
const LINEAR_BLUE: RgbKeyConfig = { mode: RGBMode.RgbModeLinear, color: blue, speed: 30 };
const KEYS: readonly RgbKeyConfig[] = [STATIC_RED, LINEAR_RED, LINEAR_BLUE];

describe('lightingTargets', () => {
  it('is every key while none is selected', () => {
    expect(lightingTargets([], 3)).toEqual([0, 1, 2]);
  });

  it('is the selected keys the keyboard has lighting for, in selection order', () => {
    expect(lightingTargets([2, 0, 7], 3)).toEqual([2, 0]);
  });

  it('is empty when only keys without lighting are selected', () => {
    expect(lightingTargets([5], 3)).toEqual([]);
  });
});

describe('sharedKeyValues', () => {
  it('shows the values the targets share', () => {
    expect(sharedKeyValues(KEYS, [1])).toEqual({
      mode: RGBMode.RgbModeLinear,
      color: red,
      speed: 20,
      first: LINEAR_RED,
    });
  });

  it('marks each field that differs as mixed and keeps the first target', () => {
    expect(sharedKeyValues(KEYS, [0, 1])).toEqual({
      mode: MIXED,
      color: red,
      speed: 20,
      first: STATIC_RED,
    });
    expect(sharedKeyValues(KEYS, [1, 2])).toEqual({
      mode: RGBMode.RgbModeLinear,
      color: MIXED,
      speed: MIXED,
      first: LINEAR_RED,
    });
  });

  it('is null without targets', () => {
    expect(sharedKeyValues(KEYS, [])).toBeNull();
    expect(sharedKeyValues(KEYS, [9])).toBeNull();
  });
});

describe('editKeys', () => {
  it('changes only the edited field of every target', () => {
    expect(editKeys(KEYS, [0, 2], { mode: RGBMode.RgbModeTrigger })).toEqual([
      { keyId: 0, config: { mode: RGBMode.RgbModeTrigger, color: red, speed: 20 } },
      { keyId: 2, config: { mode: RGBMode.RgbModeTrigger, color: blue, speed: 30 } },
    ]);
  });

  it('skips keys without lighting', () => {
    expect(editKeys(KEYS, [9], { speed: 1 })).toEqual([]);
  });
});

describe('recolorKeys', () => {
  it('gives each key its colour and keeps its mode and speed', () => {
    expect(
      recolorKeys(
        KEYS,
        new Map([
          [2, green],
          [9, green],
        ])
      )
    ).toEqual([{ keyId: 2, config: { mode: RGBMode.RgbModeLinear, color: green, speed: 30 } }]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/features/lighting/model/key-edits.test.ts`
Expected: FAIL ("Cannot find module './key-edits'").

- [ ] **Step 3: Implement**

`src/features/lighting/model/key-edits.ts`:

```ts
/**
 * Edits of the per-key lighting (docs/superpowers/specs/2026-10-01-lighting-redesign-design.md):
 * the keys an edit changes, the values they share, and the configurations an edit writes.
 */
import type { RGBMode } from 'emi-keyboard-controller';
import type { Rgb, RgbKeyConfig } from '../../device/model/types';

/** The value of a field that differs between the edited keys. */
export const MIXED = 'mixed';
export type Mixed = typeof MIXED;

/** One key's new configuration, as `deviceSession.setRgbKeys` takes it. */
export interface KeyConfigEntry {
  readonly keyId: number;
  readonly config: RgbKeyConfig;
}

/** What the key panel shows: each field the targets share, or `MIXED`. */
export interface SharedKeyValues {
  readonly mode: RGBMode | Mixed;
  readonly color: Rgb | Mixed;
  readonly speed: number | Mixed;
  /** The first target's configuration: a control shows it where its field is mixed. */
  readonly first: RgbKeyConfig;
}

/**
 * The keys a key-panel edit changes: the selected keys the keyboard has lighting for (in
 * selection order), or all `keyCount` keys while none is selected.
 */
export function lightingTargets(selected: readonly number[], keyCount: number): number[] {
  if (selected.length === 0) return Array.from({ length: keyCount }, (_, id) => id);
  return selected.filter(id => Number.isInteger(id) && id >= 0 && id < keyCount);
}

function sameRgb(a: Rgb, b: Rgb): boolean {
  return a.red === b.red && a.green === b.green && a.blue === b.blue;
}

/** The targets' shared values; null without targets. */
export function sharedKeyValues(
  rgbKeys: readonly RgbKeyConfig[],
  targets: readonly number[]
): SharedKeyValues | null {
  const configs = targets.flatMap(id => {
    const config = rgbKeys[id];
    return config ? [config] : [];
  });
  const [first] = configs;
  if (!first) return null;
  return {
    mode: configs.every(config => config.mode === first.mode) ? first.mode : MIXED,
    color: configs.every(config => sameRgb(config.color, first.color)) ? first.color : MIXED,
    speed: configs.every(config => config.speed === first.speed) ? first.speed : MIXED,
    first,
  };
}

/** Each target's configuration with `patch` applied; its other fields are kept. */
export function editKeys(
  rgbKeys: readonly RgbKeyConfig[],
  targets: readonly number[],
  patch: Partial<RgbKeyConfig>
): KeyConfigEntry[] {
  return targets.flatMap(keyId => {
    const config = rgbKeys[keyId];
    return config ? [{ keyId, config: { ...config, ...patch } }] : [];
  });
}

/** The keys of `colors` with their new colour; mode and speed are kept. */
export function recolorKeys(
  rgbKeys: readonly RgbKeyConfig[],
  colors: ReadonlyMap<number, Rgb>
): KeyConfigEntry[] {
  return [...colors].flatMap(([keyId, color]) => {
    const config = rgbKeys[keyId];
    return config ? [{ keyId, config: { ...config, color } }] : [];
  });
}
```

`src/features/lighting/model/index.ts`:

```ts
export {
  MIXED,
  editKeys,
  lightingTargets,
  recolorKeys,
  sharedKeyValues,
  type KeyConfigEntry,
  type Mixed,
  type SharedKeyValues,
} from './key-edits';
export { hexToRgb, rainbowColors, rgbToHex } from './rainbow';
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/lighting/model`
Expected: PASS.

- [ ] **Step 5: Check and commit**

Run: `npm run typecheck && npx eslint src/features/lighting/model && npx prettier --check src/features/lighting/model`

```bash
git add src/features/lighting/model/key-edits.ts src/features/lighting/model/key-edits.test.ts src/features/lighting/model/index.ts
git commit -m "feat(lighting): model the key panel's targets, shared values and edits"
```

---

### Task 4: Mode lists with explanations, and the Lighting copy

**Files:**
- Create: `src/features/lighting/components/modes.ts`
- Create: `src/features/lighting/components/modes.test.ts`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/zh.ts`, `src/lib/i18n/i18n.test.tsx`

**Interfaces:**
- Produces: `interface ModeOption<Mode> { value: Mode; label: TranslationKey; description: TranslationKey }`, `BASE_MODES: readonly ModeOption<RGBBaseMode>[]`, `KEY_MODES: readonly ModeOption<RGBMode>[]`, `modeOption<Mode>(modes, value): ModeOption<Mode> | undefined`; translation keys `rgb_base_mode_*_desc`, `rgb_mode_*_desc`, `lighting.saveHint`, `lighting.mixed`, `lighting.mixedModes`, `lighting.allKeys`, `lighting.oneKey`, `lighting.keyCount`.

(The lists are UI constants with translation keys, so they live in `components/`, not in the pure `model/`.)

- [ ] **Step 1: Write the failing tests**

`src/features/lighting/components/modes.test.ts`:

```ts
import { RGBBaseMode, RGBMode } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import { en } from '../../../lib/i18n/en';
import { BASE_MODES, KEY_MODES, modeOption } from './modes';

describe('lighting modes', () => {
  it('list every base mode and every key mode in device order', () => {
    expect(BASE_MODES.map(mode => mode.value)).toEqual([
      RGBBaseMode.RgbBaseModeOff,
      RGBBaseMode.RgbBaseModeBlank,
      RGBBaseMode.RgbBaseModeRainbow,
      RGBBaseMode.RgbBaseModeWave,
    ]);
    expect(KEY_MODES.map(mode => mode.value)).toEqual([
      RGBMode.RgbModeFixed,
      RGBMode.RgbModeStatic,
      RGBMode.RgbModeCycle,
      RGBMode.RgbModeLinear,
      RGBMode.RgbModeTrigger,
      RGBMode.RgbModeString,
      RGBMode.RgbModeFadingString,
      RGBMode.RgbModeDiamondRipple,
      RGBMode.RgbModeFadingDiamondRipple,
      RGBMode.RgbModeJelly,
      RGBMode.RgbModeBubble,
    ]);
  });

  it('explain each mode with copy of its own', () => {
    const descriptions = [...BASE_MODES, ...KEY_MODES].map(mode => en[mode.description]);
    expect(new Set(descriptions).size).toBe(15);
  });

  it('find a mode by its device value', () => {
    expect(modeOption(KEY_MODES, RGBMode.RgbModeJelly)?.label).toBe('rgb_mode_jelly');
    expect(modeOption(BASE_MODES, 9 as RGBBaseMode)).toBeUndefined();
  });
});
```

`src/lib/i18n/i18n.test.tsx`: change the key count test's comment and number to

```ts
    // 263 keys used by the Svelte app, the six it referenced but never defined, the Settings
    // confirmations (PL-012), the Save button's unsaved-changes label (PL-050) and the Lighting
    // copy (PL-047 to PL-049).
    expect(Object.keys(en)).toHaveLength(294);
```

and add:

```ts
  it('add the Lighting copy: mode explanations, Mixed, targets and the save hint', () => {
    expect(en).toMatchObject({
      rgb_mode_jelly_desc:
        'Pressing lights up the keys around it in their own colors; the deeper the press, the farther it reaches.',
      'lighting.saveHint': 'Lighting changes reach the keyboard when you press Save.',
      'lighting.keyCount': '{0} keys',
    });
    expect(zh).toMatchObject({
      rgb_mode_jelly_desc: '按下时，周围的按键以各自的颜色亮起；按得越深，范围越大。',
      'lighting.saveHint': '按下「保存」后，灯光更改才会发送到键盘。',
      'lighting.keyCount': '{0} 个按键',
    });
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/lighting/components/modes.test.ts src/lib/i18n`
Expected: FAIL ("Cannot find module './modes'"; 273 keys).

- [ ] **Step 3: Add the copy**

`src/lib/i18n/en.ts`, after `rgb_mode_bubble: 'Bubble',`:

```ts

  // Lighting: mode explanations and the key panel (lighting redesign, PL-047 to PL-049)
  rgb_base_mode_off_desc: 'Turns all lighting off, the per-key effects too.',
  rgb_base_mode_blank_desc: 'No base lighting: only the per-key effects light the keys.',
  rgb_base_mode_rainbow_desc:
    'A rainbow that starts at the hue of Color and scrolls across the keyboard. Speed sets how fast, Direction which way, Density how close the colors are.',
  rgb_base_mode_wave_desc:
    'Waves that blend Color into Secondary Color and move across the keyboard. Speed sets how fast, Direction which way, Density how close the waves are.',
  rgb_mode_fixed_desc: 'Always shows Color, in place of the base lighting.',
  rgb_mode_static_desc: 'Always adds Color on top of the base lighting.',
  rgb_mode_cycle_desc: 'Cycles through every hue, starting from Color. Speed sets how fast.',
  rgb_mode_linear_desc:
    'Lights up in Color as the key goes down: the deeper the press, the brighter.',
  rgb_mode_trigger_desc:
    'Flashes Color when the key is pressed, then fades out. Speed sets how fast it fades.',
  rgb_mode_string_desc:
    "Each press sends a line of Color along the key's row. Speed sets how fast it travels.",
  rgb_mode_fading_string_desc:
    "Each press sends a line of Color along the key's row, with a trail that fades out.",
  rgb_mode_diamond_ripple_desc:
    'Each press sends a diamond-shaped ripple of Color across the keyboard. Speed sets how fast it spreads.',
  rgb_mode_fading_diamond_ripple_desc:
    'Each press sends a diamond-shaped ripple of Color across the keyboard, with a trail that fades out.',
  rgb_mode_jelly_desc:
    'Pressing lights up the keys around it in their own colors; the deeper the press, the farther it reaches.',
  rgb_mode_bubble_desc:
    'Each press makes a small round ripple of Color around the key, with a trail that fades out.',
  'lighting.saveHint': 'Lighting changes reach the keyboard when you press Save.',
  'lighting.mixed': 'Mixed',
  'lighting.mixedModes': 'These keys use different modes. Pick one to use it on all of them.',
  'lighting.allKeys': 'All keys',
  'lighting.oneKey': '1 key',
  'lighting.keyCount': '{0} keys',
```

`src/lib/i18n/zh.ts`, after `rgb_mode_bubble: '气泡',`:

```ts

  // Lighting: mode explanations and the key panel (lighting redesign, PL-047 to PL-049)
  rgb_base_mode_off_desc: '关闭所有灯光，包括按键灯效。',
  rgb_base_mode_blank_desc: '没有基础灯光：只有按键灯效会点亮按键。',
  rgb_base_mode_rainbow_desc:
    '从「颜色」的色相开始、在键盘上滚动的彩虹。速度决定快慢，方向决定走向，密度决定颜色的疏密。',
  rgb_base_mode_wave_desc:
    '「颜色」与「次要颜色」交融的波浪在键盘上移动。速度决定快慢，方向决定走向，密度决定波浪的疏密。',
  rgb_mode_fixed_desc: '始终显示「颜色」，取代基础灯光。',
  rgb_mode_static_desc: '始终在基础灯光之上叠加「颜色」。',
  rgb_mode_cycle_desc: '从「颜色」开始循环显示所有色相。速度决定循环快慢。',
  rgb_mode_linear_desc: '按下时以「颜色」点亮：按得越深越亮。',
  rgb_mode_trigger_desc: '按下时以「颜色」闪亮，随后逐渐熄灭。速度决定熄灭快慢。',
  rgb_mode_string_desc: '每次按下都会沿按键所在的行发出一道「颜色」光线。速度决定传播快慢。',
  rgb_mode_fading_string_desc:
    '每次按下都会沿按键所在的行发出一道「颜色」光线，并留下逐渐消失的拖尾。',
  rgb_mode_diamond_ripple_desc:
    '每次按下都会发出一圈菱形的「颜色」涟漪扩散到整个键盘。速度决定扩散快慢。',
  rgb_mode_fading_diamond_ripple_desc:
    '每次按下都会发出一圈菱形的「颜色」涟漪扩散到整个键盘，并留下逐渐消失的拖尾。',
  rgb_mode_jelly_desc: '按下时，周围的按键以各自的颜色亮起；按得越深，范围越大。',
  rgb_mode_bubble_desc: '每次按下都会在按键周围泛起一圈小的圆形「颜色」涟漪，并留下逐渐消失的拖尾。',
  'lighting.saveHint': '按下「保存」后，灯光更改才会发送到键盘。',
  'lighting.mixed': '混合',
  'lighting.mixedModes': '这些按键使用不同的模式。选择一个即可应用到全部按键。',
  'lighting.allKeys': '全部按键',
  'lighting.oneKey': '1 个按键',
  'lighting.keyCount': '{0} 个按键',
```

- [ ] **Step 4: Add the mode lists**

`src/features/lighting/components/modes.ts`:

```ts
import { RGBBaseMode, RGBMode } from 'emi-keyboard-controller';
import type { TranslationKey } from '../../../lib/i18n';

/**
 * A mode button: the device value, its label and its explanation (written from libamp's
 * `src/rgb.c`; see the lighting redesign spec).
 */
export interface ModeOption<Mode> {
  readonly value: Mode;
  readonly label: TranslationKey;
  readonly description: TranslationKey;
}

export const BASE_MODES: readonly ModeOption<RGBBaseMode>[] = [
  {
    value: RGBBaseMode.RgbBaseModeOff,
    label: 'rgb_base_mode_off',
    description: 'rgb_base_mode_off_desc',
  },
  {
    value: RGBBaseMode.RgbBaseModeBlank,
    label: 'rgb_base_mode_blank',
    description: 'rgb_base_mode_blank_desc',
  },
  {
    value: RGBBaseMode.RgbBaseModeRainbow,
    label: 'rgb_base_mode_rainbow',
    description: 'rgb_base_mode_rainbow_desc',
  },
  {
    value: RGBBaseMode.RgbBaseModeWave,
    label: 'rgb_base_mode_wave',
    description: 'rgb_base_mode_wave_desc',
  },
];

export const KEY_MODES: readonly ModeOption<RGBMode>[] = [
  { value: RGBMode.RgbModeFixed, label: 'rgb_mode_fixed', description: 'rgb_mode_fixed_desc' },
  { value: RGBMode.RgbModeStatic, label: 'rgb_mode_static', description: 'rgb_mode_static_desc' },
  { value: RGBMode.RgbModeCycle, label: 'rgb_mode_cycle', description: 'rgb_mode_cycle_desc' },
  { value: RGBMode.RgbModeLinear, label: 'rgb_mode_linear', description: 'rgb_mode_linear_desc' },
  {
    value: RGBMode.RgbModeTrigger,
    label: 'rgb_mode_trigger',
    description: 'rgb_mode_trigger_desc',
  },
  { value: RGBMode.RgbModeString, label: 'rgb_mode_string', description: 'rgb_mode_string_desc' },
  {
    value: RGBMode.RgbModeFadingString,
    label: 'rgb_mode_fading_string',
    description: 'rgb_mode_fading_string_desc',
  },
  {
    value: RGBMode.RgbModeDiamondRipple,
    label: 'rgb_mode_diamond_ripple',
    description: 'rgb_mode_diamond_ripple_desc',
  },
  {
    value: RGBMode.RgbModeFadingDiamondRipple,
    label: 'rgb_mode_fading_diamond_ripple',
    description: 'rgb_mode_fading_diamond_ripple_desc',
  },
  { value: RGBMode.RgbModeJelly, label: 'rgb_mode_jelly', description: 'rgb_mode_jelly_desc' },
  { value: RGBMode.RgbModeBubble, label: 'rgb_mode_bubble', description: 'rgb_mode_bubble_desc' },
];

/** The option of `value`, if `modes` has it. */
export function modeOption<Mode>(
  modes: readonly ModeOption<Mode>[],
  value: Mode
): ModeOption<Mode> | undefined {
  return modes.find(mode => mode.value === value);
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/features/lighting src/lib/i18n`
Expected: PASS.

- [ ] **Step 6: Check and commit**

Run: `npm run typecheck && npx eslint src/features/lighting src/lib/i18n && npx prettier --check src/features/lighting src/lib/i18n`

```bash
git add src/features/lighting/components/modes.ts src/features/lighting/components/modes.test.ts src/lib/i18n/en.ts src/lib/i18n/zh.ts src/lib/i18n/i18n.test.tsx
git commit -m "feat(lighting): explain every lighting mode"
```

---

### Task 5: Base panel edits the staged base configuration

**Files:**
- Create: `src/features/lighting/components/panel-header.ts`
- Modify: `src/features/lighting/components/RGBPanel.tsx`
- Modify: `src/features/lighting/components/RGBPanel.test.tsx`
- Modify: `src/features/lighting/LightingPage.tsx`
- Modify: `src/features/lighting/LightingPage.test.tsx`

**Interfaces:**
- Consumes: `BASE_MODES`, `modeOption` (Task 4); staged `deviceSession.setRgbBase` (Task 1).
- Produces: `PANEL_HEADER_STYLE: CSSProperties`; `RGBPanelProps { config: RgbBaseConfig; onEdit: (patch: Partial<RgbBaseConfig>) => void; title?: string }`.

- [ ] **Step 1: Write the failing panel tests**

Replace `src/features/lighting/components/RGBPanel.test.tsx` with:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RGBBaseMode } from 'emi-keyboard-controller';
import { describe, expect, it, vi } from 'vitest';
import type { RgbBaseConfig } from '../../device';
import { RGBPanel } from './RGBPanel';
import styles from './RGBPanel.module.css';

const CONFIG: RgbBaseConfig = {
  mode: RGBBaseMode.RgbBaseModeRainbow,
  color: { red: 163, green: 55, blue: 252 },
  secondaryColor: { red: 0, green: 0, blue: 0 },
  speed: 20,
  direction: 0,
  density: 0,
  brightness: 255,
};

const RAINBOW =
  'A rainbow that starts at the hue of Color and scrolls across the keyboard. Speed sets how fast, Direction which way, Density how close the colors are.';

function colorInput(name: RegExp): HTMLInputElement {
  const input = screen.getByLabelText(name);
  if (!(input instanceof HTMLInputElement)) throw new Error('expected an input');
  return input;
}

const modeButton = (name: string) => screen.getByRole('button', { name });

describe('RGBPanel', () => {
  it('shows the base configuration with its mode pressed and explained', () => {
    render(<RGBPanel config={CONFIG} onEdit={vi.fn()} title="Base Configuration" />);
    expect(screen.getByRole('region', { name: 'Base Configuration' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Base Configuration' })).toBeVisible();
    // PL-047: edits wait for Save, not for an Apply button.
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Mode & Color' })).toBeInTheDocument();

    expect(modeButton('Rainbow')).toHaveAttribute('aria-pressed', 'true');
    expect(modeButton('Rainbow')).toHaveClass('border-primary', 'bg-primary/20');
    for (const name of ['Off', 'Blank', 'Wave']) {
      expect(modeButton(name)).toHaveAttribute('aria-pressed', 'false');
      expect(modeButton(name)).toHaveClass('glassmorphism-button');
    }
    expect(screen.getByText(RAINBOW)).toHaveClass('text-xs', 'text-gray-500');

    expect(colorInput(/^Color/)).toHaveValue('#a337fc');
    expect(colorInput(/^Color/)).toHaveClass(styles['color-input'] ?? '');
    expect(screen.getByText('#a337fc')).toHaveClass('uppercase');
    expect(colorInput(/^Secondary Color/)).toHaveValue('#000000');

    // The speed is the device value (D11), not ×1000.
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Speed' })).toHaveValue('20');
    expect(screen.getByRole('spinbutton', { name: 'Direction' })).toHaveValue(0);
    expect(screen.getByRole('slider', { name: 'Density' })).toHaveValue('0');
    expect(screen.getByRole('slider', { name: 'Brightness' })).toHaveValue('255');
    expect(screen.getByText('255')).toBeInTheDocument();
  });

  it('falls back to its own title', () => {
    render(<RGBPanel config={CONFIG} onEdit={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Base Configuration' })).toBeVisible();
  });

  it('explains every mode on its button (PL-049)', () => {
    render(<RGBPanel config={CONFIG} onEdit={vi.fn()} />);
    expect(modeButton('Off')).toHaveAccessibleDescription(
      'Turns all lighting off, the per-key effects too.'
    );
    expect(modeButton('Blank')).toHaveAccessibleDescription(
      'No base lighting: only the per-key effects light the keys.'
    );
    expect(modeButton('Rainbow')).toHaveAccessibleDescription(RAINBOW);
    expect(modeButton('Wave')).toHaveAccessibleDescription(
      'Waves that blend Color into Secondary Color and move across the keyboard. Speed sets how fast, Direction which way, Density how close the waves are.'
    );
  });

  it('edits one field per input, in whole degrees for the direction', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn<(patch: Partial<RgbBaseConfig>) => void>();
    render(<RGBPanel config={CONFIG} onEdit={onEdit} />);

    await user.click(modeButton('Wave'));
    fireEvent.input(colorInput(/^Color/), { target: { value: '#00ff00' } });
    fireEvent.input(colorInput(/^Secondary Color/), { target: { value: '#0000ff' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Speed' }), { target: { value: '55' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Direction' }), {
      target: { value: '12.5' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Density' }), { target: { value: '30' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Brightness' }), {
      target: { value: '200' },
    });

    expect(onEdit.mock.calls).toEqual([
      [{ mode: RGBBaseMode.RgbBaseModeWave }],
      [{ color: { red: 0, green: 255, blue: 0 } }],
      [{ secondaryColor: { red: 0, green: 0, blue: 255 } }],
      [{ speed: 55 }],
      [{ direction: 12 }],
      [{ density: 30 }],
      [{ brightness: 200 }],
    ]);
  });

  it('shows every new configuration, its mode included', () => {
    const { rerender } = render(<RGBPanel config={CONFIG} onEdit={vi.fn()} />);
    rerender(
      <RGBPanel
        config={{
          ...CONFIG,
          mode: RGBBaseMode.RgbBaseModeBlank,
          color: { red: 255, green: 96, blue: 0 },
          speed: 64,
          direction: 180,
          density: 12,
          brightness: 99,
        }}
        onEdit={vi.fn()}
      />
    );
    expect(modeButton('Blank')).toHaveAttribute('aria-pressed', 'true');
    expect(modeButton('Rainbow')).toHaveAttribute('aria-pressed', 'false');
    expect(colorInput(/^Color/)).toHaveValue('#ff6000');
    expect(screen.getByText('64%')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Direction' })).toHaveValue(180);
    expect(screen.getByRole('slider', { name: 'Density' })).toHaveValue('12');
    expect(screen.getByRole('slider', { name: 'Brightness' })).toHaveValue('99');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/features/lighting/components/RGBPanel.test.tsx`
Expected: FAIL (type errors on `config` / `onEdit` props; Apply still rendered).

- [ ] **Step 3: Add the shared header style**

`src/features/lighting/components/panel-header.ts`:

```ts
import type { CSSProperties } from 'react';

/**
 * The lighting panels' header padding, with the height the header had with its Apply button
 * (36 px of content, PL-047), so the panel content does not move.
 */
export const PANEL_HEADER_STYLE: CSSProperties = {
  padding: 'calc(1.25rem * var(--ui-scale, 1))',
  minHeight: 'calc(2.25rem + 2.5rem * var(--ui-scale, 1) + 1px)',
};
```

- [ ] **Step 4: Rewrite the base panel**

Replace `src/features/lighting/components/RGBPanel.tsx` with:

```tsx
import { useId } from 'react';
import { ThemedSlider } from '../../../components/ui';
import { useT } from '../../../lib/i18n';
import type { RgbBaseConfig } from '../../device';
import { hexToRgb, rgbToHex } from '../model';
import { DirectionSelector } from './DirectionSelector';
import { BASE_MODES, modeOption } from './modes';
import { PANEL_HEADER_STYLE } from './panel-header';
import styles from './RGBPanel.module.css';

export interface RGBPanelProps {
  /** The app's copy of the base lighting, staged until Save (PL-047). */
  config: RgbBaseConfig;
  /** Called with the changed field on every input. */
  onEdit: (patch: Partial<RgbBaseConfig>) => void;
  title?: string;
}

const COLOR_INPUT_CLASS =
  'w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 p-0 cursor-pointer overflow-hidden transition-colors hover:border-primary/50';

/** The keyboard-wide lighting settings (port of RGBPanel.svelte, edited in place: PL-047). */
export function RGBPanel({ config, onEdit, title }: RGBPanelProps) {
  const t = useT();
  const titleId = useId();
  const color = rgbToHex(config.color);
  const subColor = rgbToHex(config.secondaryColor);
  const pressed = modeOption(BASE_MODES, config.mode);

  return (
    <div
      className="rounded-2xl shadow bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col glassmorphism-card overflow-hidden"
      role="region"
      aria-labelledby={titleId}
    >
      {/* Header */}
      <div
        className="px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"
        style={PANEL_HEADER_STYLE}
      >
        <h3
          id={titleId}
          className="font-bold text-black dark:text-white"
          style={{ fontSize: 'calc(1.1rem * var(--ui-scale, 1))' }}
        >
          {title || t('lighting.baseConfigTitle')}
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Mode & Color Section */}
        <div
          className="border-b border-gray-200 dark:border-gray-700"
          style={{ padding: 'calc(1rem * var(--ui-scale, 1))' }}
        >
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {`${t('lighting.mode')} & ${t('lighting.color')}`}
          </h4>

          {/* Mode buttons */}
          <div className="grid grid-cols-4 gap-2 mb-2">
            {BASE_MODES.map(mode => {
              const isSelected = config.mode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={isSelected}
                  title={t(mode.description)}
                  className={`px-3 py-2 min-h-[38px] rounded-lg border text-center transition-all duration-200 relative overflow-hidden ${
                    isSelected
                      ? 'border-primary bg-primary/20 dark:bg-primary/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary/50 glassmorphism-button'
                  }`}
                  onClick={() => {
                    onEdit({ mode: mode.value });
                  }}
                >
                  <div
                    className={`text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis ${
                      isSelected
                        ? 'text-primary-700 dark:text-primary-200'
                        : 'text-black dark:text-white'
                    }`}
                  >
                    {t(mode.label)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mode explanation (PL-049) */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {pressed ? t(pressed.description) : null}
          </p>

          {/* Color pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs text-gray-600 dark:text-gray-300 mb-2"
                style={{ marginBottom: 'calc(0.5rem * var(--ui-scale, 1))' }}
              >
                {`${t('lighting.color')} `}
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
                    value={color}
                    onChange={event => {
                      onEdit({ color: hexToRgb(event.currentTarget.value) });
                    }}
                    className={`${COLOR_INPUT_CLASS} ${styles['color-input'] ?? ''}`}
                  />
                  <span className="text-sm font-mono text-gray-700 dark:text-gray-300 uppercase">
                    {color}
                  </span>
                </div>
              </label>
            </div>
            <div>
              <label
                className="block text-xs text-gray-600 dark:text-gray-300 mb-2"
                style={{ marginBottom: 'calc(0.5rem * var(--ui-scale, 1))' }}
              >
                {`${t('lighting.secondaryColor')} `}
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
                    value={subColor}
                    onChange={event => {
                      onEdit({ secondaryColor: hexToRgb(event.currentTarget.value) });
                    }}
                    className={`${COLOR_INPUT_CLASS} ${styles['color-input'] ?? ''}`}
                  />
                  <span className="text-sm font-mono text-gray-700 dark:text-gray-300 uppercase">
                    {subColor}
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Animation Section */}
        <div
          className="border-b border-gray-200 dark:border-gray-700"
          style={{ padding: 'calc(1rem * var(--ui-scale, 1))' }}
        >
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('lighting.animation') || 'Animation'}
          </h4>

          {/* Speed slider */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
              <span>{t('lighting.speed')}</span>
              <span className="font-semibold">{`${config.speed}%`}</span>
            </div>
            <ThemedSlider
              min={1}
              max={100}
              value={config.speed}
              onChange={event => {
                onEdit({ speed: Math.round(Number(event.currentTarget.value)) });
              }}
              aria-label={t('lighting.speed')}
            />
          </div>

          {/* Direction and Density */}
          <div className="grid grid-cols-2 gap-4">
            {/* Direction */}
            <div>
              <span className="block text-xs text-gray-600 dark:text-gray-300 mb-1.5">
                {t('lighting.direction')}
              </span>
              <DirectionSelector
                direction={config.direction}
                onDirectionChange={direction => {
                  // Whole degrees, as the keyboard stores them.
                  onEdit({ direction: Math.trunc(direction) });
                }}
                ariaLabel={t('lighting.direction')}
              />
            </div>

            {/* Density */}
            <div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
                <span>{t('lighting.density')}</span>
                <span className="font-semibold">{config.density}</span>
              </div>
              <ThemedSlider
                min={0}
                max={255}
                value={config.density}
                onChange={event => {
                  onEdit({ density: Number(event.currentTarget.value) });
                }}
                aria-label={t('lighting.density')}
              />
            </div>
          </div>
        </div>

        {/* Brightness Section */}
        <div style={{ padding: 'calc(1rem * var(--ui-scale, 1))' }}>
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('lighting.brightness')}
          </h4>

          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
            <span>{t('lighting.level') || 'Level'}</span>
            <span className="font-semibold">{config.brightness}</span>
          </div>
          <ThemedSlider
            min={0}
            max={255}
            value={config.brightness}
            onChange={event => {
              onEdit({ brightness: Number(event.currentTarget.value) });
            }}
            aria-label={t('lighting.brightness')}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire the page**

In `src/features/lighting/LightingPage.tsx`, replace

```tsx
  const handleBaseConfigChange = (config: RgbBaseConfig) => {
    deviceSession.setRgbBase(config);
  };
```

with

```tsx
  // Reads the latest configuration: two inputs can arrive before the next render.
  const editBase = (patch: Partial<RgbBaseConfig>) => {
    const config = deviceStore.getState().config;
    if (config) deviceSession.setRgbBase({ ...config.rgbBase, ...patch });
  };
```

and the `<RGBPanel …/>` element with

```tsx
          <RGBPanel
            key={loads}
            config={rgbBase}
            onEdit={editBase}
            title={t('lighting.baseConfigTitle')}
          />
```

- [ ] **Step 6: Update the page's base tests**

In `src/features/lighting/LightingPage.test.tsx`:

Replace the test `'applies the base configuration'` with:

```tsx
  it('stages base edits, which reach the keyboard on Save (PL-047)', async () => {
    const user = userEvent.setup();
    const before = structuredClone(keyboard.vk.state.active.rgbBase);
    renderPage();
    const base = basePanel();
    await user.click(base.getByRole('button', { name: 'Wave' }));
    fireEvent.input(colorInput(base, /^Color/), { target: { value: '#00ff00' } });
    fireEvent.input(colorInput(base, /^Secondary Color/), { target: { value: '#0000ff' } });
    fireEvent.change(base.getByRole('slider', { name: 'Speed' }), { target: { value: '55' } });
    fireEvent.change(base.getByRole('spinbutton', { name: 'Direction' }), {
      target: { value: '90' },
    });
    fireEvent.change(base.getByRole('slider', { name: 'Density' }), { target: { value: '30' } });
    fireEvent.change(base.getByRole('slider', { name: 'Brightness' }), {
      target: { value: '200' },
    });

    const expected = {
      mode: RGBBaseMode.RgbBaseModeWave,
      color: rgb(0, 255, 0),
      secondaryColor: rgb(0, 0, 255),
      speed: 55,
      direction: 90,
      density: 30,
      brightness: 200,
    };
    expect(deviceStore.getState().config?.rgbBase).toEqual(expected);
    expect(deviceStore.getState().unsaved).toBe(true);
    expect(base.getByRole('button', { name: 'Wave' })).toHaveAttribute('aria-pressed', 'true');
    expect(base.getByText('55%')).toBeInTheDocument();
    expect(keyboard.vk.state.active.rgbBase).toEqual(before);

    await saveToKeyboard();
    expect(keyboard.vk.state.active.rgbBase).toEqual(expected);
  });
```

In `'applies the new configuration’s modes, not the ones picked before the load'`, replace the base part (from the Brightness `fireEvent.change` to the `rgbBase.mode` expectation, including the base Apply click and the `saveToKeyboard()` added in Task 1) with:

```tsx
      fireEvent.change(basePanel().getByRole('slider', { name: 'Brightness' }), {
        target: { value: '100' },
      });
      expect(deviceStore.getState().config?.rgbBase).toMatchObject({
        brightness: 100,
        mode: RGBBaseMode.RgbBaseModeRainbow,
      });
```

- [ ] **Step 7: Run the lighting tests**

Run: `npx vitest run src/features/lighting`
Expected: PASS.

- [ ] **Step 8: Check and commit**

Run: `npm run typecheck && npx eslint src/features/lighting && npx prettier --check src/features/lighting`

```bash
git add src/features/lighting/components/panel-header.ts src/features/lighting/components/RGBPanel.tsx src/features/lighting/components/RGBPanel.test.tsx src/features/lighting/LightingPage.tsx src/features/lighting/LightingPage.test.tsx
git commit -m "feat(lighting): edit the staged base lighting in place"
```

---

### Task 6: Key panel edits its targets in place

**Files:**
- Modify: `src/features/lighting/components/RGBSubPanel.tsx`
- Modify: `src/features/lighting/components/RGBSubPanel.test.tsx`
- Modify: `src/features/lighting/LightingPage.tsx`
- Modify: `src/features/lighting/LightingPage.test.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/zh.ts`, `src/lib/i18n/i18n.test.tsx`

**Interfaces:**
- Consumes: `MIXED`, `SharedKeyValues`, `lightingTargets`, `sharedKeyValues`, `editKeys`, `recolorKeys`, `rainbowColors` (Task 3, `../model`); `KEY_MODES`, `modeOption` (Task 4); `PANEL_HEADER_STYLE` (Task 5).
- Produces: `RGBSubPanelProps { values: SharedKeyValues; targetCount: number | 'all'; onEdit: (patch: Partial<RgbKeyConfig>) => void; onRainbow: (referenceHex: string, direction: number, density: number) => void; title?: string }`.

- [ ] **Step 1: Write the failing panel tests**

Replace `src/features/lighting/components/RGBSubPanel.test.tsx` with:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RGBMode } from 'emi-keyboard-controller';
import { describe, expect, it, vi } from 'vitest';
import type { RgbKeyConfig } from '../../device';
import { MIXED, type SharedKeyValues } from '../model';
import { RGBSubPanel, type RGBSubPanelProps } from './RGBSubPanel';
import styles from './RGBSubPanel.module.css';

const CONFIG: RgbKeyConfig = {
  mode: RGBMode.RgbModeStatic,
  color: { red: 255, green: 0, blue: 0 },
  speed: 20,
};

const SHARED: SharedKeyValues = { ...CONFIG, first: CONFIG };

const MODE_NAMES = [
  'Fixed',
  'Static',
  'Cycle',
  'Linear',
  'Trigger',
  'String',
  'Fading String',
  'Diamond Ripple',
  'Fading Diamond Ripple',
  'Jelly',
  'Bubble',
];

function renderPanel(props: Partial<RGBSubPanelProps> = {}) {
  const handlers = {
    onEdit: vi.fn<(patch: Partial<RgbKeyConfig>) => void>(),
    onRainbow: vi.fn<(referenceHex: string, direction: number, density: number) => void>(),
  };
  const view = render(<RGBSubPanel values={SHARED} targetCount="all" {...handlers} {...props} />);
  return { ...handlers, ...view };
}

const modeButton = (name: string) => screen.getByRole('button', { name });

function colorInput(): HTMLInputElement {
  const input = screen.getByLabelText('Color');
  if (!(input instanceof HTMLInputElement)) throw new Error('expected an input');
  return input;
}

describe('RGBSubPanel', () => {
  it('shows the shared values with their mode pressed and explained', () => {
    renderPanel({ title: 'Key Configuration' });
    expect(screen.getByRole('region', { name: 'Key Configuration' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Mode' })).toBeInTheDocument();
    for (const name of MODE_NAMES) {
      expect(modeButton(name)).toHaveAttribute('aria-pressed', String(name === 'Static'));
    }
    expect(screen.getByText('Always adds Color on top of the base lighting.')).toBeInTheDocument();
    expect(colorInput()).toHaveValue('#ff0000');
    expect(colorInput()).toHaveClass(styles['color-input'] ?? '');
    expect(screen.getByText('#ff0000')).toHaveClass('uppercase');
    expect(screen.getByRole('heading', { level: 4, name: 'Speed' })).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Speed' })).toHaveValue('20');
  });

  it('falls back to its own title', () => {
    renderPanel();
    expect(screen.getByRole('heading', { level: 3, name: 'Key Configuration' })).toBeVisible();
  });

  it('names the keys its edits change (PL-047)', () => {
    const { rerender, onEdit, onRainbow } = renderPanel();
    expect(screen.getByText('All keys')).toBeInTheDocument();
    rerender(
      <RGBSubPanel values={SHARED} targetCount={1} onEdit={onEdit} onRainbow={onRainbow} />
    );
    expect(screen.getByText('1 key')).toBeInTheDocument();
    rerender(
      <RGBSubPanel values={SHARED} targetCount={3} onEdit={onEdit} onRainbow={onRainbow} />
    );
    expect(screen.getByText('3 keys')).toBeInTheDocument();
  });

  it('shows Mixed where the keys differ, with the first key’s values in the controls (PL-048)', () => {
    renderPanel({ values: { mode: MIXED, color: MIXED, speed: MIXED, first: CONFIG } });
    for (const name of MODE_NAMES) expect(modeButton(name)).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByText('These keys use different modes. Pick one to use it on all of them.')
    ).toBeInTheDocument();
    expect(screen.getAllByText('Mixed')).toHaveLength(2);
    expect(colorInput()).toHaveValue('#ff0000');
    expect(screen.getByRole('slider', { name: 'Speed' })).toHaveValue('20');
    expect(screen.queryByText('20%')).not.toBeInTheDocument();
  });

  it('explains every mode on its button (PL-049)', () => {
    renderPanel();
    expect(modeButton('Fixed')).toHaveAccessibleDescription(
      'Always shows Color, in place of the base lighting.'
    );
    expect(modeButton('Jelly')).toHaveAccessibleDescription(
      'Pressing lights up the keys around it in their own colors; the deeper the press, the farther it reaches.'
    );
  });

  it('edits one field per input', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderPanel();
    await user.click(modeButton('Jelly'));
    fireEvent.input(colorInput(), { target: { value: '#123456' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Speed' }), { target: { value: '70' } });
    expect(onEdit.mock.calls).toEqual([
      [{ mode: RGBMode.RgbModeJelly }],
      [{ color: { red: 0x12, green: 0x34, blue: 0x56 } }],
      [{ speed: 70 }],
    ]);
  });

  it('opens and closes the rainbow preset', async () => {
    const user = userEvent.setup();
    renderPanel();
    const toggle = screen.getByRole('button', { name: 'Rainbow Preset' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Apply Settings' })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('▼')).toHaveClass('rotate-180');
    expect(screen.getByText('Rainbow Direction')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Rainbow Direction' })).toHaveValue(0);
    expect(screen.getByText('Rainbow Density')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Rainbow Density' })).toHaveValue('10');
    expect(screen.getByRole('button', { name: 'Apply Settings' })).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByRole('button', { name: 'Apply Settings' })).not.toBeInTheDocument();
  });

  it('runs the rainbow preset from the panel’s colour (D11)', async () => {
    const user = userEvent.setup();
    const { onRainbow, onEdit } = renderPanel({
      values: { ...SHARED, color: MIXED, first: { ...CONFIG, color: { red: 0, green: 0, blue: 255 } } },
    });
    await user.click(screen.getByRole('button', { name: 'Rainbow Preset' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Rainbow Direction' }), {
      target: { value: '180' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Rainbow Density' }), {
      target: { value: '60' },
    });
    await user.click(screen.getByRole('button', { name: 'Apply Settings' }));
    expect(onRainbow).toHaveBeenCalledExactlyOnceWith('#0000ff', 180, 60);
    expect(onEdit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/features/lighting/components/RGBSubPanel.test.tsx`
Expected: FAIL (props do not exist yet; Apply still rendered).

- [ ] **Step 3: Rewrite the key panel**

Replace `src/features/lighting/components/RGBSubPanel.tsx` with:

```tsx
import { useId, useState } from 'react';
import { ThemedSlider } from '../../../components/ui';
import { useT } from '../../../lib/i18n';
import type { RgbKeyConfig } from '../../device';
import { MIXED, hexToRgb, rgbToHex, type SharedKeyValues } from '../model';
import { DirectionSelector } from './DirectionSelector';
import { KEY_MODES, modeOption } from './modes';
import { PANEL_HEADER_STYLE } from './panel-header';
import styles from './RGBSubPanel.module.css';

export interface RGBSubPanelProps {
  /** The targets' shared values, `MIXED` where they differ (PL-048). */
  values: SharedKeyValues;
  /** How many keys an edit changes, or `'all'` while no key is selected. */
  targetCount: number | 'all';
  /** Called with the changed field on every input; the page applies it to every target. */
  onEdit: (patch: Partial<RgbKeyConfig>) => void;
  /** The rainbow preset: colours the targets from `referenceHex` along `direction` (D11). */
  onRainbow: (referenceHex: string, direction: number, density: number) => void;
  title?: string;
}

/**
 * Per-key lighting of the selected keys (all keys while none is selected) and the rainbow preset
 * (port of RGBSubPanel.svelte, edited in place: PL-047, PL-048).
 */
export function RGBSubPanel({ values, targetCount, onEdit, onRainbow, title }: RGBSubPanelProps) {
  const t = useT();
  const titleId = useId();

  // Local state for rainbow preset (not part of base config)
  const [showRainbowPreset, setShowRainbowPreset] = useState(false);
  const [rainbowDirection, setRainbowDirection] = useState(0);
  const [rainbowDensity, setRainbowDensity] = useState(10);

  // Where a field is mixed, its control shows the first target's value.
  const color = rgbToHex(values.color === MIXED ? values.first.color : values.color);
  const speed = values.speed === MIXED ? values.first.speed : values.speed;
  const pressed = values.mode === MIXED ? undefined : modeOption(KEY_MODES, values.mode);

  let targets: string;
  if (targetCount === 'all') targets = t('lighting.allKeys');
  else if (targetCount === 1) targets = t('lighting.oneKey');
  else targets = t('lighting.keyCount', String(targetCount));

  let modeText: string | null = null;
  if (values.mode === MIXED) modeText = t('lighting.mixedModes');
  else if (pressed) modeText = t(pressed.description);

  return (
    <div
      className="rounded-2xl shadow bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col glassmorphism-card overflow-hidden"
      role="region"
      aria-labelledby={titleId}
    >
      {/* Header with the keys the edits change */}
      <div
        className="px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"
        style={PANEL_HEADER_STYLE}
      >
        <h3
          id={titleId}
          className="font-bold text-black dark:text-white"
          style={{ fontSize: 'calc(1.1rem * var(--ui-scale, 1))' }}
        >
          {title || t('lighting.subConfigTitle')}
        </h3>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{targets}</span>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto p-4"
        style={{ padding: 'calc(1rem * var(--ui-scale, 1))' }}
      >
        {/* Mode Section */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('lighting.mode')}
          </h4>
          {/* Mode buttons in 2 rows */}
          <div className="grid grid-cols-6 gap-2">
            {KEY_MODES.map(mode => {
              const isSelected = values.mode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={isSelected}
                  title={t(mode.description)}
                  className={`h-12 min-h-[48px] rounded-lg border text-center transition-all duration-200 px-2 flex items-center justify-center ${
                    isSelected
                      ? 'border-primary bg-primary/20 dark:bg-primary/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary/50 glassmorphism-button'
                  }`}
                  onClick={() => {
                    onEdit({ mode: mode.value });
                  }}
                >
                  <div
                    className={`text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis ${
                      isSelected
                        ? 'text-primary-700 dark:text-primary-200'
                        : 'text-black dark:text-white'
                    }`}
                  >
                    {t(mode.label)}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Mode explanation, or the mixed modes (PL-048, PL-049) */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{modeText}</p>
        </div>

        {/* Color Section */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('lighting.color')}
          </h4>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={event => {
                onEdit({ color: hexToRgb(event.currentTarget.value) });
              }}
              className={`w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 p-0 cursor-pointer overflow-hidden transition-colors hover:border-primary/50 ${styles['color-input'] ?? ''}`}
              aria-label={t('lighting.color')}
            />
            <span className="text-sm font-mono text-gray-700 dark:text-gray-300 uppercase">
              {values.color === MIXED ? t('lighting.mixed') : color}
            </span>
          </div>
        </div>

        {/* Speed Section */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('lighting.speed')}
          </h4>
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
            <span>{t('lighting.speed')}</span>
            <span className="font-semibold">
              {values.speed === MIXED ? t('lighting.mixed') : `${speed}%`}
            </span>
          </div>
          <ThemedSlider
            min={1}
            max={100}
            value={speed}
            onChange={event => {
              onEdit({ speed: Math.round(Number(event.currentTarget.value)) });
            }}
            aria-label={t('lighting.speed')}
          />
        </div>

        {/* Rainbow Preset Collapsible Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <button
            type="button"
            aria-expanded={showRainbowPreset}
            onClick={() => {
              setShowRainbowPreset(!showRainbowPreset);
            }}
            className="w-full flex items-center justify-between text-left mb-3"
          >
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('lighting.rainbowPreset')}
            </h4>
            <span
              aria-hidden="true"
              className={`text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                showRainbowPreset ? 'rotate-180' : ''
              }`}
            >
              ▼
            </span>
          </button>

          {showRainbowPreset && (
            <div className="space-y-4">
              {/* Direction */}
              <div>
                <span className="block text-xs text-gray-600 dark:text-gray-300 mb-2">
                  {t('lighting.rainbowDirection')}
                </span>
                <DirectionSelector
                  direction={rainbowDirection}
                  onDirectionChange={setRainbowDirection}
                  ariaLabel={t('lighting.rainbowDirection')}
                />
              </div>

              {/* Density */}
              <div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
                  <span>{t('lighting.rainbowDensity')}</span>
                  <span className="font-semibold">{rainbowDensity}</span>
                </div>
                <ThemedSlider
                  min={0}
                  max={255}
                  value={rainbowDensity}
                  onChange={event => {
                    setRainbowDensity(Number(event.currentTarget.value));
                  }}
                  aria-label={t('lighting.rainbowDensity')}
                />
              </div>

              {/* Apply Rainbow Button */}
              <button
                type="button"
                onClick={() => {
                  onRainbow(color, rainbowDirection, rainbowDensity);
                }}
                className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-medium text-sm hover:border-primary/50 transition-colors glassmorphism-button"
              >
                {t('lighting.applySettings')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire the page and add the save hint**

Replace `src/features/lighting/LightingPage.tsx` with:

```tsx
import { RGBMode } from 'emi-keyboard-controller';
import { useEffect, useMemo } from 'react';
import { useT } from '../../lib/i18n';
import {
  deviceSession,
  deviceStore,
  useDeviceStore,
  type RgbBaseConfig,
  type RgbKeyConfig,
} from '../device';
import {
  keySelection,
  keySelectionStore,
  useLayoutKeys,
  useSelectedKeys,
  useSelectionShortcuts,
} from '../keyboard';
import { RGBPanel } from './components/RGBPanel';
import { RGBSubPanel } from './components/RGBSubPanel';
import { useDeviceLoads } from './hooks/use-device-loads';
import {
  editKeys,
  lightingTargets,
  rainbowColors,
  recolorKeys,
  sharedKeyValues,
  type SharedKeyValues,
} from './model';

/** emi-keyboard-controller `RGBConfig` defaults: the key panel without keys to edit. */
const DEFAULT_KEY_CONFIG: RgbKeyConfig = {
  mode: RGBMode.RgbModeLinear,
  color: { red: 163, green: 55, blue: 252 },
  speed: 20,
};
const NO_TARGET_VALUES: SharedKeyValues = { ...DEFAULT_KEY_CONFIG, first: DEFAULT_KEY_CONFIG };

/** The keys an edit changes, from the selection at the time of the edit. */
function currentTargets(rgbKeys: readonly RgbKeyConfig[]): number[] {
  return lightingTargets(keySelectionStore.getState().selected, rgbKeys.length);
}

/**
 * Lighting route (port of `routes/lighting/+page.svelte`): the keyboard-wide base lighting and the
 * per-key lighting of the selected keys (all keys while none is selected), edited in place and
 * sent to the keyboard by Save (PL-047). The global keyboard above it belongs to the shell.
 */
export function LightingPage() {
  const t = useT();
  const rgbBase = useDeviceStore(state => state.config?.rgbBase);
  const rgbKeys = useDeviceStore(state => state.config?.rgbKeys);
  const selected = useSelectedKeys();
  const layout = useLayoutKeys();
  // Each configuration the keyboard loads (profile switch, reset) opens both panels again on it,
  // with the rainbow preset closed.
  const loads = useDeviceLoads();

  // Always allow key selection on lighting page
  useEffect(() => {
    keySelection.setAllowSelection(true);
  }, []);
  useSelectionShortcuts();

  const keyCount = rgbKeys?.length ?? 0;
  const targets = useMemo(() => lightingTargets(selected, keyCount), [selected, keyCount]);
  const values = useMemo(
    () => (rgbKeys && sharedKeyValues(rgbKeys, targets)) ?? NO_TARGET_VALUES,
    [rgbKeys, targets]
  );

  if (!rgbBase || !rgbKeys) return null;

  // Edits read the latest configuration: two inputs can arrive before the next render.
  const editBase = (patch: Partial<RgbBaseConfig>) => {
    const config = deviceStore.getState().config;
    if (config) deviceSession.setRgbBase({ ...config.rgbBase, ...patch });
  };

  const editTargets = (patch: Partial<RgbKeyConfig>) => {
    const config = deviceStore.getState().config;
    if (config) {
      deviceSession.setRgbKeys(editKeys(config.rgbKeys, currentTargets(config.rgbKeys), patch));
    }
  };

  // The rainbow preset colours the targets the layout shows; modes and speeds stay (PL-007).
  const applyRainbow = (referenceHex: string, direction: number, density: number) => {
    const config = deviceStore.getState().config;
    if (!config || !layout) return;
    const targetIds = new Set(currentTargets(config.rgbKeys));
    const keys = layout.visible.filter(key => targetIds.has(key.id));
    deviceSession.setRgbKeys(
      recolorKeys(config.rgbKeys, rainbowColors(keys, referenceHex, direction, density))
    );
  };

  return (
    <div
      className="rounded-2xl shadow mt-2 mb-4 grow bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col glassmorphism-card"
      style={{ padding: 'calc(2rem * var(--ui-scale, 1))' }}
    >
      <div
        className="flex items-center justify-between -mt-4"
        style={{ marginBottom: 'calc(0.5rem * var(--ui-scale, 1))' }}
      >
        <h2
          className="font-bold text-black dark:text-white"
          style={{ fontSize: 'calc(1.5rem * var(--ui-scale, 1))' }}
        >
          {t('lighting.title')}
        </h2>
        {/* PL-047: lighting edits wait for Save */}
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('lighting.saveHint')}</p>
      </div>

      <div
        className="rounded-xl shadow flex flex-col lg:flex-row flex-1 gap-4"
        style={{ gap: 'calc(1rem * var(--ui-scale, 1))' }}
      >
        {/* Base Configuration Panel */}
        <div className="flex-1 min-w-0">
          <RGBPanel
            key={loads}
            config={rgbBase}
            onEdit={editBase}
            title={t('lighting.baseConfigTitle')}
          />
        </div>

        {/* Sub Configuration Panel */}
        <div className="flex-1 min-w-0">
          <RGBSubPanel
            key={loads}
            values={values}
            targetCount={selected.length === 0 ? 'all' : targets.length}
            onEdit={editTargets}
            onRainbow={applyRainbow}
            title={t('lighting.subConfigTitle')}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Remove `lighting.apply`**

Delete `'lighting.apply': 'Apply',` from `src/lib/i18n/en.ts` and `'lighting.apply': '应用',` from `src/lib/i18n/zh.ts`. In `src/lib/i18n/i18n.test.tsx`, the key count becomes 293 and its comment ends "…and the Lighting copy (PL-047 to PL-049), without the panels' Apply."

- [ ] **Step 6: Rewrite the page tests**

Replace `src/features/lighting/LightingPage.test.tsx` with:

```tsx
/**
 * Lighting page against the real device layer: the app's `deviceSession` connected to the virtual
 * keyboard. Key selection is driven through the key-selection store, like the shell's keyboard.
 * Lighting edits are staged; they reach the keyboard on Save (PL-047).
 */
import {
  act,
  fireEvent,
  render,
  screen,
  within,
  type BoundFunctions,
  type queries,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RGBBaseMode, RGBMode } from 'emi-keyboard-controller';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectVirtualKeyboard, type ConnectedKeyboard } from '../../testing/app-keyboard';
import type { WireRgbKey } from '../../testing/virtual-keyboard';
import { deviceSession, deviceStore, type Rgb } from '../device';
import { INITIAL_KEY_SELECTION, keySelection, keySelectionStore } from '../keyboard';
import {
  DEFAULT_LAYOUT_OPTIONS,
  layoutVariantIndices,
  parseLayout,
  visibleKeys,
  type LayoutKey,
} from '../keyboard/model';
import { LightingPage } from './LightingPage';
import { rainbowColors, rgbToHex } from './model';

const TOTAL_KEYS = 70;
const MIXED_MODES = 'These keys use different modes. Pick one to use it on all of them.';

function renderPage() {
  return render(
    <MemoryRouter>
      <LightingPage />
    </MemoryRouter>
  );
}

/** Lets the controller queue and the virtual keyboard finish pending exchanges. */
async function settle(): Promise<void> {
  for (let round = 0; round < 3; round++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

it('renders nothing until a keyboard configuration is loaded', () => {
  const { container } = renderPage();
  expect(container).toBeEmptyDOMElement();
});

describe('LightingPage', () => {
  let keyboard: ConnectedKeyboard;

  beforeEach(async () => {
    // The vendored controller logs every load step.
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false });
    // The shell's keyboard reports the selectable keys (highest visible id + 1).
    keySelectionStore.setState({ ...INITIAL_KEY_SELECTION, totalKeys: TOTAL_KEYS }, true);
  });

  afterEach(() => {
    keyboard.dispose();
    keySelectionStore.setState(INITIAL_KEY_SELECTION, true);
  });

  const basePanel = () => within(screen.getByRole('region', { name: 'Base Configuration' }));
  const keyPanel = () => within(screen.getByRole('region', { name: 'Key Configuration' }));

  function colorInput(
    panel: BoundFunctions<typeof queries>,
    name: RegExp | string
  ): HTMLInputElement {
    const input = panel.getByLabelText(name);
    if (!(input instanceof HTMLInputElement)) throw new Error('expected an input');
    return input;
  }

  function deviceRgbKeys(): readonly WireRgbKey[] {
    return keyboard.vk.state.active.rgbKeys;
  }

  /** The app's (staged) per-key lighting. */
  function stagedRgbKeys() {
    const config = deviceStore.getState().config;
    if (!config) throw new Error('no configuration');
    return config.rgbKeys;
  }

  function stagedHex(keyId: number): string {
    const config = stagedRgbKeys()[keyId];
    if (!config) throw new Error(`no RGB key ${keyId}`);
    return rgbToHex(config.color);
  }

  /** Visible keys of the connected layout with the default Layout dropdown options. */
  function layoutKeys(): readonly LayoutKey[] {
    const { connection } = deviceStore.getState();
    if (connection.status !== 'ready') throw new Error('not connected');
    const { layoutJson, layoutLabels } = connection.model;
    return visibleKeys(
      parseLayout(layoutJson),
      layoutVariantIndices(layoutLabels, DEFAULT_LAYOUT_OPTIONS)
    );
  }

  const rgb = (red: number, green: number, blue: number): Rgb => ({ red, green, blue });

  async function saveToKeyboard(): Promise<void> {
    await act(async () => {
      await deviceSession.save();
    });
  }

  it('shows the base configuration, the save hint and the keys’ shared values', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 2, name: 'Lighting' })).toBeInTheDocument();
    expect(
      screen.getByText('Lighting changes reach the keyboard when you press Save.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();

    const base = basePanel();
    expect(base.getByRole('button', { name: 'Blank' })).toHaveAttribute('aria-pressed', 'true');
    expect(colorInput(base, /^Color/)).toHaveValue('#a337fc');
    expect(colorInput(base, /^Secondary Color/)).toHaveValue('#000000');
    // D11 / PL-006: the device speed as {n}%.
    expect(base.getByText('20%')).toBeInTheDocument();
    expect(base.getByText('255')).toBeInTheDocument();

    // No key selected: all keys. On the virtual keyboard every 7th key is Static and the others
    // Linear, each in its own colour, all at speed 20 (PL-048).
    const key = keyPanel();
    expect(key.getByText('All keys')).toBeInTheDocument();
    expect(key.getByRole('button', { name: 'Static' })).toHaveAttribute('aria-pressed', 'false');
    expect(key.getByRole('button', { name: 'Linear' })).toHaveAttribute('aria-pressed', 'false');
    expect(key.getByText(MIXED_MODES)).toBeInTheDocument();
    expect(key.getByText('Mixed')).toBeInTheDocument();
    expect(colorInput(key, 'Color')).toHaveValue('#ff0000');
    expect(key.getByText('20%')).toBeInTheDocument();
  });

  it('shows what the selected keys share', () => {
    renderPage();
    act(() => {
      keySelection.setSelected([1, 2]);
    });
    const key = keyPanel();
    expect(key.getByText('2 keys')).toBeInTheDocument();
    expect(key.getByRole('button', { name: 'Linear' })).toHaveAttribute('aria-pressed', 'true');
    expect(
      key.getByText('Lights up in Color as the key goes down: the deeper the press, the brighter.')
    ).toBeInTheDocument();
    expect(key.getByText('Mixed')).toBeInTheDocument();

    act(() => {
      keySelection.setSelected([1]);
    });
    expect(key.getByText('1 key')).toBeInTheDocument();
    expect(colorInput(key, 'Color')).toHaveValue(stagedHex(1));
    expect(key.queryByText('Mixed')).not.toBeInTheDocument();
    // Selecting keys never edits them.
    expect(deviceStore.getState().unsaved).toBe(false);
  });

  it('opens with the keyboard’s own modes', async () => {
    const config = deviceStore.getState().config;
    if (!config) throw new Error('no configuration');
    deviceSession.setRgbBase({ ...config.rgbBase, mode: RGBBaseMode.RgbBaseModeRainbow });
    deviceSession.setRgbKeys(
      config.rgbKeys.map((rgbKey, keyId) => ({
        keyId,
        config: { ...rgbKey, mode: RGBMode.RgbModeBubble },
      }))
    );
    await saveToKeyboard();
    expect(keyboard.vk.state.active.rgbBase.mode).toBe(RGBBaseMode.RgbBaseModeRainbow);

    renderPage();
    expect(basePanel().getByRole('button', { name: 'Rainbow' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(keyPanel().getByRole('button', { name: 'Bubble' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('stages base edits, which reach the keyboard on Save (PL-047)', async () => {
    const user = userEvent.setup();
    const before = structuredClone(keyboard.vk.state.active.rgbBase);
    renderPage();
    const base = basePanel();
    await user.click(base.getByRole('button', { name: 'Wave' }));
    fireEvent.input(colorInput(base, /^Color/), { target: { value: '#00ff00' } });
    fireEvent.input(colorInput(base, /^Secondary Color/), { target: { value: '#0000ff' } });
    fireEvent.change(base.getByRole('slider', { name: 'Speed' }), { target: { value: '55' } });
    fireEvent.change(base.getByRole('spinbutton', { name: 'Direction' }), {
      target: { value: '90' },
    });
    fireEvent.change(base.getByRole('slider', { name: 'Density' }), { target: { value: '30' } });
    fireEvent.change(base.getByRole('slider', { name: 'Brightness' }), {
      target: { value: '200' },
    });

    const expected = {
      mode: RGBBaseMode.RgbBaseModeWave,
      color: rgb(0, 255, 0),
      secondaryColor: rgb(0, 0, 255),
      speed: 55,
      direction: 90,
      density: 30,
      brightness: 200,
    };
    expect(deviceStore.getState().config?.rgbBase).toEqual(expected);
    expect(deviceStore.getState().unsaved).toBe(true);
    expect(base.getByRole('button', { name: 'Wave' })).toHaveAttribute('aria-pressed', 'true');
    expect(base.getByText('55%')).toBeInTheDocument();
    await settle();
    expect(keyboard.vk.state.active.rgbBase).toEqual(before);

    await saveToKeyboard();
    expect(keyboard.vk.state.active.rgbBase).toEqual(expected);
  });

  it('edits only the changed field of every key while none is selected', async () => {
    const user = userEvent.setup();
    const before = structuredClone(deviceRgbKeys());
    renderPage();
    const key = keyPanel();
    await user.click(key.getByRole('button', { name: 'Jelly' }));
    expect(key.getByRole('button', { name: 'Jelly' })).toHaveAttribute('aria-pressed', 'true');
    expect(key.queryByText(MIXED_MODES)).not.toBeInTheDocument();
    fireEvent.change(key.getByRole('slider', { name: 'Speed' }), { target: { value: '70' } });
    expect(key.getByText('70%')).toBeInTheDocument();

    const expected = before.map(config => ({ ...config, mode: RGBMode.RgbModeJelly, speed: 70 }));
    expect(stagedRgbKeys()).toEqual(expected);
    await settle();
    expect(deviceRgbKeys()).toEqual(before);

    await saveToKeyboard();
    expect(deviceRgbKeys()).toHaveLength(TOTAL_KEYS);
    expect(deviceRgbKeys()).toEqual(expected);
  });

  it('edits the selected keys only', async () => {
    const user = userEvent.setup();
    const before = structuredClone(deviceRgbKeys());
    renderPage();
    act(() => {
      keySelection.setSelected([3, 4]);
    });
    const key = keyPanel();
    await user.click(key.getByRole('button', { name: 'Jelly' }));
    fireEvent.input(colorInput(key, 'Color'), { target: { value: '#123456' } });
    expect(colorInput(key, 'Color')).toHaveValue('#123456');
    expect(key.queryByText('Mixed')).not.toBeInTheDocument();

    await saveToKeyboard();
    const edited = { mode: RGBMode.RgbModeJelly, color: rgb(0x12, 0x34, 0x56), speed: 20 };
    expect(deviceRgbKeys()[3]).toEqual(edited);
    expect(deviceRgbKeys()[4]).toEqual(edited);
    deviceRgbKeys().forEach((config, id) => {
      if (id !== 3 && id !== 4) expect(config).toEqual(before[id]);
    });
  });

  describe('rainbow preset (D11, PL-007)', () => {
    async function applyRainbow(direction: string, density: string) {
      const user = userEvent.setup();
      const key = keyPanel();
      await user.click(key.getByRole('button', { name: 'Rainbow Preset' }));
      fireEvent.change(key.getByRole('spinbutton', { name: 'Rainbow Direction' }), {
        target: { value: direction },
      });
      fireEvent.change(key.getByRole('slider', { name: 'Rainbow Density' }), {
        target: { value: density },
      });
      await user.click(key.getByRole('button', { name: 'Apply Settings' }));
    }

    it('colours every visible key from its position, keeping modes and speeds', async () => {
      const before = structuredClone(deviceRgbKeys());
      renderPage();
      await applyRainbow('90', '20');
      await saveToKeyboard();

      const keys = layoutKeys();
      // The panel's colour is the first key's (key 0, red) while the colours are mixed.
      const colors = rainbowColors(keys, '#ff0000', 90, 20);
      for (const { id } of keys) {
        expect(deviceRgbKeys()[id]).toEqual({ ...before[id], color: colors.get(id) });
      }
      expect(new Set(keys.map(({ id }) => JSON.stringify(colors.get(id)))).size).toBeGreaterThan(4);
      // Keys of layout options that are not shown keep their colours.
      const visible = new Set(keys.map(({ id }) => id));
      const hidden = deviceRgbKeys().flatMap((_, id) => (visible.has(id) ? [] : [id]));
      expect(hidden).toEqual([14, 15, 55, 56, 65, 66, 67, 68, 69]);
      for (const id of hidden) expect(deviceRgbKeys()[id]).toEqual(before[id]);
    });

    it('colours only the selected keys, from the first one’s colour', async () => {
      const before = structuredClone(deviceRgbKeys());
      renderPage();
      act(() => {
        keySelection.setSelected([5, 30, 47]);
      });
      const reference = stagedHex(5);
      await applyRainbow('0', '30');
      await saveToKeyboard();

      const colors = rainbowColors(layoutKeys(), reference, 0, 30);
      for (const id of [5, 30, 47]) {
        expect(deviceRgbKeys()[id]).toEqual({ ...before[id], color: colors.get(id) });
      }
      deviceRgbKeys().forEach((config, id) => {
        if (![5, 30, 47].includes(id)) expect(config).toEqual(before[id]);
      });
    });
  });

  describe('device loads (profile switches, resets)', () => {
    /** Profile 1 of the virtual keyboard with the Rainbow base mode and key 0 in Cycle mode. */
    function storeModesOnProfile1(): void {
      const profile = keyboard.vk.state.profiles[1];
      const key0 = profile?.rgbKeys[0];
      if (!profile || !key0) throw new Error('profile 1 has no key 0');
      profile.rgbBase = { ...profile.rgbBase, mode: RGBBaseMode.RgbBaseModeRainbow };
      profile.rgbKeys[0] = { ...key0, mode: RGBMode.RgbModeCycle };
    }

    /** Selects key 0, stages new modes in both panels, then switches to profile 1. */
    async function editAndSwitchToProfile1(user: ReturnType<typeof userEvent.setup>) {
      act(() => {
        keySelection.setSelected([0]);
      });
      await user.click(basePanel().getByRole('button', { name: 'Wave' }));
      await user.click(keyPanel().getByRole('button', { name: 'Bubble' }));
      expect(deviceStore.getState().unsaved).toBe(true);
      await act(async () => {
        await deviceSession.switchProfile(1);
      });
      expect(deviceStore.getState().config?.profileIndex).toBe(1);
    }

    it('drops unsaved edits and shows the new configuration in both panels', async () => {
      const user = userEvent.setup();
      storeModesOnProfile1();
      renderPage();
      await editAndSwitchToProfile1(user);

      expect(deviceStore.getState().unsaved).toBe(false);
      // Profile 1 of the virtual keyboard: orange base colour, rainbow shifted by 90°.
      expect(colorInput(basePanel(), /^Color/)).toHaveValue('#ff6000');
      expect(colorInput(keyPanel(), 'Color')).toHaveValue('#80ff00');
      expect(basePanel().getByRole('button', { name: 'Rainbow' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(keyPanel().getByRole('button', { name: 'Cycle' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });

    it('edits the new configuration after the load', async () => {
      const user = userEvent.setup();
      storeModesOnProfile1();
      renderPage();
      await editAndSwitchToProfile1(user);

      fireEvent.change(basePanel().getByRole('slider', { name: 'Brightness' }), {
        target: { value: '100' },
      });
      fireEvent.change(keyPanel().getByRole('slider', { name: 'Speed' }), {
        target: { value: '70' },
      });
      await saveToKeyboard();
      expect(keyboard.vk.state.active.rgbBase).toMatchObject({
        brightness: 100,
        mode: RGBBaseMode.RgbBaseModeRainbow,
      });
      expect(deviceRgbKeys()[0]).toMatchObject({ speed: 70, mode: RGBMode.RgbModeCycle });
    });
  });

  it('works under StrictMode, which renders and runs its effects twice', async () => {
    render(
      <StrictMode>
        <MemoryRouter>
          <LightingPage />
        </MemoryRouter>
      </StrictMode>
    );
    act(() => {
      keySelection.setSelected([8]);
    });
    const key = keyPanel();
    fireEvent.input(colorInput(key, 'Color'), { target: { value: '#00ffff' } });
    expect(colorInput(key, 'Color')).toHaveValue('#00ffff');
    await saveToKeyboard();
    expect(deviceRgbKeys()[8]?.color).toEqual(rgb(0, 255, 255));
  });

  it('allows key selection and toggles it with Ctrl/⌘+A and Ctrl/⌘+Escape', async () => {
    const user = userEvent.setup();
    keySelection.setAllowSelection(false);
    const { unmount } = renderPage();
    expect(keySelectionStore.getState().allowSelection).toBe(true);

    await user.keyboard('{Control>}a{/Control}');
    expect(keySelectionStore.getState().selected).toHaveLength(TOTAL_KEYS);
    await user.keyboard('{Control>}{Escape}{/Control}');
    expect(keySelectionStore.getState().selected).toHaveLength(0);
    await user.keyboard('{Meta>}a{/Meta}');
    expect(keySelectionStore.getState().selected).toHaveLength(TOTAL_KEYS);
    await user.keyboard('{Meta>}a{/Meta}');
    expect(keySelectionStore.getState().selected).toHaveLength(0);

    unmount();
    expect(fireEvent.keyDown(window, { key: 'a', ctrlKey: true })).toBe(true);
    expect(keySelectionStore.getState().selected).toHaveLength(0);
  });
});
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/features/lighting src/lib/i18n src/app/layout`
Expected: PASS. If a fixture assumption fails (e.g. a key's mode or colour on the virtual keyboard), read `src/testing/virtual-keyboard/state.ts` (`withVariedColors`) and fix the test's expectation, not the app.

- [ ] **Step 8: Check and commit**

Run: `npm run typecheck && npm run lint && npx prettier --check src`

```bash
git add src/features/lighting/components/RGBSubPanel.tsx src/features/lighting/components/RGBSubPanel.test.tsx src/features/lighting/LightingPage.tsx src/features/lighting/LightingPage.test.tsx src/lib/i18n/en.ts src/lib/i18n/zh.ts src/lib/i18n/i18n.test.tsx
git commit -m "feat(lighting): edit the selected keys in place, with Mixed values and a save hint"
```

---

### Task 7: e2e lighting journeys

**Files:**
- Modify: `e2e/performance-lighting.spec.ts`

**Interfaces:**
- Consumes: the UI of Tasks 2, 5 and 6 (copy as in Task 4).

- [ ] **Step 1: Rewrite the lighting journeys**

In `e2e/performance-lighting.spec.ts`, inside `test.describe('lighting', …)`, keep `panels()` and the Ctrl/⌘+A test, add after `panels()`:

```ts
  const saveButton = (page: Page) =>
    page.locator('.sidebar').getByRole('button', { name: 'Save' });
```

and replace the two other tests with:

```ts
  test('stages base and per-key edits, which reach the keyboard on Save', async ({
    page,
    virtualKeyboard,
  }) => {
    const keyboard = await openPage(page, virtualKeyboard, 'Lighting', '/lighting/');
    const { base, keys } = panels(page);
    const before = await activeProfile(keyboard);
    await expect(
      page.getByText('Lighting changes reach the keyboard when you press Save.')
    ).toBeVisible();
    await expect(saveButton(page)).toHaveAccessibleDescription('Save configuration');

    // Base panel. The speed is the device value (D11, PL-006).
    await expect(base.getByText('20%')).toBeVisible();
    await base.getByRole('button', { name: 'Rainbow', exact: true }).click();
    await expect(base.getByRole('button', { name: 'Rainbow', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(base.getByText(/^A rainbow that starts at the hue of Color/)).toBeVisible();
    await base.getByRole('slider', { name: 'Speed' }).focus();
    await page.keyboard.press('End');
    await expect(base.getByText('100%')).toBeVisible();
    await base.getByRole('spinbutton', { name: 'Direction' }).fill('90');
    await expect(base.getByText('↑ DTU')).toBeVisible();
    await expect(saveButton(page)).toHaveAccessibleDescription('Unsaved changes');

    // Key panel without a selection: all keys, whose modes and colours differ (PL-048).
    await expect(keys.getByText('All keys')).toBeVisible();
    await expect(
      keys.getByText('These keys use different modes. Pick one to use it on all of them.')
    ).toBeVisible();
    await expect(keys.getByText('Mixed', { exact: true })).toBeVisible();
    await keys.getByRole('button', { name: 'Cycle', exact: true }).click();
    await expect(keys.getByRole('button', { name: 'Cycle', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Selected keys: only they change; they keep their speed.
    await keycap(page, 1).click();
    await keycap(page, 2).click();
    await expect(keys.getByText('2 keys')).toBeVisible();
    await keys.getByRole('button', { name: 'Fading Diamond Ripple', exact: true }).click();
    await keys.getByLabel('Color', { exact: true }).fill('#00ff00');
    await expect(keycap(page, 1)).toHaveText('ripple');
    await expect(keycap(page, 3)).toHaveText('');

    // Nothing reached the keyboard yet (PL-047).
    expect(await activeProfile(keyboard)).toEqual(before);

    await save(page);
    await expect(saveButton(page)).toHaveAccessibleDescription('Save configuration');
    const ripple = {
      mode: RGB_MODE.fadingDiamondRipple,
      color: { red: 0, green: 255, blue: 0 },
      speed: 20,
    };
    const expectedKeys = before.rgbKeys.map((config, id) =>
      id === 1 || id === 2 ? ripple : { ...config, mode: RGB_MODE.cycle }
    );
    const expectedBase = {
      ...before.rgbBase,
      mode: RGB_BASE_MODE.rainbow,
      speed: 100,
      direction: 90,
    };
    expect((await storedProfile(keyboard))?.rgbKeys).toEqual(expectedKeys);
    expect((await storedProfile(keyboard))?.rgbBase).toEqual(expectedBase);
    expect((await activeProfile(keyboard)).rgbKeys).toEqual(expectedKeys);
  });

  test('colours each key from its position with the rainbow preset, keeping its mode', async ({
    page,
    virtualKeyboard,
  }) => {
    const keyboard = await openPage(page, virtualKeyboard, 'Lighting', '/lighting/');
    const { keys } = panels(page);
    const before = await activeProfile(keyboard);
    const visible = await visibleKeyIds(page);

    await keys.getByRole('button', { name: 'Rainbow Preset' }).click();
    await expect(keys.getByRole('spinbutton', { name: 'Rainbow Direction' })).toHaveValue('0');
    await keys.getByRole('button', { name: 'Apply Settings' }).click();
    await save(page);
    await expect(saveButton(page)).toHaveAccessibleDescription('Save configuration');

    // PL-007: every visible key gets a colour of its own and keeps its mode and speed; with the
    // direction 0 and density 10 the hue moves 10° per key unit, from key 0's red.
    const { rgbKeys } = await activeProfile(keyboard);
    for (const id of visible) {
      expect(rgbKeys[id]?.mode, `key ${id}`).toBe(at(before.rgbKeys, id).mode);
      expect(rgbKeys[id]?.speed, `key ${id}`).toBe(20);
    }
    // The number row: 1u keys side by side.
    const hues = [1, 2, 3, 4, 5, 6].map(id => hue(at(rgbKeys, id).color));
    for (let index = 1; index < hues.length; index++) {
      const step = (at(hues, index) - at(hues, index - 1) + 360) % 360;
      expect(step, `hue step to key ${index + 1}`).toBeCloseTo(10, 0);
    }
    // Keys of the hidden layout variants keep their lighting.
    for (let id = 0; id < rgbKeys.length; id++) {
      if (!visible.includes(id))
        expect(rgbKeys[id], `hidden key ${id}`).toEqual(before.rgbKeys[id]);
    }

    // With a key selected, only it changes.
    await keycap(page, 10).click();
    await expect(keys.getByText('1 key')).toBeVisible();
    await keys.getByRole('button', { name: 'Static', exact: true }).click();
    await keys.getByRole('button', { name: 'Apply Settings' }).click();
    await save(page);
    await expect(saveButton(page)).toHaveAccessibleDescription('Save configuration');
    const after = await activeProfile(keyboard);
    expect(after.rgbKeys[10]?.mode).toBe(RGB_MODE.static);
    expect(after.rgbKeys[9]).toEqual(rgbKeys[9]);
  });
```

Remove `RGB_MODE.linear` from the `RGB_MODE` constant if nothing uses it any more (lint flags nothing for unused object keys, so keep it if in doubt).

- [ ] **Step 2: Run the journeys**

Run (one heavy job; nothing else heavy in parallel): `npm run test:e2e -- e2e/performance-lighting.spec.ts --workers=2`
Expected: PASS. If a step fails on fixture data (a mode or colour of the virtual keyboard), fix the expectation after reading `src/testing/virtual-keyboard/state.ts`.

- [ ] **Step 3: Check and commit**

Run: `npx eslint e2e && npx prettier --check e2e`

```bash
git add e2e/performance-lighting.spec.ts
git commit -m "test(e2e): lighting edits wait for Save"
```

---

### Task 8: Parity scenarios, screenshots and the parity log

**Files:**
- Modify: `e2e/parity/scenarios/performance-lighting.ts`
- Modify: `docs/migration/parity-log.md`
- Modify: `docs/migration/parity-notes/performance-lighting.md`
- Add/replace: `docs/migration/parity/pl-047-*.png` … `pl-050-*.png`, refreshed `pl-0NN-*.png`
- Modify: `docs/superpowers/specs/2026-10-01-lighting-redesign-design.md` (status line)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Adapt the parity scenarios**

In `e2e/parity/scenarios/performance-lighting.ts`:

1. `openLighting` waits for a mode button instead of Apply (which the React panels no longer have):

```ts
async function openLighting(page: Page): Promise<void> {
  await connectTo(page, /Lighting|灯光/, '/lighting/');
  await pageRegion(page)
    .getByRole('button', { name: exactly('Blank', '空白') })
    .waitFor();
}
```

2. Add after `clickMode`:

```ts
/**
 * Presses a panel's Apply button where it has one: the baseline sends its edits with it. The
 * React panels have none (their edits wait for Save, PL-047), so both apps then show the same
 * values.
 */
async function applyInBaseline(panel: Locator): Promise<void> {
  const apply = panel.getByRole('button', { name: exactly('Apply', '应用') });
  if ((await apply.count()) > 0) await apply.click();
}
```

3. In `lighting-base-applied` and `lighting-key-applied-selection`, replace `await base.getByRole('button', { name: /^(Apply|应用)$/ }).click();` / `await key.getByRole('button', { name: /^(Apply|应用)$/ }).click();` with `await applyInBaseline(base);` / `await applyInBaseline(key);`, and update their comments ("Base edits with a new mode and direction (Apply in the baseline, staged in React: PL-047)…").

4. Update the comments of `lighting-default` (PL-006, PL-048: the React key panel shows the keys' shared values, Mixed), `lighting-edited` (edits in the panels; the React app stages them, PL-047) and `lighting-rainbow-applied` (PL-007: modes and speeds are kept).

5. Add after `lighting-key-applied-selection`:

```ts
  {
    // PL-048: keys 0 (Static) and 1 (Linear), each in its own colour, selected: the React key
    // panel shows "2 keys", no mode pressed and Mixed; the baseline shows key 0.
    name: 'lighting-keys-mixed',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openLighting(page);
      const keycaps = page.locator('.keycap');
      await keycaps.nth(0).click();
      await keycaps.nth(1).click();
      await parkPointer(page);
    },
  },
```

Run: `npx eslint e2e/parity && npx prettier --check e2e/parity`

- [ ] **Step 2: Run the lighting scenarios in one variant**

Run: `npm run parity -- --workers=2 --grep "lighting-.*--dark-en-1440x900"`
Open `e2e/.artifacts/parity/index.html` (or read the PNGs in `captures/` and `diff/`). Check every React capture against the spec: no Apply buttons; save hint opposite the title; key panel header label; Mixed; explanation lines; panel content at the same height as in the baseline (header height kept). Fix and re-run until the React screens are right.

- [ ] **Step 3: Full 8-variant parity run**

Run: `npm run parity -- --workers=2` (about an hour; nothing else heavy in parallel).
Then classify every difference of `summary.json`: each must be explained by a parity-log row or the known capture noise. The unsaved-changes dot (PL-050) now shows in the sidebar of every capture taken after an edit (any page): list those scenarios.

- [ ] **Step 4: Write the parity log rows**

In `docs/migration/parity-log.md`, add rows PL-047 to PL-050 after PL-046 (same table format; screenshots are the `dark-en-1440x900` captures, copied as `docs/migration/parity/pl-0NN-before.png` from `captures/baseline/` and `pl-0NN-after.png` from `captures/react/`):

- **PL-047** `/lighting/` — `lighting-default--*`, `lighting-edited--*`, `lighting-base-applied--*`, `lighting-key-applied-selection--*`: the panels have no Apply buttons, edits are staged in the app and sent by Save; the page header shows "Lighting changes reach the keyboard when you press Save."; the key panel header shows its targets ("All keys" / "1 key" / "{0} keys"). Reason: lighting redesign spec (upstream configurator's model; the user's choice "edits wait for Save").
- **PL-048** `/lighting/` — `lighting-default--*`, `lighting-keys-mixed--*`: the key panel shows the targets' shared values, "Mixed" where they differ and no pressed mode with the mixed-modes line; the baseline showed key 0's values whatever was selected. Reason: lighting redesign spec.
- **PL-049** `/lighting/` — every `lighting-*` capture: a muted explanation line under each mode grid, and each mode button's explanation as its tooltip (`title`). Reason: lighting redesign spec (copy from libamp `rgb.c`).
- **PL-050** sidebar — the scenarios from Step 3: an amber dot on the Save button while edits are unsaved (and "Unsaved changes" as the button's accessible description). Reason: lighting redesign spec ("Unsaved changes").

Update PL-007 (the rainbow preset keeps each key's mode and speed, and is staged until Save) and PL-032 (a load drops unsaved edits; there are no unapplied edits any more). Update the "Deviations" intro paragraph's ranges (PL-047 to PL-050 come from the lighting redesign spec and are the product owner's decisions).

Refresh every `docs/migration/parity/pl-0NN-*.png` whose capture changed since it was taken (all lighting rows; rows whose after-screenshot now shows the PL-050 dot; and the stale screenshots the parity review listed: PL-005 to PL-007, PL-022 to PL-024, PL-031 to PL-033, PL-034's Performance pair), copying the current captures of the scenario each row cites.

In `docs/migration/parity-notes/performance-lighting.md`, add a section "Lighting redesign (2026-10-01)" that lists the changed lighting scenarios and the new `lighting-keys-mixed` scenario, and points to PL-047 to PL-050.

In the spec, set the status line to "Status: implemented (2026-10-01)."

Run: `npx prettier --write docs/migration/parity-log.md docs/migration/parity-notes/performance-lighting.md`

- [ ] **Step 5: Final validation**

Run, one at a time: `npm run validate`, then `npm run test:e2e -- --workers=2`.
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add e2e/parity/scenarios/performance-lighting.ts docs/migration/parity-log.md docs/migration/parity-notes/performance-lighting.md docs/migration/parity docs/superpowers/specs/2026-10-01-lighting-redesign-design.md
git commit -m "docs(parity): log the lighting redesign and refresh the screenshots"
```
