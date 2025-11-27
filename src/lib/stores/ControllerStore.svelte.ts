import { writable } from 'svelte/store';
import * as ekc from 'emi-keyboard-controller';

export const advancedKeys = writable(Array<ekc.IAdvancedKey>());
export const rgbConfigs = writable(Array<ekc.IRGBConfig>());
export const keymap = writable(Array<Array<number>>());
export const rgbBaseConfig = writable(new ekc.RGBBaseConfig());
export const dynamicKeys = writable(Array<ekc.IDynamicKey>());
