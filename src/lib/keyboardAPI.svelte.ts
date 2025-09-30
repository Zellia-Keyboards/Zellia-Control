// keyboardAPI.svelte.ts
// Manages keyboard connection state, device communication, and routing

import { 
  Zellia80Controller, 
  OholeoKeyboardController, 
  TrinityPadController,
  type IKeyboardController 
} from '../../src-controller/src/index';
import { goto } from '$app/navigation';
import * as api from '$lib/api.svelte';

export type KeyboardModel = 'zellia60he' | 'zellia80he' | 'oholeo' | 'trinity_pad';

export interface DetectedDevice {
  device: any; // HIDDevice type from WebHID API
  controller: IKeyboardController;
  modelName: string;
}

export interface KeyboardConnectionState {
  isConnected: boolean;
  isDemoMode: boolean;
  selectedModel: KeyboardModel | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastConnectedDevice?: string;
  error?: string;
  controller?: IKeyboardController;
  detectedDevices?: DetectedDevice[];
}

const defaultState: KeyboardConnectionState = {
  isConnected: false,
  isDemoMode: false,
  selectedModel: null,
  connectionStatus: 'disconnected'
};

// Create reactive state
export let keyboardConnectionState = $state<KeyboardConnectionState>({
  ...defaultState
});

// Available controllers
const availableControllers = [
  { controller: Zellia80Controller, modelName: 'Zellia 80HE', modelKey: 'zellia80he' as KeyboardModel },
  { controller: OholeoKeyboardController, modelName: 'Oholeo Keyboard', modelKey: 'oholeo' as KeyboardModel },
  { controller: TrinityPadController, modelName: 'Trinity Pad', modelKey: 'trinity_pad' as KeyboardModel },
];

