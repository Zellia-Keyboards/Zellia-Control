import { describe, expect, it } from 'vitest';
import { DksAction, clickNode, getIntervals, type DksBitmap, type DksInterval } from './dks-bitmap';
import { decodeKeyControl, encodeKeyControl } from './dks-codec';

const { Hold: H, Press: P, Release: R, Tap: T } = DksAction;

function at<V>(values: readonly V[], index: number): V {
  const value = values[index];
  if (value === undefined) throw new Error(`index ${index} out of range`);
  return value;
}

const ACTIONS: readonly DksAction[] = [H, P, R, T];
const ALL_BITMAPS: readonly DksBitmap[] = Array.from({ length: 256 }, (_, n): DksBitmap => [
  at(ACTIONS, n & 3),
  at(ACTIONS, (n >> 2) & 3),
  at(ACTIONS, (n >> 4) & 3),
  at(ACTIONS, (n >> 6) & 3),
]);
const ALL_BYTES = Array.from({ length: 256 }, (_, byte) => byte);

// libamp dynamic_key.h
const DKS_RELEASE = 0;
const DKS_TAP = 1;
const DKS_HOLD = 3;
const DKS_KEY_CONTROL = (a: number, b: number, c: number, d: number) =>
  (a & 0x03) | ((b & 0x03) << 2) | ((c & 0x03) << 4) | ((d & 0x03) << 6);
const stageValue = (byte: number, stage: number) => (byte >> (2 * stage)) & 0x03;

/** Stage letters of a firmware byte: R release (0), T tap (1), 2 (undefined), H hold (3). */
const stageLetters = (byte: number) =>
  [0, 1, 2, 3].map(stage => 'RT2H'.charAt(stageValue(byte, stage))).join('');
/** Node letters of a UI bitmap: H hold, P press, R release, T tap. */
const nodeLetters = (bitmap: DksBitmap) => bitmap.map(action => 'HPRT'.charAt(action)).join('');
const show = (edges: readonly string[]) => edges.join(' ');

/**
 * Key-down/up edges the host sees in one press/release cycle of one binding, per libamp
 * `dynamic_key.c`. Crossing stage `s` runs `dynamic_key_s_update_state`: HOLD and TAP set the
 * binding's bit (TAP also schedules its reset 5 ms later), RELEASE and the undefined value 2 clear
 * it. `dynamic_key_s_process` then reports `CALC_EVENT(last, now)`, and `CALC_EVENT(1, 1)` is
 * KEY_TRUE, not KEY_DOWN: a TAP while the bit is already set sends no new key-down, it only ends
 * the press 5 ms later. `down@s` / `up@s` happen at stage `s`, `up@s+` 5 ms after it. The key
 * starts released and crosses the four stages in order, more than 5 ms apart.
 */
function firmwareEdges(byte: number): { edges: string[]; heldAfterCycle: boolean } {
  const edges: string[] = [];
  let pressed = false;
  for (let stage = 0; stage < 4; stage++) {
    const value = stageValue(byte, stage);
    const next = value === DKS_HOLD || value === DKS_TAP;
    if (next && !pressed) edges.push(`down@${stage}`);
    if (!next && pressed) edges.push(`up@${stage}`);
    pressed = next;
    if (value === DKS_TAP) {
      edges.push(`up@${stage}+`);
      pressed = false;
    }
  }
  return { edges, heldAfterCycle: pressed };
}

/**
 * The edges the UI intervals draw: an interval `[s, e]` presses at `s` and releases at `e`; a tap
 * at `i` presses there and releases 5 ms later. At one stage: an interval's release, then a press,
 * then a tap's release.
 */
function uiEdges(intervals: readonly DksInterval[]): string[] {
  const edges: string[] = [];
  for (let stage = 0; stage < 4; stage++) {
    if (intervals.some(([start, end]) => start < end && end === stage)) edges.push(`up@${stage}`);
    if (intervals.some(([start]) => start === stage)) edges.push(`down@${stage}`);
    if (intervals.some(([start, end]) => start === end && start === stage)) {
      edges.push(`up@${stage}+`);
    }
  }
  return edges;
}

/** Lossy: an interval ends where another starts; the firmware cannot release and re-press. */
function hasTouchingIntervals(bitmap: DksBitmap): boolean {
  const intervals = getIntervals(bitmap).filter(([start, end]) => start < end);
  return intervals.some(([, end]) => intervals.some(([start]) => start === end));
}

