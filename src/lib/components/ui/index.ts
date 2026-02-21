// Shared UI component library for Zellia Control
// Import from '$lib/components/ui' to use these components.
//
// These components replace repeated patterns found across the codebase:
//
//   ThemedSlider  — replaces 8 duplicate slider CSS blocks
//   Toggle        — replaces 5 toggle switch implementations
//   Card          — standardizes 88+ glassmorphism-card wrappers
//   NoKeySelected — replaces 3 near-identical empty state components
//   SectionHeader — replaces 35+ inline heading+subtitle combos
//   Button        — replaces ~12 inline button style variants
//   Tabs          — replaces 3 inline horizontal tab implementations
//   Modal         — replaces 3 duplicate modal overlay implementations
//   StatusDot     — replaces 8+ hand-coded dot+text indicators
//   ColorInput    — replaces 3 duplicate color picker CSS blocks

export { default as ThemedSlider } from './ThemedSlider.svelte';
export { default as Toggle } from './Toggle.svelte';
export { default as Card } from './Card.svelte';
export { default as NoKeySelected } from './NoKeySelected.svelte';
export { default as SectionHeader } from './SectionHeader.svelte';
export { default as Button } from './Button.svelte';
export { default as Tabs } from './Tabs.svelte';
export { default as Modal } from './Modal.svelte';
export { default as StatusDot } from './StatusDot.svelte';
export { default as ColorInput } from './ColorInput.svelte';
