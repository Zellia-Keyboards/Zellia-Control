// ConnectionManager.svelte.ts
// Owns the WebHID lifecycle: hotplug detection, silent reattach, retry, listener hygiene.

import {
  Zellia80Controller,
  ZelliaStarlightController,
  OholeoKeyboardController,
  TrinityPadController,
  type IKeyboardController,
} from '../../../src-controller/src/index';
import * as ekc from 'emi-keyboard-controller';
import type { KeyboardController } from 'emi-keyboard-controller';
import {
  advancedKeys,
  dynamicKeys,
  rgbBaseConfig,
  rgbConfigs,
  keymap,
  layoutLabels,
  selectedLayoutIndices,
  keyboardConfig,
  firmwareVersion,
  firmwareFeature,
  profileIndex,
  profileCount,
  macros,
  scriptSource,
  scriptBytecode,
  configHydrationStatus,
  configHydrationError,
} from '$lib/stores/ControllerStore.svelte';
import { keyboardLayout } from '$lib/stores/LayoutStore.svelte';
import { mapBackDynamicKey } from '$lib/utils/dynamicMap';

export type KeyboardModel = 'zellia_starlight' | 'zellia80he' | 'oholeo' | 'trinity_pad';

export enum ConnectionError {
  None = 'none',
  NoDeviceSelected = 'no_device_selected',
  NoCompatibleController = 'no_compatible_controller',
  OpenFailed = 'open_failed',
  LostConnection = 'lost_connection',
  Stale = 'stale',
  Unknown = 'unknown',
}

export interface DeviceHint {
  vendorId: number;
  productId: number;
  productName: string;
  modelKey: KeyboardModel;
}

export interface KeyboardConnectionState {
  isConnected: boolean;
  selectedModel: KeyboardModel | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastConnectedDevice?: string;
  error?: string;
  controller?: KeyboardController;
  detectedDevices?: any[];
  lastError?: ConnectionError;
  reconnectAttempt?: number;
  lastDeviceHint?: DeviceHint;
  configStatus?: 'idle' | 'loading' | 'ready' | 'error';
  configError?: string;
}

const HID_FILTERS = [
  { vendorId: 0xfeed, productId: 22319, usagePage: 0xff60 },
  { vendorId: 0xfeed, productId: 0xffff, usagePage: 0xff60 },
];

const STORAGE_KEY = 'zellia.lastDevice';
const HEARTBEAT_INTERVAL_MS = 15000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 8000;
const RECONNECT_MAX_ATTEMPTS = 5;

export const availableControllers = [
  {
    controller: ZelliaStarlightController,
    modelName: 'Zellia Starlight',
    modelKey: 'zellia_starlight' as KeyboardModel,
  },
  {
    controller: Zellia80Controller,
    modelName: 'Zellia 80HE',
    modelKey: 'zellia80he' as KeyboardModel,
  },
  {
    controller: OholeoKeyboardController,
    modelName: 'Oholeo Keyboard',
    modelKey: 'oholeo' as KeyboardModel,
  },
  {
    controller: TrinityPadController,
    modelName: 'Trinity Pad',
    modelKey: 'trinity_pad' as KeyboardModel,
  },
];

const PRODUCT_NAME_PATTERNS: Record<KeyboardModel, RegExp[]> = {
  zellia_starlight: [/starlight/i],
  zellia80he: [/zellia\s*80/i, /80\s*he/i, /80he/i],
  oholeo: [/oholeo/i],
  trinity_pad: [/trinity/i],
};

class ConnectionManager extends EventTarget {
  state = $state<KeyboardConnectionState>({
    isConnected: false,
    selectedModel: null,
    connectionStatus: 'disconnected',
  });

  private activeDevice: HIDDevice | undefined;
  private boundController: any;
  private updateDataHandler: (() => void) | undefined;
  private updateDataStartHandler: (() => void) | undefined;
  private deviceDisconnectedHandler: (() => void) | undefined;
  private hidConnectHandler = (e: Event) => this.onHidConnect(e as any);
  private hidDisconnectHandler = (e: Event) => this.onHidDisconnect(e as any);
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private hidListenersAttached = false;
  private userInitiatedDisconnect = false;
  private initialized = false;

  init() {
    if (this.initialized) return;
    if (typeof navigator === 'undefined' || !(navigator as any).hid) return;
    const hid = (navigator as any).hid;
    if (!this.hidListenersAttached) {
      hid.addEventListener('connect', this.hidConnectHandler);
      hid.addEventListener('disconnect', this.hidDisconnectHandler);
      this.hidListenersAttached = true;
    }
    this.state.lastDeviceHint = this.loadHint();
    this.initialized = true;
  }

