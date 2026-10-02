/**
 * Null-bind editor parts (ports of `advancedkey/nullbind/*.svelte`): header, key selection,
 * selected pair, behavior list, bottom-out switch and slider, and the key tester tab. The
 * performance tab and the configured list have their own modules.
 */
import { ThemedSlider, Toggle } from '../../../../components/ui';
import { useT } from '../../../../lib/i18n';
import { NULL_BIND_BEHAVIORS, type NullBindBehavior } from '../../model/null-bind';
import { EditorHeader } from '../shared/EditorHeader';

/** Key label of the null-bind editor (Svelte `getNullBindKeyLabel`). */
export type KeyLabel = (keyIndex: number | undefined) => string;

/** Port of `NullBindHeader.svelte`. */
interface NullBindHeaderProps {
  readonly onBack: () => void;
  readonly onApply: () => void;
  readonly canApply: boolean;
}

export function NullBindHeader({ onBack, onApply, canApply }: NullBindHeaderProps) {
  const t = useT();
  return (
    <EditorHeader
      titleKey="advancedkey.nullBindTitle"
      subtitleKey="advancedkey.nullBindSubtitle"
      onBack={onBack}
    >
      <button
        type="button"
        className="px-4 py-2 text-white bg-primary-500 hover:bg-primary-600 rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed glassmorphism-button"
        onClick={onApply}
        disabled={!canApply}
      >
        {t('advancedkey.applyConfiguration')}
      </button>
    </EditorHeader>
  );
}

/** Port of `NullBindKeySelection.svelte`. */
interface NullBindKeySelectionProps {
  readonly localSelectedKeys: readonly number[];
  readonly getKeyLabel: KeyLabel;
  readonly onRemoveKey: (index: number) => void;
}

