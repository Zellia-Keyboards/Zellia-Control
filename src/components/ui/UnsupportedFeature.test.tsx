import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UnsupportedFeature } from './UnsupportedFeature';

describe('UnsupportedFeature', () => {
  it('names what the keyboard does not support, with a decorative icon', () => {
    const { container } = render(
      <UnsupportedFeature message="This keyboard does not support macros" />
    );
    expect(
      screen.getByRole('heading', { name: 'This keyboard does not support macros' })
    ).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
