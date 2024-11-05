<script>
    import { handleProfileSelection } from '../utils/ButtonActions';
    let currentProfile = "Default Profile";
  
    function selectProfile() {
      handleProfileSelection(currentProfile);
    }
  </script>
  
  <div class="section flex-grow">
    <h2 class="sidebar-heading">Profiles</h2>
    <button class="sidebar-button" on:click={selectProfile}>1. {currentProfile}</button>
  </div>