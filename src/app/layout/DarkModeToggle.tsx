import { Moon, Sun } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { useDarkMode } from '../../lib/theme';

/** Sidebar dark/light mode button (port of `DarkModeToggle.svelte`). */
export function DarkModeToggle() {
  const t = useT();
  const { toggle } = useDarkMode();

  return (
    <div className="p-3 border-transparent">
      <button
        type="button"
        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 glassmorphism-button"
        onClick={toggle}
      >
        <div className="flex items-center gap-3">
          <Sun className="w-4 h-4 hidden dark:block" />
          <Moon className="w-4 h-4 block dark:hidden" />
          <span className="hidden dark:block">{t('ui.darkMode')}</span>
          <span className="block dark:hidden">{t('ui.lightMode')}</span>
        </div>
      </button>
    </div>
  );
}
