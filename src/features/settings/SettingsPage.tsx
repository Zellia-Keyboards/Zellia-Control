import { AlertTriangle, Download, RotateCcw, Trash2, type LucideIcon } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { useNavigate, type NavigateFunction } from 'react-router';
import { ConfirmationModal } from '../../components/ui';
import { deviceSession } from '../device';
import { enterBootloaderForUpdate } from '../firmware-update';
import { useT, type TranslationKey } from '../../lib/i18n';
import styles from './SettingsPage.module.css';
import { cx } from '../../lib/class-names';

type ActionColor = 'blue' | 'violet' | 'red';

/** Actions that ask for confirmation first (§1.3, PL-012); Restart runs at once. */
type ConfirmedAction = 'bootloader' | 'factory-reset';

interface SettingsOption {
  readonly id: 'restart' | ConfirmedAction;
  readonly nameKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
  readonly icon: LucideIcon;
  readonly color: ActionColor;
}

const SETTINGS_OPTIONS: readonly SettingsOption[] = [
  {
    id: 'restart',
    nameKey: 'settings.restart',
    descriptionKey: 'settings.restartDesc',
    icon: RotateCcw,
    color: 'blue',
  },
  {
    id: 'bootloader',
    nameKey: 'settings.bootloader',
    descriptionKey: 'settings.bootloaderDesc',
    icon: Download,
    color: 'violet',
  },
  {
    id: 'factory-reset',
    nameKey: 'settings.factoryReset',
    descriptionKey: 'settings.factoryResetDesc',
    icon: Trash2,
    color: 'red',
  },
];

interface Confirmation {
  readonly titleKey: TranslationKey;
  readonly messageKey: TranslationKey;
  readonly confirmColor: 'orange' | 'red';
  readonly run: (navigate: NavigateFunction) => void;
}

const CONFIRMATIONS: Readonly<Record<ConfirmedAction, Confirmation>> = {
  bootloader: {
    titleKey: 'settings.bootloader',
    messageKey: 'settings.bootloaderConfirm',
    confirmColor: 'orange',
    // §1.8: the Update page opens with the update started, ready to flash the bootloader.
    run: navigate => {
      void enterBootloaderForUpdate();
      void navigate('/update/');
    },
  },
  'factory-reset': {
    titleKey: 'settings.factoryReset',
    messageKey: 'settings.factoryResetConfirm',
    confirmColor: 'red',
    run: () => {
      deviceSession.factoryReset();
    },
  },
};

/**
 * Device settings (port of `routes/settings/+page.svelte`, plus the PL-012 confirmations; a
 * confirmed Enter Bootloader opens the Update page, PL-026).
 */
export function SettingsPage() {
  const t = useT();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState<ConfirmedAction | null>(null);

  const runOption = (option: SettingsOption) => {
    if (option.id === 'restart') deviceSession.systemReset();
    else setConfirming(option.id);
  };

  const handleKeyDown = (event: KeyboardEvent, option: SettingsOption) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      runOption(option);
    }
  };

  return (
    <div className={styles['settings-container']}>
      {/* Header */}
      <div className={styles['settings-header']}>
        <div className={styles['header-content']}>
          <h1 className={cx(styles['page-title'], 'text-gray-900 dark:text-white')}>
            {t('settings.title')}
          </h1>
          <p className={cx(styles['page-subtitle'], 'text-gray-600 dark:text-gray-300')}>
            {t('settings.subtitle')}
          </p>
        </div>
        <div className={styles['header-decoration']}>
          <div className={styles['decoration-line']}></div>
        </div>
      </div>

      {/* Actions Grid */}
      <div className={styles['actions-grid']}>
        {SETTINGS_OPTIONS.map((option, index) => {
          const Icon = option.icon;
          return (
            <div
              key={option.id}
              className={cx(styles['action-card'], styles[`action-card-${option.color}`])}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => {
                runOption(option);
              }}
              onKeyDown={event => {
                handleKeyDown(event, option);
              }}
              role="button"
              tabIndex={0}
            >
              <div className={cx(styles['action-glow'], styles[`glow-${option.color}`])}></div>
              <div className={cx(styles['action-content'], 'glassmorphism-card')}>
                <div
                  className={cx(
                    styles['action-icon-wrapper'],
                    styles[`icon-wrapper-${option.color}`]
                  )}
                >
                  <Icon className={`action-icon icon-${option.color}`} />
                </div>
                <div className={styles['action-info']}>
                  <h3 className={cx(styles['action-title'], 'text-gray-900 dark:text-white')}>
                    {t(option.nameKey)}
                  </h3>
                  <p
                    className={cx(styles['action-description'], 'text-gray-600 dark:text-gray-300')}
                  >
                    {t(option.descriptionKey)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning Text */}
      <div
        className={cx(styles['warning-section'], 'glassmorphism-card')}
        style={{ animationDelay: '300ms' }}
      >
        <AlertTriangle className="warning-icon text-amber-500 dark:text-amber-400" />
        <p className={cx(styles['warning-text'], 'text-gray-600 dark:text-gray-300')}>
          These actions affect your keyboard&apos;s firmware and settings. Use with caution.
        </p>
      </div>

      {(Object.keys(CONFIRMATIONS) as ConfirmedAction[]).map(action => {
        const confirmation = CONFIRMATIONS[action];
        const title = t(confirmation.titleKey);
        return (
          <ConfirmationModal
            key={action}
            open={confirming === action}
            title={title}
            message={t(confirmation.messageKey)}
            confirmText={title}
            cancelText={t('common.cancel')}
            confirmColor={confirmation.confirmColor}
            onConfirm={() => {
              setConfirming(null);
              confirmation.run(navigate);
            }}
            onCancel={() => {
              setConfirming(null);
            }}
          />
        );
      })}
    </div>
  );
}
