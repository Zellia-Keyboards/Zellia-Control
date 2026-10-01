import { Keycode as EmiKeycode, KeyModifier } from 'emi-keyboard-controller';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { kc } from '../../keycodes';
import { dynamicKeyKeycode, fractionToRaw } from '../../../testing/virtual-keyboard';
import { DksAction } from '../model/dks-bitmap';
import { encodeKeyControl } from '../model/dks-codec';
import { renderDynamicKeysPage, selectKeys, selectLayer } from '../testing/render-page';

const { Hold: H, Press: P, Release: R, Tap: T } = DksAction;
const A = kc.key(EmiKeycode.A);
const S = kc.key(EmiKeycode.S);
/** Seeded Starlight stroke (slot 0) on S. */
const SEEDED_STROKE_KEY = 32;

async function openDks(options: Parameters<typeof renderDynamicKeysPage>[0] = {}) {
  const page = await renderDynamicKeysPage(options);
  await page.user.click(screen.getByRole('button', { name: /^Dynamic Key Stroke/ }));
  return page;
}

/** The stage node ("+") of a binding: its name says which binding and phase it edits. */
function node(binding: number, stage: number): HTMLElement {
  return screen.getByRole('button', {
    name: `Binding ${binding + 1}: add tap at phase ${stage + 1}`,
  });
}

/** A binding's slider row. */
function slider(binding: number): HTMLElement {
  const row = node(binding, 0).parentElement;
  if (!row) throw new Error('no slider');
  return row;
}

/** A binding's keycode button (left of its slider). */
function bindingButton(binding: number): HTMLElement {
  const button = slider(binding).previousElementSibling;
  if (!(button instanceof HTMLElement)) throw new Error('no binding button');
  return button;
}

function bars(binding: number): HTMLElement[] {
  return within(slider(binding)).queryAllByRole('button', { name: 'Delete interval' });
}

function picker(): HTMLElement {
  const heading = screen.getByRole('heading', { name: 'Keycode Selection' });
  const card = heading.parentElement?.parentElement;
  if (!card) throw new Error('no picker');
  return card;
}

