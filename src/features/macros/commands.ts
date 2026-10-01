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
