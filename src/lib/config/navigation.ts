// Navigation configuration
export const NAVIGATE = [
  ['/performance', 'nav.performance'],
  ['/remap', 'nav.remap'],
  ['/lighting', 'nav.lighting'],
  ['/advancedkey', 'nav.advancedkey'],
  ['/debug', 'nav.debug'],
  ['/settings', 'nav.settings'],
  ['/update', 'nav.update'],
  ['/about', 'nav.about'],
] as const;

// Pages that should use the sidebar layout
export const SIDEBAR_PAGES = [
  '/performance',
  '/remap',
  '/lighting',
  '/advancedkey',
  '/debug',
  '/settings',
  '/about',
  '/update',
  '/profiles',
] as const;

// Pages that should show the layer selector
export const LAYER_SELECTOR_PAGES = ['/performance', '/remap', '/advancedkey'] as const;
