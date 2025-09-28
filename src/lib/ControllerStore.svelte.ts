import { writable } from 'svelte/store';
import * as ekc from 'emi-keyboard-controller';

export const advancedKeys = writable(Array<ekc.IAdvancedKey>()); 