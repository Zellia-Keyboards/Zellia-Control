import { Heart, Keyboard } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { DonationSection } from './components/DonationSection';
import { FeatureGrid } from './components/FeatureGrid';
import { LibrarySection } from './components/LibrarySection';
import { openExternal } from './open-external';

const LIBRARY_URL = 'https://github.com/Zellia-Keyboards/zellia_libamp';

function openLibraryGitHub(): void {
  openExternal(LIBRARY_URL);
}

/** About Zellia Control (port of `routes/about/+page.svelte`). */
export function AboutPage() {
  const t = useT();
  return (
    <div className="flex-1 w-full p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t('about.title')}</h2>
            <p className="text-gray-600 dark:text-gray-300 mt-2">{t('about.subtitle')}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* App Info Section */}
          <div className="glassmorphism-card rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-black">
                  <Keyboard className="w-8 h-8 text-primary-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {t('about.appName')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {t('about.appDescription')}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-primary-600">
                    <div className="w-2 h-2 rounded-full bg-primary-600"></div>
                    <span>{t('about.version')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-black"></div>
                    <span>{t('about.builtWith')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <FeatureGrid />

          {/* Open Source Library Section */}
          <LibrarySection onGitHubClick={openLibraryGitHub} />

          <DonationSection />

          {/* Contact/Links */}
          <div className="glassmorphism-card rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center transition-all duration-300">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-2">
              Made with <Heart className="w-5 h-5 text-gray-900 dark:text-white" /> for the Hall
              Effect keyboard community
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2025 Zellia Control. All rights reserved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