/** Lossy: an interval ends at a tap; the firmware keeps the key down through the tap. */
function hasIntervalEndedByTap(bitmap: DksBitmap): boolean {
  const intervals = getIntervals(bitmap);
  return intervals.some(
    ([start, end]) =>
      start < end && intervals.some(([tap, tapEnd]) => tap === tapEnd && tap === end)
  );
}

/** A firmware hold run ends at a tap (the byte form of {@link hasIntervalEndedByTap}). */
const holdEndedByTap = (byte: number) =>
  [0, 1, 2].some(
    stage => stageValue(byte, stage) === DKS_HOLD && stageValue(byte, stage + 1) === DKS_TAP
  );

describe('encodeKeyControl', () => {
  it('packs one 2-bit firmware action per stage (stage s at bits 2s)', () => {
    expect(encodeKeyControl([R, R, R, R])).toBe(0x00);
    expect(encodeKeyControl([P, H, H, R])).toBe(
      DKS_KEY_CONTROL(DKS_HOLD, DKS_HOLD, DKS_HOLD, DKS_RELEASE)
    );
    expect(encodeKeyControl([T, H, H, H])).toBe(
      DKS_KEY_CONTROL(DKS_TAP, DKS_RELEASE, DKS_RELEASE, DKS_RELEASE)
    );
    expect(encodeKeyControl([P, R, P, R])).toBe(0x33);
    expect(encodeKeyControl([R, T, R, T])).toBe(0x44);
  });

  it('holds from an interval’s start until its end, where a tap starting there wins', () => {
    expect(encodeKeyControl([P, H, T, R])).toBe(
      DKS_KEY_CONTROL(DKS_HOLD, DKS_HOLD, DKS_TAP, DKS_RELEASE)
    );
    // Touching intervals: the firmware cannot release and re-press in one stage.
    expect(encodeKeyControl([P, P, H, R])).toBe(encodeKeyControl([P, H, H, R]));
  });

  it('encodes nothing for a press that is never closed (it is not an interval)', () => {
    expect(encodeKeyControl([H, P, H, H])).toBe(0x00);
    expect(encodeKeyControl([H, H, H, H])).toBe(0x00);
  });

  it('makes the firmware send exactly the key edges the UI draws, except for the lossy bitmaps', () => {
    const lossy = ALL_BITMAPS.filter(
      bitmap =>
        show(firmwareEdges(encodeKeyControl(bitmap)).edges) !== show(uiEdges(getIntervals(bitmap)))
    );
    expect(lossy).toEqual(
      ALL_BITMAPS.filter(bitmap => hasTouchingIntervals(bitmap) || hasIntervalEndedByTap(bitmap))
    );
    expect(lossy).toHaveLength(73); // 27 with touching intervals, 56 with a tap ending one, 10 both
    for (const bitmap of ALL_BITMAPS) {
      // Even when lossy: nothing is held into the next press and every key-down sent is drawn.
      const firmware = firmwareEdges(encodeKeyControl(bitmap));
      const drawn = uiEdges(getIntervals(bitmap));
      const undrawnKeyDowns = firmware.edges.filter(
        edge => edge.startsWith('down') && !drawn.includes(edge)
      );
      expect({
        bitmap: nodeLetters(bitmap),
        held: firmware.heldAfterCycle,
        undrawnKeyDowns,
      }).toEqual({ bitmap: nodeLetters(bitmap), held: false, undrawnKeyDowns: [] });
    }
  });

  it('enumerates the lossy bitmaps where a tap ends an interval: the key stays down through the tap', () => {
    // Drawn edges → firmware edges. The UI draws a release and a new press at the tap; the
    // firmware sends no key-down there (the key is already down) and releases 5 ms later.
    const endedByTap = ALL_BITMAPS.filter(hasIntervalEndedByTap);
    expect(
      endedByTap.map(
        bitmap =>
          `${nodeLetters(bitmap)}: ${show(uiEdges(getIntervals(bitmap)))} → ${show(firmwareEdges(encodeKeyControl(bitmap)).edges)}`
      )
    ).toEqual([
      'PTHH: down@0 up@1 down@1 up@1+ → down@0 up@1+',
      'PTPH: down@0 up@1 down@1 up@1+ → down@0 up@1+',
      'PTRH: down@0 up@1 down@1 up@1+ → down@0 up@1+',
      'PHTH: down@0 up@2 down@2 up@2+ → down@0 up@2+',
      'HPTH: down@1 up@2 down@2 up@2+ → down@1 up@2+',
      'PPTH: down@0 up@1 down@1 up@2 down@2 up@2+ → down@0 up@2+',
      'RPTH: down@1 up@2 down@2 up@2+ → down@1 up@2+',
      'TPTH: down@0 up@0+ down@1 up@2 down@2 up@2+ → down@0 up@0+ down@1 up@2+',
      'PTTH: down@0 up@1 down@1 up@1+ down@2 up@2+ → down@0 up@1+ down@2 up@2+',
      'PTHP: down@0 up@1 down@1 up@1+ → down@0 up@1+',
      'PTPP: down@0 up@1 down@1 up@1+ down@2 up@3 → down@0 up@1+ down@2 up@3',
      'PTRP: down@0 up@1 down@1 up@1+ → down@0 up@1+',
      'PHTP: down@0 up@2 down@2 up@2+ → down@0 up@2+',
      'HPTP: down@1 up@2 down@2 up@2+ → down@1 up@2+',
      'PPTP: down@0 up@1 down@1 up@2 down@2 up@2+ → down@0 up@2+',
      'RPTP: down@1 up@2 down@2 up@2+ → down@1 up@2+',
      'TPTP: down@0 up@0+ down@1 up@2 down@2 up@2+ → down@0 up@0+ down@1 up@2+',
      'PTTP: down@0 up@1 down@1 up@1+ down@2 up@2+ → down@0 up@1+ down@2 up@2+',
      'PTHR: down@0 up@1 down@1 up@1+ → down@0 up@1+',
      'PTPR: down@0 up@1 down@1 up@1+ down@2 up@3 → down@0 up@1+ down@2 up@3',
      'PTRR: down@0 up@1 down@1 up@1+ → down@0 up@1+',
      'PHTR: down@0 up@2 down@2 up@2+ → down@0 up@2+',
      'HPTR: down@1 up@2 down@2 up@2+ → down@1 up@2+',
      'PPTR: down@0 up@1 down@1 up@2 down@2 up@2+ → down@0 up@2+',
      'RPTR: down@1 up@2 down@2 up@2+ → down@1 up@2+',
      'TPTR: down@0 up@0+ down@1 up@2 down@2 up@2+ → down@0 up@0+ down@1 up@2+',
      'PTTR: down@0 up@1 down@1 up@1+ down@2 up@2+ → down@0 up@1+ down@2 up@2+',
      'PHHT: down@0 up@3 down@3 up@3+ → down@0 up@3+',
      'HPHT: down@1 up@3 down@3 up@3+ → down@1 up@3+',
      'PPHT: down@0 up@1 down@1 up@3 down@3 up@3+ → down@0 up@3+',
      'RPHT: down@1 up@3 down@3 up@3+ → down@1 up@3+',
      'TPHT: down@0 up@0+ down@1 up@3 down@3 up@3+ → down@0 up@0+ down@1 up@3+',
      'PTHT: down@0 up@1 down@1 up@1+ down@3 up@3+ → down@0 up@1+ down@3 up@3+',
      'HHPT: down@2 up@3 down@3 up@3+ → down@2 up@3+',
      'PHPT: down@0 up@2 down@2 up@3 down@3 up@3+ → down@0 up@3+',
      'RHPT: down@2 up@3 down@3 up@3+ → down@2 up@3+',
      'THPT: down@0 up@0+ down@2 up@3 down@3 up@3+ → down@0 up@0+ down@2 up@3+',
      'HPPT: down@1 up@2 down@2 up@3 down@3 up@3+ → down@1 up@3+',
      'PPPT: down@0 up@1 down@1 up@2 down@2 up@3 down@3 up@3+ → down@0 up@3+',
      'RPPT: down@1 up@2 down@2 up@3 down@3 up@3+ → down@1 up@3+',
      'TPPT: down@0 up@0+ down@1 up@2 down@2 up@3 down@3 up@3+ → down@0 up@0+ down@1 up@3+',
      'HRPT: down@2 up@3 down@3 up@3+ → down@2 up@3+',
      'PRPT: down@0 up@1 down@2 up@3 down@3 up@3+ → down@0 up@1 down@2 up@3+',
      'RRPT: down@2 up@3 down@3 up@3+ → down@2 up@3+',
      'TRPT: down@0 up@0+ down@2 up@3 down@3 up@3+ → down@0 up@0+ down@2 up@3+',
      'HTPT: down@1 up@1+ down@2 up@3 down@3 up@3+ → down@1 up@1+ down@2 up@3+',
      'PTPT: down@0 up@1 down@1 up@1+ down@2 up@3 down@3 up@3+ → down@0 up@1+ down@2 up@3+',
      'RTPT: down@1 up@1+ down@2 up@3 down@3 up@3+ → down@1 up@1+ down@2 up@3+',
      'TTPT: down@0 up@0+ down@1 up@1+ down@2 up@3 down@3 up@3+ → down@0 up@0+ down@1 up@1+ down@2 up@3+',
      'PTRT: down@0 up@1 down@1 up@1+ down@3 up@3+ → down@0 up@1+ down@3 up@3+',
      'PHTT: down@0 up@2 down@2 up@2+ down@3 up@3+ → down@0 up@2+ down@3 up@3+',
      'HPTT: down@1 up@2 down@2 up@2+ down@3 up@3+ → down@1 up@2+ down@3 up@3+',
      'PPTT: down@0 up@1 down@1 up@2 down@2 up@2+ down@3 up@3+ → down@0 up@2+ down@3 up@3+',
      'RPTT: down@1 up@2 down@2 up@2+ down@3 up@3+ → down@1 up@2+ down@3 up@3+',
      'TPTT: down@0 up@0+ down@1 up@2 down@2 up@2+ down@3 up@3+ → down@0 up@0+ down@1 up@2+ down@3 up@3+',
      'PTTT: down@0 up@1 down@1 up@1+ down@2 up@2+ down@3 up@3+ → down@0 up@1+ down@2 up@2+ down@3 up@3+',
    ]);
    // They are exactly the bitmaps with a tap for which the firmware sends no key-down.
    const hasSilentTap = (bitmap: DksBitmap) => {
      const sent = firmwareEdges(encodeKeyControl(bitmap)).edges;
      return getIntervals(bitmap).some(
        ([start, end]) => start === end && !sent.includes(`down@${start}`)
      );
    };
    expect(endedByTap).toEqual(ALL_BITMAPS.filter(hasSilentTap));
    // One click makes one: clicking the end node of an interval turns it into a tap.
    expect(nodeLetters(clickNode([P, H, H, R], [P, H, H, R], 3))).toBe('PHHT');
  });
});

