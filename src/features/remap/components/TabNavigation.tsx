import type { ReactNode } from 'react';

export interface TabOption<Name extends string> {
  readonly name: Name;
  readonly icon: ReactNode;
}

export interface TabNavigationProps<Name extends string> {
  readonly tabs: readonly TabOption<Name>[];
  readonly activeTab: Name;
  readonly onTabChange: (tabName: Name) => void;
}

/**
 * The Remap categories (port of `remap/TabNavigation.svelte`; the glassmorphism style is always
 * on, as in the Svelte app).
 */
export function TabNavigation<Name extends string>({
  tabs,
  activeTab,
  onTabChange,
}: TabNavigationProps<Name>) {
  return (
    <nav className="flex flex-col gap-2 w-full" aria-label="Categories">
      {tabs.map(tab => {
        const isActive = activeTab === tab.name;
        return (
          <button
            key={tab.name}
            type="button"
            className={`w-full h-14 text-base font-medium px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 glassmorphism-tab${isActive ? ' active' : ''}`}
            onClick={() => {
              onTabChange(tab.name);
            }}
            aria-pressed={isActive}
          >
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{ fill: 'currentColor' }}
            >
              {tab.icon}
            </div>
            <span className="text-left">{tab.name}</span>
          </button>
        );
      })}
    </nav>
  );
}
