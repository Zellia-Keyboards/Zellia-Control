import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLanguage } from '../../lib/i18n';
import { AboutPage } from './index';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/about/']}>
      <AboutPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  setLanguage('en');
});

afterEach(() => {
  setLanguage('en');
  localStorage.clear();
});

// Page renders and role queries are slow in jsdom on a busy machine.
describe('AboutPage', { timeout: 20_000 }, () => {
  it('shows the translated header and app card', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 2, name: 'About Zellia Control' })).toHaveClass(
      'text-3xl font-bold text-gray-900 dark:text-white'
    );
    expect(screen.getByText('Hall Effect keyboard configurator')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Zellia Control' })).toBeInTheDocument();
    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
    expect(screen.getByText('Built with SvelteKit & PWA')).toBeInTheDocument();
  });

  it('lists the four feature groups with their items', () => {
    renderPage();
    const groups = screen.getAllByRole('heading', { level: 4 }).slice(0, 4);
    expect(groups.map(group => group.textContent)).toEqual([
      'Performance',
      'Dynamic Keys',
      'Customization',
      'Technical',
    ]);
    const items = (heading: HTMLElement) =>
      within(heading.parentElement ?? heading)
        .getAllByRole('listitem')
        .map(item => item.textContent);
    expect(items(groups[0] ?? document.body)).toEqual([
      'Adjustable actuation points (0-4mm)',
      'Rapid trigger technology',
      'Real-time pressure monitoring',
    ]);
    expect(items(groups[3] ?? document.body)).toEqual([
      'Cross-platform support',
      'Hardware calibration',
      'Debug tools',
      'Profile import/export',
    ]);
  });

  it('describes the open-source library with its copy', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: 'Open Source Library - zellia_libamp' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/our core library/, { selector: 'p' }).textContent.replace(/\s+/g, ' ')
    ).toBe(
      'While Zellia Control is proprietary software, our core library zellia_libamp is fully ' +
        'open source. The library powers keyboard communication protocols and is available for ' +
        'developers to use.'
    );
    expect(screen.getByRole('heading', { name: 'Library Features:' })).toBeInTheDocument();
  });

  it('opens the library on GitHub in a new tab', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'View zellia_libamp on GitHub' }));

    expect(open).toHaveBeenCalledWith(
      'https://github.com/Zellia-Keyboards/zellia_libamp',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('shows no sponsor button in English (its link was a placeholder, spec §1.9)', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Support Development' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Alipay QR Code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Support Development' })).not.toBeInTheDocument();
    expect(screen.getByText('New features and improvements')).toBeInTheDocument();
  });

  it('shows the Alipay and WeChat Pay codes in Chinese', () => {
    renderPage();
    act(() => {
      setLanguage('zh');
    });

    expect(screen.getByRole('heading', { level: 2, name: '关于 Zellia 控制' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Alipay QR Code' })).toHaveAttribute(
      'src',
      '/alipayqr.jpg'
    );
    expect(screen.getByText('QR Code')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Support Development' })).not.toBeInTheDocument();
    // Hard-coded copy stays English (parity).
    expect(screen.getByRole('heading', { name: 'Support Development' })).toBeInTheDocument();
  });

  it('ends with the community line and copyright', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: /Made with/ }).textContent.replace(/\s+/g, ' ')
    ).toBe('Made with for the Hall Effect keyboard community');
    expect(screen.getByText('© 2025 Zellia Control. All rights reserved')).toBeInTheDocument();
  });
});
