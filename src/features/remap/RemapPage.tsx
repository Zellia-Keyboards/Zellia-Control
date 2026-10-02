import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { KeyedTransition, Transition, fade, slideMove } from '../../lib/transitions';
import { deviceSession, deviceStore, type Keycode } from '../device';
import { addedKeys, keySelection, keySelectionStore } from '../keyboard';
import type { PaletteKey } from '../keycodes';
import { BasicTab } from './components/BasicTab';
import { ExtensionTab } from './components/ExtensionTab';
import type { PaletteTabProps } from './components/KeySlots';
import { LayerTab } from './components/LayerTab';
import { ProfileTab } from './components/ProfileTab';
import { SystemTab } from './components/SystemTab';
import {
  BasicIcon,
  ExtensionIcon,
  LayerIcon,
  ProfileIcon,
  SystemIcon,
} from './components/TabIcons';
import { TabNavigation } from './components/TabNavigation';

interface RemapTab {
  readonly name: string;
  readonly icon: ReactNode;
  readonly Panel: (props: PaletteTabProps) => ReactNode;
}

const TABS = [
  { name: 'Basic', icon: <BasicIcon />, Panel: BasicTab },
  { name: 'System', icon: <SystemIcon />, Panel: SystemTab },
  { name: 'Layer', icon: <LayerIcon />, Panel: LayerTab },
  { name: 'Profile', icon: <ProfileIcon />, Panel: ProfileTab },
  { name: 'Extension', icon: <ExtensionIcon />, Panel: ExtensionTab },
] as const satisfies readonly RemapTab[];

type TabName = (typeof TABS)[number]['name'];

/** How long the "select a key first" message stays. */
const NOTIFICATION_MS = 3000;

/**
 * Writes `keycode` to the keys of the UI `layer` (1-based) that have a keymap entry; like the
 * Svelte page, selected keys beyond the keymap (e.g. Zellia Starlight keys 64–69) are skipped.
 */
function assignKeycode(layer: number, keyIds: readonly number[], keycode: Keycode): void {
  const deviceLayer = layer - 1;
  const layerKeymap = deviceStore.getState().config?.keymap[deviceLayer];
  if (!layerKeymap) return;
  const keys = keyIds.filter(id => id < layerKeymap.length);
  if (keys.length > 0) deviceSession.setKeycodes(deviceLayer, keys, keycode);
}

/**
 * `/remap/`: assign keycodes from the category palettes to the selected keys (port of
 * `routes/remap/+page.svelte`). The global keyboard and the layer selector belong to the shell.
 */
