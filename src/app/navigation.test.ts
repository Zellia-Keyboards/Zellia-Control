import { describe, expect, it } from 'vitest';
import {
  hidesToolbarAndKeyboard,
  isActivePage,
  keyboardLabelsFor,
  navigationFor,
  shouldShowConfiguratorLayout,
  shouldShowLayerSelector,
  usesSidebarLayout,
  type PageSupport,
} from './navigation';

describe('usesSidebarLayout', () => {
  it('matches the sidebar pages with and without the trailing slash', () => {
    for (const path of ['/performance', '/remap/', '/lighting/', '/dynamic/', '/debug/']) {
      expect(usesSidebarLayout(path)).toBe(true);
    }
    for (const path of [
      '/settings/',
      '/about/',
      '/update/',
      '/profiles/',
      '/macros/',
      '/scripts/',
    ]) {
      expect(usesSidebarLayout(path)).toBe(true);
    }
  });

  it('does not match the root, unknown paths or prefixes of page names', () => {
    for (const path of ['/', '/remapping/', '/not-a-route/', '/advancedkey/']) {
      expect(usesSidebarLayout(path)).toBe(false);
    }
  });
});

describe('shouldShowConfiguratorLayout', () => {
  it('is the sidebar layout plus the root page', () => {
    expect(shouldShowConfiguratorLayout('/')).toBe(true);
    expect(shouldShowConfiguratorLayout('/remap/')).toBe(true);
    expect(shouldShowConfiguratorLayout('/not-a-route/')).toBe(false);
  });
});

describe('shouldShowLayerSelector', () => {
  it('shows the layer selector on Performance, Remap and Dynamic Keys (PL-024)', () => {
    expect(shouldShowLayerSelector('/performance/')).toBe(true);
    expect(shouldShowLayerSelector('/remap/')).toBe(true);
    expect(shouldShowLayerSelector('/dynamic/')).toBe(true);
    expect(shouldShowLayerSelector('/lighting/')).toBe(false);
    expect(shouldShowLayerSelector('/')).toBe(false);
  });
});

describe('hidesToolbarAndKeyboard', () => {
  it('hides them on About, Profiles, Debug, Settings, Update, Macros and Scripts', () => {
    for (const path of [
      '/about/',
      '/profiles/',
      '/debug/',
      '/settings/',
      '/update/',
      '/macros/',
      '/scripts/',
    ]) {
      expect(hidesToolbarAndKeyboard(path)).toBe(true);
    }
    for (const path of ['/', '/remap/', '/performance/', '/lighting/', '/dynamic/']) {
      expect(hidesToolbarAndKeyboard(path)).toBe(false);
    }
  });
});

describe('navigationFor', () => {
  const hrefs = (support: PageSupport) => navigationFor(support).map(([href]) => href);

  it('lists Macros and Scripts after Dynamic Keys for keyboards that support them', () => {
    expect(hrefs({ macros: true, scripts: true })).toEqual([
      '/performance',
      '/remap',
      '/lighting',
      '/dynamic',
      '/macros',
      '/scripts',
      '/debug',
      '/settings',
      '/update',
      '/about',
    ]);
    expect(hrefs({ macros: true, scripts: false })).toContain('/macros');
    expect(hrefs({ macros: true, scripts: false })).not.toContain('/scripts');
  });

  it('leaves them out for keyboards without them', () => {
    expect(hrefs({ macros: false, scripts: false })).toEqual([
      '/performance',
      '/remap',
      '/lighting',
      '/dynamic',
      '/debug',
      '/settings',
      '/update',
      '/about',
    ]);
  });
});

describe('isActivePage', () => {
  it('matches the page and everything below it', () => {
    expect(isActivePage('/remap/', '/remap')).toBe(true);
    expect(isActivePage('/remap', '/remap')).toBe(true);
    expect(isActivePage('/remapping/', '/remap')).toBe(false);
  });
});

describe('keyboardLabelsFor', () => {
  it('picks the keycap labels of each keyboard page', () => {
    expect(keyboardLabelsFor('/performance/')).toBe('performance');
    expect(keyboardLabelsFor('/lighting/')).toBe('lighting');
    expect(keyboardLabelsFor('/remap/')).toBe('remap');
    // Dynamic Keys shows the selected layer's keycodes like Remap (PL-023).
    expect(keyboardLabelsFor('/dynamic/')).toBe('remap');
    // The root page shows the keyboard only while redirecting to /remap/.
    expect(keyboardLabelsFor('/')).toBe('remap');
  });
});
