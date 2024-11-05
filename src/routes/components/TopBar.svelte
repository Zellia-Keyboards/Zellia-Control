<script>
    import { updateFirmware, saveSettings } from '../utils/ButtonActions';
  </script>
  
  <div class="w-full p-4 bg-black border-b border-gray-500 flex items-center justify-between">
    <!-- Left Side: Update Firmware Button -->
    <button class="topbar-button" on:click={updateFirmware}>Update Firmware</button>
  
    <!-- Center: Device Name -->
    <h2 class="text-lg font-semibold text-gray-200">Arius</h2>
  
    <!-- Right Side: Save Settings Button -->
    <button class="topbar-button bg-green-600 text-gray-200 px-4 py-2 rounded" on:click={saveSettings}>Save Keyboard Setting</button>
  </div>