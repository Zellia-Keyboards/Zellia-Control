import { act, cleanup, render, screen } from '@testing-library/react';
import { createRef, type ReactElement, type Ref } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { linear } from './easing';
import { fade, slide, slideMove } from './functions';
import { installFakeAnimations, type FakeAnimations } from './testing';
import { KeyedTransition, Transition } from './Transition';
import type { TransitionFn } from './types';

/** Linear opacity transition with easy-to-read keyframes. */
const opacity: TransitionFn<{ duration?: number }> = (_node, { duration = 300 } = {}) => ({
  duration,
  easing: linear,
  css: t => `opacity: ${t}`,
});

let animations: FakeAnimations;

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function panel(): HTMLElement {
  return screen.getByTestId('panel');
}

beforeEach(() => {
  vi.useFakeTimers();
  animations = installFakeAnimations();
});

afterEach(() => {
  cleanup();
  animations.uninstall();
  vi.useRealTimers();
});

describe('Transition', () => {
  /** Component children forward `ref` to their root element. */
  function Panel({
    text = 'content',
    ref,
  }: {
    text?: string;
    ref?: Ref<HTMLDivElement>;
  }): ReactElement {
    return (
      <div ref={ref} data-testid="panel" className="rounded p-2">
        {text}
      </div>
    );
  }

  it('renders its child without adding wrapper elements', () => {
    const { container } = render(
      <Transition show transition={[opacity]}>
        <div className="grid grid-cols-4" style={{ gap: 2 }}>
          x
        </div>
      </Transition>
    );
    expect(container.innerHTML).toBe('<div class="grid grid-cols-4" style="gap: 2px;">x</div>');
  });

  it('renders nothing while hidden', () => {
    const { container } = render(
      <Transition show={false} transition={[opacity]}>
        <Panel />
      </Transition>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('does not animate when mounted already shown (local transition)', () => {
    render(
      <Transition show transition={[opacity]}>
        <Panel />
      </Transition>
    );
    advance(1000);
    expect(animations.all).toHaveLength(0);
  });

  it('plays the intro on mount with appear (global transition)', () => {
    render(
      <Transition show in={[opacity, { duration: 350 }]} appear>
        <Panel />
      </Transition>
    );
    const [hold] = animations.of(panel());
    expect(hold?.keyframes).toEqual([{ opacity: '0' }, { opacity: '0' }]);
    advance(0);
    expect(animations.of(panel())[1]?.duration).toBe(350);
  });

  it('mounts the child and plays the intro when shown', () => {
    const { rerender } = render(
      <Transition show={false} transition={[opacity]}>
        <Panel />
      </Transition>
    );
    rerender(
      <Transition show transition={[opacity]}>
        <Panel />
      </Transition>
    );
    expect(panel()).toBeInTheDocument();
    advance(0);
    const intro = animations.of(panel())[1];
    expect(intro?.keyframes[0]).toEqual({ opacity: '0' });
    expect(intro?.keyframes.at(-1)).toEqual({ opacity: '1' });
    advance(300);
    expect(animations.active()).toHaveLength(0);
  });

  it('keeps the child mounted and inert during the outro, then removes it', () => {
    const { rerender } = render(
      <Transition show transition={[opacity]}>
        <Panel />
      </Transition>
    );
    const element = panel();
    rerender(
      <Transition show={false} transition={[opacity]}>
        <Panel />
      </Transition>
    );
    expect(element).toBeInTheDocument();
    expect(element.inert).toBe(true);
    advance(0);
    const outro = animations.of(element)[1];
    expect(outro?.keyframes[0]).toEqual({ opacity: '1' });
    expect(outro?.keyframes.at(-1)).toEqual({ opacity: '0' });
    advance(299);
    expect(element).toBeInTheDocument();
    advance(1);
    expect(element).not.toBeInTheDocument();
  });

  it('keeps showing the last visible content during the outro', () => {
    const { rerender } = render(
      <Transition show transition={[opacity]}>
        <Panel text="Duplicate Profile 1" />
      </Transition>
    );
    rerender(
      <Transition show={false} transition={[opacity]}>
        <Panel text="undefined" />
      </Transition>
    );
    expect(panel()).toHaveTextContent('Duplicate Profile 1');
  });

  it('reverses an interrupted outro on the same element', () => {
    const { rerender } = render(
      <Transition show transition={[opacity]}>
        <Panel />
      </Transition>
    );
    const element = panel();
    rerender(
      <Transition show={false} transition={[opacity]}>
        <Panel />
      </Transition>
    );
    advance(0);
    advance(100);
    rerender(
      <Transition show transition={[opacity]}>
        <Panel text="updated" />
      </Transition>
    );
    expect(panel()).toBe(element);
    expect(element).toHaveTextContent('updated');
    advance(0);
    const reversal = animations.of(element).at(-1);
    expect(Number(reversal?.keyframes[0]?.opacity)).toBeCloseTo(2 / 3);
    expect(reversal?.duration).toBeCloseTo(100);
    advance(1000);
    expect(element).toBeInTheDocument();
  });

  it('removes an intro-only child immediately', () => {
    const { rerender } = render(
      <Transition show in={[opacity]}>
        <Panel />
      </Transition>
    );
    rerender(
      <Transition show={false} in={[opacity]}>
        <Panel />
      </Transition>
    );
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
    expect(animations.all).toHaveLength(0);
  });

  it('plays only the outro of an outro-only transition', () => {
    const { rerender } = render(
      <Transition show={false} out={[opacity]}>
        <Panel />
      </Transition>
    );
    rerender(
      <Transition show out={[opacity]}>
        <Panel />
      </Transition>
    );
    expect(animations.all).toHaveLength(0);
    rerender(
      <Transition show={false} out={[opacity]}>
        <Panel />
      </Transition>
    );
    advance(0);
    expect(animations.active()).toHaveLength(1);
    advance(300);
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
  });

  it('uses the parameters current when the transition starts', () => {
    const { rerender } = render(
      <Transition show transition={[opacity, { duration: 100 }]}>
        <Panel />
      </Transition>
    );
    rerender(
      <Transition show={false} transition={[opacity, { duration: 500 }]}>
        <Panel />
      </Transition>
    );
    advance(0);
    expect(animations.all.at(-1)?.duration).toBe(500);
  });

  it('hides immediately where the Web Animations API is unavailable', () => {
    animations.uninstall();
    const { rerender } = render(
      <Transition show transition={[opacity]}>
        <Panel />
      </Transition>
    );
    rerender(
      <Transition show={false} transition={[opacity]}>
        <Panel />
      </Transition>
    );
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
  });

  it("forwards the child's own ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Transition show transition={[opacity]}>
        <div ref={ref} data-testid="panel" />
      </Transition>
    );
    expect(ref.current).toBe(panel());
  });

  it('does not play nested local transitions when their parent appears', () => {
    function Dropdown({ open }: { open: boolean }) {
      return (
        <Transition show={open} transition={[opacity]}>
          <div data-testid="panel">
            <Transition show transition={[opacity]}>
              <div data-testid="section">section</div>
            </Transition>
          </div>
        </Transition>
      );
    }
    const { rerender } = render(<Dropdown open={false} />);
    rerender(<Dropdown open />);
    advance(0);
    expect(animations.of(panel())).not.toHaveLength(0);
    expect(animations.of(screen.getByTestId('section'))).toHaveLength(0);
  });
  it('checks transition parameters against the transition function at compile time', () => {
    const child = <div />;
    const { container } = render(
      <>
        <Transition show transition={[slide, { duration: 300, axis: 'y' }]}>
          {child}
        </Transition>
        <Transition show in={[slide, { duration: 350, easing: t => t * (2 - t) }]} appear>
          {child}
        </Transition>
        <Transition show transition={[fade, { duration: 150 }]}>
          {child}
        </Transition>
        {/* @ts-expect-error -- `axis` must be 'x' or 'y' */}
        <Transition show transition={[slide, { axis: 'z' }]}>
          {child}
        </Transition>
      </>
    );
    expect(container.children).toHaveLength(4);
  });
});

describe('KeyedTransition', () => {
  function Tabs({ tab, previous }: { tab: string; previous: string }) {
    const order = ['basic', 'system', 'layer'];
    const forward = order.indexOf(tab) > order.indexOf(previous);
    return (
      <div data-testid="viewport">
        <KeyedTransition
          transitionKey={tab}
          in={[slideMove, { duration: 350, direction: forward ? 1 : -1 }]}
          out={[slideMove, { duration: 350, direction: forward ? -1 : 1 }]}
        >
          <div className="absolute inset-0" data-testid={`tab-${tab}`}>
            {tab}
          </div>
        </KeyedTransition>
      </div>
    );
  }

  function tabs(): HTMLElement[] {
    return Array.from(screen.getByTestId('viewport').children, child => {
      if (!(child instanceof HTMLElement)) throw new Error('unexpected child');
      return child;
    });
  }

  it('does not animate the initial child', () => {
    render(<Tabs tab="basic" previous="basic" />);
    advance(1000);
    expect(animations.all).toHaveLength(0);
    expect(tabs()).toHaveLength(1);
  });

  it('keeps the previous child during its outro and slides the new one in after it', () => {
    const { rerender } = render(<Tabs tab="basic" previous="basic" />);
    const basic = screen.getByTestId('tab-basic');
    rerender(<Tabs tab="system" previous="basic" />);
    const system = screen.getByTestId('tab-system');

    expect(tabs()).toEqual([basic, system]);
    expect(basic.inert).toBe(true);
    expect(animations.of(system)[0]?.keyframes[0]).toEqual({
      transform: 'translateY(100%)',
      opacity: '0',
    });

    advance(0);
    expect(animations.of(basic).at(-1)?.keyframes.at(-1)).toEqual({
      transform: 'translateY(-100%)',
      opacity: '0',
    });
    expect(animations.of(system).at(-1)?.keyframes.at(-1)).toEqual({
      transform: 'translateY(0%)',
      opacity: '1',
    });

    advance(350);
    expect(tabs()).toEqual([system]);
  });

  it('reverses the directions when moving back', () => {
    const { rerender } = render(<Tabs tab="layer" previous="layer" />);
    rerender(<Tabs tab="basic" previous="layer" />);
    advance(0);
    const [layer, basic] = tabs();
    expect(layer && animations.of(layer).at(-1)?.keyframes.at(-1)).toEqual({
      transform: 'translateY(100%)',
      opacity: '0',
    });
    expect(basic && animations.of(basic).at(-1)?.keyframes[0]).toEqual({
      transform: 'translateY(-100%)',
      opacity: '0',
    });
  });

  it('keeps every leaving child until its own outro ends', () => {
    const { rerender } = render(<Tabs tab="basic" previous="basic" />);
    rerender(<Tabs tab="system" previous="basic" />);
    advance(100);
    rerender(<Tabs tab="layer" previous="system" />);
    expect(tabs().map(tab => tab.textContent)).toEqual(['basic', 'system', 'layer']);
    advance(250);
    expect(tabs().map(tab => tab.textContent)).toEqual(['system', 'layer']);
    advance(100);
    expect(tabs().map(tab => tab.textContent)).toEqual(['layer']);
  });

  it('mounts a fresh child when returning to a key that is still leaving', () => {
    const { rerender } = render(<Tabs tab="basic" previous="basic" />);
    const first = screen.getByTestId('tab-basic');
    rerender(<Tabs tab="system" previous="basic" />);
    rerender(<Tabs tab="basic" previous="system" />);
    const children = tabs();
    expect(children).toHaveLength(3);
    expect(children[0]).toBe(first);
    expect(children[2]).not.toBe(first);
    advance(1000);
    expect(tabs()).toEqual([children[2]]);
  });
});