export function NullBindKeySelection({
  localSelectedKeys,
  getKeyLabel,
  onRemoveKey,
}: NullBindKeySelectionProps) {
  const t = useT();
  const count = localSelectedKeys.length;
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          {t('advancedkey.selectTwoKeys')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('advancedkey.selectTwoKeysInstructions')}
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div
            className={`p-4 border-2 border-dashed rounded-lg glassmorphism-card ${
              count >= 1
                ? 'border-primary-500 bg-primary-100 dark:bg-primary-900'
                : 'border-primary-400 bg-primary-200 dark:bg-primary-800'
            }`}
          >
            <div className="text-center">
              {count >= 1 ? (
                <>
                  <div className="w-12 h-12 text-white bg-primary-500 rounded-lg flex items-center justify-center mx-auto mb-2 glassmorphism-button">
                    <span className="font-mono font-bold">{getKeyLabel(localSelectedKeys[0])}</span>
                  </div>
                  <div className="text-sm font-medium text-primary-500">
                    {t('advancedkey.firstKey')}
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-xs text-red-600 hover:text-red-700 glassmorphism-button"
                    onClick={() => {
                      onRemoveKey(0);
                    }}
                  >
                    {t('advancedkey.remove')}
                  </button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-primary-300 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-2 animate-pulse glassmorphism-button">
                    <span className="text-primary-500">?</span>
                  </div>
                  <div className="text-sm text-primary-500">
                    {t('advancedkey.clickKeyToSelect')}
                  </div>
                </>
              )}
            </div>
          </div>

          <div
            className={`p-4 border-2 border-dashed rounded-lg glassmorphism-card ${
              count >= 2
                ? 'border-primary-500 bg-primary-100 dark:bg-primary-900'
                : count === 1
                  ? 'border-primary-500 bg-primary-100 dark:bg-primary-800'
                  : 'border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-800'
            }`}
          >
            <div className="text-center">
              {count >= 2 ? (
                <>
                  <div className="w-12 h-12 text-white bg-primary-500 rounded-lg flex items-center justify-center mx-auto mb-2 glassmorphism-button">
                    <span className="font-mono font-bold">{getKeyLabel(localSelectedKeys[1])}</span>
                  </div>
                  <div className="text-sm font-medium text-primary-500">
                    {t('advancedkey.secondKey')}
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-xs text-red-600 hover:text-red-700 glassmorphism-button"
                    onClick={() => {
                      onRemoveKey(1);
                    }}
                  >
                    {t('advancedkey.remove')}
                  </button>
                </>
              ) : count === 1 ? (
                <>
                  <div className="w-12 h-12 bg-primary-300 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-2 animate-pulse glassmorphism-button">
                    <span className="text-primary-500">?</span>
                  </div>
                  <div className="text-sm text-primary-500">
                    {t('advancedkey.clickOpposingKey')}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-lg flex items-center justify-center mx-auto mb-2 glassmorphism-button">
                    <span className="text-gray-500 dark:text-gray-400">?</span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t('advancedkey.secondKey')}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The two-way arrow between the keys of a pair. */
export function PairArrow() {
  return (
    <div className="flex items-center gap-1 text-primary-500">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    </div>
  );
}

/** Port of `NullBindSelectedKeysInfo.svelte`. */
interface NullBindSelectedKeysInfoProps {
  readonly localSelectedKeys: readonly number[];
  readonly getKeyLabel: KeyLabel;
}

export function NullBindSelectedKeysInfo({
  localSelectedKeys,
  getKeyLabel,
}: NullBindSelectedKeysInfoProps) {
  const t = useT();
  return (
    <div className="relative overflow-hidden rounded-lg border bg-gradient-to-br from-primary-200 to-primary-100 border-primary-400 dark:from-primary-800 dark:to-primary-900 dark:border-primary-600 glassmorphism-card">
      <div className="p-4">
        <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          {t('advancedkey.selectedKeys')}
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="px-3 py-2 bg-primary-500 text-white rounded-lg font-mono font-bold text-sm glassmorphism-button">
            {getKeyLabel(localSelectedKeys[0])}
          </div>
          <PairArrow />
          <div className="px-3 py-2 bg-primary-500 text-white rounded-lg font-mono font-bold text-sm glassmorphism-button">
            {getKeyLabel(localSelectedKeys[1])}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Port of `NullBindBehaviorSelector.svelte`. */
interface NullBindBehaviorSelectorProps {
  readonly behavior: NullBindBehavior;
  readonly onBehaviorSelect: (behavior: NullBindBehavior) => void;
}

export function NullBindBehaviorSelector({
  behavior,
  onBehaviorSelect,
}: NullBindBehaviorSelectorProps) {
  const t = useT();
  return (
    <div className="flex flex-col">
      <p className="text-sm font-semibold leading-none tracking-tight text-gray-900 dark:text-white">
        {t('advancedkey.configureNullBindBehavior')}
      </p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {t('advancedkey.selectHowToResolveKeyEvents')}
      </p>

      <div className="mt-3 grid gap-1">
        {NULL_BIND_BEHAVIORS.map(behaviorMeta => {
          const selected = behavior === behaviorMeta.behavior;
          return (
            <button
              key={behaviorMeta.behavior}
              type="button"
              aria-pressed={selected}
              className={`relative flex items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 glassmorphism-button ${
                selected
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-500 border border-primary-400 dark:border-primary-600'
                  : 'text-gray-700 dark:text-white'
              }`}
              onClick={() => {
                onBehaviorSelect(behaviorMeta.behavior);
              }}
            >
              <span className="absolute left-2 flex size-3.5 items-center justify-center">
                <div className="size-3 rounded-full border-2 border-current flex items-center justify-center">
                  {selected && <div className="size-1.5 rounded-full bg-current"></div>}
                </div>
              </span>
              {t(behaviorMeta.nameKey)}
              <span className="inline-flex flex-1 justify-end">
                <div className="group relative">
                  <svg
                    className="size-4 text-current"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="glassmorphism bg-primary-100 dark:bg-primary-900 text-primary-500 absolute bottom-full right-0 mb-2 w-56 p-2 bg-gray-900  text-white dark:border dark:border-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {t(behaviorMeta.descriptionKey)}
                  </div>
                </div>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Port of `NullBindBottomOutControl.svelte`. */
interface NullBindBottomOutControlProps {
  readonly bottomOutPoint: number;
  readonly onBottomOutToggle: (enabled: boolean) => void;
}

export function NullBindBottomOutControl({
  bottomOutPoint,
  onBottomOutToggle,
}: NullBindBottomOutControlProps) {
  const t = useT();
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {t('advancedkey.alternativeBottomOutBehavior')}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('advancedkey.alternativeBottomOutBehaviorDesc')}
          </div>
        </div>
        <Toggle
          checked={bottomOutPoint > 0}
          onToggle={() => {
            onBottomOutToggle(bottomOutPoint === 0);
          }}
          size="sm"
          ariaLabel={t('advancedkey.alternativeBottomOutBehavior')}
        />
      </div>
    </div>
  );
}

/** Port of `NullBindBottomOutSlider.svelte`. */
interface NullBindBottomOutSliderProps {
  readonly bottomOutPoint: number;
  readonly actuationPoint: number;
  readonly uiBottomOutPoint: number;
  readonly switchDistance: number;
  readonly onBottomOutPointChange: (value: number) => void;
  readonly onCommitBottomOutPoint: () => void;
}

export function NullBindBottomOutSlider({
  bottomOutPoint,
  actuationPoint,
  uiBottomOutPoint,
  switchDistance,
  onBottomOutPointChange,
  onCommitBottomOutPoint,
}: NullBindBottomOutSliderProps) {
  const t = useT();
  if (bottomOutPoint <= 0) return null;
  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {t('advancedkey.bottomOutPoint')}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('advancedkey.bottomOutPointDesc')}
          </div>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {`${uiBottomOutPoint.toFixed(1)}${t('units.mm')}`}
        </span>
      </div>
      <ThemedSlider
        aria-label={t('advancedkey.bottomOutPoint')}
        min={actuationPoint + 0.1}
        max={switchDistance}
        step={0.1}
        value={uiBottomOutPoint}
        onChange={event => {
          onBottomOutPointChange(Number(event.currentTarget.value));
        }}
        onCommit={onCommitBottomOutPoint}
      />
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>{`${(actuationPoint + 0.1).toFixed(1)}${t('units.mm')}`}</span>
        <span>{`${switchDistance.toFixed(1)}${t('units.mm')}`}</span>
      </div>
    </div>
  );
}

/** Port of `NullBindKeyTesterTab.svelte`. */
interface NullBindKeyTesterTabProps {
  readonly localSelectedKeys: readonly number[];
  readonly getKeyLabel: KeyLabel;
  readonly behavior: NullBindBehavior;
  readonly bottomOutPoint: number;
  readonly rtDown: number;
  readonly getBehaviorName: (behavior: number) => string;
}

export function NullBindKeyTesterTab({
  localSelectedKeys,
  getKeyLabel,
  behavior,
  bottomOutPoint,
  rtDown,
  getBehaviorName,
}: NullBindKeyTesterTabProps) {
  const t = useT();
  return (
    <div className="flex flex-col gap-4 rounded-md border glassmorphism-card p-4 shadow-sm">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {t('advancedkey.keyTesterTitle')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('advancedkey.keyTesterDesc')}
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <div className="p-6 border-2 border-primary-300 bg-primary-100 rounded-lg glassmorphism-card">
            <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white mb-2">
              {getKeyLabel(localSelectedKeys[0])}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('advancedkey.key1')}</div>
            {behavior === 1 && (
              <div className="text-xs mt-1 font-medium text-primary-500">
                {t('advancedkey.priorityKey')}
              </div>
            )}
          </div>
          <div className="p-6 border-2 border-primary-300 bg-primary-100 rounded-lg glassmorphism-card">
            <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white mb-2">
              {getKeyLabel(localSelectedKeys[1])}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('advancedkey.key2')}</div>
            {behavior === 2 && (
              <div className="text-xs mt-1 font-medium text-primary-500">
                {t('advancedkey.priorityKey')}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 glassmorphism-card rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {`${t('advancedkey.currentBehavior')} `}
            <span className="font-medium text-gray-900 dark:text-white">
              {getBehaviorName(behavior)}
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {`${t('advancedkey.bottomOut')} `}
            <span className="font-medium text-gray-900 dark:text-white">
              {bottomOutPoint > 0 ? t('advancedkey.enabled') : t('advancedkey.disabled')}
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {`${t('advancedkey.rapidTrigger')}: `}
            <span className="font-medium text-gray-900 dark:text-white">
              {rtDown > 0 ? t('advancedkey.enabled') : t('advancedkey.disabled')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
