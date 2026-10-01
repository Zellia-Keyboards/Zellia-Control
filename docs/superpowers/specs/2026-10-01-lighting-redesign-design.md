# Lighting page redesign

Status: implemented (2026-10-01).

## Why

The Lighting page is a 1:1 port of the Svelte page. Each panel holds its edits until its Apply
button sends them, and the key panel always shows key 0, whatever is selected. The upstream
configurator (zhangqili/EMIKeyboardConfigurator) is better at setting up a lighting mode:

- It edits the selected keys in place and shows "Mix" where their values differ.
- Nothing goes to the keyboard until the toolbar's Apply, which sends the whole configuration
  and stores it.

We take that way of working and keep our own look: mode button grids, the panel layout, the
rainbow preset. Our sidebar Save plays the part of upstream's toolbar Apply. We also explain each
mode, because names like "Jelly" or "Fading Diamond Ripple" say little.

Not included: upstream's keycaps drawn in their colours, its inline colour picker and its
selection tools (marquee, add/subtract/toggle, invert).

## Behaviour

### Edits wait for Save

- A lighting edit changes the app's copy of the configuration (the session snapshot and the
  controller cache) and sends nothing. The panels and the keycap labels show it at once.
- The sidebar's Save sends every unsaved edit and stores the configuration on the keyboard. It
  already does both: `save()` writes the whole snapshot, lighting included (the base packet and
  per-key pages of 7 keys), then flashes it.
- The panels have no Apply buttons.
- The keyboard keeps its old lighting until Save. The Lighting header says so, opposite the
  title: "Lighting changes reach the keyboard when you press Save."
