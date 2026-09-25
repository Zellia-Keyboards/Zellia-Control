/**
 * The firmware updater's seven steps (from `WebUSBFirmwareFlasher.svelte`, identical names and
 * copy) and the state they are derived from. Upstream WebDFU drives them (spec §8 Update):
 * choose the file → reboot into the bootloader → pick and open the DFU device → erase ("Update
 * Program") → the second connection completes at once → download with progress → finish.
 */

export type FlashStepId =
  | 'choose_binary'
  | 'reboot_recovery'
  | 'connect_recovery'
  | 'update_program'
  | 'connect_flash'
  | 'flash_firmware'
  | 'finish';

export type FlashStepStatus = 'pending' | 'active' | 'completed' | 'error';

export interface FlashStep {
  readonly id: FlashStepId;
  readonly name: string;
  readonly description: string;
}

export const FLASH_STEPS: readonly FlashStep[] = [
  { id: 'choose_binary', name: 'Choose Binary', description: 'Select firmware file' },
  { id: 'reboot_recovery', name: 'Reboot to Recovery', description: 'Enter DFU mode' },
  { id: 'connect_recovery', name: 'Connect Recovery', description: 'Connect in DFU mode' },
  { id: 'update_program', name: 'Update Program', description: 'Update DFU bootloader' },
  { id: 'connect_flash', name: 'Connect Flash', description: 'Reconnect for flashing' },
  { id: 'flash_firmware', name: 'Flash Firmware', description: 'Write firmware to device' },
  { id: 'finish', name: 'Finish', description: 'Flashing complete' },
];

export type FlasherState =
  /** Step 1: waiting for a firmware file. */
  | { readonly phase: 'choose' }
  /** Step 2: the keyboard was asked to reboot into its bootloader (or is entered manually). */
  | { readonly phase: 'reboot' }
  /** Step 3: finding (browser picker) and opening the DFU device. */
  | { readonly phase: 'connect' }
  /** Step 4: erasing the flash. */
  | { readonly phase: 'erase' }
  /** Step 6: writing the image; `progress` is the written share in percent. */
  | { readonly phase: 'flash'; readonly progress: number }
  /** Step 7: manifested and reset; the keyboard boots the new firmware. */
  | { readonly phase: 'done' }
  /**
   * The error panel. `step` shows the error icon, except for file errors: Svelte had already
   * moved on to step 2 and left it active.
   */
  | {
      readonly phase: 'error';
      readonly step: FlashStepId;
      readonly stepStatus: 'active' | 'error';
      readonly message: string;
    };

function stepIndex(id: FlashStepId): number {
  return FLASH_STEPS.findIndex(step => step.id === id);
}

function currentStep(state: FlasherState): { index: number; status: FlashStepStatus } {
  switch (state.phase) {
    case 'choose':
      return { index: stepIndex('choose_binary'), status: 'active' };
    case 'reboot':
      return { index: stepIndex('reboot_recovery'), status: 'active' };
    case 'connect':
      return { index: stepIndex('connect_recovery'), status: 'active' };
    case 'erase':
      return { index: stepIndex('update_program'), status: 'active' };
    case 'flash':
      return { index: stepIndex('flash_firmware'), status: 'active' };
    case 'done':
      return { index: stepIndex('finish'), status: 'active' };
    case 'error':
      return { index: stepIndex(state.step), status: state.stepStatus };
  }
}

/** Every step before the current one is completed, the ones after it pending. */
export function stepStatuses(state: FlasherState): FlashStepStatus[] {
  const { index, status } = currentStep(state);
  return FLASH_STEPS.map((_, position) =>
    position < index ? 'completed' : position === index ? status : 'pending'
  );
}

/** Height of the vertical progress line: completed steps plus half of the active one. */
export function progressPercentage(statuses: readonly FlashStepStatus[]): number {
  const completed = statuses.filter(status => status === 'completed').length;
  const active = statuses.includes('active') ? 0.5 : 0;
  return ((completed + active) / statuses.length) * 100;
}
