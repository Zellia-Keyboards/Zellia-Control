/**
 * One DKS binding: its keycode button and its four-stage slider (ports of `DKSBindingRow.svelte`
 * and DynamicMode's `DKSSlider` snippet). The slider draws the preview bitmap; clicks and drags
 * are reported to the editor, which owns the bitmap editing (`model/dks-bitmap.ts`).
 */
import { Fragment, type MouseEvent } from 'react';
import {
  DKS_GRIP_HEIGHT,
  DKS_GRIP_OFFSET,
  DKS_GRIP_TOP,
  DKS_GRIP_WIDTH,
  DKS_NODE_SIZE,
  DKS_NODE_TOP,
  DKS_STAGE_COUNT,
  dksIntervalWidth,
  dksNodeLeft,
  getIntervals,
  type DksBitmap,
} from '../../model/dks-bitmap';
import { dksBindingLabel, type DksBinding } from '../../model/defaults';

const NODES = Array.from({ length: DKS_STAGE_COUNT }, (_, index) => index);

// The Svelte handlers wrote these into the button's inline style. Only the focus colour is valid
// CSS; browsers ignore the others, which keeps them inert. The unselected border colour was
// invalid too (`#e5e7eb) dark:#4b5563`), i.e. no inline border colour.
const HOVER_BACKGROUND =
  'color-mix(in srgb, var(--theme-color-primary) 2%, #f9fafb) dark:color-mix(in srgb, var(--theme-color-primary) 3%, black)';
const OUT_BACKGROUND = 'white dark:black';
const FOCUS_BACKGROUND = 'color-mix(in srgb, var(--theme-color-primary) 2%, #f9fafb)';

export interface DKSSliderHandlers {
  readonly onNodeClick: (bindingIndex: number, nodeIndex: number) => void;
  /** A bar or tap marker was clicked: delete the interval starting at `start`. */
  readonly onIntervalClick: (bindingIndex: number, start: number) => void;
  readonly onGripMouseDown: (event: MouseEvent, bindingIndex: number, nodeIndex: number) => void;
}

interface DKSSliderProps extends DKSSliderHandlers {
  readonly uiBitmap: DksBitmap;
  readonly bindingIndex: number;
}

function DKSSlider({
  uiBitmap,
  bindingIndex,
  onNodeClick,
  onIntervalClick,
  onGripMouseDown,
}: DKSSliderProps) {
  const uiIntervals = getIntervals(uiBitmap);
  return (
    <>
      {NODES.map(i => (
        <button
          key={i}
          type="button"
          // The "+" alone (16 of them) says nothing to assistive technology. Verb first: the
          // binding buttons are named "Binding N: <keycode>".
          aria-label={`Add tap at phase ${i + 1} to binding ${bindingIndex + 1}`}
          className="rounded-full border-2 glassmorphism-button"
          onClick={() => {
            onNodeClick(bindingIndex, i);
          }}
          style={{ width: `${DKS_NODE_SIZE}px`, height: `${DKS_NODE_SIZE}px` }}
        >
          +
        </button>
      ))}

      {uiIntervals.map((interval, index) => {
        const [start, end] = interval;
        return (
          // Unkeyed in Svelte: the markup is reused by position.
          <Fragment key={index}>
            {start !== -1 && end > start ? (
              <button
                type="button"
                className="absolute z-20 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 glassmorphism-button bg-primary-500 hover:bg-primary-600 focus-visible:ring-primary-300 dark:bg-gray-600"
                style={{
                  width: `${DKS_NODE_SIZE + dksIntervalWidth(interval)}px`,
                  height: `${DKS_NODE_SIZE}px`,
                  top: `${DKS_NODE_TOP}px`,
                  left: `${dksNodeLeft(start)}px`,
                }}
                onClick={() => {
                  onIntervalClick(bindingIndex, start);
                }}
                title="Click to delete interval"
                aria-label="Delete interval"
              >
                <span className="sr-only">Delete interval</span>
              </button>
            ) : start === end ? (
              <button
                type="button"
                className="absolute z-20 rounded-full glassmorphism-button bg-purple-500 dark:bg-gray-500"
                style={{
                  width: `${DKS_NODE_SIZE}px`,
                  height: `${DKS_NODE_SIZE}px`,
                  top: `${DKS_NODE_TOP}px`,
                  left: `${dksNodeLeft(start)}px`,
                }}
                title={`TAP action at phase ${start + 1}`}
                aria-label={`TAP action at phase ${start + 1}`}
                onClick={() => {
                  onIntervalClick(bindingIndex, start);
                }}
              ></button>
            ) : null}
            <button
              type="button"
              className="absolute z-30 flex items-center justify-center rounded-sm border cursor-ew-resize transition-colors select-none glassmorphism-button bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 hover:bg-gray-600"
              style={{
                width: `${DKS_GRIP_WIDTH}px`,
                height: `${DKS_GRIP_HEIGHT}px`,
                left: `${dksNodeLeft(start) + DKS_GRIP_OFFSET + dksIntervalWidth(interval)}px`,
                top: `${DKS_GRIP_TOP}px`,
              }}
              onMouseDown={event => {
                onGripMouseDown(event, bindingIndex, start);
              }}
              title="Drag to resize interval"
              aria-label="Drag to resize interval"
            >
              <svg className="" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>
          </Fragment>
        );
      })}
    </>
  );
}

export interface DKSBindingRowProps extends DKSSliderHandlers {
  readonly bindingIndex: number;
  readonly binding: DksBinding;
  readonly selectedBindingIndex: number | null;
  readonly onSelectBinding: (index: number) => void;
  readonly uiBitmap: DksBitmap;
}

export function DKSBindingRow({
  bindingIndex,
  binding,
  selectedBindingIndex,
  onSelectBinding,
  uiBitmap,
  ...handlers
}: DKSBindingRowProps) {
  const selected = selectedBindingIndex === bindingIndex;
  const label = dksBindingLabel(binding);
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        // An unset binding shows no text; name the button for assistive technology.
        aria-label={`Binding ${bindingIndex + 1}${label ? `: ${label}` : ''}`}
        aria-pressed={selected}
        className="w-16 h-16 p-0.5 rounded-lg border-2 text-xs transition-all font-medium glassmorphism-button"
        style={{ borderColor: selected ? 'var(--theme-color-primary)' : undefined }}
        onMouseOver={event => {
          if (!selected) event.currentTarget.style.backgroundColor = HOVER_BACKGROUND;
        }}
        onMouseOut={event => {
          if (!selected) event.currentTarget.style.backgroundColor = OUT_BACKGROUND;
        }}
        onFocus={event => {
          if (!selected) event.currentTarget.style.backgroundColor = FOCUS_BACKGROUND;
        }}
        onBlur={event => {
          if (!selected) event.currentTarget.style.backgroundColor = '';
        }}
        onClick={() => {
          onSelectBinding(bindingIndex);
        }}
      >
        {label}
      </button>
      <div className="flex justify-between grow relative">
        <DKSSlider uiBitmap={uiBitmap} bindingIndex={bindingIndex} {...handlers} />
      </div>
    </div>
  );
}
