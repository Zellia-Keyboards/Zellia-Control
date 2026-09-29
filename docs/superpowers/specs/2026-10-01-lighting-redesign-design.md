# Lighting page redesign

Status: approved direction (2026-10-01), spec awaiting review.

## Why

The Lighting page is a 1:1 port of the Svelte page. That page holds every edit until Apply is
pressed, and its key panel always shows key 0, whatever is selected. The upstream configurator
(zhangqili/EMIKeyboardConfigurator) is better at setting up a lighting mode:

- It edits the selected keys in place and shows "Mix" where their values differ.
- It draws the keycaps in their own colours.

We take that way of working and keep our own look: mode button grids, the panel layout, the
rainbow preset. We also explain each mode, because names like "Jelly" or "Fading Diamond Ripple"
say little.

Not included: the upstream inline colour picker and its selection tools (marquee,
add/subtract/toggle, invert).

## Behaviour

### Targets

- The key panel edits its **targets**: the selected keys that have a per-key lighting
  configuration. With no key selected, the targets are all of them, which is what Apply does
  today.
- The panel header shows the targets in the slot Apply used: "All keys", "1 key" or "{0} keys".
- Selecting or deselecting keys never writes anything. It only changes what the panel shows and
  edits. This is unlike the Performance brush.

### Key panel: shared values or Mixed

- The panel shows the targets' shared mode, colour and speed.
- When the targets differ:
  - **Mode:** no button is pressed. The description line reads "These keys use different modes.
    Pick one to use it on all of them."
  - **Colour:** the hex text reads "Mixed". The swatch shows the first target's colour.
  - **Speed:** the value reads "Mixed" instead of `{n}%`. The thumb sits at the first target's
    speed.
- An edit writes only the field it changes, to every target. Each key keeps its other fields.
  For example, picking Trigger after a rainbow preset keeps every key's own colour.

### Base panel

- The base panel always shows the keyboard's base configuration (`rgbBase` from the store). It
  has no draft.
- Its edits write the changed field as soon as it is committed (see the next section).

### When edits are written

There are no Apply buttons. Each control writes when its value is committed:

| Control                         | Writes                                                            |
| ------------------------------- | ----------------------------------------------------------------- |
| Mode buttons                    | on click                                                          |
| Sliders (speed, density, brightness) | on release, or on each keyboard step (native `change`)            |
| Colour inputs                   | when the picker commits (native `change`)                         |
| Direction dial                  | on pointer release                                                |
| Direction degree input          | on each edit that parses as a number; an empty field writes nothing |

- While a slider, picker or dial is being dragged, the panel shows the dragged value. The
  keyboard and the keycaps change on commit, so a drag never floods the keyboard with packets.
  Per-key writes take one packet per key: 70 for all keys of a Starlight, 87 on a Zellia 80.
- A device load (profile switch, reset) remounts the panels, as `useDeviceLoads` does today. This
  drops a drag in progress, so nothing from the old configuration is written to the new one (D2).
- If the session refuses an edit (for example during a reload) or the keyboard rejects it, the
  store keeps the keyboard's value and the panel shows it again. Errors go through the existing
  `lastError` / ErrorModal path.

### Rainbow preset

- The preset stays a one-shot action behind its "Apply Settings" button. It is an action, not a
  pending edit.
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
| base Rainbow (`…rainbow_desc`)                   | A rainbow that starts at [Color]'s hue and scrolls across the keyboard. Speed sets how fast, Direction which way, Density how close the colours are. | 从「颜色」的色相开始、在键盘上滚动的彩虹。速度决定快慢，方向决定走向，密度决定颜色的疏密。 |
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

| Key                     | en                                                         | zh                                         |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| `lighting.mixed`        | Mixed                                                      | 混合                                       |
| `lighting.mixedModes`   | These keys use different modes. Pick one to use it on all of them. | 这些按键使用不同的模式。选择一个即可应用到全部按键。 |
| `lighting.allKeys`      | All keys                                                   | 全部按键                                   |
| `lighting.oneKey`       | 1 key                                                      | 1 个按键                                   |
| `lighting.keyCount`     | {0} keys                                                   | {0} 个按键                                 |

`lighting.apply` is removed. `lighting.applySettings` (rainbow preset) stays.

### Keycaps in their colours

- On `/lighting/` only, each keycap face is filled with its key's per-key colour. A key without
  a per-key configuration keeps the normal transparent face.
- The fill stays on hover, press and selection. Those states keep their border and glow.
- The label colour is black or white, whichever has the higher WCAG contrast ratio against the
  fill. That always gives at least 4.58:1.
- The labels themselves do not change ("Static" / "reactive" / "ripple", as in Svelte).
- The keycap shows the configured colour, not the live LED output. Base layer, brightness and
  animation are not simulated.

## Design

### Pure model, `features/lighting/model`