export function RemapPage() {
  const mainContainer = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabName>('Basic');
  const [previousTabIndex, setPreviousTabIndex] = useState(0);
  const [showingNotification, setShowingNotification] = useState(false);
  const notificationTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  /**
   * Paint mode (spec §1.4): the keycode assigned last. Keys added to the selection afterwards get
   * it, also after deselecting every key; it lives as long as the page.
   */
  const brush = useRef<Keycode | null>(null);

  const currentTabIndex = TABS.findIndex(tab => tab.name === activeTab);
  const ActiveTabPanel = TABS[currentTabIndex]?.Panel ?? BasicTab;
  const forward = currentTabIndex > previousTabIndex;

  // Always allow key selection on the remap page
  useLayoutEffect(() => {
    keySelection.setAllowSelection(true);
  }, []);

  // Focus the page when it mounts, so its keyboard shortcuts work right away
  useEffect(() => {
    mainContainer.current?.focus();
  }, []);

  // Keys added to the selection get the brush keycode on the selected layer. Switching layers
  // changes no selection, so it never writes (PL-015).
  useEffect(
    () =>
      keySelectionStore.subscribe((state, previous) => {
        const keycode = brush.current;
        if (keycode === null) return;
        const added = addedKeys(previous.selected, state.selected);
        if (added.length > 0) assignKeycode(state.layer, added, keycode);
      }),
    []
  );

  useEffect(() => {
    const timers = notificationTimers.current;
    return () => {
      timers.forEach(timer => {
        clearTimeout(timer);
      });
      timers.clear();
    };
  }, []);

  // Tab change with direction tracking
  const changeTab = (name: TabName) => {
    setPreviousTabIndex(currentTabIndex);
    setActiveTab(name);
  };

  // Every click without a selection hides the message 3 s later, like the Svelte timeouts.
  const showNotification = () => {
    setShowingNotification(true);
    const timer = setTimeout(() => {
      notificationTimers.current.delete(timer);
      setShowingNotification(false);
    }, NOTIFICATION_MS);
    notificationTimers.current.add(timer);
  };

  const setKeyContent = (key: PaletteKey) => {
    const { selected, layer } = keySelectionStore.getState();
    if (selected.length === 0) {
      showNotification();
      return;
    }
    // Placeholders without a firmware equivalent assign nothing (D8).
    if (key.keycode === null) return;
    brush.current = key.keycode;
    assignKeycode(layer, selected, key.keycode);
  };

  const handleKeydown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey && (event.key === 'a' || event.key === 'A')) {
      event.preventDefault();
      keySelection.toggleSelectAll();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      keySelection.deselectAll();
    }
  };

  const keyslot = (key: PaletteKey) => (
    <button
      type="button"
      onClick={() => {
        setKeyContent(key);
      }}
      className="size-14 text-wrap text-sm whitespace-pre-line rounded-lg overflow-auto transition-all duration-200 border-2 hover:shadow-[inset_0_0_0_2px_var(--color-primary)] hover:border-[color-mix(in_srgb,var(--color-primary)_50%,transparent)] border-[color-mix(in_srgb,var(--color-primary)_50%,transparent)]"
    >
      {key.label}
    </button>
  );

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the page captures its keyboard shortcuts (Ctrl+A, Escape) and takes focus on clicks, as in Svelte */}
      <div
        ref={mainContainer}
        className="rounded-2xl shadow mt-2 mb-4 grow border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex glassmorphism-card bg-gray-50 dark:bg-gray-900"
        tabIndex={-1}
        role="application"
        onKeyDown={handleKeydown}
        onClick={() => {
          mainContainer.current?.focus();
        }}
        style={{ outline: 'none', padding: 'calc(1.5rem * var(--ui-scale, 1))' }}
      >
        {/* Sidebar with Tab Navigation */}
        <aside
          className="flex-shrink-0 relative"
          style={{
            width: 'calc(14rem * var(--ui-scale, 1))',
            paddingRight: 'calc(1.5rem * var(--ui-scale, 1))',
          }}
        >
          <h2
            className="font-semibold mb-4"
            style={{ fontSize: 'calc(1.25rem * var(--ui-scale, 1))' }}
          >
            Categories
          </h2>
          <TabNavigation tabs={TABS} activeTab={activeTab} onTabChange={changeTab} />

          {/* Glassmorphism separator line */}
          <div
            className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent dark:via-white/10"
            style={{ boxShadow: '0 0 8px rgba(255, 255, 255, 0.1)' }}
          />
        </aside>

        {/* Main Content Area */}
        <main
          className="flex-1 flex flex-col min-w-0"
          style={{ paddingLeft: 'calc(1.5rem * var(--ui-scale, 1))' }}
        >
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <KeyedTransition
              transitionKey={activeTab}
              in={[slideMove, { duration: 350, direction: forward ? 1 : -1 }]}
              out={[slideMove, { duration: 350, direction: forward ? -1 : 1 }]}
            >
              <div className="absolute inset-0 w-full h-full overflow-y-auto">
                <ActiveTabPanel keyslot={keyslot} />
              </div>
            </KeyedTransition>
          </div>
        </main>
      </div>

      <Transition show={showingNotification} transition={[fade, { duration: 300 }]}>
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="glassmorphism-card bg-gray-50 dark:bg-gray-900 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 text-black dark:text-white">
            Select the key you want to remap first
          </div>
        </div>
      </Transition>
    </>
  );
}
