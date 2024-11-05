<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
  
    let devices = ["Arius80HE"];
    let showDropdown = false;
  
    function selectDevice(device) {
      dispatch('select', device);
      showDropdown = false;
    }
  </script>
  
  <div class="section flex-grow relative">
    <h4 class="sidebar-heading">My devices</h4>
    <button class="sidebar-button" on:click={() => (showDropdown = !showDropdown)}>
      {devices[0]} ▼
    </button>
  
    {#if showDropdown}
      <ul class="device-dropdown">
        {#each devices as device}
          <li>
            <button class="sidebar-button" on:click={() => selectDevice(device)}>
              {device}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>