import { describe, expect, it } from 'vitest';
import {
  FLASH_STEPS,
  progressPercentage,
  stepStatuses,
  type FlasherState,
  type FlashStepStatus,
} from './flash-steps';

const C = 'completed';
const A = 'active';
const P = 'pending';
const E = 'error';

describe('FLASH_STEPS', () => {
  it('keeps the seven Svelte steps and names in order', () => {
    expect(FLASH_STEPS.map(step => [step.id, step.name])).toEqual([
      ['choose_binary', 'Choose Binary'],
      ['reboot_recovery', 'Reboot to Recovery'],
      ['connect_recovery', 'Connect Recovery'],
      ['update_program', 'Update Program'],
      ['connect_flash', 'Connect Flash'],
      ['flash_firmware', 'Flash Firmware'],
      ['finish', 'Finish'],
    ]);
  });
});

describe('stepStatuses', () => {
  it.each<[FlasherState, FlashStepStatus[]]>([
    [{ phase: 'choose' }, [A, P, P, P, P, P, P]],
    [{ phase: 'reboot' }, [C, A, P, P, P, P, P]],
    [{ phase: 'connect' }, [C, C, A, P, P, P, P]],
    [{ phase: 'erase' }, [C, C, C, A, P, P, P]],
    // The connect-flash step completes at once: WebDFU needs no second connection.
    [{ phase: 'flash', progress: 40 }, [C, C, C, C, C, A, P]],
    [{ phase: 'done' }, [C, C, C, C, C, C, A]],
  ])('derives the steps of %o', (state, expected) => {
    expect(stepStatuses(state)).toEqual(expected);
  });

  it('marks the failed step, or keeps it active for file errors (as in Svelte)', () => {
    expect(
      stepStatuses({ phase: 'error', step: 'connect_recovery', stepStatus: 'error', message: 'x' })
    ).toEqual([C, C, E, P, P, P, P]);
    expect(
      stepStatuses({ phase: 'error', step: 'flash_firmware', stepStatus: 'error', message: 'x' })
    ).toEqual([C, C, C, C, C, E, P]);
    expect(
      stepStatuses({ phase: 'error', step: 'reboot_recovery', stepStatus: 'active', message: 'x' })
    ).toEqual([C, A, P, P, P, P, P]);
  });
});

describe('progressPercentage', () => {
  it('counts completed steps and half of the active one', () => {
    expect(progressPercentage([A, P, P, P, P, P, P])).toBeCloseTo((0.5 / 7) * 100);
    expect(progressPercentage([C, C, A, P, P, P, P])).toBeCloseTo((2.5 / 7) * 100);
    expect(progressPercentage([C, C, E, P, P, P, P])).toBeCloseTo((2 / 7) * 100);
    expect(progressPercentage([C, C, C, C, C, C, A])).toBeCloseTo((6.5 / 7) * 100);
  });
});
