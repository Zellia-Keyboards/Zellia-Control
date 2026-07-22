/**
 * React equivalents of Svelte's `{#if}` + `transition:`/`in:`/`out:` and `{#key}` blocks.
 *
 * The single child element is animated through a ref, so no wrapper element is added and the
 * ported markup stays identical. Semantics follow Svelte 5:
 * - local by default: no intro when the component mounts already shown (the enclosing
 *   block is being created), unless `appear` (Svelte's `|global`) is set;
 * - a hidden child stays mounted, inert and frozen (last shown render) until its outro ends;
 * - showing it again mid-outro reverses the transition on the same element.
 */
import {
  cloneElement,
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefCallback,
} from 'react';
import {
  createTransitionManager,
  runOutTransitions,
  type TransitionDirection,
  type TransitionManager,
} from './engine';
import type { TransitionConfig, TransitionSpec } from './types';

/** A single element; components must pass the `ref` prop on to their root DOM element. */
export type TransitionChild = ReactElement<{ ref?: Ref<HTMLElement> }>;

type ConfigFactory = (node: HTMLElement) => TransitionConfig;

interface ConfigFactories {
  readonly transition: ConfigFactory | undefined;
  readonly in: ConfigFactory | undefined;
  readonly out: ConfigFactory | undefined;
}

function toFactory<P extends object>(
  spec: TransitionSpec<P> | undefined
): ConfigFactory | undefined {
  if (!spec) return undefined;
  const [fn, params] = spec;
  return node => fn(node, params);
}

/** Svelte creates one manager per directive, in markup order (`in:` before `out:`). */
function createManagers(
  element: HTMLElement,
  getFactories: () => ConfigFactories
): TransitionManager[] {
  const manager = (
    direction: TransitionDirection,
    pick: (factories: ConfigFactories) => ConfigFactory | undefined
  ) => createTransitionManager(element, direction, () => pick(getFactories())?.(element) ?? {});

  const { transition, in: intro, out: outro } = getFactories();
  if (transition) return [manager('both', factories => factories.transition)];
  return [
    ...(intro ? [manager('in', factories => factories.in)] : []),
    ...(outro ? [manager('out', factories => factories.out)] : []),
  ];
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): (() => void) | undefined {
  if (typeof ref === 'function') {
    const cleanup = ref(value);
    return typeof cleanup === 'function' ? cleanup : undefined;
  }
  if (ref) ref.current = value;
  return undefined;
}

function mergeRefs<T>(...refs: readonly (Ref<T> | undefined)[]): RefCallback<T> {
  return instance => {
    const cleanups = refs.map(ref => assignRef(ref, instance));
    return () => {
      refs.forEach((ref, index) => {
        const cleanup = cleanups[index];
        if (cleanup) cleanup();
        else assignRef(ref, null);
      });
    };
  };
}

interface FrozenProps {
  element: TransitionChild;
  nodeRef: RefCallback<HTMLElement>;
  /** While frozen the previous render is kept, like a paused Svelte block. */
  frozen: boolean;
}

const Frozen = memo(
  function Frozen({ element, nodeRef }: FrozenProps) {
    const childRef = element.props.ref;
    const ref = useMemo(() => mergeRefs(childRef, nodeRef), [childRef, nodeRef]);
    return cloneElement(element, { ref });
  },
  (_previous, next) => next.frozen
);

interface PresenceItemProps {
  element: TransitionChild;
  /** `true` = shown (intro / reversal), `false` = leaving (outro, then `onExited`). */
  present: boolean;
  /** Play the intro when mounted shown. */
  animateOnMount: boolean;
  factories: ConfigFactories;
  onExited: () => void;
}

function PresenceItem({
  element,
  present,
  animateOnMount,
  factories,
  onExited,
}: PresenceItemProps) {
  const latest = useRef({ factories, onExited });
  const node = useRef<HTMLElement | null>(null);
  const bound = useRef<{ node: HTMLElement; managers: readonly TransitionManager[] } | null>(null);
  /** The `present` value the transitions last acted on; `null` before the first run. */
  const acted = useRef<boolean | null>(null);

  const setNode = useCallback((instance: HTMLElement | null) => {
    node.current = instance;
  }, []);

  useLayoutEffect(() => {
    latest.current = { factories, onExited };
  });

  useLayoutEffect(
    () => () => {
      bound.current?.managers.forEach(manager => {
        manager.stop();
      });
      bound.current = null;
      acted.current = null;
    },
    []
  );

  useLayoutEffect(() => {
    const previous = acted.current;
    acted.current = present;
    if (previous === present) return;

    const element = node.current;
    if (bound.current?.node !== element) {
      bound.current = element
        ? { node: element, managers: createManagers(element, () => latest.current.factories) }
        : null;
    }
    const managers = bound.current?.managers ?? [];

    if (present) {
      if (previous !== null || animateOnMount) {
        managers.forEach(manager => {
          manager.in();
        });
      }
    } else {
      runOutTransitions(managers, () => {
        if (acted.current === false) latest.current.onExited();
      });
    }
  }, [present, animateOnMount]);

  return <Frozen element={element} nodeRef={setNode} frozen={!present} />;
}