describe('decodeKeyControl', () => {
  it('turns hold runs into intervals and taps into taps', () => {
    expect(decodeKeyControl(0x00)).toEqual([R, R, R, R]);
    expect(decodeKeyControl(DKS_KEY_CONTROL(DKS_HOLD, DKS_HOLD, DKS_HOLD, DKS_RELEASE))).toEqual([
      P,
      H,
      H,
      R,
    ]);
    expect(decodeKeyControl(DKS_KEY_CONTROL(DKS_TAP, 0, 0, 0))).toEqual([T, R, R, R]);
    expect(decodeKeyControl(0x33)).toEqual([P, R, P, R]);
    expect(decodeKeyControl(DKS_KEY_CONTROL(DKS_HOLD, DKS_HOLD, DKS_TAP, 0))).toEqual([P, H, T, R]);
    expect(decodeKeyControl(0x44)).toEqual([R, T, R, T]);
  });

  it('reads the undefined stage value 2 as release, like the firmware', () => {
    expect(decodeKeyControl(0xaa)).toEqual([R, R, R, R]);
    expect(decodeKeyControl(DKS_KEY_CONTROL(DKS_HOLD, 2, DKS_TAP, 2))).toEqual([P, R, T, R]);
  });

  it('clamps a hold that continues through release-fully (stage 3) to end at stage 3', () => {
    expect(decodeKeyControl(0xff)).toEqual([P, H, H, R]);
    expect(decodeKeyControl(DKS_KEY_CONTROL(0, DKS_HOLD, DKS_HOLD, DKS_HOLD))).toEqual([
      R,
      P,
      H,
      R,
    ]);
    // A hold that starts at stage 3 shrinks to a tap there.
    expect(decodeKeyControl(DKS_KEY_CONTROL(DKS_TAP, 0, 0, DKS_HOLD))).toEqual([T, R, R, T]);
  });

  it('decodes every byte to what the firmware does, except stage-3 holds and holds ended by a tap', () => {
    const unfaithful = ALL_BYTES.filter(byte => {
      const firmware = firmwareEdges(byte);
      const drawn = uiEdges(getIntervals(decodeKeyControl(byte)));
      return firmware.heldAfterCycle || show(drawn) !== show(firmware.edges);
    });
    expect(unfaithful).toEqual(
      ALL_BYTES.filter(byte => stageValue(byte, 3) === DKS_HOLD || holdEndedByTap(byte))
    );
    // A stage-3 hold is drawn ending at stage 3: a release there, or a tap if it starts there.
    for (const byte of ALL_BYTES.filter(b => stageValue(b, 3) === DKS_HOLD && !holdEndedByTap(b))) {
      const clampedEnd = stageValue(byte, 2) === DKS_HOLD ? 'up@3' : 'up@3+';
      expect({ byte, drawn: uiEdges(getIntervals(decodeKeyControl(byte))) }).toEqual({
        byte,
        drawn: [...firmwareEdges(byte).edges, clampedEnd],
      });
    }
  });

  it('enumerates the lossy bytes where a hold ends at a tap: drawn as an interval plus a tap', () => {
    // Bytes using the undefined value 2 or holding at stage 3 are left out (see above). Each
    // decodes to a bitmap listed under encodeKeyControl and re-encodes to the same byte.
    const holdsEndedByTap = ALL_BYTES.filter(
      byte =>
        holdEndedByTap(byte) &&
        stageValue(byte, 3) !== DKS_HOLD &&
        !stageLetters(byte).includes('2')
    );
    expect(
      holdsEndedByTap.map(byte => `${stageLetters(byte)} → ${nodeLetters(decodeKeyControl(byte))}`)
    ).toEqual([
      'HTRR → PTRR',
      'HTTR → PTTR',
      'RHTR → RPTR',
      'THTR → TPTR',
      'HHTR → PHTR',
      'HTHR → PTPR',
      'HTRT → PTRT',
      'HTTT → PTTT',
      'RHTT → RPTT',
      'THTT → TPTT',
      'HHTT → PHTT',
      'RRHT → RRPT',
      'TRHT → TRPT',
      'HRHT → PRPT',
      'RTHT → RTPT',
      'TTHT → TTPT',
      'HTHT → PTPT',
      'RHHT → RPHT',
      'THHT → TPHT',
      'HHHT → PHHT',
    ]);
    for (const byte of holdsEndedByTap) {
      expect(hasIntervalEndedByTap(decodeKeyControl(byte))).toBe(true);
      expect(encodeKeyControl(decodeKeyControl(byte))).toBe(byte);
    }
  });
});

