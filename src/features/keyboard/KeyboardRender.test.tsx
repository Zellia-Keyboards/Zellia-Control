import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deviceStore, type ModelInfo } from '../device';
import { INITIAL_DEVICE_STATE } from '../device/device-store';
import { KeyboardRender } from './KeyboardRender';
import { DEFAULT_LAYOUT_OPTIONS, KLE_LABEL_SLOTS, type LayoutKey } from './model';
import { INITIAL_KEY_SELECTION, keySelection, keySelectionStore } from './store/key-selection';
import { layoutOptionsStore, setLayoutOptions } from './store/layout-options';

interface KeySpec {
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly labels?: Readonly<Record<number, string>>;
  readonly layoutGroup?: LayoutKey['layoutGroup'];
}

function layoutKey(id: number, spec: KeySpec = {}): LayoutKey {
  const { x = id, y = 0, width = 1, height = 1, labels = {}, layoutGroup = null } = spec;
  return {
    id,
    x,
    y,
    width,
    height,
    rotationAngle: 0,
    rotationX: 0,
    rotationY: 0,
    labels: Array.from({ length: KLE_LABEL_SLOTS }, (_, slot) => labels[slot] ?? ''),
    layoutGroup,
  };
}

function keycap(id: number): HTMLElement {
  const element = document.querySelector<HTMLElement>(`.keycap[data-key-id="${id}"]`);
  if (!element) throw new Error(`no keycap for key ${id}`);
  return element;
}

/** The absolutely positioned container around a keycap. */
function container(id: number): HTMLElement {
  const element = keycap(id).parentElement;
  if (!element) throw new Error(`keycap ${id} has no container`);
  return element;
}

function press(id: number, buttons = 1): void {
  fireEvent.mouseDown(keycap(id), { buttons });
}

function selected(): readonly number[] {
  return keySelectionStore.getState().selected;
}

/** A connected model with one two-option layout group (group 0: split backspace). */
function connectModel(layoutLabels: readonly (readonly string[])[]): void {
  const model: ModelInfo = {
    id: 'zellia-starlight',
    displayName: 'Zellia Starlight',
    layoutJson: '[]',
    layoutLabels,
  };
  deviceStore.setState({ connection: { status: 'ready', model, deviceName: 'ZelliaKB' } });
}

afterEach(() => {
  keySelectionStore.setState(INITIAL_KEY_SELECTION, true);
  layoutOptionsStore.setState(DEFAULT_LAYOUT_OPTIONS, true);
  deviceStore.setState(INITIAL_DEVICE_STATE, true);
  document.documentElement.style.removeProperty('--key-unit-size');
});

