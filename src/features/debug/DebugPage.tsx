import { Activity, TestTube, type LucideIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { KeyTest } from './components/KeyTest';
import { KeyTracking } from './components/KeyTracking';
import styles from './DebugPage.module.css';
import { cx } from '../../lib/class-names';

type DebugTab = 'tracking' | 'keytest';

const TABS: readonly { id: DebugTab; label: string; icon: LucideIcon }[] = [
  { id: 'tracking', label: 'Key Tracking', icon: Activity },
  { id: 'keytest', label: 'Key Test', icon: TestTube },
];

/** Debug tools: Key Tracking and Key Test (port of `routes/debug/+page.svelte`). */
export function DebugPage() {
  const [activeTab, setActiveTab] = useState<DebugTab>('tracking');
  const panelId = useId();

  return (
    <div className={styles['debug-container']}>
      {/* Header */}
      <div className={styles['debug-header']}>
        <h1 className={cx(styles['page-title'], 'text-gray-900 dark:text-white')}>Debug Tools</h1>
        <p className={cx(styles['page-subtitle'], 'text-gray-600 dark:text-gray-300')}>
          Test and monitor your keyboard
        </p>
      </div>

      {/* Tabs */}
      <div className={styles['tabs-container']} role="tablist">
        {TABS.map(tab => {
          const TabIcon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={panelId}
              className={cx(styles.tab, active ? styles['tab-active'] : undefined)}
              onClick={() => {
                setActiveTab(tab.id);
              }}
            >
              <TabIcon className="tab-icon" />
              <span>{tab.label}</span>
              {active && <div className={styles['tab-indicator']}></div>}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div
        id={panelId}
        role="tabpanel"
        className={cx(styles['content-area'], 'glassmorphism-card')}
      >
        {activeTab === 'tracking' ? <KeyTracking /> : <KeyTest />}
      </div>
    </div>
  );
}
