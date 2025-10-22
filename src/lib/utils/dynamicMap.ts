import * as ekc from 'emi-keyboard-controller'

export function mapDynamicKey(keymap : number[][],dynamic_keys : ekc.IDynamicKey[]) : void{
  keymap.forEach((layer,layer_index)=>{
    layer.forEach((item,item_index)=>{
      //if ((item & 0xFF) == Keycode.DynamicKey) {
      //  keymap[layer_index][item_index] = Keycode.NoEvent;
      //}
    })
  })
  dynamic_keys.forEach((item,index)=>{
    //if (item.type != DynamicKeyType.DynamicKeyNone) {
    //  item.target_keys_location.forEach((location)=>{
    //    keymap[location.layer][location.id] = (Keycode.DynamicKey & 0xFF | ((index & 0xFF) << 8));
    //  });
    //}
  });
};

export function mapBackDynamicKey(keymap : number[][],dynamic_keys : ekc.IDynamicKey[]) : void{
  keymap.forEach((layer,layer_index)=>{
    layer.forEach((item,item_index)=>{
      //if ((item & 0xFF) == Keycode.DynamicKey) {
      //  const index = ((item >> 8) & 0xFF);
      //  if (dynamic_keys[index].type == DynamicKeyType.DynamicKeyMutex) {
      //    dynamic_keys[index].target_keys_location[(dynamic_keys[index] as DynamicKeyMutex).is_key2_primary ? 1 : 0]={layer: layer_index, id: item_index};
      //    (dynamic_keys[index] as DynamicKeyMutex).is_key2_primary = !(dynamic_keys[index] as DynamicKeyMutex).is_key2_primary;
      //  }
      //  else
      //  {
      //    dynamic_keys[index].target_keys_location[0]={layer: layer_index, id: item_index};
      //  }
      //}
    })
  });
};