- Edits apply on every input, during a drag too. They cost no packets now.
- A device load replaces the app's copy with the keyboard's, which drops unsaved lighting edits.
  Loads are a profile switch (toolbar or the keyboard's own keys), a factory reset and a
  reconnect.
- Remap, Performance and Dynamic Keys keep writing at once, as now. Save stores them.

### Unsaved changes

- The device store gets an `unsaved` flag. Any edit command that changes the configuration sets
  it, on every page.
- A load clears it. A save clears it when it succeeds and no edit came in after the save
  started. A failed save keeps it.
- While it is set, the sidebar Save button shows a small amber dot in its top-right corner
  (`aria-hidden`), and the button's accessible description becomes "Unsaved changes".

### Targets

- The key panel edits its **targets**: the selected keys that have a per-key lighting
  configuration. With no key selected, the targets are all of them, as with Apply today.
- The panel header shows the targets in the slot Apply used: "All keys", "1 key" or "{0} keys".
- Selecting or deselecting keys never edits anything. It only changes what the panel shows and
  edits. This is unlike the Performance brush.

### Key panel: shared values or Mixed

- The panel shows the targets' shared mode, colour and speed.
- When the targets differ:
  - **Mode:** no button is pressed. The description line reads "These keys use different modes.
    Pick one to use it on all of them."
  - **Colour:** the hex text reads "Mixed". The swatch shows the first target's colour.
  - **Speed:** the value reads "Mixed" instead of `{n}%`. The thumb sits at the first target's
    speed.
- An edit changes only its own field, on every target. Each key keeps its other fields. For
  example, picking Trigger after a rainbow preset keeps every key's own colour.

### Base panel

The base panel always shows the app's copy of the base configuration (`rgbBase` from the store).
Its controls edit that copy directly.

### Rainbow preset

- The preset stays a one-shot action behind its "Apply Settings" button.
- It colours the targets that are visible in the layout.
- Each key keeps its own mode and speed. Today the preset also wrote the panel's mode and speed,
  which only differs from the new behaviour when those values were Mixed.
- The reference colour is the panel's colour: the first target's colour when Mixed.

### Mode explanations

- Under each mode grid, a muted line (`text-xs text-gray-500 dark:text-gray-400`) explains the
  pressed mode, or the mixed-modes line.
- Each mode button also carries its explanation as its `title`, so a mode can be read about
  before it is picked. The `title` is also the button's accessible description.

The copy follows libamp `src/rgb.c` (identical in upstream `30f9e11` and the Zellia fork).
Bracketed names are the UI labels; the zh copy quotes them as 「…」.

| Mode (key)                                       | en                                                                                                                                 | zh                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| base Off (`rgb_base_mode_off_desc`)              | Turns all lighting off, the per-key effects too.                                                                                   | 关闭所有灯光，包括按键灯效。                                                   |
| base Blank (`…blank_desc`)                       | No base lighting: only the per-key effects light the keys.                                                                         | 没有基础灯光：只有按键灯效会点亮按键。                                         |
| base Rainbow (`…rainbow_desc`)                   | A rainbow that starts at the hue of [Color] and scrolls across the keyboard. Speed sets how fast, Direction which way, Density how close the colors are. | 从「颜色」的色相开始、在键盘上滚动的彩虹。速度决定快慢，方向决定走向，密度决定颜色的疏密。 |
| base Wave (`…wave_desc`)                         | Waves that blend [Color] into [Secondary Color] and move across the keyboard. Speed sets how fast, Direction which way, Density how close the waves are. | 「颜色」与「次要颜色」交融的波浪在键盘上移动。速度决定快慢，方向决定走向，密度决定波浪的疏密。 |
| Fixed (`rgb_mode_fixed_desc`)                    | Always shows [Color], in place of the base lighting.                                                                               | 始终显示「颜色」，取代基础灯光。                                               |
| Static (`…static_desc`)                          | Always adds [Color] on top of the base lighting.                                                                                   | 始终在基础灯光之上叠加「颜色」。                                               |
| Cycle (`…cycle_desc`)                            | Cycles through every hue, starting from [Color]. Speed sets how fast.                                                              | 从「颜色」开始循环显示所有色相。速度决定循环快慢。                             |
| Linear (`…linear_desc`)                          | Lights up in [Color] as the key goes down: the deeper the press, the brighter.                                                     | 按下时以「颜色」点亮：按得越深越亮。                                           |
| Trigger (`…trigger_desc`)                        | Flashes [Color] when the key is pressed, then fades out. Speed sets how fast it fades.                                             | 按下时以「颜色」闪亮，随后逐渐熄灭。速度决定熄灭快慢。                         |
| String (`…string_desc`)                          | Each press sends a line of [Color] along the key's row. Speed sets how fast it travels.                                            | 每次按下都会沿按键所在的行发出一道「颜色」光线。速度决定传播快慢。             |
| Fading String (`…fading_string_desc`)            | Each press sends a line of [Color] along the key's row, with a trail that fades out.                                               | 每次按下都会沿按键所在的行发出一道「颜色」光线，并留下逐渐消失的拖尾。         |
| Diamond Ripple (`…diamond_ripple_desc`)          | Each press sends a diamond-shaped ripple of [Color] across the keyboard. Speed sets how fast it spreads.                           | 每次按下都会发出一圈菱形的「颜色」涟漪扩散到整个键盘。速度决定扩散快慢。       |
| Fading Diamond Ripple (`…fading_diamond_ripple_desc`) | Each press sends a diamond-shaped ripple of [Color] across the keyboard, with a trail that fades out.                         | 每次按下都会发出一圈菱形的「颜色」涟漪扩散到整个键盘，并留下逐渐消失的拖尾。   |
| Jelly (`…jelly_desc`)                            | Pressing lights up the keys around it in their own colors; the deeper the press, the farther it reaches.                           | 按下时，周围的按键以各自的颜色亮起；按得越深，范围越大。                       |
| Bubble (`…bubble_desc`)                          | Each press makes a small round ripple of [Color] around the key, with a trail that fades out.                                      | 每次按下都会在按键周围泛起一圈小的圆形「颜色」涟漪，并留下逐渐消失的拖尾。     |

New UI strings:

| Key                   | en                                                                 | zh                                                   |
| --------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| `lighting.saveHint`   | Lighting changes reach the keyboard when you press Save.           | 按下「保存」后，灯光更改才会发送到键盘。             |
| `lighting.mixed`      | Mixed                                                              | 混合                                                 |
| `lighting.mixedModes` | These keys use different modes. Pick one to use it on all of them. | 这些按键使用不同的模式。选择一个即可应用到全部按键。 |
| `lighting.allKeys`    | All keys                                                           | 全部按键                                             |
| `lighting.oneKey`     | 1 key                                                              | 1 个按键                                             |
| `lighting.keyCount`   | {0} keys                                                           | {0} 个按键                                           |
| `ui.unsavedChanges`   | Unsaved changes                                                    | 有未保存的更改                                       |

`lighting.apply` is removed. `lighting.applySettings` (rainbow preset) stays.

## Design

### Device session

- `setRgbBase` and `setRgbKeys` stage their edit: they validate it, update the controller cache
  and patch the snapshot, and send no packet. `save()` already syncs the snapshot into the cache
  and writes everything, so it needs no change for lighting.
- `DeviceState.unsaved: boolean`:
  - The session counts edits. Every edit command that changes the snapshot (`setKeycodes`,
    `setAdvancedKeys`, `setRgbBase`, `setRgbKeys`, `applyDynamicKey`, `removeDynamicKey`,
    `removeDynamicKeysOfKind`) increments the count and sets `unsaved`.
  - `#save` records the count when it starts. After a successful save it clears `unsaved` only
    if the count is unchanged.
  - Every load (connect, profile switch, factory reset) clears it.
- Docs: the "State" paragraph of `CLAUDE.md`, `docs/architecture.md` and `docs/device.md` say
  that lighting edits are staged until `save()`.

### Pure model, `features/lighting/model`

- `key-edits.ts`
  - `lightingTargets(selected: readonly number[], keyCount: number): readonly number[]`: the
    selected ids below `keyCount`, or every id when that is empty.
  - `sharedKeyValues(rgbKeys, targets): SharedKeyValues`, with
    `{ mode: RGBMode | typeof MIXED; color: Rgb | typeof MIXED; speed: number | typeof MIXED; first: RgbKeyConfig }`.
  - `editKeys(rgbKeys, targets, patch: Partial<RgbKeyConfig>): KeyConfigEntry[]`: each target's
    configuration with `patch` applied.
- `rainbow.ts`: `rainbowColors` is unchanged. The page turns its colours into entries that keep
  each key's mode and speed.

### Components

- **`LightingPage`**
  - Reads `rgbBase`, `rgbKeys`, the selection and the layout.
  - Computes the targets and the shared values.
  - Calls `deviceSession.setRgbBase({ ...rgbBase, ...patch })` and
    `deviceSession.setRgbKeys(editKeys(...))`.
  - Shows the save hint in its header.
  - Keeps `key={loads}`, so the rainbow preset closes on a load, as now.
- **`components/modes.ts`**: the base and key mode lists (moved out of the panels), each with
  its label and description `TranslationKey`. They are UI constants, so they stay out of the
  pure model.
- **`RGBPanel` (base)**: props `config: RgbBaseConfig` and
  `onEdit(patch: Partial<RgbBaseConfig>)`. It has no draft state.
- **`RGBSubPanel` (keys)**
  - Props: `values: SharedKeyValues`, `targetCount: number | 'all'`,
    `onEdit(patch: Partial<RgbKeyConfig>)` and `onRainbow(referenceHex, direction, density)`.
  - Local state holds only the preset's direction, density and open state.
- **Headers**: Apply is removed, and the headers keep their height so the panels' content does
  not move. The key panel shows the target label in Apply's place.
- **`Sidebar`**: the Save button reads `unsaved` and shows the dot and the description.

## Parity

New `docs/migration/parity-log.md` rows, each with before/after screenshots:

- **PL-047** (`/lighting/`): no Apply buttons; edits wait for Save; the save hint; the key panel
  header shows its targets.
- **PL-048** (`/lighting/`): the key panel shows the targets' shared values or Mixed, not key
  0's.
- **PL-049** (`/lighting/`): a mode explanation under each grid, and button tooltips.
- **PL-050** (sidebar): the unsaved-changes dot on Save. It shows in every capture taken after
  an edit, on any page.

Updates to existing rows:

- **PL-007:** the rainbow preset keeps each key's mode and speed.
- **PL-032:** unsaved edits are dropped on a load; there are no unapplied edits any more.

Parity scenarios:

- The lighting `-applied` scenarios press Apply only where it exists, which is the baseline.
  Both apps then show the same values.
- A new `lighting-keys-mixed` scenario selects keys with different modes.
- After an edit, the captures of other pages show the PL-050 dot, and the log lists those
  scenarios.
- The affected scenarios get one full 8-variant run at the end.

## Testing

- **Session** (virtual keyboard):
  - `setRgbBase` and `setRgbKeys` send no packet and update the snapshot and the cache.
  - `save()` puts them on the keyboard, and the keyboard keeps them after a reconnect.
  - `unsaved` is set by each edit command and cleared by a load and by a successful save.
  - `unsaved` stays set when an edit lands during a save, and when the save fails.
- **Model unit tests:**
  - Target resolution, including selected ids without a configuration.
  - Shared values and Mixed per field.
  - `editKeys` keeps the other fields.
- **Panel component tests:**
  - Shared and Mixed rendering, and the target label.
  - The explanation and `title` of each mode.
  - Every control calls `onEdit` with its field only.
- **`LightingPage` integration tests** (virtual keyboard):
  - An edit sends nothing; Save sends it.
  - Selected keys only, or all keys with no selection.
  - Other fields are kept.
  - The rainbow preset keeps modes and speeds.
  - A profile switch drops unsaved edits and shows the new configuration.
- **`Sidebar` test:** the dot and the description follow `unsaved`.
- **e2e** (`performance-lighting.spec.ts`):
  - Edit the base and some keys: the keyboard is unchanged. Save, reconnect: it has them.
  - Mixed shows for a mixed selection.
  - The rainbow preset.

## Later (not in this change)

- A warning before a profile switch, reset or disconnect drops unsaved changes.
- A live preview of lighting edits on the keyboard before Save.
- Upstream's inline colour picker and selection tools.
- Undo.