describe('round trips', () => {
  it('re-encodes every firmware byte identically unless it holds at stage 3 or uses value 2', () => {
    const identical = ALL_BYTES.filter(byte => encodeKeyControl(decodeKeyControl(byte)) === byte);
    const expected = ALL_BYTES.filter(
      byte =>
        [0, 1, 2, 3].every(stage => stageValue(byte, stage) !== 2) &&
        stageValue(byte, 3) !== DKS_HOLD
    );
    expect(identical).toEqual(expected);
    expect(identical).toHaveLength(54);
    // Value 2 is re-encoded as 0 (both release in the firmware).
    for (const byte of ALL_BYTES.filter(b => stageValue(b, 3) !== DKS_HOLD)) {
      const releaseFor2 = [0, 1, 2, 3].reduce(
        (sum, stage) =>
          sum | ((stageValue(byte, stage) === 2 ? 0 : stageValue(byte, stage)) << (2 * stage)),
        0
      );
      expect(encodeKeyControl(decodeKeyControl(byte))).toBe(releaseFor2);
    }
  });

  it('enumerates the lossy firmware bytes: holds lasting into the next press (stage 3)', () => {
    // Bytes using the undefined value 2 are left out (they re-encode as release, which the
    // firmware treats identically).
    const clamped = ALL_BYTES.filter(
      byte => stageValue(byte, 3) === DKS_HOLD && !stageLetters(byte).includes('2')
    ).map(byte => {
      const decoded = decodeKeyControl(byte);
      return `${stageLetters(byte)} → ${nodeLetters(decoded)} → ${stageLetters(encodeKeyControl(decoded))}`;
    });
    expect(clamped).toEqual([
      'RRRH → RRRT → RRRT',
      'TRRH → TRRT → TRRT',
      'HRRH → PRRT → HRRT',
      'RTRH → RTRT → RTRT',
      'TTRH → TTRT → TTRT',
      'HTRH → PTRT → HTRT',
      'RHRH → RPRT → RHRT',
      'THRH → TPRT → THRT',
      'HHRH → PHRT → HHRT',
      'RRTH → RRTT → RRTT',
      'TRTH → TRTT → TRTT',
      'HRTH → PRTT → HRTT',
      'RTTH → RTTT → RTTT',
      'TTTH → TTTT → TTTT',
      'HTTH → PTTT → HTTT',
      'RHTH → RPTT → RHTT',
      'THTH → TPTT → THTT',
      'HHTH → PHTT → HHTT',
      'RRHH → RRPR → RRHR',
      'TRHH → TRPR → TRHR',
      'HRHH → PRPR → HRHR',
      'RTHH → RTPR → RTHR',
      'TTHH → TTPR → TTHR',
      'HTHH → PTPR → HTHR',
      'RHHH → RPHR → RHHR',
      'THHH → TPHR → THHR',
      'HHHH → PHHR → HHHR',
    ]);
  });

  it('reloads every UI bitmap with its intervals except touching intervals, which merge', () => {
    // Bitmaps whose tap ends an interval reload unchanged, although the firmware does not
    // re-press at the tap (enumerated under encodeKeyControl).
    const merged = ALL_BITMAPS.filter(
      bitmap =>
        JSON.stringify(getIntervals(decodeKeyControl(encodeKeyControl(bitmap)))) !==
        JSON.stringify(getIntervals(bitmap))
    );
    expect(merged).toEqual(ALL_BITMAPS.filter(hasTouchingIntervals));
    const showIntervals = (intervals: readonly DksInterval[]) =>
      intervals.map(([start, end]) => `[${start},${end}]`).join(' ');
    expect(
      merged.map(
        bitmap =>
          `${nodeLetters(bitmap)}: ${showIntervals(getIntervals(bitmap))} → ${showIntervals(getIntervals(decodeKeyControl(encodeKeyControl(bitmap))))}`
      )
    ).toEqual([
      'PPPH: [0,1] [1,2] → [0,2]',
      'PPRH: [0,1] [1,2] → [0,2]',
      'PPTH: [0,1] [1,2] [2,2] → [0,2] [2,2]',
      'PPHP: [0,1] [1,3] → [0,3]',
      'PHPP: [0,2] [2,3] → [0,3]',
      'HPPP: [1,2] [2,3] → [1,3]',
      'PPPP: [0,1] [1,2] [2,3] → [0,3]',
      'RPPP: [1,2] [2,3] → [1,3]',
      'TPPP: [0,0] [1,2] [2,3] → [0,0] [1,3]',
      'PPRP: [0,1] [1,2] → [0,2]',
      'PPTP: [0,1] [1,2] [2,2] → [0,2] [2,2]',
      'PPHR: [0,1] [1,3] → [0,3]',
      'PHPR: [0,2] [2,3] → [0,3]',
      'HPPR: [1,2] [2,3] → [1,3]',
      'PPPR: [0,1] [1,2] [2,3] → [0,3]',
      'RPPR: [1,2] [2,3] → [1,3]',
      'TPPR: [0,0] [1,2] [2,3] → [0,0] [1,3]',
      'PPRR: [0,1] [1,2] → [0,2]',
      'PPTR: [0,1] [1,2] [2,2] → [0,2] [2,2]',
      'PPHT: [0,1] [1,3] [3,3] → [0,3] [3,3]',
      'PHPT: [0,2] [2,3] [3,3] → [0,3] [3,3]',
      'HPPT: [1,2] [2,3] [3,3] → [1,3] [3,3]',
      'PPPT: [0,1] [1,2] [2,3] [3,3] → [0,3] [3,3]',
      'RPPT: [1,2] [2,3] [3,3] → [1,3] [3,3]',
      'TPPT: [0,0] [1,2] [2,3] [3,3] → [0,0] [1,3] [3,3]',
      'PPRT: [0,1] [1,2] [3,3] → [0,2] [3,3]',
      'PPTT: [0,1] [1,2] [2,2] [3,3] → [0,2] [2,2] [3,3]',
    ]);
  });

  it('decodes to canonical bitmaps (decode ∘ encode is idempotent)', () => {
    for (const bitmap of ALL_BITMAPS) {
      const canonical = decodeKeyControl(encodeKeyControl(bitmap));
      expect(decodeKeyControl(encodeKeyControl(canonical))).toEqual(canonical);
    }
  });
});
