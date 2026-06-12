// keyboardAPI.svelte.ts
// Thin facade over ConnectionManager. Public surface preserved for callers.

import { goto } from '$app/navigation';
import {
  connectionManager,
  availableControllers,
  ConnectionError,
  type KeyboardModel,
  type KeyboardConnectionState,
  type DeviceHint,
} from './ConnectionManager.svelte';

export type { KeyboardModel, KeyboardConnectionState, DeviceHint };
export { ConnectionError, availableControllers };

export const keyboardConnectionState = connectionManager.state;

connectionManager.addEventListener('connected', e => {
  const detail = (e as CustomEvent).detail;
  if (detail?.navigateOnSuccess) goto('/remap');
});

export const keyboardAPI = {
  async connect(modelKey?: KeyboardModel): Promise<boolean> {
    return connectionManager.connect(modelKey);
  },

  selectModel(modelKey: KeyboardModel): void {
    connectionManager.selectModel(modelKey);
  },

  async tryReattach(): Promise<boolean> {
    return connectionManager.tryReattach();
  },

  disconnect(): void {
    connectionManager.disconnect();
  },

  getController() {
    return connectionManager.state.controller;
  },

  async refreshConfiguration(): Promise<boolean> {
    return connectionManager.refreshConfiguration();
  },

  async setProfileIndex(index: number): Promise<boolean> {
    return connectionManager.setProfileIndex(index);
  },

  on(event: string, listener: EventListener): void {
    connectionManager.addEventListener(event, listener);
  },

  off(event: string, listener: EventListener): void {
    connectionManager.removeEventListener(event, listener);
  },

  async saveConfiguration(): Promise<boolean> {
    const ctrl = connectionManager.state.controller as any;
    if (!ctrl) return false;
    try {
      const result = ctrl.save?.() ?? ctrl.save_config?.();
      if (result && typeof result.then === 'function') await result;
      return true;
    } catch (error) {
      connectionManager.state.error =
        error instanceof Error ? error.message : 'Failed to save configuration';
      return false;
    }
  },

  async flashConfiguration(): Promise<boolean> {
    const ctrl = connectionManager.state.controller as any;
    if (!ctrl) return false;
    try {
      const result = ctrl.flash?.() ?? ctrl.flash_config?.();
      if (result && typeof result.then === 'function') await result;
      return true;
    } catch (error) {
      connectionManager.state.error =
        error instanceof Error ? error.message : 'Failed to flash configuration';
      return false;
    }
  },

  async factoryReset(): Promise<boolean> {
    const ctrl = connectionManager.state.controller as any;
    if (!ctrl) return false;
    try {
      ctrl.factory_reset();
      return true;
    } catch (error) {
      connectionManager.state.error =
        error instanceof Error ? error.message : 'Failed to factory reset';
      return false;
    }
  },

  get shouldShowConfigurator(): boolean {
    return connectionManager.state.isConnected && connectionManager.state.selectedModel !== null;
  },

  get state(): KeyboardConnectionState {
    return connectionManager.state;
  },
};

export const isKeyboard60HE = () => connectionManager.state.selectedModel === 'zellia_starlight';
export const isKeyboard80HE = () => connectionManager.state.selectedModel === 'zellia80he';
export const isOholeoKeyboard = () => connectionManager.state.selectedModel === 'oholeo';
export const isTrinityPad = () => connectionManager.state.selectedModel === 'trinity_pad';
export const isConnected = () => connectionManager.state.isConnected;
export const getSelectedModel = () => connectionManager.state.selectedModel;
export const getConnectionStatus = () => connectionManager.state.connectionStatus;
export const getLastError = () => connectionManager.state.error;
export const getDetectedDeviceCount = () => connectionManager.state.detectedDevices?.length || 0;
export const getControllerName = () => {
  const model = connectionManager.state.selectedModel;
  const config = availableControllers.find(c => c.modelKey === model);
  return config?.modelName || 'Unknown Device';
};