describe('DKS editor', () => {
  it('asks for a key until one is selected', async () => {
    await openDks({ seedDynamicKeys: false });
    expect(
      screen.getByRole('heading', { name: 'Dynamic Keystroke Configuration' })
    ).toBeInTheDocument();
    expect(screen.getByText(/Dynamic keys allow 4-phase control/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply Configuration' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset Configuration' })).toBeDisabled();
  });

  it('starts a key without a DKS empty: unset bindings, released nodes, 3.0 mm bottom-out', async () => {
    await openDks({ seedDynamicKeys: false });
    selectKeys(12);

    expect(screen.getByText('Position: 0, 12')).toBeInTheDocument();
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
    expect([0, 1, 2, 3].map(binding => bindingButton(binding).textContent)).toEqual([
      '',
      '',
      '',
      '',
    ]);
    const nodes = screen.getAllByRole('button', { name: /^Binding \d: add tap at phase \d$/ });
    expect(nodes).toHaveLength(16);
    expect(nodes.every(button => button.textContent === '+')).toBe(true);
    expect(screen.queryAllByRole('button', { name: 'Delete interval' })).toHaveLength(0);
    expect(screen.getByText('3.0mm')).toBeInTheDocument();
    expect(screen.getByText('Click on a binding button to select a keycode')).toBeInTheDocument();
  });

  it('assigns a keycode to the selected binding', async () => {
    const { user } = await openDks({ seedDynamicKeys: false });
    selectKeys(12);
    await user.click(bindingButton(1));
    expect(screen.getByText('Select a keycode for binding 2')).toBeInTheDocument();
    await user.click(within(picker()).getByRole('button', { name: 'A' }));
    expect(bindingButton(1)).toHaveTextContent('A');
    expect(within(picker()).getByRole('button', { name: 'A' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByText('Click on a binding button to select a keycode')).toBeInTheDocument();
    // Without a selected binding the picker assigns nothing.
    await user.click(within(picker()).getByRole('button', { name: 'Esc' }));
    expect(bindingButton(1)).toHaveTextContent('A');
  });

  it('edits the stages: click adds a tap, dragging its grip stretches it, a bar click deletes it', async () => {
    const { user } = await openDks({ seedDynamicKeys: false });
    selectKeys(12);

    await user.click(node(0, 0));
    expect(
      within(slider(0)).getByRole('button', { name: 'TAP action at phase 1' })
    ).toBeInTheDocument();

    const grip = within(slider(0)).getByRole('button', { name: 'Drag to resize interval' });
    fireEvent.mouseDown(grip, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 300 });
    // The preview follows the mouse before the release commits it.
    expect(bars(0)).toHaveLength(1);
    fireEvent.mouseUp(document);
    expect(bars(0)).toHaveLength(1);
    expect(bars(0)[0]).toHaveStyle({ left: '0px', width: `${32 + 74.25 * 3 - 40}px` });

    // A node inside the interval cannot become a tap.
    await user.click(node(0, 1));
    expect(within(slider(0)).queryByRole('button', { name: /TAP action/ })).toBeNull();

    const [bar] = bars(0);
    if (!bar) throw new Error('no bar');
    await user.click(bar);
    expect(bars(0)).toHaveLength(0);
  });

  it('applies the stroke on the selected layer with the encoded stages and distances (D14)', async () => {
    const { keyboard, user } = await openDks({ seedDynamicKeys: false });
    selectLayer(2);
    selectKeys(12);
    expect(screen.getByText('Position: 1, 12')).toBeInTheDocument();
    await user.click(bindingButton(0));
    await user.click(within(picker()).getByRole('button', { name: 'A' }));
    await user.click(node(0, 0));
    const grip = within(slider(0)).getByRole('button', { name: 'Drag to resize interval' });
    fireEvent.mouseDown(grip, { clientX: 0 });
    fireEvent.mouseMove(document, { clientX: 500 });
    fireEvent.mouseUp(document);
    await user.click(node(1, 1));
    fireEvent.change(screen.getByLabelText('Distance'), { target: { value: '3.5' } });

    await user.click(screen.getByRole('button', { name: 'Apply Configuration' }));

    await expect
      .poll(() => keyboard.vk.state.active.dynamicKeys[0])
      .toEqual({
        type: 'stroke',
        bindings: [A, 0, 0, 0],
        keyControl: [encodeKeyControl([P, H, H, R]), encodeKeyControl([R, T, R, R]), 0, 0],
        pressBegin: fractionToRaw(1.5 / 4),
        pressFully: fractionToRaw(3.5 / 4),
        releaseBegin: fractionToRaw(3.5 / 4),
        releaseFully: fractionToRaw(1.5 / 4),
        keyId: 12,
      });
    expect(keyboard.vk.state.active.keymap[1]?.[12]).toBe(dynamicKeyKeycode(0));

    const list = await screen.findByRole('heading', { name: 'Configured Dynamic Keys' });
    const section = list.parentElement?.parentElement;
    if (!section) throw new Error('no list');
    expect(within(section).getByText('1 key')).toBeInTheDocument();
    expect(within(section).getByText('4')).toBeInTheDocument();
    expect(within(section).getByText('3.5mm')).toBeInTheDocument();
  });

  it("loads the keyboard's DKS of the selected key", async () => {
    await openDks();
    selectKeys(SEEDED_STROKE_KEY);
    // Binding 0 is S, held from press to release; binding 1 taps Left Shift when bottomed out.
    expect(bindingButton(0)).toHaveTextContent('S');
    expect(bindingButton(1)).toHaveTextContent('Left Shift');
    expect(bindingButton(2)).toHaveTextContent('');
    expect(bars(0)).toHaveLength(1);
    expect(
      within(slider(1)).getByRole('button', { name: 'TAP action at phase 2' })
    ).toBeInTheDocument();
    expect(screen.getByText('3.0mm')).toBeInTheDocument();
    expect(kc.modifier(KeyModifier.KeyLeftShift)).toBe(0x0200);
  });

  it('resets: removes the key’s DKS from the keyboard and loads the preset (PL-020)', async () => {
    const { keyboard, user } = await openDks();
    selectKeys(SEEDED_STROKE_KEY);
    await user.click(screen.getByRole('button', { name: 'Reset Configuration' }));

    await expect.poll(() => keyboard.vk.state.active.keymap[0]?.[SEEDED_STROKE_KEY]).toBe(S);
    expect(keyboard.vk.state.active.dynamicKeys.some(key => key.type === 'stroke')).toBe(false);
    expect([0, 1, 2, 3].map(binding => bindingButton(binding).textContent)).toEqual([
      'Esc',
      'Enter',
      'Space',
      'Backspace',
    ]);
    expect(screen.getByLabelText('Distance')).toHaveValue('4');
    expect(bars(0)).toHaveLength(1);
    expect(bars(2)).toHaveLength(2);
    expect(
      within(slider(1)).getByRole('button', { name: 'TAP action at phase 1' })
    ).toBeInTheDocument();
  });

  it('keeps the applied bitmaps, and a reload shows what the firmware stores (PL-021)', async () => {
    const { keyboard, user } = await openDks({ seedDynamicKeys: false });
    selectKeys(12);
    await user.click(screen.getByRole('button', { name: 'Reset Configuration' }));
    await user.click(screen.getByRole('button', { name: 'Apply Configuration' }));
    await expect
      .poll(() => keyboard.vk.state.active.dynamicKeys[0])
      .toMatchObject({ type: 'stroke', keyId: 12 });
    // Space `[0,1] + [1,3]` stays as edited…
    expect(bars(2)).toHaveLength(2);

    // …until the key is loaded again: the firmware keeps one press from stage 0 to 3.
    selectKeys(13);
    selectKeys(12);
    expect(bars(2)).toHaveLength(1);
    expect([0, 1, 2, 3].map(binding => bindingButton(binding).textContent)).toEqual([
      'Esc',
      'Enter',
      'Space',
      'Backspace',
    ]);
  });

  it('deletes a DKS from the configured list after its fade-out', async () => {
    const { keyboard, user } = await openDks();
    const list = await screen.findByRole('heading', { name: 'Configured Dynamic Keys' });
    const section = list.parentElement?.parentElement;
    if (!section) throw new Error('no list');
    await user.click(within(section).getByRole('button', { name: 'Delete key' }));

    await waitFor(() => {
      expect(keyboard.vk.state.active.dynamicKeys.some(key => key.type === 'stroke')).toBe(false);
    });
    expect(keyboard.vk.state.active.keymap[0]?.[SEEDED_STROKE_KEY]).toBe(S);
    expect(screen.queryByRole('heading', { name: 'Configured Dynamic Keys' })).toBeNull();
  });

  it("tunes the selected keys' actuation in normal mode on the performance tab", async () => {
    const { keyboard, user } = await openDks({ seedDynamicKeys: false });
    selectKeys(12, 13);
    await user.click(screen.getByRole('button', { name: 'Performance' }));
    expect(screen.getByText('Actuation: 2.000mm')).toBeInTheDocument();
    expect(screen.getByText('Deactivation: 1.960mm')).toBeInTheDocument();
    // The inputs show the device values without the 16-bit quantization noise (1.95999…mm).
    expect(screen.getByLabelText('Actuation point (mm)')).toHaveValue(2);
    expect(screen.getByLabelText('Deactivation point (mm)')).toHaveValue(1.96);
    expect(screen.getByText('2 keys selected')).toBeInTheDocument();
    const before = keyboard.vk.state.active.advancedKeys[12];

    fireEvent.change(screen.getByLabelText('Actuation point (mm)'), { target: { value: '2.5' } });

    await expect
      .poll(() => keyboard.vk.state.active.advancedKeys[13]?.activation)
      .toBe(fractionToRaw(2.5 / 4));
    expect(keyboard.vk.state.active.advancedKeys[12]).toMatchObject({
      mode: before?.mode,
      activation: fractionToRaw(2.5 / 4),
      deactivation: before?.deactivation,
    });
    expect(screen.getByText('Actuation: 2.500mm')).toBeInTheDocument();
  });

  it('shows the key tester', async () => {
    const { user } = await openDks({ seedDynamicKeys: false });
    selectKeys(12);
    await user.click(screen.getByRole('button', { name: 'Key Tester' }));
    expect(screen.getByText('Test your dynamic keystroke configuration')).toBeInTheDocument();
    expect(
      screen.getByText('Press the key to test dynamic keystroke behavior')
    ).toBeInTheDocument();
  });
});