// Store functions
export const keyboardAPI = {
  // Connect to a physical keyboard
  async connect(): Promise<boolean> {
    keyboardConnectionState.connectionStatus = 'connecting';
    keyboardConnectionState.error = undefined;
    
    try {
      // Try to request devices with all controller filters at once (single popup)
      const allFilters = [
        { vendorId: 0xFEED, productId: 22319, usagePage: 0xFF60 }, // Zellia80 & Oholeo
        { vendorId: 0xFEED, productId: 0xFFFF, usagePage: 0xFF60 }, // Trinity Pad
      ];
      
      const devices = await (navigator as any).hid?.requestDevice?.({ filters: allFilters });
      
      if (!devices || devices.length === 0) {
        throw new Error('No compatible keyboards found');
      }
      
      // Match the first device to a controller
      let selectedController: IKeyboardController | null = null;
      let selectedModel: KeyboardModel = 'trinity_pad';
      let deviceName = 'Unknown Device';
      
      for (const device of devices) {
        for (const controllerConfig of availableControllers) {
          if (this.deviceMatchesController(device, controllerConfig.controller)) {
            selectedController = new controllerConfig.controller();
            selectedModel = controllerConfig.modelKey;
            deviceName = device.productName || controllerConfig.modelName;
            break;
          }
        }
        if (selectedController) break;
      }
      
      if (!selectedController) {
        throw new Error('No compatible controller found for detected device');
      }
      
      // Connect to the device
      const connected = await selectedController.connect(devices[0]);
      //const connected = true;
      if (!connected) {
        throw new Error('Failed to connect to keyboard');
      }
      
      // Update state
      keyboardConnectionState.isConnected = true;
      keyboardConnectionState.isDemoMode = false;
      keyboardConnectionState.connectionStatus = 'connected';
      keyboardConnectionState.lastConnectedDevice = deviceName;
      keyboardConnectionState.selectedModel = selectedModel;
      keyboardConnectionState.controller = selectedController;
      
      // Request initial configuration from keyboard
      selectedController.request_config();
      
      // Redirect to remap page after successful connection
      goto('/remap');
      
      return true;
    } catch (error) {
      keyboardConnectionState.connectionStatus = 'error';
      keyboardConnectionState.error = error instanceof Error ? error.message : 'Connection failed';
      keyboardConnectionState.isConnected = false;
      keyboardConnectionState.controller = undefined;
      return false;
    }
  },

  // Enter demo mode with selected keyboard model
  enterDemoMode(model: KeyboardModel): void {
    // Clear any existing controller when entering demo mode
    if (keyboardConnectionState.controller) {
      keyboardConnectionState.controller.disconnect();
    }
    
    keyboardConnectionState.isConnected = true;
    keyboardConnectionState.isDemoMode = true;
    keyboardConnectionState.selectedModel = model;
    keyboardConnectionState.connectionStatus = 'connected';
    keyboardConnectionState.lastConnectedDevice = `Demo ${model.toUpperCase()}`;
    keyboardConnectionState.controller = undefined;
    keyboardConnectionState.error = undefined;
    
    // Redirect to remap page after entering demo mode
    goto('/remap');
  },

  // Check if a device matches a controller (simplified matching)
  deviceMatchesController(device: any, ControllerClass: any): boolean {
    // For Zellia80Controller: vendorId: 0xFEED, productId: 22319
    if (ControllerClass === Zellia80Controller) {
      return device.vendorId === 0xFEED && device.productId === 22319;
    }
    // For OholeoKeyboardController: vendorId: 0xFEED, productId: 22319 (same as Zellia80)
    if (ControllerClass === OholeoKeyboardController) {
      return device.vendorId === 0xFEED && device.productId === 22319;
    }
    // For TrinityPadController: vendorId: 0xFEED, productId: 0xFFFF
    if (ControllerClass === TrinityPadController) {
      return device.vendorId === 0xFEED && device.productId === 0xFFFF;
    }
    return false;
  },

  // Disconnect keyboard and clear all data
  disconnect(): void {
    // Disconnect physical device if connected
    if (keyboardConnectionState.controller) {
      keyboardConnectionState.controller.disconnect();
    }
    
    // Reset all state to default
    Object.assign(keyboardConnectionState, {
      ...defaultState,
      controller: undefined,
      detectedDevices: undefined
    });
    
    // Clear any cached data
    console.log('Keyboard disconnected and all data cleared');
  },

  // Switch keyboard model (for demo mode)
  switchModel(model: KeyboardModel): void {
    if (keyboardConnectionState.isDemoMode) {
      keyboardConnectionState.selectedModel = model;
      keyboardConnectionState.lastConnectedDevice = `Demo ${model.toUpperCase()}`;
    }
  },

  // Get the active keyboard controller
  getController(): IKeyboardController | undefined {
    return keyboardConnectionState.controller;
  },

  // Send configuration to keyboard (if connected)
  async saveConfiguration(): Promise<boolean> {
    if (!keyboardConnectionState.controller || keyboardConnectionState.isDemoMode) {
      return false;
    }
    
    try {
      keyboardConnectionState.controller.save_config();
      return true;
    } catch (error) {
      keyboardConnectionState.error = error instanceof Error ? error.message : 'Failed to save configuration';
      return false;
    }
  },

  // Flash configuration to keyboard firmware
  async flashConfiguration(): Promise<boolean> {
    if (!keyboardConnectionState.controller || keyboardConnectionState.isDemoMode) {
      return false;
    }
    
    try {
      keyboardConnectionState.controller.flash_config();
      return true;
    } catch (error) {
      keyboardConnectionState.error = error instanceof Error ? error.message : 'Failed to flash configuration';
      return false;
    }
  },

  // Reset keyboard to factory defaults
  async factoryReset(): Promise<boolean> {
    if (!keyboardConnectionState.controller || keyboardConnectionState.isDemoMode) {
      return false;
    }
    
    try {
      keyboardConnectionState.controller.factory_reset();
      return true;
    } catch (error) {
      keyboardConnectionState.error = error instanceof Error ? error.message : 'Failed to factory reset';
      return false;
    }
  },

  // Check if we should show the configurator
  get shouldShowConfigurator(): boolean {
    return keyboardConnectionState.isConnected && keyboardConnectionState.selectedModel !== null;
  },

  // Get current state (for reactive subscriptions)
  get state(): KeyboardConnectionState {
    return keyboardConnectionState;
  }
};

// Helper functions
export const isKeyboard60HE = () => keyboardConnectionState.selectedModel === 'zellia60he';
export const isKeyboard80HE = () => keyboardConnectionState.selectedModel === 'zellia80he';
export const isOholeoKeyboard = () => keyboardConnectionState.selectedModel === 'oholeo';
export const isTrinityPad = () => keyboardConnectionState.selectedModel === 'trinity_pad';
export const isConnected = () => keyboardConnectionState.isConnected;
export const isDemoMode = () => keyboardConnectionState.isDemoMode;
export const getSelectedModel = () => keyboardConnectionState.selectedModel;
export const getConnectionStatus = () => keyboardConnectionState.connectionStatus;
export const getLastError = () => keyboardConnectionState.error;
export const getDetectedDeviceCount = () => keyboardConnectionState.detectedDevices?.length || 0;
export const getControllerName = () => {
  const model = keyboardConnectionState.selectedModel;
  const config = availableControllers.find(c => c.modelKey === model);
  return config?.modelName || 'Unknown Device';
};