export interface TransitionProps<P extends object, PI extends object, PO extends object> {
  show: boolean;
  children: TransitionChild;
  /** Bidirectional transition (`transition:`); reverses smoothly when interrupted. */
  transition?: TransitionSpec<P>;
  /** Intro only (`in:`); ignored when `transition` is set. */
  in?: TransitionSpec<PI>;
  /** Outro only (`out:`); ignored when `transition` is set. */
  out?: TransitionSpec<PO>;
  /** Also play the intro when mounted already shown (Svelte `|global`). */
  appear?: boolean;
}

/** `{#if show}<child transition:…>{/if}` */
export function Transition<
  P extends object = object,
  PI extends object = object,
  PO extends object = object,
>({
  show,
  children,
  transition,
  in: intro,
  out: outro,
  appear = false,
}: TransitionProps<P, PI, PO>): ReactNode {
  const [state, setState] = useState(() => ({ show, mounted: show, generation: 0 }));
  let current = state;
  if (show !== state.show) {
    // A child hidden and fully exited is mounted afresh; one still leaving is reversed.
    const remount = show && !state.mounted;
    current = {
      show,
      mounted: show || state.mounted,
      generation: remount ? state.generation + 1 : state.generation,
    };
    setState(current);
  }

  const handleExited = useCallback(() => {
    setState(latest => (latest.show ? latest : { ...latest, mounted: false }));
  }, []);

  if (!current.mounted) return null;

  return (
    <PresenceItem
      key={current.generation}
      element={children}
      present={show}
      animateOnMount={current.generation > 0 || appear}
      factories={{ transition: toFactory(transition), in: toFactory(intro), out: toFactory(outro) }}
      onExited={handleExited}
    />
  );
}

export interface KeyedTransitionProps<P extends object, PI extends object, PO extends object> {
  /** A new key replaces the child: the old one plays its outro while the new one enters. */
  transitionKey: string | number;
  children: TransitionChild;
  transition?: TransitionSpec<P>;
  in?: TransitionSpec<PI>;
  out?: TransitionSpec<PO>;
}

interface KeyedEntry {
  readonly id: number;
  readonly leaving: boolean;
}

interface KeyedState {
  readonly key: string | number;
  readonly nextId: number;
  /** Leaving children first, the current child last (DOM order, as in `{#key}`). */
  readonly entries: readonly KeyedEntry[];
}

/**
 * `{#key transitionKey}<child in:… out:…>{/key}` — leaving children stay in the DOM before
 * the entering one until their outro ends. The first child does not animate.
 */
export function KeyedTransition<
  P extends object = object,
  PI extends object = object,
  PO extends object = object,
>({
  transitionKey,
  children,
  transition,
  in: intro,
  out: outro,
}: KeyedTransitionProps<P, PI, PO>): ReactNode {
  const [state, setState] = useState<KeyedState>(() => ({
    key: transitionKey,
    nextId: 1,
    entries: [{ id: 0, leaving: false }],
  }));
  let current = state;
  if (!Object.is(transitionKey, state.key)) {
    current = {
      key: transitionKey,
      nextId: state.nextId + 1,
      entries: [
        ...state.entries.map(entry => (entry.leaving ? entry : { ...entry, leaving: true })),
        { id: state.nextId, leaving: false },
      ],
    };
    setState(current);
  }

  const handleExited = useCallback((id: number) => {
    setState(latest => ({ ...latest, entries: latest.entries.filter(entry => entry.id !== id) }));
  }, []);

  const factories: ConfigFactories = {
    transition: toFactory(transition),
    in: toFactory(intro),
    out: toFactory(outro),
  };

  return current.entries.map(entry => (
    <PresenceItem
      key={entry.id}
      element={children}
      present={!entry.leaving}
      animateOnMount={entry.id > 0}
      factories={factories}
      onExited={() => {
        handleExited(entry.id);
      }}
    />
  ));
}
