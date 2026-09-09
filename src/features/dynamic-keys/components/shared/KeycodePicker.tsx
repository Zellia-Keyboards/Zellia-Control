/**
 * Action picker of the dynamic-key editors (port of `advancedkey/shared/KeycodePicker.svelte`):
 * collapsible categories of `ACTION_CATEGORIES`, each emitting its full encoded keycode (D15).
 *
 * With glassmorphism always on (the Svelte `glassmorphismMode` store was a constant `true`), every
 * action button carried `glassmorphism-button` and the picked-action highlight classes never
 * applied, so `highlightColor` had no visible effect and is not ported; the picked action is
 * exposed as `aria-pressed` instead.
 */
import { useState } from 'react';
import type { Keycode } from '../../../device';
import { ACTION_CATEGORIES, type ActionCategoryName } from '../../../keycodes';
import { Transition, slide } from '../../../../lib/transitions';

export interface KeycodePickerProps {
  readonly title?: string;
  readonly description?: string;
  /** The action currently assigned, if any. */
  readonly selectedAction: Keycode | null;
  readonly onActionSelect: (keycode: Keycode) => void;
  readonly defaultExpandedSection?: ActionCategoryName;
}

export function KeycodePicker({
  title,
  description,
  selectedAction,
  onActionSelect,
  defaultExpandedSection = 'Basic',
}: KeycodePickerProps) {
  const [expandedSections, setExpandedSections] = useState<
    Readonly<Record<ActionCategoryName, boolean>>
  >(() => ({
    Basic: defaultExpandedSection === 'Basic',
    Layer: defaultExpandedSection === 'Layer',
    System: defaultExpandedSection === 'System',
    Mouse: defaultExpandedSection === 'Mouse',
  }));

  const cardClasses = description
    ? 'rounded-lg border p-4 sm:p-6 ' + 'glassmorphism-card'
    : 'rounded-lg border border-gray-200 dark:border-gray-600 p-4 sm:p-6 bg-white dark:bg-gray-900 ' +
      'glassmorphism-card';

  return (
    <div className={cardClasses}>
      {title && <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>}

      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>
      )}

      <div className="space-y-2">
        {ACTION_CATEGORIES.map(category => {
          const expanded = expandedSections[category.name];
          return (
            <div key={category.name} className="border rounded-lg glassmorphism-card">
              <button
                type="button"
                className="w-full px-4 py-3 flex items-center justify-between glassmorphism-button rounded-lg transition-colors"
                aria-expanded={expanded}
                onClick={() => {
                  setExpandedSections(sections => ({
                    ...sections,
                    [category.name]: !sections[category.name],
                  }));
                }}
              >
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {category.name}
                </h4>
                <svg
                  className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <Transition show={expanded} transition={[slide, { duration: 300, axis: 'y' }]}>
                <div className="px-4 pb-4 pt-2">
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                    {category.actions.map(action => (
                      <button
                        key={action.name}
                        type="button"
                        className="aspect-square min-w-12 text-xs rounded-md border transition-all flex items-center justify-center p-1 whitespace-pre-line leading-tight glassmorphism-button"
                        aria-pressed={selectedAction === action.keycode}
                        onClick={() => {
                          onActionSelect(action.keycode);
                        }}
                        title={action.name}
                      >
                        {action.name}
                      </button>
                    ))}
                  </div>
                </div>
              </Transition>
            </div>
          );
        })}
      </div>
    </div>
  );
}
