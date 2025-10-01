<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Keycode, ConsumerKeycode } from '../../../src-controller/src/interface';

  type KeyInfo = {
    label: string;
    keycode: Keycode;
    subcode: ConsumerKeycode;
  };

  const AvailableKeys: KeyInfo[] = [
    { label: 'BRT-', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerBrightnessDown },
    { label: 'BRT+', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerBrightnessUp },
    { label: 'Vol-', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerAudioVolDown },
    { label: 'Vol+', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerAudioVolUp },
    { label: 'Mute', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerAudioMute },
    { label: 'Play\nPause', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerTransportPlayPause },
    { label: 'Stop', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerTransportStop },
    { label: 'Prev', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerTransportPrevTrack },
    { label: 'Next', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerTransportNextTrack },
    { label: 'Email', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerAlEmail },
    { label: 'Calculator', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerAlCalculator },
    { label: 'Explorer', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerAlLocalBrowser },
    { label: 'Media\nPlayer', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerTransportPlayPause },
    { label: 'Control\nPanel', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerAlControlPanel },
    { label: 'Search', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerAcSearch },
    { label: 'Home', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerAcHome },
    { label: 'Back', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerAcBack },
    { label: 'Forward', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerAcForward },
    { label: 'Stop', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerTransportStop },
    { label: 'Refresh', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerAcRefresh },
    { label: 'Bookmarks', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerAcBookmarks },
    { label: 'Snapshot', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerSnapshot },
    { label: 'Record', keycode: Keycode.ConsumerCollection, subcode: ConsumerKeycode.ConsumerTransportRecord },
  ];

  interface Props {
    keyslot: Snippet<[KeyInfo]>;
  }

  let { keyslot }: Props = $props();
</script>

<div class="flex flex-wrap gap-2 *:w-20">
  {#each AvailableKeys as key}
    {@render keyslot(key)}
  {/each}
</div>
