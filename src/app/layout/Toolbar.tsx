import { ProfileDropdown } from '../../features/profiles';
import { LayerSelector } from './LayerSelector';
import { LayoutConfigDropdown } from './LayoutConfigDropdown';

export interface ToolbarProps {
  readonly showLayerSelector: boolean;
}

/** Layer buttons, profile and layout dropdowns above the keyboard (port of `ToolbarSection.svelte`). */
export function Toolbar({ showLayerSelector }: ToolbarProps) {
  return (
    <div className="flex items-center justify-between -mb-3">
      <LayerSelector shouldShow={showLayerSelector} />

      <div className="flex items-center gap-3 px-4 py-2">
        {/* Profile Dropdown */}
        <ProfileDropdown />

        {/* Layout Configuration Dropdown */}
        <LayoutConfigDropdown />
      </div>
    </div>
  );
}
