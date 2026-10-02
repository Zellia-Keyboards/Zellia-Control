import { keySelection, useSelectedLayer } from '../../features/keyboard';

const LAYERS = [1, 2, 3, 4] as const;

export interface LayerSelectorProps {
  readonly shouldShow: boolean;
}

/**
 * Toolbar layer buttons (port of `LayerSelector.svelte`); layers are 1-based as in the UI. When
 * hidden, an empty element keeps the toolbar's other items right-aligned.
 */
export function LayerSelector({ shouldShow }: LayerSelectorProps) {
  const selectedLayer = useSelectedLayer();

  if (!shouldShow) return <div></div>;

  return (
    <div className="layer-selector flex items-center gap-2 px-4 py-2 h-12">
      <span className="font-semibold text-gray-900 dark:text-white mr-2 text-gray-800 dark:text-white">
        Layer:
      </span>
      {LAYERS.map(layer => (
        <button
          key={layer}
          type="button"
          className={`w-8 h-8 flex items-center justify-center rounded-lg border font-bold text-lg transition-all duration-200 focus:outline-none bg-white dark:bg-black border-gray-300 dark:border-gray-600 text-primary-500 hover:bg-primary-100 dark:hover:bg-gray-700 glassmorphism-button ${
            selectedLayer === layer
              ? 'bg-primary-500 !text-white !border-primary-700 shadow-lg scale-110 ring-2 ring-primary-400'
              : ''
          }`}
          onClick={() => {
            keySelection.setLayer(layer);
          }}
          title={`Layer ${layer}`}
          aria-pressed={selectedLayer === layer}
        >
          {layer}
        </button>
      ))}
    </div>
  );
}
