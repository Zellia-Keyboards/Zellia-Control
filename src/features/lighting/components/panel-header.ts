import type { CSSProperties } from 'react';

/**
 * The lighting panels' header padding, with the height the header had with its Apply button
 * (38 px: 36 px of content plus the glass button's 1 px border top and bottom, PL-047),
 * so the panel content does not move.
 */
export const PANEL_HEADER_STYLE: CSSProperties = {
  padding: 'calc(1.25rem * var(--ui-scale, 1))',
  minHeight: 'calc(2.25rem + 2.5rem * var(--ui-scale, 1) + 3px)',
};
