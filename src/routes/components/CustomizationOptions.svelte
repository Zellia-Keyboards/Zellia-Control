<script>
    import { handleNavigation } from '../utils/ButtonActions';
  
    function navigateTo(page) {
      handleNavigation(page);
    }
  </script>
  
  <div class="section flex-grow">
    <h2 class="sidebar-heading">Customization</h2>
    <button class="sidebar-button" on:click={() => navigateTo("Keymap")}>Keymap</button>
    <button class="sidebar-button" on:click={() => navigateTo("Performance")}>Performance</button>
  </div>