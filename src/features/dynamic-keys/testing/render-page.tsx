/**
 * Renders the Dynamic Keys page against the app's device session connected to a virtual keyboard
 * (the shell is not part of these tests: key selection is driven through the selection store).
 */
import { act, render } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { onTestFinished } from 'vitest';
import type { KeyLocation } from '../../device';
import { INITIAL_KEY_SELECTION, keySelection, keySelectionStore } from '../../keyboard';
import { connectVirtualKeyboard, type ConnectedKeyboard } from '../../../testing/app-keyboard';
import type { VirtualKeyboardOptions } from '../../../testing/virtual-keyboard';
import { DynamicKeysPage } from '../DynamicKeysPage';
import { uiFields } from '../store/ui-fields';

export interface RenderedPage {
  readonly keyboard: ConnectedKeyboard;
  readonly user: UserEvent;
  readonly unmount: () => void;
}

function resetStores(): void {
  keySelectionStore.setState(INITIAL_KEY_SELECTION, true);
  uiFields.reset();
}

export async function renderDynamicKeysPage(
  options: VirtualKeyboardOptions = {}
): Promise<RenderedPage> {
  resetStores();
  const keyboard = await connectVirtualKeyboard(options);
  onTestFinished(() => {
    keyboard.dispose();
    resetStores();
  });
  const user = userEvent.setup();
  const { unmount } = render(
    <MemoryRouter initialEntries={['/dynamic/']}>
      <DynamicKeysPage />
    </MemoryRouter>
  );
  return { keyboard, user, unmount };
}

/** Selects keys like clicks on the on-screen keyboard would (ids on the selected layer). */
export function selectKeys(...ids: number[]): void {
  act(() => {
    keySelection.setSelected(ids);
  });
}

/** Switches the layer selector (1-based, as shown). */
export function selectLayer(layer: number): void {
  act(() => {
    keySelection.setLayer(layer);
  });
}

export const at = (layer: number, id: number): KeyLocation => ({ layer, id });