  private loadHint(): DeviceHint | undefined {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as DeviceHint) : undefined;
    } catch {
      return undefined;
    }
  }

  private saveHint(hint: DeviceHint) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hint));
    } catch {}
  }

  private clearHint() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  selectModel(modelKey: KeyboardModel) {
    this.state.selectedModel = modelKey;
  }

  private matchController(device: HIDDevice, preferredModel?: KeyboardModel | null) {
    const matches = availableControllers.filter(cfg =>
      this.deviceMatchesController(device, cfg.controller)
    );
    if (matches.length <= 1) return matches[0];

    if (preferredModel) {
      const preferred = matches.find(cfg => cfg.modelKey === preferredModel);
      if (preferred) return preferred;
    }

    const productName = device.productName || '';
    const productMatch = matches.find(cfg =>
      PRODUCT_NAME_PATTERNS[cfg.modelKey].some(pattern => pattern.test(productName))
    );
    if (productMatch) return productMatch;

    const hint = this.loadHint();
    if (hint && hint.vendorId === device.vendorId && hint.productId === device.productId) {
      const hinted = matches.find(cfg => cfg.modelKey === hint.modelKey);
      if (hinted) return hinted;
    }

    return matches[0];
  }

  deviceMatchesController(device: HIDDevice, ControllerClass: any): boolean {
    if (ControllerClass === ZelliaStarlightController) {
      return device.vendorId === 0xfeed && device.productId === 22319;
    }
    if (ControllerClass === Zellia80Controller) {
      return device.vendorId === 0xfeed && device.productId === 22319;
    }
    if (ControllerClass === OholeoKeyboardController) {
      return device.vendorId === 0xfeed && device.productId === 22319;
    }
    if (ControllerClass === TrinityPadController) {
      return device.vendorId === 0xfeed && device.productId === 0xffff;
    }
    return false;
  }

  async tryReattach(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !(navigator as any).hid?.getDevices) return false;
    if (this.state.isConnected) return true;
    try {
      const devices: HIDDevice[] = await (navigator as any).hid.getDevices();
      if (!devices || devices.length === 0) return false;
      const hint = this.loadHint();
      const candidate =
        (hint &&
          devices.find(
              d => d.vendorId === hint.vendorId && d.productId === hint.productId && this.matchController(d)
          )) ||
        devices.find(d => this.matchController(d));
      if (!candidate) return false;
      return await this.attach(candidate, /* navigateOnSuccess */ false);
    } catch {
      return false;
    }
  }

  async connect(preferredModel?: KeyboardModel): Promise<boolean> {
    if (this.state.connectionStatus === 'connecting') return false;
    this.userInitiatedDisconnect = false;
    this.cancelReconnect();
    if (preferredModel) this.selectModel(preferredModel);
    this.state.connectionStatus = 'connecting';
    this.state.error = undefined;
    this.state.lastError = ConnectionError.None;
    try {
      const devices: HIDDevice[] = await (navigator as any).hid?.requestDevice?.({
        filters: HID_FILTERS,
      });
      if (!devices || devices.length === 0) {
        this.fail('No compatible keyboards found', ConnectionError.NoDeviceSelected);
        return false;
      }
      return await this.attach(devices[0], /* navigateOnSuccess */ true, preferredModel ?? this.state.selectedModel);
    } catch (e) {
      this.fail(e instanceof Error ? e.message : 'Connection failed', ConnectionError.Unknown);
      return false;
    }
  }

  private async attach(
    device: HIDDevice,
    navigateOnSuccess: boolean,
    preferredModel?: KeyboardModel | null
  ): Promise<boolean> {
    const cfg = this.matchController(device, preferredModel);
    if (!cfg) {
      this.fail('No compatible controller found for detected device', ConnectionError.NoCompatibleController);
      return false;
    }

    this.state.connectionStatus = 'connecting';
    let ctrl: IKeyboardController | undefined;
    let ok = false;
    try {
      ctrl = new cfg.controller();
      this.bindStores(ctrl as any);
      this.setHydrationStatus('loading');
      ok = await ctrl.connect(device);
    } catch (e) {
      this.unbindStores(ctrl as any);
      this.fail(
        e instanceof Error ? e.message : 'Failed to open device',
        ConnectionError.OpenFailed
      );
      return false;
    }
    if (!ctrl || !ok) {
      this.unbindStores(ctrl as any);
      this.fail('Failed to connect to keyboard', ConnectionError.OpenFailed);
      return false;
    }

    this.activeDevice = device;
    this.state.isConnected = true;
    this.state.connectionStatus = 'connected';
    this.state.lastConnectedDevice = device.productName || cfg.modelName;
    this.state.selectedModel = cfg.modelKey;
    this.state.controller = ctrl as unknown as KeyboardController;
    this.state.reconnectAttempt = 0;
    this.state.error = undefined;
    this.state.lastError = ConnectionError.None;

    const hint: DeviceHint = {
      vendorId: device.vendorId,
      productId: device.productId,
      productName: device.productName || cfg.modelName,
      modelKey: cfg.modelKey,
    };
    this.state.lastDeviceHint = hint;
    this.saveHint(hint);

    const layout = ctrl.get_layout_json() as string;
    keyboardLayout.set(layout || '[]');
    const labels = ctrl.get_layout_labels() ?? [[]];
    layoutLabels.set(labels);
    selectedLayoutIndices.set(new Array(labels.length).fill(0));

    this.syncStoresFromController(ctrl as any);
    this.startHeartbeat();
    this.dispatchEvent(
      new CustomEvent('connected', {
        detail: { navigateOnSuccess, modelKey: cfg.modelKey, deviceName: hint.productName },
      })
    );
    return true;
  }

  private bindStores(ctrl: any) {
    this.unbindStores();
    this.boundController = ctrl;
    this.updateDataStartHandler = () => this.setHydrationStatus('loading');
    this.updateDataHandler = () => {
      this.syncStoresFromController(ctrl);
      this.setHydrationStatus('ready');
    };
    this.deviceDisconnectedHandler = () => this.handleLost(ConnectionError.LostConnection);
    ctrl.addEventListener('updateDataStart', this.updateDataStartHandler);
    ctrl.addEventListener('updateData', this.updateDataHandler);
    ctrl.addEventListener('deviceDisconnected', this.deviceDisconnectedHandler);
  }

  private unbindStores(ctrl = this.boundController) {
    if (!ctrl) return;
    if (this.updateDataStartHandler) {
      try {
        ctrl.removeEventListener?.('updateDataStart', this.updateDataStartHandler);
      } catch {}
    }
    if (this.updateDataHandler) {
      try {
        ctrl.removeEventListener?.('updateData', this.updateDataHandler);
      } catch {}
    }
    if (this.deviceDisconnectedHandler) {
      try {
        ctrl.removeEventListener?.('deviceDisconnected', this.deviceDisconnectedHandler);
      } catch {}
    }
    this.boundController = undefined;
    this.updateDataStartHandler = undefined;
    this.updateDataHandler = undefined;
    this.deviceDisconnectedHandler = undefined;
  }

  private setHydrationStatus(
    status: 'idle' | 'loading' | 'ready' | 'error',
    error: string | null = null
  ) {
    this.state.configStatus = status;
    this.state.configError = error ?? undefined;
    configHydrationStatus.set(status);
    configHydrationError.set(error);
  }

  private syncStoresFromController(ctrl: any) {
    const nextAdvancedKeys = (ctrl.get_advanced_keys?.() ?? []).map((key: ekc.IAdvancedKey) =>
      ekc.normalizeAdvancedKey(key)
    );
    const nextRgbConfigs = (ctrl.get_rgb_configs?.() ?? []).map((config: ekc.IRGBConfig) => ({
      ...config,
      rgb: { ...config.rgb },
    }));
    const nextRgbBaseConfig = ctrl.get_rgb_base_config?.() as ekc.IRGBBaseConfig | undefined;
    const nextDynamicKeys = [...(ctrl.get_dynamic_keys?.() ?? [])] as ekc.IDynamicKey[];
    const nextKeymap = ((ctrl.get_keymap?.() ?? []) as number[][]).map(layer => [...layer]);

    if (nextKeymap.length > 0 && nextDynamicKeys.length > 0) {
      try {
        mapBackDynamicKey(nextKeymap, nextDynamicKeys);
      } catch (e) {
        console.warn('Failed to map dynamic key locations from keymap', e);
      }
    }

    advancedKeys.set(nextAdvancedKeys);
    rgbConfigs.set(nextRgbConfigs);
    if (nextRgbBaseConfig) {
      rgbBaseConfig.set({
        ...nextRgbBaseConfig,
        rgb: { ...nextRgbBaseConfig.rgb },
        secondary_rgb: { ...nextRgbBaseConfig.secondary_rgb },
      });
    }
    dynamicKeys.set(nextDynamicKeys);
    keymap.set(nextKeymap);

    keyboardConfig.set(ctrl.get_config?.() ?? new ekc.KeyboardConfig());
    firmwareVersion.set({ ...(ctrl.get_firmware_version?.() ?? { major: 0, minor: 0, patch: 0, info: '' }) });
    firmwareFeature.set(ctrl.get_feature?.() ?? new ekc.Feature());
    profileIndex.set(ctrl.get_profile_index?.() ?? 0);
    profileCount.set(ctrl.get_profile_num?.() ?? 0);
    macros.set((ctrl.get_macros?.() ?? [[]]).map((macro: ekc.IMacroAction[]) => [...macro]));
    scriptSource.set(ctrl.get_script_source?.() ?? '');
    const bytecode = ctrl.get_script_bytecode?.();
    scriptBytecode.set(bytecode ? new Uint8Array(bytecode) : new Uint8Array());
  }

  async refreshConfiguration(): Promise<boolean> {
    const ctrl: any = this.state.controller;
    if (!ctrl) return false;
    this.setHydrationStatus('loading');
    try {
      const request = ctrl.request?.() ?? ctrl.fetch?.() ?? ctrl.request_config?.();
      if (request && typeof request.then === 'function') await request;
      this.syncStoresFromController(ctrl);
      this.setHydrationStatus('ready');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to read keyboard configuration';
      this.setHydrationStatus('error', message);
      this.state.error = message;
      return false;
    }
  }

  async setProfileIndex(index: number): Promise<boolean> {
    const ctrl: any = this.state.controller;
    if (!ctrl) return false;
    this.setHydrationStatus('loading');
    try {
      const result = ctrl.set_profile_index?.(index) ?? ctrl.set_config_file_index?.(index);
      if (result && typeof result.then === 'function') await result;
      profileIndex.set(index);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to switch profile';
      this.setHydrationStatus('error', message);
      this.state.error = message;
      return false;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    if (typeof localStorage !== 'undefined' && localStorage.getItem('zellia.disable_heartbeat') === '1') return;
    this.heartbeatTimer = setInterval(() => {
      if (this.activeDevice && !this.activeDevice.opened) {
        this.handleLost(ConnectionError.LostConnection);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
  }

  private onHidConnect(e: { device: HIDDevice }) {
    if (this.state.isConnected) return;
    if (this.userInitiatedDisconnect) return;
    if (!e?.device || !this.matchController(e.device)) return;
    void this.tryReattach();
  }

  private onHidDisconnect(e: { device: HIDDevice }) {
    if (!this.activeDevice || e?.device !== this.activeDevice) return;
    this.handleLost(ConnectionError.LostConnection);
  }

  private handleLost(reason: ConnectionError) {
    this.teardownController();
    this.state.isConnected = false;
    this.state.connectionStatus = 'disconnected';
    this.state.lastError = reason;
    this.state.error = reason === ConnectionError.LostConnection ? 'Keyboard disconnected' : 'Keyboard connection lost';
    this.dispatchEvent(new CustomEvent('connectionLost', { detail: { reason } }));
    if (!this.userInitiatedDisconnect) this.scheduleReconnect();
  }

  private scheduleReconnect() {
    const attempt = (this.state.reconnectAttempt ?? 0) + 1;
    if (attempt > RECONNECT_MAX_ATTEMPTS) return;
    this.state.reconnectAttempt = attempt;
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, attempt - 1), RECONNECT_MAX_MS);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = undefined;
      const ok = await this.tryReattach();
      if (!ok && !this.userInitiatedDisconnect) this.scheduleReconnect();
    }, delay);
  }

  private cancelReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.state.reconnectAttempt = 0;
  }

  private teardownController() {
    this.stopHeartbeat();
    const ctrl: any = this.state.controller;
    this.unbindStores(ctrl);
    if (ctrl) {
      try {
        ctrl.disconnect();
      } catch {}
    }
    this.activeDevice = undefined;
    this.state.controller = undefined;
  }

  private fail(msg: string, kind: ConnectionError) {
    this.teardownController();
    this.state.isConnected = false;
    this.state.connectionStatus = 'error';
    this.state.error = msg;
    this.state.lastError = kind;
  }

  disconnect() {
    this.userInitiatedDisconnect = true;
    this.cancelReconnect();
    this.teardownController();
    this.state.isConnected = false;
    this.state.selectedModel = null;
    this.state.connectionStatus = 'disconnected';
    this.state.lastConnectedDevice = undefined;
    this.state.error = undefined;
    this.state.lastError = ConnectionError.None;
    this.state.reconnectAttempt = 0;
    this.state.lastDeviceHint = undefined;
    this.setHydrationStatus('idle');
    this.clearHint();
    this.dispatchEvent(new CustomEvent('disconnected'));
  }
}

export const connectionManager = new ConnectionManager();
if (typeof window !== 'undefined') connectionManager.init();
