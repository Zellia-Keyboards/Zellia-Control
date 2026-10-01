/**
 * DKS editor parts (ports of `advancedkey/dynamic/*.svelte`): header, selected key, phase
 * header, keycode selection panel and the key tester tab. The binding rows, bottom-out slider,
 * performance tab and configured list have their own modules.
 */
import type { Keycode } from '../../../device';
import { useT, type TranslationKey } from '../../../../lib/i18n';
import { DKS_NODE_SIZE, DKS_SLIDER_GAP, DKS_SLIDER_WIDTH } from '../../model/dks-bitmap';
import { EditorHeader } from '../shared/EditorHeader';
import { KeycodePicker } from '../shared/KeycodePicker';

/** Port of `DKSHeader.svelte`. */
interface DKSHeaderProps {
  readonly onBack: () => void;
  readonly onApply: () => void;
  readonly onReset: () => void;
  readonly canApply: boolean;
}

export function DKSHeader({ onBack, onApply, onReset, canApply }: DKSHeaderProps) {
  const t = useT();
  return (
    <EditorHeader
      titleKey="advancedkey.dynamicTitle"
      subtitleKey="advancedkey.dynamicSubtitle"
      onBack={onBack}
    >
      <button
        type="button"
        className="px-4 py-2 text-white rounded-md transition-colors text-sm font-medium glassmorphism-button"
        onClick={onReset}
        disabled={!canApply}
      >
        {t('advancedkey.resetConfiguration')}
      </button>
      <button
        type="button"
        className="px-4 py-2 rounded-md transition-colors text-sm font-medium text-white disabled:opacity-50 glassmorphism-button"
        onClick={onApply}
        disabled={!canApply}
      >
        {t('advancedkey.applyConfiguration')}
      </button>
    </EditorHeader>
  );
}

/** Port of `SelectedKeyInfo.svelte`: `currentSelectedCoords` is `[layer, key]`. */
interface SelectedKeyInfoProps {
  readonly currentKeyName: string;
  readonly currentSelectedCoords: readonly [number, number] | null;
}

export function SelectedKeyInfo({ currentKeyName, currentSelectedCoords }: SelectedKeyInfoProps) {
  const t = useT();
  return (
    <div className="rounded-lg border p-6 mb-6 glassmorphism-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center border-2 glassmorphism-button">
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {currentKeyName}
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {t('advancedkey.selectedKey')}
              </h3>
              {currentSelectedCoords && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {`${t('advancedkey.position')}: ${currentSelectedCoords[0]}, ${currentSelectedCoords[1]}`}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {`${t('advancedkey.mode')}:`}
          </span>
          <span className="px-3 py-1 rounded-full text-sm font-medium border bg-primary-200 dark:bg-black dark:text-white text-primary dark:border-white/40">
            {t('advancedkey.dynamicKeystroke')}
          </span>
        </div>
      </div>
    </div>
  );
}

const ARROW_DOWN = 'M19 14l-7 7m0 0l-7-7m7 7V3';
const ARROW_UP = 'M5 10l7-7m0 0l7 7m-7-7v18';

function PhaseArrow({ d }: { readonly d: string }) {
  return (
    <svg
      className="w-4 h-4 text-gray-700 dark:text-gray-300"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d} />
    </svg>
  );
}

const PHASES: readonly { readonly nameKey: TranslationKey; readonly icon: PhaseIcon }[] = [
  { nameKey: 'advancedkey.keyPressedPastActuation', icon: 'arrow-down' },
  { nameKey: 'advancedkey.keyPressedPastBottomOut', icon: 'arrow-down-line' },
  { nameKey: 'advancedkey.keyReleasedPastBottomOut', icon: 'arrow-up-line' },
  { nameKey: 'advancedkey.keyReleasedPastActuation', icon: 'arrow-up' },
];

type PhaseIcon = 'arrow-down' | 'arrow-down-line' | 'arrow-up-line' | 'arrow-up';

function PhaseIconView({ icon }: { readonly icon: PhaseIcon }) {
  switch (icon) {
    case 'arrow-down':
      return <PhaseArrow d={ARROW_DOWN} />;
    case 'arrow-down-line':
      return (
        <div className="flex flex-col items-center">
          <PhaseArrow d={ARROW_DOWN} />
          <div className="w-6 h-0.5 bg-gray-700 dark:bg-gray-300 mt-1"></div>
        </div>
      );
    case 'arrow-up-line':
      return (
        <div className="flex flex-col items-center">
          <div className="w-6 h-0.5 bg-gray-700 dark:bg-gray-300 mb-1"></div>
          <PhaseArrow d={ARROW_UP} />
        </div>
      );
    case 'arrow-up':
      return <PhaseArrow d={ARROW_UP} />;
  }
}

/** The "Bindings" row above the sliders with one icon per phase (DynamicMode.svelte). */
export function DKSPhaseHeader() {
  const t = useT();
  return (
    <div className="flex items-center gap-4 mb-3">
      <div className="w-16 text-center text-sm font-semibold dark:text-white text-gray-900">
        Bindings
      </div>
      <div className="relative h-4" style={{ width: `${DKS_SLIDER_WIDTH}px` }}>
        {PHASES.map((phase, i) => (
          <div
            key={phase.icon}
            className="absolute top-0 flex flex-col items-center gap-2"
            style={{ width: '16px', left: `${DKS_SLIDER_GAP * i + DKS_NODE_SIZE / 2 - 8}px` }}
            title={t(phase.nameKey)}
          >
            <PhaseIconView icon={phase.icon} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Port of `Binding.svelte`: the keycode panel of the bindings tab. */
interface DKSBindingProps {
  readonly selectedBindingIndex: number | null;
  /** The selected binding's keycode (null while unset or none is selected). */
  readonly selectedAction: Keycode | null;
  readonly onActionSelect: (keycode: Keycode) => void;
  readonly onDone: () => void;
}

export function DKSBinding({
  selectedBindingIndex,
  selectedAction,
  onActionSelect,
  onDone,
}: DKSBindingProps) {
  const t = useT();
  const description =
    selectedBindingIndex !== null
      ? t('advancedkey.selectKeycodeForBinding', String(selectedBindingIndex + 1))
      : t('advancedkey.clickOnBinding');

  return (
    <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 glassmorphism-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('advancedkey.keycodeSelectionTitle')}
        </h3>
        {selectedBindingIndex !== null && (
          <button
            type="button"
            className="text-sm px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            onClick={onDone}
          >
            {t('advancedkey.done')}
          </button>
        )}
      </div>

      <KeycodePicker
        description={description}
        selectedAction={selectedAction}
        onActionSelect={onActionSelect}
        defaultExpandedSection="Basic"
      />
    </div>
  );
}

/** Port of `KeyTester.svelte`. */
export function DKSKeyTester({ currentKeyName }: { readonly currentKeyName: string }) {
  const t = useT();
  return (
    <div className="rounded-lg border p-6 bg-primary-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700 glassmorphism-card">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {t('advancedkey.keyTester')}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {t('advancedkey.testDynamicDesc')}
      </p>
      <div className="border-2 border-dashed rounded-lg p-8 text-center border-primary-300 dark:border-primary-600 glassmorphism-card">
        <div className="w-20 h-20 rounded-lg flex items-center justify-center mx-auto mb-4 bg-primary-100 dark:bg-primary-800 glassmorphism-button">
          <span className="font-mono font-bold text-primary-600 dark:text-primary-400">
            {currentKeyName}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('advancedkey.testKeyBehavior')}
        </p>
      </div>
    </div>
  );
}
