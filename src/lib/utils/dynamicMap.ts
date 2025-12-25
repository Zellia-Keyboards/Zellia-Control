import * as ekc from 'emi-keyboard-controller';
import {
  advancedKeys,
  dynamicKeys,
  rgbBaseConfig,
  rgbConfigs,
  keymap,
} from '$lib/stores/ControllerStore.svelte';

export function mapDynamicKey(keymap: number[][], dynamic_keys: ekc.IDynamicKey[]): void {
  keymap.forEach((layer, layer_index) => {
    layer.forEach((item, item_index) => {
      if ((item & 0xff) == ekc.Keycode.DynamicKey) {
        keymap[layer_index][item_index] = ekc.Keycode.NoEvent;
      }
    });
  });
  dynamic_keys.forEach((item, index) => {
    if (item.type != ekc.DynamicKeyType.DynamicKeyNone) {
      item.target_keys_location.forEach(location => {
        keymap[location.layer][location.id] =
          (ekc.Keycode.DynamicKey & 0xff) | ((index & 0xff) << 8);
      });
    }
  });
}

export function mapBackDynamicKey(keymap: number[][], dynamic_keys: ekc.IDynamicKey[]): void {
  keymap.forEach((layer, layer_index) => {
    layer.forEach((item, item_index) => {
      if ((item & 0xff) == ekc.Keycode.DynamicKey) {
        const index = (item >> 8) & 0xff;
        if (dynamic_keys[index].type == ekc.DynamicKeyType.DynamicKeyMutex) {
          dynamic_keys[index].target_keys_location[
            (dynamic_keys[index] as ekc.DynamicKeyMutex).is_key2_primary ? 1 : 0
          ] = { layer: layer_index, id: item_index };
          (dynamic_keys[index] as ekc.DynamicKeyMutex).is_key2_primary = !(
            dynamic_keys[index] as ekc.DynamicKeyMutex
          ).is_key2_primary;
        } else {
          dynamic_keys[index].target_keys_location[0] = { layer: layer_index, id: item_index };
        }
      }
    });
  });
}