describe('KeyboardRender', () => {
  it('positions every key in key units of 59 px, like the Svelte keycaps', () => {
    render(<KeyboardRender keys={[layoutKey(0, { x: 1.5, y: 2, width: 2.25, height: 1 })]} />);

    expect(container(0)).toHaveStyle({
      position: 'absolute',
      left: '88.5px',
      top: '118px',
      width: '132.75px',
      height: '59px',
      transform: 'rotate(0deg)',
    });
    expect(container(0).style.transition).toBe('all 0.3s ease-out');
  });

  it('sizes the keyboard to the furthest key edges', () => {
    render(
      <KeyboardRender
        keys={[layoutKey(0, { x: 0, y: 0 }), layoutKey(1, { x: 13, y: 4, width: 2 })]}
      />
    );

    const keyboard = container(0).parentElement?.parentElement;
    expect(keyboard).toHaveStyle({ width: `${15 * 59}px`, height: `${5 * 59}px` });
  });

  it('uses the --key-unit-size of the document and follows it on resize', () => {
    document.documentElement.style.setProperty('--key-unit-size', '74px');
    render(<KeyboardRender keys={[layoutKey(0, { x: 1, y: 1 })]} />);
    expect(container(0)).toHaveStyle({ left: '74px', top: '74px', width: '74px' });

    document.documentElement.style.setProperty('--key-unit-size', '88px');
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(container(0)).toHaveStyle({ left: '88px', width: '88px' });
  });

  it('shows the non-empty label slots 0-8 in their grid cells', () => {
    render(
      <KeyboardRender
        keys={[layoutKey(0, { labels: { 0: 'Shift', 4: '⇅2.000', 6: 'A', 8: '↥0.800', 9: '3' } })]}
      />
    );

    const cells = [...keycap(0).querySelectorAll('span')].map(cell => [
      cell.className,
      cell.textContent,
    ]);
    expect(cells).toEqual([
      ['label-cell-0', 'Shift'],
      ['label-cell-4', '⇅2.000'],
      ['label-cell-6', 'A'],
      ['label-cell-8', '↥0.800'],
    ]);
  });

  it('toggles a key when it is pressed with the left button', () => {
    const onSelect = vi.fn();
    render(<KeyboardRender keys={[layoutKey(0), layoutKey(1)]} onSelect={onSelect} />);

    press(1);
    expect(selected()).toEqual([1]);
    expect(onSelect).toHaveBeenCalledWith(1);

    press(1);
    expect(selected()).toEqual([]);
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('ignores presses with other buttons', () => {
    render(<KeyboardRender keys={[layoutKey(0)]} />);

    press(0, 2);
    press(0, 3);

    expect(selected()).toEqual([]);
  });

  it('toggles keys entered while the left button is held', () => {
    render(<KeyboardRender keys={[layoutKey(0), layoutKey(1), layoutKey(2)]} />);

    press(0);
    fireEvent.mouseEnter(keycap(1), { buttons: 1 });
    fireEvent.mouseEnter(keycap(2), { buttons: 1 });
    fireEvent.mouseEnter(keycap(0), { buttons: 0 });

    expect(selected()).toEqual([0, 1, 2]);
  });

  it('marks selected keys', () => {
    render(<KeyboardRender keys={[layoutKey(0), layoutKey(1)]} />);

    act(() => {
      keySelection.setSelected([1]);
    });

    expect(keycap(1)).toHaveClass('keycap', 'selected');
    expect(keycap(1)).toHaveAttribute('aria-pressed', 'true');
    expect(keycap(0)).not.toHaveClass('selected');
    expect(keycap(0)).toHaveAttribute('aria-pressed', 'false');
  });

  it('neither selects nor shows the selection while selection is not allowed', () => {
    const onSelect = vi.fn();
    keySelection.setSelected([0]);
    render(<KeyboardRender keys={[layoutKey(0), layoutKey(1)]} allowSelection={false} />);

    press(1);
    fireEvent.mouseEnter(keycap(0), { buttons: 1 });

    expect(selected()).toEqual([0]);
    expect(onSelect).not.toHaveBeenCalled();
    expect(keycap(0)).toHaveClass('keycap', 'selection-disabled');
    expect(keycap(0)).not.toHaveClass('selected');
    expect(keycap(0)).not.toHaveAttribute('aria-pressed');
  });

  it('bounds select-all by the highest visible key id', () => {
    render(<KeyboardRender keys={[layoutKey(4), layoutKey(0), layoutKey(2)]} />);

    expect(keySelectionStore.getState().totalKeys).toBe(5);
    act(() => {
      keySelection.selectAll();
    });
    expect(selected()).toEqual([0, 1, 2, 3, 4]);
  });

  it('leaves the selection store alone when only the labels change', () => {
    const { rerender } = render(<KeyboardRender keys={[layoutKey(0), layoutKey(1)]} />);
    const changes = vi.fn();
    const unsubscribe = keySelectionStore.subscribe(changes);

    rerender(<KeyboardRender keys={[layoutKey(0, { labels: { 0: 'Esc' } }), layoutKey(1)]} />);
    unsubscribe();

    expect(screen.getByText('Esc')).toBeInTheDocument();
    expect(changes).not.toHaveBeenCalled();
  });

  it('shows the layout variants chosen in the Layout dropdown', () => {
    connectModel([['Backspace', 'Split Backspace']]);
    const keys = [
      layoutKey(0),
      layoutKey(13, { layoutGroup: { groupId: 0, option: 0 } }),
      layoutKey(14, { layoutGroup: { groupId: 0, option: 1 } }),
      layoutKey(15, { layoutGroup: { groupId: 0, option: 1 } }),
    ];
    render(<KeyboardRender keys={keys} />);

    const shown = () =>
      [...document.querySelectorAll<HTMLElement>('.keycap')].map(cap => cap.dataset.keyId);
    expect(shown()).toEqual(['0', '13']);
    expect(keySelectionStore.getState().totalKeys).toBe(14);

    act(() => {
      setLayoutOptions({ splitBackspace: true });
    });

    expect(shown()).toEqual(['0', '14', '15']);
    expect(keySelectionStore.getState().totalKeys).toBe(16);
  });

  it('keeps a key element when it moves between layout variants', () => {
    connectModel([['6.25u', '7u']]);
    const keys = [
      layoutKey(7, { x: 1, layoutGroup: { groupId: 0, option: 0 } }),
      layoutKey(7, { x: 2, layoutGroup: { groupId: 0, option: 1 } }),
    ];
    render(<KeyboardRender keys={keys} />);
    const before = keycap(7);
    expect(container(7)).toHaveStyle({ left: '59px' });

    act(() => {
      setLayoutOptions({ splitBackspace: true });
    });

    expect(keycap(7)).toBe(before);
    expect(container(7)).toHaveStyle({ left: '118px' });
  });

  it('re-renders only the keycap whose selection changed', () => {
    const renders = new Map<number, number>();
    /** Counts how often each keycap reads its labels, i.e. renders. */
    const counted = (key: LayoutKey): LayoutKey => ({
      ...key,
      get labels() {
        renders.set(key.id, (renders.get(key.id) ?? 0) + 1);
        return key.labels;
      },
    });
    const keys = [0, 1, 2, 3].map(id => counted(layoutKey(id)));
    render(<KeyboardRender keys={keys} />);
    renders.clear();

    press(2);

    expect(selected()).toEqual([2]);
    expect([...renders.keys()]).toEqual([2]);
    expect(screen.getAllByRole('button', { pressed: true })).toEqual([keycap(2)]);
  });
});
