import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DirectionSelector } from './DirectionSelector';
import styles from './DirectionSelector.module.css';

// jsdom has no pointer capture.
const setPointerCapture = vi.fn<(pointerId: number) => void>();
const releasePointerCapture = vi.fn<(pointerId: number) => void>();

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'setPointerCapture', {
    configurable: true,
    value: setPointerCapture,
  });
  Object.defineProperty(Element.prototype, 'releasePointerCapture', {
    configurable: true,
    value: releasePointerCapture,
  });
});

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, 'setPointerCapture');
  Reflect.deleteProperty(Element.prototype, 'releasePointerCapture');
  setPointerCapture.mockReset();
  releasePointerCapture.mockReset();
});

function Harness({ initial = 0 }: { initial?: number }) {
  const [direction, setDirection] = useState(initial);
  return <DirectionSelector direction={direction} onDirectionChange={setDirection} />;
}

/** The dial, laid out as a 64×64 px box at (100, 200). */
function dial(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('no dial');
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 200, 64, 64));
  return svg;
}

const degreeInput = () => screen.getByRole('spinbutton', { name: 'Direction' });

describe('DirectionSelector', () => {
  it('shows the direction on the dial and in the degree input', () => {
    const { container } = render(<DirectionSelector direction={0} onDirectionChange={vi.fn()} />);
    const svg = dial(container);
    expect(svg).toHaveClass('w-16', 'h-16', styles['dial'] ?? '');
    expect(svg).toHaveAttribute('viewBox', '0 0 64 64');
    expect(svg.style.touchAction).toBe('none');
    // Ring and indicator only: no arc at 0°.
    expect(svg.querySelectorAll('circle')).toHaveLength(2);
    expect(svg.querySelectorAll(':scope > path')).toHaveLength(0);
    expect(degreeInput()).toHaveValue(0);
    expect(degreeInput()).toHaveAttribute('min', '0');
    expect(degreeInput()).toHaveAttribute('max', '360');
    expect(screen.getByText('← RTL')).toBeInTheDocument();
  });

  it('draws the arc, indicator and arrow for the direction', () => {
    const { container } = render(<DirectionSelector direction={270} onDirectionChange={vi.fn()} />);
    const arc = container.querySelector('svg > path');
    expect(arc).toHaveAttribute('d', 'M 6 31.999999999999996 A 26 26 0 0 1 32 6');
    expect(arc).toHaveClass('text-primary');
    const indicator = container.querySelectorAll('circle')[1];
    expect(indicator).toHaveAttribute('cx', '32');
    expect(indicator).toHaveAttribute('cy', '6');
    expect(container.querySelector('g')).toHaveAttribute('transform', 'translate(32, 32)');
    expect(screen.getByText('↓ UTD')).toBeInTheDocument();
  });

  it('follows the pointer while it is pressed on the dial', () => {
    const { container } = render(<Harness />);
    const svg = dial(container);

    fireEvent.pointerDown(svg, { clientX: 132, clientY: 264, pointerId: 7 });
    expect(degreeInput()).toHaveValue(90);
    expect(setPointerCapture).toHaveBeenCalledWith(7);

    fireEvent.pointerMove(svg, { clientX: 164, clientY: 232, pointerId: 7 });
    expect(degreeInput()).toHaveValue(180);
    expect(screen.getByText('→ LTR')).toBeInTheDocument();

    fireEvent.pointerUp(svg, { clientX: 164, clientY: 232, pointerId: 7 });
    expect(releasePointerCapture).toHaveBeenCalledWith(7);
    fireEvent.pointerMove(svg, { clientX: 132, clientY: 200, pointerId: 7 });
    expect(degreeInput()).toHaveValue(180);
  });

  it('stops following when the pointer leaves the dial', () => {
    const { container } = render(<Harness />);
    const svg = dial(container);
    fireEvent.pointerDown(svg, { clientX: 132, clientY: 200, pointerId: 1 });
    expect(degreeInput()).toHaveValue(270);
    fireEvent.pointerLeave(svg, { pointerId: 1 });
    fireEvent.pointerMove(svg, { clientX: 100, clientY: 232, pointerId: 1 });
    expect(degreeInput()).toHaveValue(270);
  });

  it('clamps typed degrees to 0–360', () => {
    render(<Harness initial={45} />);
    expect(screen.getByText('Custom')).toBeInTheDocument();
    fireEvent.change(degreeInput(), { target: { value: '400' } });
    expect(degreeInput()).toHaveValue(360);
    fireEvent.change(degreeInput(), { target: { value: '-20' } });
    expect(degreeInput()).toHaveValue(0);
    fireEvent.change(degreeInput(), { target: { value: '135' } });
    expect(degreeInput()).toHaveValue(135);
  });

  it('names the degree input after its use', () => {
    render(
      <DirectionSelector direction={0} onDirectionChange={vi.fn()} ariaLabel="Rainbow Direction" />
    );
    expect(screen.getByRole('spinbutton', { name: 'Rainbow Direction' })).toBeInTheDocument();
  });
});