- `key-edits.ts`
  - `lightingTargets(selected: readonly number[], keyCount: number): readonly number[]`: the
    selected ids below `keyCount`, or every id when that is empty.
  - `sharedKeyValues(rgbKeys, targets): SharedKeyValues`, with
    `{ mode: RGBMode | typeof MIXED; color: Rgb | typeof MIXED; speed: number | typeof MIXED; first: RgbKeyConfig }`.
  - `editKeys(rgbKeys, targets, patch: Partial<RgbKeyConfig>): KeyConfigEntry[]`: each target's
    configuration with `patch` applied.
- `keycap-colors.ts`
  - `keycapColors(rgbKeys): ReadonlyMap<number, KeycapColor>`, with
    `KeycapColor = { fill: string; text: '#000000' | '#ffffff' }`.
  - `contrastText(rgb)`.
- `modes.ts`: the base and key mode lists (moved out of the panels), each with its label and
  description `TranslationKey`.
- `rainbow.ts`: `rainbowColors` unchanged. The page builds the entries with `editKeys`, one per
  key colour.

### Components

- **`LightingPage`**
  - Reads `rgbBase`, `rgbKeys`, the selection and the layout.
  - Computes the targets and the shared values.
  - Calls `deviceSession.setRgbBase({ ...rgbBase, ...patch })` and
    `deviceSession.setRgbKeys(editKeys(...))`.
  - Keeps `key={loads}`.
- **`RGBPanel` (base)**
  - Props: `config: RgbBaseConfig` and `onEdit(patch: Partial<RgbBaseConfig>)`.
  - Local state holds only the value being dragged.
- **`RGBSubPanel` (keys)**
  - Props: `values: SharedKeyValues`, `targetCount: number | 'all'`,
    `onEdit(patch: Partial<RgbKeyConfig>)` and `onRainbow(direction, density, referenceHex)`.
  - Local state holds the dragged value and the preset's direction, density and open state.
- **`DirectionSelector`**: adds `onDirectionCommit`. It is called on pointer release and on each
  valid degree edit. `onDirectionChange` stays for the preview.
- **Headers**: Apply is removed; the headers keep their height so the panels' content does not
  move. The key panel shows the target label in Apply's place.

### Keyboard

- `KeyboardRender` takes `keycapColors?: ReadonlyMap<number, KeycapColor>`.
- `Key` takes `color?: KeycapColor` and adds it to its memo comparison, so only recoloured keys
  re-render.
- `Key.module.css` gets a tinted state for `.keycap`. The global class names are unchanged. Its
  `!important` fill wins over the "transparent" rules and the hover/active backgrounds.
- `navigation.ts` gets `showsKeycapColors(pathname)`, true for `/lighting/`.
- `ShellKeyboard` reads `rgbKeys` on that route and passes `keycapColors(rgbKeys)`.

## Parity

New `docs/migration/parity-log.md` rows, each with before/after screenshots:

- **PL-047:** no Apply buttons; edits reach the keyboard as they are committed; the key panel
  header shows its targets.
- **PL-048:** the key panel shows the targets' shared values or Mixed, not key 0's.
- **PL-049:** a mode explanation under each grid, and button tooltips.
- **PL-050:** Lighting keycaps filled with their colours, with contrast labels.

Updates to existing rows:

- **PL-007:** the rainbow preset keeps each key's mode and speed.
- **PL-032:** there are no "unapplied edits" any more.

Changes to the parity scenarios in `e2e/parity/scenarios/performance-lighting.ts`:

- The `-applied` scenarios press Apply only where it exists, which is the baseline. Both apps then
  end in the same written state.
- A new `lighting-keys-mixed` scenario selects keys with different modes.
- The lighting scenarios get one full 8-variant run at the end.

## Testing

- **Model unit tests:**
  - Target resolution, including selected ids without a configuration.
  - Shared values and Mixed per field.
  - `editKeys` keeps the other fields.
  - Contrast: yellow gets black text, navy gets white.
- **Panel component tests:**
  - Shared and Mixed rendering, and the target label.
  - The explanation and `title` of each mode.
  - Edits fire on click and commit, never on `input`.
  - The dial commits on release.
- **`LightingPage` integration tests** (virtual keyboard, `sentPackets`):
  - A mode click with keys selected sends RGB packets for those keys only, with their colours and
    speeds kept.
  - With no selection, all keys are written.
  - A slider `input` sends nothing until its `change`.
  - A colour `change` writes.
  - Base edits send one base packet.
  - The rainbow preset keeps modes and speeds.
  - A profile switch shows the new configuration.
- **`ShellKeyboard` test:** keycaps are filled on `/lighting/` only, with the contrast text
  colour.
- **e2e:** `performance-lighting.spec.ts` lighting journeys:
  - Edit the base and some keys live, save, reload: the keyboard kept them.
  - Mixed shows for a mixed selection.
  - The rainbow preset.

## Later (not in this change)

- A live preview on the keyboard while dragging, coalescing writes so the latest value wins.
- The upstream inline colour picker and selection tools.
- Undo.
