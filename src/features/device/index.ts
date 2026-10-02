/**
 * Device feature: the keyboard session, its immutable snapshot store and the debug stream.
 * UI code reads the store through the hooks and changes the keyboard only through
 * `deviceSession` commands.
 */
export type { DeviceController } from './controller';
export type * from './model/types';
export { deviceSession } from './session'; // lazily bound to navigator.hid
export { createDeviceSession, type DeviceSession, type DynamicKeyDraft } from './session';
export { useDeviceStore, deviceStore, type DeviceState } from './store';
export { useConnection, useDeviceConfig, useIsReady, useModel, useDeviceName } from './store';
export { useDeviceLoads, useFeatureFlags, useSupportsMacros, useSupportsScripts } from './store';
export { subscribeDebugSamples, type DebugSample } from './debug-stream';
