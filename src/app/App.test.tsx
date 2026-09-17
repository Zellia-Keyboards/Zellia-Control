import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { resetShellState } from './testing/render-app';

afterEach(resetShellState);

describe('App', () => {
  it('opens the connection screen at the browser location', async () => {
    render(<App />);

    expect(await screen.findByRole('button', { name: 'Get Started' })).toBeInTheDocument();
    // The sidebar title and the big welcome title.
    expect(screen.getAllByRole('heading', { level: 1, name: 'ZELLIA Control' })).toHaveLength(2);
  });
});
