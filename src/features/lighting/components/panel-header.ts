import type { CSSProperties } from 'react';

/**
 * The lighting panels' header padding, with the height the header had with its Apply button
 * (38 px: 36 px of content plus the glass button's 1 px border top and bottom, PL-047), so the
 * panel content does not move. The code adds 3 px, not 2: the third pixel is the header's own
 * 1 px bottom border, which min-height counts along with the content (border-box sizing).
 */
export const PANEL_HEADER_STYLE: CSSProperties = {
  padding: 'calc(1.25rem * var(--ui-scale, 1))',
  minHeight: 'calc(2.25rem + 2.5rem * var(--ui-scale, 1) + 3px)',
};
