/**
 * Test harness for DeviceSession: a virtual libamp keyboard installed on jsdom's `navigator` and a
 * session with its own store and debug stream, driving the real vendored controllers. Controllers
 * are only observed (to know which one the session connected), never replaced.
 */
import {
  installVirtualHid,
  type HostPacket,
  type InstalledVirtualKeyboard,
  type VirtualKeyboardOptions,
} from '../../../testing/virtual-keyboard';
import type { DeviceController } from '../controller';
import { createDebugStream, type DebugStream } from '../debug-stream';
import { createDeviceStore, type DeviceState, type DeviceStore } from '../device-store';
import { MODELS, type ModelDefinition } from '../models';
import { createDeviceSession, type DeviceSession, type DeviceSessionTimeouts } from '../session';

export interface HarnessOptions {
  readonly keyboard?: VirtualKeyboardOptions;
  readonly timeouts?: Partial<DeviceSessionTimeouts>;
  /** Runs on every controller the session creates (e.g. to delay `connect()`). */
  readonly onController?: (controller: DeviceController) => void;
}

export interface SessionHarness {
  readonly vk: InstalledVirtualKeyboard;
  readonly store: DeviceStore;
  readonly session: DeviceSession;
  readonly debug: DebugStream;
  /** Connection statuses the store went through, consecutive duplicates collapsed. */
  readonly statuses: readonly string[];
  /** The controller the session connected last. */
  controller(): DeviceController;
  state(): DeviceState;
  /** Decoded host → device packets since the last `vk.clearHistory()`. */
  packets(): readonly HostPacket[];
  dispose(): void;
}

export function createHarness(options: HarnessOptions = {}): SessionHarness {
  const vk = installVirtualHid(navigator, options.keyboard);
  const store = createDeviceStore();
  const debug = createDebugStream();
  const connected: DeviceController[] = [];
  const models: ModelDefinition[] = MODELS.map(model => ({
    ...model,
    create: () => {
      const controller = model.create();
      const connect = controller.connect.bind(controller);
      controller.connect = async device => {
        connected.push(controller);
        return connect(device);
      };
      options.onController?.(controller);
      return controller;
    },
  }));
  const session = createDeviceSession({
    hid: vk.hid,
    models,
    store,
    debugStream: debug,
    ...(options.timeouts ? { timeouts: options.timeouts } : {}),
  });

  const statuses: string[] = [store.getState().connection.status];
  const unsubscribe = store.subscribe(state => {
    if (statuses[statuses.length - 1] !== state.connection.status) {
      statuses.push(state.connection.status);
    }
  });

  return {
    vk,
    store,
    session,
    debug,
    statuses,
    controller() {
      const controller = connected[connected.length - 1];
      if (!controller) throw new Error('The session has not connected a controller');
      return controller;
    },
    state: () => store.getState(),
    packets: () => vk.sentPackets,
    dispose() {
      unsubscribe();
      session.disconnect();
      vk.uninstall();
    },
  };
}

/** Lets the virtual keyboard and the controller queue finish every pending exchange. */
export async function settle(): Promise<void> {
  for (let round = 0; round < 3; round++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

/** Resolves with the first store state matching `predicate` (rejects after `timeoutMs`). */
export function waitForState(
  store: DeviceStore,
  predicate: (state: DeviceState) => boolean,
  timeoutMs = 2000
): Promise<DeviceState> {
  return new Promise((resolve, reject) => {
    const current = store.getState();
    if (predicate(current)) {
      resolve(current);
      return;
    }
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Store did not reach the expected state within ${timeoutMs} ms`));
    }, timeoutMs);
    const unsubscribe = store.subscribe(state => {
      if (!predicate(state)) return;
      clearTimeout(timer);
      unsubscribe();
      resolve(state);
    });
  });
}

/** Every object reachable from `root` (for aliasing checks). */
export function reachableObjects(root: unknown, seen = new Set<object>()): Set<object> {
  if (typeof root !== 'object' || root === null || seen.has(root)) return seen;
  seen.add(root);
  const children: unknown[] = Object.values(root);
  for (const child of children) reachableObjects(child, seen);
  return seen;
}

/** Every object reachable from the controller's configuration caches. */
export function controllerCacheObjects(controller: DeviceController): Set<object> {
  const seen = new Set<object>();
  for (const cache of [
    controller.get_advanced_keys(),
    controller.get_keymap(),
    controller.get_rgb_base_config(),
    controller.get_rgb_configs(),
    controller.get_dynamic_keys(),
    controller.get_feature(),
    controller.get_firmware_version(),
    controller.get_layout_labels(),
  ]) {
    reachableObjects(cache, seen);
  }
  return seen;
}
