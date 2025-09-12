// KeyboardConnectionStore.svelte.ts
// Manages keyboard connection state, selected model, and demo mode

export type KeyboardModel = 'zellia60he' | 'zellia80he';

export interface KeyboardConnectionState {
  isConnected: boolean;
  isDemoMode: boolean;
  selectedModel: KeyboardModel | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastConnectedDevice?: string;
  error?: string;
}

const defaultState: KeyboardConnectionState = {
  isConnected: false,
  isDemoMode: false,
  selectedModel: null,
  connectionStatus: 'disconnected'
};

// Create reactive state
export const keyboardConnectionState = $state<KeyboardConnectionState>({
  ...defaultState
});

// Store functions
export const keyboardConnection = {
  // Connect to a physical keyboard
  async connect(): Promise<boolean> {
    keyboardConnectionState.connectionStatus = 'connecting';
    keyboardConnectionState.error = undefined;
    
    try {
      // TODO: Implement actual keyboard detection and connection
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate connection delay
      
      // For now, simulate successful connection
      keyboardConnectionState.isConnected = true;
      keyboardConnectionState.isDemoMode = false;
      keyboardConnectionState.connectionStatus = 'connected';
      keyboardConnectionState.lastConnectedDevice = 'Zellia Keyboard';
      
      // TODO: Auto-detect keyboard model
      keyboardConnectionState.selectedModel = 'zellia80he'; // Default for now
      
      return true;
    } catch (error) {
      keyboardConnectionState.connectionStatus = 'error';
      keyboardConnectionState.error = error instanceof Error ? error.message : 'Connection failed';
      return false;
    }
  },

  // Enter demo mode with selected keyboard model
  enterDemoMode(model: KeyboardModel): void {
    keyboardConnectionState.isConnected = true;
    keyboardConnectionState.isDemoMode = true;
    keyboardConnectionState.selectedModel = model;
    keyboardConnectionState.connectionStatus = 'connected';
    keyboardConnectionState.lastConnectedDevice = `Demo ${model.toUpperCase()}`;
  },

  // Disconnect keyboard
  disconnect(): void {
    Object.assign(keyboardConnectionState, defaultState);
  },

  // Switch keyboard model (for demo mode)
  switchModel(model: KeyboardModel): void {
    if (keyboardConnectionState.isDemoMode) {
      keyboardConnectionState.selectedModel = model;
      keyboardConnectionState.lastConnectedDevice = `Demo ${model.toUpperCase()}`;
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
export const isConnected = () => keyboardConnectionState.isConnected;
export const isDemoMode = () => keyboardConnectionState.isDemoMode;
export const getSelectedModel = () => keyboardConnectionState.selectedModel;